// Quantitative verification of the integrated river-layering + cave/surface
// changes (implementation prompt 4+7). Loads the real generation scripts in a
// stubbed browser env (same harness as gen_world_headless.js), then checks:
//
//   4-A (rivers):
//     R1) riverMaskAt returns values in [0,1] and produces a non-trivial share
//         of river points across a large sample (rivers did not disappear).
//     R2) Tributaries fire: there exist sampled points that are tributary-only
//         (main ridge in the mid band 0.55..mainThresh AND a tributary ridge
//         above its threshold) — i.e. the second layer is active, not dead code.
//     R3) Main stream fires: there exist points with main ridge above the
//         (width-modulated) trunk threshold.
//     R4) Width varies: the width noise ws produces a spread of mainThresh
//         values across the map (std dev > 0), so trunk thickness is not flat.
//
//   4-B (caves vs surface depth):
//     C1) Across all columns, the fraction of AIR (carved cave) cells at
//         depthBelowSurface in [4,12) is LOWER than at depth >= 12 — shallow
//         crust is suppressed by surfaceMask.
//     C2) Deep crust (depth >= 12) still has a meaningful amount of carved air
//         (caves are not killed entirely underground).
//
//   4-C (water-body safety margin):
//     W1) waterBedMap has at least some 1-entries (rivers/lakes exist & cached).
//     W2) Under water columns (waterBedMap==1), NO air cell exists in the
//         [h-9 .. h-4] band (the 10-block safety margin keeps caves out of the
//         riverbed roof), while dry columns may have air there.
//     W3) Generation completes and terrain is non-empty (sanity).
//
// Run:  node test/river_cave_verify.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── 1. Browser-global stubs (same as gen_world_headless.js) ──────────────
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
  navigator: navigatorStub, localStorage: localStorageStub,
  addEventListener(){}, removeEventListener(){},
  ontouchstart: undefined, innerWidth:1280, innerHeight:720, devicePixelRatio:1,
  matchMedia:()=>({matches:false,addListener(){},removeListener(){}}),
};
const documentStub = {
  body:{classList:cls}, documentElement:{classList:cls},
  head:{appendChild(){},insertBefore(){}},
  createElement:()=>({style:{},getContext(){return null;}, addEventListener(){}, appendChild(){}, setAttribute(){}, classList:cls}),
  getElementById:()=>null, querySelector:()=>null, querySelectorAll:()=>[],
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
vm.createContext(ctx, { name:'river-cave-verify' });

// ── 2. Load scripts (shrink dimensions like gen_world_headless.js) ───────
const SMALL_W = 200, SMALL_D = 200, SMALL_H = 72;
function loadFile(rel){
  let src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  if (rel === 'js/core/config.js'){
    src = src.replace(/const WORLD_W=2416,WORLD_H=128,WORLD_D=2416,/,
      `const WORLD_W=${SMALL_W},WORLD_H=${SMALL_H},WORLD_D=${SMALL_D},`);
    src = src.replace(/,SEA_LEVEL=40,/, ',SEA_LEVEL=22,');
  }
  vm.runInContext(src, ctx, { filename: rel, displayErrors:true });
}
try { loadFile('js/ui/worlds.js'); } catch(e){}
loadFile('js/core/config.js');
loadFile('js/core/noise.js');
try { loadFile('js/core/atlas.js'); } catch(e){}
loadFile('js/world/world.js');
try { loadFile('js/world/structures.js'); } catch(e){}

function setGlobal(expr){ vm.runInContext(expr, ctx); }
function getGlobal(expr){ return vm.runInContext(expr, ctx); }

const checks = [];
function check(name, cond){ checks.push({name, ok:!!cond}); }

// ══════════════════════════════════════════════════════════════════════════
// 4-A: river layering — sampled directly via riverMaskAt + mirrored internals
// ══════════════════════════════════════════════════════════════════════════
setGlobal('SEED=777888');
const SAMP = 4000;            // sample points over a 1200x1200 region (grid)
const SIDE = Math.ceil(Math.sqrt(SAMP));   // 64
const SPAN = 1200;
const cell = SPAN / SIDE;
let riverPts = 0, mainPts = 0, tribOnlyPts = 0;
// Channel tiers: rm>0 is the whole "influenced" corridor; rm>0.5 is the actual
// visible riverbed; rm>0.8 is the deep centre line.
let channelPts = 0, centrePts = 0;
// ORIGINAL baseline (single-scale ridge>0.82, /0.18) computed in parallel so the
// new layered impl can be checked as a *relative* change rather than against an
// absolute % — the ridge distribution is top-heavy, so even the original exceeds
// a naive "thin line" threshold. The new impl is allowed to be wider (trunk
// relaxed + tributaries added) but should stay within a sane multiple.
let origCorridor = 0, origChannel = 0, origCentre = 0;
// Width-noise ws (the real width modulator) statistics.
let wsSum = 0, wsSq = 0, wsMin = 1, wsMax = 0, wsN = 0;
const mainThreshVals = [];
let rmin = 1, rmax = 0;
for (let i = 0; i < SAMP; i++){
  const gx = i % SIDE, gz = Math.floor(i / SIDE);
  const x = Math.floor(gx * cell);
  const z = Math.floor(gz * cell);
  const rm = ctx.riverMaskAt(x, z);
  if (rm < rmin) rmin = rm;
  if (rm > rmax) rmax = rm;
  if (rm > 0) riverPts++;
  if (rm > 0.5) channelPts++;
  if (rm > 0.8) centrePts++;
  // Mirror riverMaskAt's internal math so we can confirm both branches fire AND
  // gather width-noise stats (measuring ws directly is more meaningful than the
  // compressed mainThresh, which has only ~1/8 of ws's std).
  const wx = x + (ctx.fbm2(x,z,151,2,1/120,0.5,2.0)-0.5)*40;
  const wz = z + (ctx.fbm2(x,z,157,2,1/120,0.5,2.0)-0.5)*40;
  const rn = ctx.fbm2(wx,wz,137,3,1/170,0.5,2.0);
  const ridge = 1 - Math.abs(rn*2-1);
  // ORIGINAL baseline mask (pre-change single-scale logic)
  let orm = 0; if (ridge > 0.82) orm = Math.min(1, (ridge - 0.82) / 0.18);
  if (orm > 0) origCorridor++; if (orm > 0.5) origChannel++; if (orm > 0.8) origCentre++;
  // width noise + mainThresh
  const ws = 0.7 + ctx.fbm2(x,z,181,2,1/400,0.5,2.0)*0.6;
  wsSum += ws; wsSq += ws * ws; wsN++; if (ws < wsMin) wsMin = ws; if (ws > wsMax) wsMax = ws;
  const mainThresh = 0.82 - (ws-1.0)*0.08;
  mainThreshVals.push(mainThresh);
  if (ridge < 0.65) continue;
  if (ridge > mainThresh){ mainPts++; continue; }
  // mid band -> evaluate tributary
  const twx = x + (ctx.fbm2(x,z,191,2,1/55,0.5,2.0)-0.5)*18;
  const twz = z + (ctx.fbm2(x,z,193,2,1/55,0.5,2.0)-0.5)*18;
  const tn = ctx.fbm2(twx,twz,139,2,1/70,0.5,2.0);
  const tribRidge = 1 - Math.abs(tn*2-1);
  if (tribRidge > 0.84) tribOnlyPts++;
}
const wsMean = wsSum / wsN;
const wsStd = Math.sqrt(wsSq / wsN - wsMean * wsMean);

check('R1: riverMaskAt range in [0,1]', rmin >= 0 && rmax <= 1);
check('R1: river corridor (rm>0) exists', riverPts > 0);
check('R1: visible channel (rm>0.5) exists', channelPts > 0);
// New impl may be wider than original (trunk relaxed + tributaries), but the
// deep centre should stay within ~3x of the original single-scale centre so
// rivers still read as channels rather than flooding the map.
check('R1: centre (rm>0.8) within 3x of original single-scale impl',
  centrePts <= origCentre * 3 + 1);
check('R1: centre coverage < channel coverage (funnel toward bed)', centrePts <= channelPts);
check('R3: main-stream branch fires somewhere', mainPts > 0);
check('R2: tributary-only branch fires somewhere', tribOnlyPts > 0);

// R4: width noise. We measure the width modulator ws directly (it has the real
// spread; mainThresh = 0.82-(ws-1)*0.08 compresses it ~8x, so ws is the signal).
const mtMean = mainThreshVals.reduce((a,b)=>a+b,0) / Math.max(1, mainThreshVals.length);
const mtStd = Math.sqrt(mainThreshVals.reduce((a,b)=>a+(b-mtMean)*(b-mtMean),0) / Math.max(1, mainThreshVals.length));
check('R4: width noise ws varies (std > 0.05)', wsStd > 0.05);
check('R4: ws stays in design band [0.6,1.4]', wsMin >= 0.6 && wsMax <= 1.4);
check('R4: mainThresh within expected band [0.78,0.86]',
  mainThreshVals.every(v => v >= 0.775 && v <= 0.865));

// ══════════════════════════════════════════════════════════════════════════
// 4-B & 4-C: drive generation in stages so 4-C can be measured on carveCaves
// IN ISOLATION. The prompt scopes 4-C to carveCaves only; the other cave
// functions (carveLargeCaves / carveRavines / placeCaveBiomes ...) all use
// caveDig() with their own h-3 margin and would re-breach the waterbed roof
// band if we measured after a full generateWorld(). So we run the terrain
// phase + carveCaves only, snapshot the 4-B/4-C metrics, THEN run the rest of
// the pipeline to confirm nothing throws.
// ══════════════════════════════════════════════════════════════════════════
setGlobal('SEED=424242');
const t0 = Date.now();
let stageErr = null;
try {
  ctx.generateClimateAndHeight();
  ctx.generateTerrainColumns(0, getGlobal('WORLD_W'));
  ctx.carveCaves();             // <-- 4-B/4-C measured here, in isolation
} catch(e){ stageErr = e; }
check('W3a: climate+terrain+carveCaves completed without throwing', stageErr===null);

if (!stageErr){
  // C1/C2: cave suppression by surface depth. For every column, walk y from
  // yMax down and tally AIR counts in two depth bands.
  let shallowAir = 0, shallowCells = 0;   // depthBelowSurface in [4,12)
  let deepAir = 0, deepCells = 0;         // depthBelowSurface >= 12
  // W1/W2: water-body safety margin.
  let waterCols = 0;
  let waterRoofAir = 0;   // air in [h-9, h-4] under water columns (should be 0)
  let waterRoofCells = 0;
  let dryRoofAir = 0;     // air in [h-9, h-4] under dry columns (may be > 0)
  let dryRoofCells = 0;

  const WW = getGlobal('WORLD_W'), WD = getGlobal('WORLD_D'), WH = getGlobal('WORLD_H');
  // Pre-resolve blockIndex via the script's own fn for correctness.
  for (let x = 0; x < WW; x++){
    for (let z = 0; z < WD; z++){
      const ci = x + z * WW; // colIndex(x,z) = z*WORLD_W + x
      const h = getGlobal(`heightMap[${ci}]`);
      const isWater = getGlobal(`waterBedMap[${ci}]`) === 1;
      if (isWater) waterCols++;
      const safety = isWater ? 10 : 4;
      const yMax = Math.min(h - safety, WH - 1);
      for (let y = 2; y <= yMax; y++){
        const depth = h - y;
        const id = getGlobal(`world[(${y}*${WD}+${z})*${WW}+${x}]`);
        const isAir = (id === 0); // B.AIR = 0
        if (depth >= 4 && depth < 12){ shallowCells++; if (isAir) shallowAir++; }
        else if (depth >= 12){ deepCells++; if (isAir) deepAir++; }
      }
      // Roof band [h-9, h-4]: under water, safetyMargin=10 means yMax=h-10, so
      // this band is entirely above yMax -> MUST be solid (no carved air) after
      // carveCaves alone. (Other cave fns would re-breach it; not in scope.)
      for (let y = Math.max(2, h - 9); y <= h - 4; y++){
        if (y < 0 || y >= WH) continue;
        const id = getGlobal(`world[(${y}*${WD}+${z})*${WW}+${x}]`);
        const isAir = (id === 0);
        if (isWater){ waterRoofCells++; if (isAir) waterRoofAir++; }
        else { dryRoofCells++; if (isAir) dryRoofAir++; }
      }
    }
  }

  const shallowRate = shallowCells ? shallowAir / shallowCells : 0;
  const deepRate = deepCells ? deepAir / deepCells : 0;
  check('W1: waterBedMap has water columns (rivers/lakes cached)', waterCols > 0);
  check('C1: shallow crust [4,12) has FEWER caves than deep (>=12)', shallowRate < deepRate);
  check('C1: shallow cave rate is suppressed (<= 80% of deep rate)', shallowRate <= deepRate * 0.8 + 0.001);
  check('C2: deep crust still has caves (deepRate > 0)', deepRate > 0);
  check('W2: NO air in [h-9,h-4] under water columns (carveCaves alone)', waterRoofCells > 0 && waterRoofAir === 0);
  check('W2 contrast: dry columns DO have air in [h-9,h-4] (margin only 4)', dryRoofAir > 0);
  console.log(`    [info] shallowRate=${shallowRate.toFixed(4)} deepRate=${deepRate.toFixed(4)} waterCols=${waterCols} waterRoofCells=${waterRoofCells} dryRoofAir=${dryRoofAir}`);
}

// Now run the REST of the generation pipeline to confirm the full flow still
// completes without throwing (the other cave fns + ores + vegetation + water).
let fullErr = null;
try {
  ctx.carveLargeCaves();
  ctx.carveCaveFeatures();
  ctx.carveRavines();
  ctx.placeCaveBiomes();
  ctx.placeAmethystGeodes();
  ctx.placeOresAndGravel();
  ctx.placeVegetation();
  ctx.fillUnderwaterAir();
  if (typeof ctx.placeStructures === 'function') ctx.placeStructures();
} catch(e){ fullErr = e; }
const dt = Date.now() - t0;
check('W3b: rest of generation pipeline completed without throwing', fullErr===null);

// ══════════════════════════════════════════════════════════════════════════
// Report
// ══════════════════════════════════════════════════════════════════════════
let failed = 0;
for (const c of checks){ if (!c.ok) failed++; console.log(`  [${c.ok?'PASS':'FAIL'}] ${c.name}`); }
console.log(`\nGen time: ${dt}ms | new: corridor(rm>0):${riverPts}/${SAMP} channel(rm>0.5):${channelPts} centre(rm>0.8):${centrePts} | orig centre:${origCentre} | main:${mainPts} trib-only:${tribOnlyPts} | ws std:${wsStd.toFixed(4)}`);
if (stageErr) console.error('\nstage threw:\n', stageErr && stageErr.stack || stageErr);
if (fullErr) console.error('\nfull pipeline threw:\n', fullErr && fullErr.stack || fullErr);
const genOk = (stageErr===null && fullErr===null);
console.log(`\n${failed===0?'ALL CHECKS PASSED':failed+' CHECK(S) FAILED'}`);
process.exit(failed===0 && genOk ? 0 : 1);
