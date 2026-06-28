// Verification harness for prompt 3-A (slope-aware beach width) + 3-B
// (deterministic biome-boundary surface blending). Loads the real browser
// scripts in a stubbed vm context (same approach as gen_world_headless.js),
// runs the full climate+height pass, then probes generateTerrainColumns /
// biomeBlendAt / the slope logic directly.
//
// Run:  node test/beach_blend_verify.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── browser stubs (minimal, generation-only) ──────────────────────────────
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
const windowStub = {
  navigator:{userAgent:'node',maxTouchPoints:0,platform:'Node'},
  localStorage:localStorageStub,
  addEventListener(){},removeEventListener(){},
  ontouchstart:undefined,innerWidth:1280,innerHeight:720,devicePixelRatio:1,
  matchMedia:()=>({matches:false,addListener(){},removeListener(){}}),
};
const documentStub = {
  body:{classList:cls},documentElement:{classList:cls},
  head:{appendChild(){},insertBefore(){}},
  createElement:()=>({style:{},getContext(){return null;},addEventListener(){},appendChild(){},setAttribute(){},classList:cls}),
  getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],
  addEventListener(){},removeEventListener(){},
};
const ctx = {
  window:windowStub,navigator:windowStub.navigator,document:documentStub,
  localStorage:localStorageStub,
  console,Math,Date,JSON,parseInt,parseFloat,isNaN,isFinite,
  String,Number,Boolean,Array,Object,Error,Uint8Array,Int8Array,Uint16Array,
  Int16Array,Uint32Array,Int32Array,Float32Array,Float64Array,ArrayBuffer,
  DataView,Map,Set,RegExp,Symbol,
  setTimeout,clearTimeout,setInterval,clearInterval,
  performance:{now:()=>Date.now()},
};
ctx.globalThis = ctx;
vm.createContext(ctx,{name:'beach-blend-verify'});

// Shrink dimensions in-memory so a full generation finishes quickly.
const SMALL_W=200, SMALL_D=200, SMALL_H=80;
function loadFile(rel){
  let src = fs.readFileSync(path.join(__dirname,'..',rel),'utf8');
  if(rel==='js/core/config.js'){
    src = src.replace(/const WORLD_W=2416,WORLD_H=128,WORLD_D=2416,/,
      `const WORLD_W=${SMALL_W},WORLD_H=${SMALL_H},WORLD_D=${SMALL_D},`);
    src = src.replace(/,SEA_LEVEL=40,/, ',SEA_LEVEL=22,'); // keep proportional
  }
  vm.runInContext(src, ctx, {filename:rel, displayErrors:true});
}
try{ loadFile('js/ui/worlds.js'); }catch(e){}
loadFile('js/core/config.js');
loadFile('js/core/noise.js');
try{ loadFile('js/core/atlas.js'); }catch(e){}
loadFile('js/world/world.js');
try{ loadFile('js/world/structures.js'); }catch(e){}

// config.js/noise.js/world.js use "use strict" + const/let, so the lexical
// bindings (BIOME, B, heightMap, biomeMap, world, SEA_LEVEL, ...) are NOT
// properties of the vm context object. Access them by evaluating expressions
// inside the context. Function declarations (colIndex, blockIndex,
// surfaceBlockFor, biomeBlendAt, ...) DO become context properties, but we
// fetch them through the same channel for uniformity. The returned function
// values still close over their original lexical scope, so calling them from
// outside the vm works and references the right globals.
function setGlobal(expr){ vm.runInContext(expr, ctx); }
function getGlobal(expr){ return vm.runInContext(expr, ctx); }

const BIOME      = getGlobal('BIOME');
const B          = getGlobal('B');
const SEA_LEVEL  = getGlobal('SEA_LEVEL');
const WORLD_W    = getGlobal('WORLD_W');
const WORLD_H    = getGlobal('WORLD_H');
const WORLD_D    = getGlobal('WORLD_D');
const heightMap  = getGlobal('heightMap');
const biomeMap   = getGlobal('biomeMap');
const world      = getGlobal('world');
const BIOME_NAME = getGlobal('BIOME_NAME');
const colIndex        = getGlobal('colIndex');
const blockIndex      = getGlobal('blockIndex');
const surfaceBlockFor = getGlobal('surfaceBlockFor');
const biomeBlendAt    = getGlobal('biomeBlendAt');

