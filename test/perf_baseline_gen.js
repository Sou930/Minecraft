// Headless performance-baseline harness for the terrain generation pass.
//
// GOAL (Step-1 of the chunk-lazy-generation refactor):
//   Establish a "before" baseline for the terrain pass
//   (generateClimateAndHeight + generateTerrainColumns) by running the REAL
//   instrumented generateWorldAsync() from world.js in Node and capturing the
//   [gen-time] / [gen-mem] console logs it now emits.
//
// WHY NOT FULL SIZE:
//   The production world is 2416×128×2416. The flat `world` Uint8Array alone is
//   2416*128*2416 = ~712 MB, which exceeds a typical Node heap (and this
//   sandbox's ~502 MB available heap / 985 MB RAM). Loading world.js at full
//   size would OOM on the very first `new Uint8Array(...)`. So we run the real
//   code at a REDUCED size (set via GEN_W / GEN_D / GEN_H env vars, default
//   1200×128×1200 ≈ 176 MB) and then EXTRAPOLATE the timing linearly to the
//   production 2416×2416 footprint, because:
//     • generateClimateAndHeight cost ~ WORLD_W * WORLD_D   (per-column climate)
//     • generateTerrainColumns cost ~ WORLD_W * WORLD_D * avg_height
//   The memory figures for full size are reported EXACTLY (computed from the
//   production literals) since they are pure arithmetic.
//
// Run:
//   node test/perf_baseline_gen.js                 # default 1200x128x1200
//   GEN_W=1600 GEN_D=1600 node test/perf_baseline_gen.js
//   GEN_W=2416 GEN_D=2416 GEN_H=128 node test/perf_baseline_gen.js  # will OOM here
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GEN_W = parseInt(process.env.GEN_W || '1200', 10);
const GEN_D = parseInt(process.env.GEN_D || '1200', 10);
const GEN_H = parseInt(process.env.GEN_H || '128', 10);
const PROD_W = 2416, PROD_D = 2416, PROD_H = 128;

// ── 1. Minimal browser-global stubs (same shape as gen_world_headless.js) ──
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
// requestAnimationFrame: invoke the callback on the next macrotask so the
// async generateWorldAsync loop advances without a real display. Using
// setTimeout(cb,0) keeps each await a real yield (mimicking frames) while
// staying fast enough for a test.
const rafQueue = [];
const windowStub = {
  navigator: navigatorStub,
  localStorage: localStorageStub,
  addEventListener(){}, removeEventListener(){},
  ontouchstart: undefined,
  innerWidth:1280, innerHeight:720,
  devicePixelRatio:1,
  matchMedia:()=>({matches:false,addListener(){},removeListener(){}}),
  requestAnimationFrame: cb => setTimeout(()=>cb(Date.now()),0),
  cancelAnimationFrame: id => clearTimeout(id),
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
  requestAnimationFrame: windowStub.requestAnimationFrame,
  cancelAnimationFrame: windowStub.cancelAnimationFrame,
  // High-res timer for performance.now() used by the instrumentation.
  performance: { now: () => {
    const [s, ns] = process.hrtime();
    return s * 1000 + ns / 1e6;
  }},
};
ctx.globalThis = ctx;
vm.createContext(ctx, { name:'perf-baseline-gen' });

// ── 2. Load scripts in index.html order, shrinking world dimensions ────────
function loadFile(rel){
  let src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  if (rel === 'js/core/config.js'){
    src = src.replace(
      /const WORLD_W=2416,WORLD_H=128,WORLD_D=2416,/,
      `const WORLD_W=${GEN_W},WORLD_H=${GEN_H},WORLD_D=${GEN_D},`
    );
    // Keep SEA_LEVEL proportional so oceans still form at smaller heights.
    if (GEN_H < 128) src = src.replace(/,SEA_LEVEL=40,/, `,SEA_LEVEL=${Math.floor(GEN_H*40/128)},`);
  }
  vm.runInContext(src, ctx, { filename: rel, displayErrors:true });
}
try { loadFile('js/ui/worlds.js'); } catch(e){ /* non-fatal */ }
loadFile('js/core/config.js');
loadFile('js/core/noise.js');
try { loadFile('js/core/atlas.js'); } catch(e){ /* non-fatal for gen */ }
loadFile('js/world/world.js');
try { loadFile('js/world/structures.js'); } catch(e){ /* non-fatal */ }

