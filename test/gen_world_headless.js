// Headless world-generation smoke test for the Simplex noise swap.
// Loads the real browser scripts (config → noise → world) in a stubbed browser
// environment, runs generateWorld() to completion, and asserts no exceptions,
// non-empty terrain, and that the noise swap is actually wired in. This is the
// "open index.html and let generation finish" check, done from Node.
//
// Run:  node test/gen_world_headless.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── 1. Minimal browser-global stubs ──────────────────────────────────────
// config.js touches: window, navigator, document.body.classList, ontouchstart.
// worlds.js (loaded before config in index.html) touches localStorage; stub it.
const cls = { add(){}, remove(){}, contains(){return false;} };
const store = {};
const localStorageStub = {
  getItem:k=>(k in store?store[k]:null),
  setItem:(k,v)=>{store[k]=String(v);},
  removeItem:k=>{delete store[k];},
  clear(){for(const k in store)delete store[k];},
  key:i=>Object.keys(store)[i]||null,
  get length(){return Object.keys(store).length;},
};
const navigatorStub = { userAgent:'node-headless', maxTouchPoints:0, platform:'Node' };
const windowStub = {
  navigator: navigatorStub,
  localStorage: localStorageStub,
  addEventListener(){}, removeEventListener(){},
  ontouchstart: undefined,
  innerWidth:1280, innerHeight:720,
  devicePixelRatio:1,
  matchMedia:()=>({matches:false,addListener(){},removeListener(){}}),
};
const documentStub = {
  body:{classList:cls},
  documentElement:{classList:cls},
  head:{appendChild(){},insertBefore(){}},
  createElement:()=>({style:{},getContext(){return null;}, addEventListener(){}, appendChild(){}, setAttribute(){}, classList:cls}),
  getElementById:()=>null,
  querySelector:()=>null,
  querySelectorAll:()=>[],
  addEventListener(){}, removeEventListener(){},
};
const ctx = {
  window: windowStub, navigator: navigatorStub, document: documentStub,
  localStorage: localStorageStub,
  console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite,
  String, Number, Boolean, Array, Object, Error, Uint8Array, Uint8Array,
  Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array,
  Float64Array, ArrayBuffer, DataView, Map, Set, RegExp, Symbol,
  setTimeout, clearTimeout, setInterval, clearInterval,
  performance: { now: () => Date.now() },
};
ctx.globalThis = ctx;
// Surface stubs as real globals on the vm context.
vm.createContext(ctx, { name:'headless-gen' });

// ── 2. Load scripts in index.html order (only the generation-critical ones) ─
// The real world is 2416×128×2416 (~747M blocks) — far too big to build
// synchronously in Node within a test budget. We shrink the dimensions via an
// in-memory source edit of config.js ONLY (the real files are never touched)
// so every generation code path (climate/fbm2, terrain columns, floating
// isles, caves, large caves, ores, vegetation) still runs end-to-end on a tiny
// volume that completes in a couple seconds.
const SMALL_W = 160, SMALL_D = 160, SMALL_H = 64;
function loadFile(rel, opts){
  let src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  if (rel === 'js/core/config.js'){
    // Replace the dimension literals in the top-of-file const line. Keep SEA_LEVEL
    // small but >0 so water fill still exercises; cap below SMALL_H.
    src = src.replace(
      /const WORLD_W=2416,WORLD_H=128,WORLD_D=2416,/,
      `const WORLD_W=${SMALL_W},WORLD_H=${SMALL_H},WORLD_D=${SMALL_D},`
    );
    // SEA_LEVEL=40 sits > SMALL_H(64)/2; keep proportionate so oceans still form.
    src = src.replace(/,SEA_LEVEL=40,/, ',SEA_LEVEL=20,');
  }
  vm.runInContext(src, ctx, { filename: rel, displayErrors:true });
}
// worlds.js is loaded before config in index.html and defines WORLDS.
try { loadFile('js/ui/worlds.js'); } catch(e){ /* worlds.js may need more stubs; generation does not depend on it */ }
loadFile('js/core/config.js');
loadFile('js/core/noise.js');
// atlas.js defines atlas helpers used by structures/decorations; stub-safe to load.
try { loadFile('js/core/atlas.js'); } catch(e){ /* atlas may reference canvas/img; non-fatal for gen */ }
loadFile('js/world/world.js');
// structures.js defines placeStructures used by generateWorld; load it so the
// typeof check at the end of generateWorld resolves to a function.
try { loadFile('js/world/structures.js'); } catch(e){ console.warn('[warn] structures.js load issue (non-fatal):', e.message); }

// ── 3. Assertions on the wiring ──────────────────────────────────────────
const checks = [];
function check(name, cond){ checks.push({name, ok:!!cond}); }
// Helpers to read/write the script's own global bindings. Because config.js is
// "use strict", `let SEED`/`const world` create lexical-global bindings that are
// NOT properties of the vm context object — so `ctx.SEED=...` writes a separate
// shadow property the noise code never reads. The scripts themselves mutate
// SEED via bare `SEED=...` (e.g. loadActiveWorld), which hits the real binding;
// we mirror that by going through vm.runInContext.
function setGlobal(expr){ vm.runInContext(expr, ctx); }
function getGlobal(expr){ return vm.runInContext(expr, ctx); }