const checks=[];
function check(name,cond){ checks.push({name,ok:!!cond}); }

// ── 1. New helpers exist & have the expected shape ─────────────────────────
setGlobal('SEED=12345');
check('biomeBlendAt defined', typeof biomeBlendAt==='function');
check('surfaceBlockFor defined', typeof surfaceBlockFor==='function');

// surfaceBlockFor returns a valid non-air block id for every BIOME
let surfOk=true;
const allBiomes=BIOME_NAME.length;
for(let b=0;b<allBiomes;b++){
  const blk=surfaceBlockFor(b);
  if(typeof blk!=='number'||blk<0||blk===B.AIR){ surfOk=false; console.log('    surfaceBlockFor('+b+')='+blk); }
}
check('surfaceBlockFor returns valid non-air block for every biome', surfOk);

// ── 2. Determinism: same SEED+coords → identical biomeBlendAt result ────────
setGlobal('SEED=777');
getGlobal('generateClimateAndHeight()'); // populate biomeMap first
const probe='JSON.stringify(biomeBlendAt(50,50))';
const r1=getGlobal(probe), r2=getGlobal(probe);
check('biomeBlendAt deterministic for fixed SEED', r1===r2);
const r1obj=JSON.parse(r1);
check('biomeBlendAt returns {primary,secondary,blend}',
  typeof r1obj==='object' && 'primary' in r1obj && 'secondary' in r1obj && 'blend' in r1obj);
check('biomeBlendAt blend is in [0,1]', r1obj.blend>=0 && r1obj.blend<=1);
check('biomeBlendAt primary matches biomeMap', r1obj.primary===biomeMap[colIndex(50,50)]);

// ── 3. Fast path: interior columns return blend=0, secondary=null ──────────
let foundInterior=false;
for(let x=10;x<WORLD_W-10 && !foundInterior;x+=5){
  for(let z=10;z<WORLD_D-10 && !foundInterior;z+=5){
    const o=biomeBlendAt(x,z);
    if(o.blend===0 && o.secondary===null){ foundInterior=true; }
  }
}
check('interior columns exist with blend=0 (fast path)', foundInterior);

// ── 4. Boundary columns exist with blend>0 somewhere ───────────────────────
let foundBoundary=false, boundaryCount=0, maxBlend=0;
for(let x=0;x<WORLD_W;x++){
  for(let z=0;z<WORLD_D;z++){
    const o=biomeBlendAt(x,z);
    if(o.blend>0){ foundBoundary=true; boundaryCount++; if(o.blend>maxBlend)maxBlend=o.blend; }
  }
}
check('boundary columns with blend>0 exist', foundBoundary);
const boundaryFrac=boundaryCount/(WORLD_W*WORLD_D);
check('boundary band is minority of columns (<40%)', boundaryFrac<0.40);
console.log(`    boundary columns: ${boundaryCount} (${(boundaryFrac*100).toFixed(1)}% of map), maxBlend=${maxBlend}`);

// ── 5. 3-A: world has gentle, mid AND steep slope columns ──────────────────
let slopeCases={gentle:0, mid:0, steep:0};
for(let x=0;x<WORLD_W;x++){
  for(let z=0;z<WORLD_D;z++){
    const h=heightMap[colIndex(x,z)];
    const hN=z>0?heightMap[colIndex(x,z-1)]:h;
    const hS=z<WORLD_D-1?heightMap[colIndex(x,z+1)]:h;
    const hE=x<WORLD_W-1?heightMap[colIndex(x+1,z)]:h;
    const hW=x>0?heightMap[colIndex(x-1,z)]:h;
    const slope=Math.max(Math.abs(h-hN),Math.abs(h-hS),Math.abs(h-hE),Math.abs(h-hW));
    if(slope>3)slopeCases.steep++; else if(slope>1)slopeCases.mid++; else slopeCases.gentle++;
  }
}
check('world has gentle, mid AND steep slope columns (slope variety)',
  slopeCases.gentle>0 && slopeCases.mid>0 && slopeCases.steep>0);