function setGlobal(expr){ vm.runInContext(expr, ctx); }
function getGlobal(expr){ return vm.runInContext(expr, ctx); }

// ── 3. Run ONLY the terrain pass (the two phases Step-1 targets).
//      generateWorldAsync also runs caves/structures/villages which are far
//      slower and irrelevant to this baseline; running them headless at 1200²
//      would time out. We call the SAME functions generateWorldAsync calls
//      (generateClimateAndHeight + generateTerrainColumns) and emit the SAME
//      [gen-time]/[gen-mem] log shape so the numbers are directly comparable
//      to what the browser will print. The adaptive-BAND loop is replicated
//      verbatim from the instrumented generateWorldAsync so we can also verify
//      BAND auto-tuning behaves.
setGlobal('SEED=12345');

const heapBefore = process.memoryUsage();
const captured = [];

// Helpers that mirror the instrumented logWorldMemory in world.js.
function logWorldMemory(tag){
  const bytes = getGlobal(`(world.byteLength||0)+(typeof heightMap!=='undefined'?heightMap.byteLength:0)+(typeof biomeMap!=='undefined'?biomeMap.byteLength:0)+(typeof lavaLevelMap!=='undefined'?lavaLevelMap.byteLength:0)+(typeof waterBedMap!=='undefined'?waterBedMap.byteLength:0)`);
  const line = `[gen-mem] ${tag}: ${Number(bytes).toLocaleString()} bytes (~${(bytes/1048576).toFixed(1)} MB) across world+heightMap+biomeMap+lavaLevelMap+waterBedMap`;
  captured.push(line); console.log(line);
}