check('SEED global is a number', getGlobal('typeof SEED')==='number' && getGlobal('(SEED|0)===SEED'));
check('simplex2 defined', typeof ctx.simplex2==='function');
check('simplex3 defined', typeof ctx.simplex3==='function');
check('valueNoise retained (backward-compat)', typeof ctx.valueNoise==='function');
check('valueNoise3 retained (backward-compat)', typeof ctx.valueNoise3==='function');
check('fbm2 defined', typeof ctx.fbm2==='function');
check('generateWorld defined', typeof ctx.generateWorld==='function');
check('carveCaves defined', typeof ctx.carveCaves==='function');
check('generateTerrainColumns defined', typeof ctx.generateTerrainColumns==='function');

// Range sanity: simplex2/simplex3 in [0,1]
let r2ok=true, r3ok=true;
for(let i=0;i<5000;i++){
  const a=ctx.simplex2(i*0.13, i*0.27, 41);
  const b=ctx.simplex3(i*0.11, i*0.19, i*0.07, 71);
  if(!(a>=0&&a<=1))r2ok=false;
  if(!(b>=0&&b<=1))r3ok=false;
}
check('simplex2 output in [0,1]', r2ok);
check('simplex3 output in [0,1]', r3ok);

// Determinism: same SEED+coord → same value. Use NON-integer coords that do NOT
// skew onto an exact lattice vertex — at a vertex every offset is 0 so every
// gradient contribution is g·(0,0,0)=0 and the value is always exactly 0.5
// regardless of salt/SEED (expected simplex math, not a bug). Avoid coords whose
// (x+y+z)/3 skew makes all of (x+s,y+s,z+s) integral, e.g. (10.5,20.5,30.5).
setGlobal('SEED=424242');
const a1 = ctx.simplex2(123.4, 567.8, 41);
const a2 = ctx.simplex2(123.4, 567.8, 41);
const b1 = ctx.simplex3(17.3,29.7,41.1,71);
const b2 = ctx.simplex3(17.3,29.7,41.1,71);
check('simplex2 deterministic for fixed SEED', a1===a2);
check('simplex3 deterministic for fixed SEED', b1===b2);
// salt stream: different salt → different value (almost surely, off-vertex)
check('simplex2 salt produces different stream', ctx.simplex2(123.4,567.8,41)!==ctx.simplex2(123.4,567.8,999));
check('simplex3 salt produces different stream', ctx.simplex3(17.3,29.7,41.1,71)!==ctx.simplex3(17.3,29.7,41.1,999));
// SEED change: different value
setGlobal('SEED=999111');
check('simplex2 SEED-sensitive', a1!==ctx.simplex2(123.4,567.8,41));
check('simplex3 SEED-sensitive', b1!==ctx.simplex3(17.3,29.7,41.1,71));

// ── 4. Run the actual world generation ───────────────────────────────────
setGlobal('SEED=12345');    // fixed deterministic world (hits the real binding)
let genOk=false, genErr=null;
const t0 = Date.now();
try {
  ctx.generateWorld();
  genOk = true;
} catch(e){
  genErr = e;
}
const dt = Date.now() - t0;
check('generateWorld() completed without throwing', genOk);

// Read the generated world/maps through the script's own bindings.
const total = getGlobal('world.length');
let nonAir = 0;
if (total > 0) nonAir = getGlobal('(()=>{let n=0;for(let i=0;i<world.length;i++)if(world[i]!==0)n++;return n;})()');
const hasHeight = getGlobal('typeof heightMap!=="undefined" && heightMap.length>0');
const biomeCount = getGlobal('(()=>{if(typeof biomeMap==="undefined")return 0;const s=new Set();for(let i=0;i<biomeMap.length;i++)s.add(biomeMap[i]);return s.size;})()');
check('world Uint8Array exists', total>0);
check('terrain has non-air blocks', nonAir>0);
check('heightMap populated', hasHeight);
check('biomeMap has variety (>=3 biomes)', biomeCount>=3);

// ── 5. Report ────────────────────────────────────────────────────────────
let failed=0;
for(const c of checks){ if(!c.ok)failed++; console.log(`  [${c.ok?'PASS':'FAIL'}] ${c.name}`); }
console.log(`\nGeneration time: ${dt}ms | non-air blocks: ${nonAir} / ${total} | distinct biomes: ${biomeCount}`);
if (genErr){
  console.error('\ngenerateWorld threw:\n', genErr && genErr.stack || genErr);
}
console.log(`\n${failed===0?'ALL CHECKS PASSED':failed+' CHECK(S) FAILED'}`);
process.exit(failed===0 && genOk ? 0 : 1);