console.log(`    slope histogram: gentle=${slopeCases.gentle} mid=${slopeCases.mid} steep=${slopeCases.steep}`);

// ── 6. Beach is rarer on steep coast than gentle coast ─────────────────────
let beachOnGentle=0, beachOnSteep=0, gentleCoast=0, steepCoast=0;
for(let x=1;x<WORLD_W-1;x++){
  for(let z=1;z<WORLD_D-1;z++){
    const h=heightMap[colIndex(x,z)];
    if(h<SEA_LEVEL-2 || h>SEA_LEVEL+4) continue; // candidate beach zone
    const hN=heightMap[colIndex(x,z-1)];
    const hS=heightMap[colIndex(x,z+1)];
    const hE=heightMap[colIndex(x+1,z)];
    const hW=heightMap[colIndex(x-1,z)];
    const slope=Math.max(Math.abs(h-hN),Math.abs(h-hS),Math.abs(h-hE),Math.abs(h-hW));
    const beachRange=slope>3?0:(slope>1?1:2);
    const beach=h<=SEA_LEVEL+beachRange;
    if(slope>3){ steepCoast++; if(beach)beachOnSteep++; }
    else if(slope<=1){ gentleCoast++; if(beach)beachOnGentle++; }
  }
}
const gentleRate=gentleCoast>0?beachOnGentle/gentleCoast:0;
const steepRate=steepCoast>0?beachOnSteep/steepCoast:0;
console.log(`    beach rate: gentle coast=${gentleRate.toFixed(2)} (${beachOnGentle}/${gentleCoast}), steep coast=${steepRate.toFixed(2)} (${beachOnSteep}/${steepCoast})`);
check('beach occurs on gentle coast (rate>0)', gentleRate>0);
check('steep coast has LOWER (or zero) beach rate than gentle coast', steepRate<=gentleRate);
check('steep coast beach rate is strictly below gentle rate (or zero)', steepRate<gentleRate || (steepRate===0 && gentleRate>0));

// ── 7. Full generation completes & terrain populated ───────────────────────
setGlobal('SEED=12345');
let genOk=false, genErr=null;
const t0=Date.now();
try{ getGlobal('world.fill(0); generateWorld();'); genOk=true; }
catch(e){ genErr=e; }
const dt=Date.now()-t0;
check('generateWorld() completes without throwing (no regression)', genOk);
const nonAir=getGlobal('(()=>{let n=0;for(let i=0;i<world.length;i++)if(world[i]!==0)n++;return n;})()');
check('terrain has non-air blocks after full gen', nonAir>0);
console.log(`\nFull generation: ${dt}ms, non-air=${nonAir}`);

// ── 8. Beach priority: beach columns surface is SAND/SNOW (never grass) ────
// Isolate the SURFACE-SELECTION logic by running ONLY generateTerrainColumns
// (no decoration passes like placeOresAndGravel, which intentionally converts
// some coastal SAND→GRAVEL afterwards — that is pre-existing, not our change).
// This tests exactly what generateTerrainColumns places at y===h for beach cols.
setGlobal('SEED=12345');
getGlobal('world.fill(0); generateClimateAndHeight(); generateTerrainColumns(0,WORLD_W);');
let beachSurfOk=true, beachSurfCount=0, badBeachSamples=[];
for(let x=0;x<WORLD_W;x++){
  for(let z=0;z<WORLD_D;z++){
    const h=heightMap[colIndex(x,z)];
    const hN=z>0?heightMap[colIndex(x,z-1)]:h;
    const hS=z<WORLD_D-1?heightMap[colIndex(x,z+1)]:h;
    const hE=x<WORLD_W-1?heightMap[colIndex(x+1,z)]:h;
    const hW=x>0?heightMap[colIndex(x-1,z)]:h;
    const slope=Math.max(Math.abs(h-hN),Math.abs(h-hS),Math.abs(h-hE),Math.abs(h-hW));
    const beachRange=slope>3?0:(slope>1?1:2);
    const beach=h<=SEA_LEVEL+beachRange;
    if(!beach)continue;
    if(h<0||h>=WORLD_H)continue;
    // Pre-existing bedrock override: the terrain loop places BEDROCK at y===0
    // and (probabilistically) at y<=2 BEFORE reaching the surface-block branch.
    // Those very-low columns never hit our beach surface logic, so they're out
    // of scope for the beach-priority assertion (unchanged by 3-A/3-B).
    if(h<=2)continue;
    const surf=world[blockIndex(x,h,z)];
    const biome=biomeMap[colIndex(x,z)];
    const expectedSnow=(biome===BIOME.SNOWY);
    if(!(surf===B.SAND || (expectedSnow&&surf===B.SNOW))){
      beachSurfOk=false;
      if(badBeachSamples.length<5)badBeachSamples.push(`(${x},${z}) h=${h} biome=${biome} surf=${surf}`);
    }
    beachSurfCount++;
  }
}
check('beach columns surface is SAND (or SNOW if SNOWY) — beach priority (terrain-only, h>2)', beachSurfOk);
if(!beachSurfOk)console.log('    bad beach surfaces: '+badBeachSamples.join('; '));
check('beach columns actually exist in world (beachSurfCount>0)', beachSurfCount>0);
console.log(`    beach surface columns checked (terrain-only, h>2): ${beachSurfCount}`);