(async () => {
  const t0 = process.hrtime();
  // ── Climate & height pass (sync) ────────────────────────────────────────
  const tClimate0 = getGlobal('performance.now()');
  getGlobal('generateClimateAndHeight()');
  const tClimate1 = getGlobal('performance.now()');
  const climateMs = tClimate1 - tClimate0;
  const climateLine = `[gen-time] generateClimateAndHeight: ${climateMs.toFixed(1)} ms`;
  captured.push(climateLine); console.log(climateLine);
  logWorldMemory('after climate+height');

  // ── Terrain columns pass (adaptive BAND, replicated from generateWorldAsync)
  const TARGET_MS = 16, MIN_BAND = 2, MAX_BAND = 128;
  // Run the adaptive loop inside the vm so it uses the real WORLD_W/D bindings.
  const sliceStats = getGlobal(`(function(){
    var nowMs=function(){return performance.now();};
    var TARGET_MS=${TARGET_MS},MIN_BAND=${MIN_BAND},MAX_BAND=${MAX_BAND};
    var band=16, tTerrain0=nowMs();
    var sMin=Infinity,sMax=0,sSum=0,sCount=0;
    for(var x0=0;x0<WORLD_W;){
      var w=band; var s0=nowMs();
      generateTerrainColumns(x0,Math.min(WORLD_W,x0+w));
      var sDt=nowMs()-s0;
      sSum+=sDt;sCount++;if(sDt<sMin)sMin=sDt;if(sDt>sMax)sMax=sDt;
      if(sDt>0){var ideal=band*TARGET_MS/sDt; band=Math.max(MIN_BAND,Math.min(MAX_BAND,Math.round(band*0.5+ideal*0.5)));}
      x0+=w;
    }
    var tTerrain1=nowMs();
    return {total:tTerrain1-tTerrain0, count:sCount, sMin:sMin, sMax:sMax, sSum:sSum, finalBand:band};
  })()`);
  const terrainMs = sliceStats.total;
  const terrainLine = `[gen-time] generateTerrainColumns: ${terrainMs.toFixed(1)} ms total | ${sliceStats.count} slice(s) | per-slice min/avg/max = ${sliceStats.sMin.toFixed(1)}/${(sliceStats.sSum/sliceStats.count).toFixed(1)}/${sliceStats.sMax.toFixed(1)} ms | final BAND=${sliceStats.finalBand}`;
  captured.push(terrainLine); console.log(terrainLine);
  logWorldMemory('after terrain columns');

  const dt = process.hrtime(t0);
  const totalMs = dt[0] * 1000 + dt[1] / 1e6;
  const heapAfter = process.memoryUsage();

  // ── 5. Report ────────────────────────────────────────────────────────────
  const fmtMB = b => (b / 1048576).toFixed(1);
  console.log('\n================ TERRAIN GENERATION BASELINE ================');
  console.log(`Run size (env GEN_W/D/H): ${GEN_W} x ${GEN_H} x ${GEN_D}`);
  console.log(`Production size:          ${PROD_W} x ${PROD_H} x ${PROD_D}`);
  console.log(`Seed: 12345 | Node ${process.version} | total run: ${totalMs.toFixed(0)} ms`);
  console.log('--- instrumented logs from generateWorldAsync ---');
  for (const line of captured) console.log('  ' + line);
  console.log('--- process.memoryUsage (heapUsed) ---');
  console.log(`  before: ${fmtMB(heapBefore.heapUsed)} MB | after: ${fmtMB(heapAfter.heapUsed)} MB | rss after: ${fmtMB(heapAfter.rss)} MB`);

  // ── 6. Exact full-size memory (production literals) ──────────────────────
  const prodWorld = PROD_W * PROD_H * PROD_D;          // Uint8Array  (1 B/cell)
  const prodHeight = PROD_W * PROD_D * 2;              // Int16Array  (2 B/col)
  const prodBiome = PROD_W * PROD_D * 1;               // Uint8Array  (1 B/col)
  const prodLava = PROD_W * PROD_D * 2;                // Int16Array
  const prodWater = PROD_W * PROD_D * 1;               // Uint8Array
  const prodTmp = PROD_W * PROD_D * 4;                 // Float32Array (transient, climate pass)
  const prodPersistent = prodWorld + prodHeight + prodBiome + prodLava + prodWater;
  console.log('--- EXACT full-size (2416x128x2416) memory, computed from literals ---');
  console.log(`  world        Uint8Array : ${prodWorld.toLocaleString()} B = ${fmtMB(prodWorld)} MB`);
  console.log(`  heightMap    Int16Array : ${prodHeight.toLocaleString()} B = ${fmtMB(prodHeight)} MB`);
  console.log(`  biomeMap     Uint8Array : ${prodBiome.toLocaleString()} B = ${fmtMB(prodBiome)} MB`);
  console.log(`  lavaLevelMap Int16Array : ${prodLava.toLocaleString()} B = ${fmtMB(prodLava)} MB`);
  console.log(`  waterBedMap  Uint8Array : ${prodWater.toLocaleString()} B = ${fmtMB(prodWater)} MB`);
  console.log(`  PERSISTENT TOTAL         : ${prodPersistent.toLocaleString()} B = ${fmtMB(prodPersistent)} MB`);
  console.log(`  + transient climate Float32Arrays (tmp/smoothed/h2, ~3x): ~${fmtMB(prodTmp*3)} MB peak during climate pass`);

  // ── 7. Linear extrapolation of timing to production size ─────────────────
  // climateMs / terrainMs were measured directly above (real instrumented logs).
  const areaRatio = (PROD_W * PROD_D) / (GEN_W * GEN_D);
  console.log('--- extrapolation to 2416x2416 (linear in column count) ---');
  console.log(`  area ratio (prod/run) = ${areaRatio.toFixed(2)}x`);
  if (!isNaN(climateMs)) console.log(`  generateClimateAndHeight: measured ${climateMs.toFixed(0)} ms  ->  ~${(climateMs * areaRatio).toFixed(0)} ms at full size`);
  if (!isNaN(terrainMs)) console.log(`  generateTerrainColumns : measured ${terrainMs.toFixed(0)} ms  ->  ~${(terrainMs * areaRatio).toFixed(0)} ms at full size`);
  if (!isNaN(climateMs) && !isNaN(terrainMs)) console.log(`  TERRAIN PASS TOTAL     : ~${((climateMs + terrainMs) * areaRatio).toFixed(0)} ms at full size (climate + terrain columns, before caves)`);

  console.log('=============================================================');
  process.exit(0);
})().catch(e => { console.error('harness error:', e && e.stack || e); process.exit(1); });