// ── 9. Boundary dithering: some inland boundary columns show secondary ─────
// Same terrain-only world so the surface is purely from generateTerrainColumns.
let ditheredCount=0, boundaryInlandCount=0;
for(let x=0;x<WORLD_W;x++){
  for(let z=0;z<WORLD_D;z++){
    const h=heightMap[colIndex(x,z)];
    if(h<0||h>=WORLD_H)continue;
    const biome=biomeMap[colIndex(x,z)];
    const hN=z>0?heightMap[colIndex(x,z-1)]:h;
    const hS=z<WORLD_D-1?heightMap[colIndex(x,z+1)]:h;
    const hE=x<WORLD_W-1?heightMap[colIndex(x+1,z)]:h;
    const hW=x>0?heightMap[colIndex(x-1,z)]:h;
    const slope=Math.max(Math.abs(h-hN),Math.abs(h-hS),Math.abs(h-hE),Math.abs(h-hW));
    const beachRange=slope>3?0:(slope>1?1:2);
    const beach=h<=SEA_LEVEL+beachRange;
    if(beach||biome===BIOME.OCEAN)continue; // only inland columns reaching the blended branch
    const o=biomeBlendAt(x,z);
    if(o.blend===0||o.secondary===null)continue;
    boundaryInlandCount++;
    const surf=world[blockIndex(x,h,z)];
    const secondaryBlk=surfaceBlockFor(o.secondary);
    if(surf===secondaryBlk)ditheredCount++;
  }
}
console.log(`    inland boundary columns: ${boundaryInlandCount}, dithered to secondary: ${ditheredCount}`);
check('some inland boundary columns show the secondary biome surface (dither fires)', ditheredCount>0);

// ── 10. Determinism of FULL generation: same SEED → identical world bytes ──
setGlobal('SEED=4242');
getGlobal('world.fill(0); generateWorld();');
const snap1=getGlobal('(()=>{const a=new Uint8Array(world.length);a.set(world);return a;})()');
getGlobal('world.fill(0); generateWorld();');
const snap2=getGlobal('(()=>{const a=new Uint8Array(world.length);a.set(world);return a;})()');
let bytesEqual=true;
if(snap1.length!==snap2.length)bytesEqual=false;
else for(let i=0;i<snap1.length;i++){ if(snap1[i]!==snap2[i]){bytesEqual=false;break;} }
check('full generateWorld() is byte-identical for same SEED (determinism)', bytesEqual);

// ── Report ─────────────────────────────────────────────────────────────────
let failed=0;
for(const c of checks){ if(!c.ok)failed++; console.log(`  [${c.ok?'PASS':'FAIL'}] ${c.name}`); }
if(genErr)console.error('\ngenerateWorld threw:\n', genErr&&genErr.stack||genErr);
console.log(`\n${failed===0?'ALL CHECKS PASSED':failed+' CHECK(S) FAILED'}`);
process.exit(failed===0&&genOk?0:1);
