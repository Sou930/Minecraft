// Quantitative verification of the mountain terracing change.
// Loads the real generation scripts in a stubbed browser env (same harness as
// gen_world_headless.js), then drives heightAtRaw directly with *controlled*
// climate objects so we can isolate the MOUNTAINS (non-VOLCANO) branch, the
// VOLCANO branch, and a lowland branch, and measure whether the height output
// shows the expected discrete banding (terraces) only where intended.
//
// What we check:
//   A) MOUNTAINS high uplift (up -> 1): height quantises into ~terraceStep bands
//      -> a histogram of (h mod terraceStep) is strongly non-uniform (peaked
//         near 0 because round() snaps toward multiples of 7).
//   B) VOLCANO cone: same histogram is roughly uniform (no banding) — the cone
//      stays smooth. We assert the banding-strength metric is far below (A).
//   C) Lowland (plains-like, e<=0.5): NO banding present — the base/detail
//      rolling hills are unchanged. Banding metric near 0.
//   D) Terrace ramps with `up`: at low uplift (up=0.2) banding is weak, at
//      high uplift (up=0.9) banding is strong — monotonic increase.
//   E) MAX_STEP (5.6) < terraceStep (7): thermal erosion won't fully erase the
//      bands (the per-iteration step cap is smaller than the band width).
//
// Run:  node test/terrace_verify.js
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
vm.createContext(ctx, { name:'terrace-verify' });

// Small world so config loads cleanly (dimensions don't matter — we call
// heightAtRaw directly, not generateWorld).
const SMALL_W = 96, SMALL_D = 96, SMALL_H = 96;
function loadFile(rel){
  let src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  if (rel === 'js/core/config.js'){
    src = src.replace(/const WORLD_W=2416,WORLD_H=128,WORLD_D=2416,/,
      `const WORLD_W=${SMALL_W},WORLD_H=${SMALL_H},WORLD_D=${SMALL_D},`);
    src = src.replace(/,SEA_LEVEL=40,/, ',SEA_LEVEL=20,');
  }
  vm.runInContext(src, ctx, { filename: rel, displayErrors:true });
}
try { loadFile('js/ui/worlds.js'); } catch(e){}
loadFile('js/core/config.js');
loadFile('js/core/noise.js');
try { loadFile('js/core/atlas.js'); } catch(e){}
loadFile('js/world/world.js');

function setGlobal(expr){ vm.runInContext(expr, ctx); }
function getGlobal(expr){ return vm.runInContext(expr, ctx); }
setGlobal('SEED=12345');

// ── 2. Banding-strength metric ───────────────────────────────────────────
// Measure how strongly heights cluster at multiples of `step` using the MEAN
// distance to the nearest multiple of step. This is a direct, robust measure
// of how much the partial-snap blend pulls values toward the band grid:
//   * smooth/continuous field: (h mod step) ~ uniform on [0,step) -> distance
//     to nearest multiple ~ uniform on [0, step/2] -> mean ≈ step/4.
//   * fully snapped (round(h/step)*step): every value is exactly on a
//     multiple -> mean distance = 0.
//   * a w-fraction blend: distances scale by (1-w) -> mean ≈ (1-w)*step/4.
// So lower mean-distance = stronger banding. This catches partial blends that
// a narrow ±0.5 "snap ratio" window misses.
function meanDistToMultiple(heights, step){
  let sum = 0;
  for(const h of heights){
    const r = ((h % step) + step) % step;          // positive remainder
    sum += Math.min(r, step - r);                  // distance to nearest multiple
  }
  return sum / heights.length;
}

// ── 3. Sample heightAtRaw across a grid for a controlled climate ─────────
// We build a synthetic climate object so we hit exactly the branch we want,
// independent of climateAt's random field. The x/z grid still exercises the
// real fbm2/simplex noise inside heightAtRaw so the surface is genuinely
// "sampled", not constant.
function sampleHeights(climate, N){
  const out = new Array(N);
  // Spread samples across the small world area (and a bit beyond) so we get
  // independent noise lookups.
  for(let i=0;i<N;i++){
    const x = (i*97) % (SMALL_W*2);                 // pseudo-random-ish spread
    const z = ((i*61) % (SMALL_D*2));
    out[i] = getGlobal(`heightAtRaw(${x},${z},${climate})`);
  }
  return out;
}

const N = 4000;
const STEP = 7;
// Mean-distance baseline for a perfectly smooth field: (h mod step) is
// ~uniform on [0,step) -> distance to nearest multiple ~ uniform on [0,step/2]
// -> mean ≈ step/4. Lower measured mean = stronger banding.
const baseline = STEP / 4;

// MOUNTAINS high uplift: e high, NOT volcano (need t<=0.55 OR m>=0.50).
// Pick t=0.30, m=0.60 -> mountain branch, not volcano. up = (e-0.72)/0.28.
// To get up near 1, use e=0.99 -> up≈0.964.
const mtnHigh = sampleHeights("{temperature:0.30,moisture:0.60,continental:0.99,weirdness:0.50}", N);
const mtnHighDist = meanDistToMultiple(mtnHigh, STEP);

// MOUNTAINS low uplift (foothills): e=0.74 -> up≈0.071 -> terraceStrength 0
const mtnLow = sampleHeights("{temperature:0.30,moisture:0.60,continental:0.74,weirdness:0.50}", N);
const mtnLowDist = meanDistToMultiple(mtnLow, STEP);

// MOUNTAINS mid uplift: e=0.86 -> up=0.5 -> terraceStrength=(0.5-0.35)/0.65≈0.231
const mtnMid = sampleHeights("{temperature:0.30,moisture:0.60,continental:0.86,weirdness:0.50}", N);
const mtnMidDist = meanDistToMultiple(mtnMid, STEP);

// VOLCANO cone: e high, t>0.55, m<0.50 -> volcano branch (no terracing)
const volc = sampleHeights("{temperature:0.80,moisture:0.30,continental:0.99,weirdness:0.50}", N);
const volcDist = meanDistToMultiple(volc, STEP);

// LOWLAND plains-like: e in mid range, no special biome branch fires (we want
// the generic base+detail path). e=0.50, t=0.50, m=0.50, w=0.50.
const low = sampleHeights("{temperature:0.50,moisture:0.50,continental:0.50,weirdness:0.50}", N);
const lowDist = meanDistToMultiple(low, STEP);

// ── 4. Report & assertions ───────────────────────────────────────────────
const checks = [];
function check(name, cond){ checks.push({name, ok:!!cond}); }

console.log('Terrace banding (mean distance to nearest multiple of ' + STEP + ';');
console.log('  lower = stronger banding; smooth-field baseline ≈ ' + baseline.toFixed(3) + '):');
console.log('  MOUNTAINS high uplift (up≈0.96): ' + mtnHighDist.toFixed(3));
console.log('  MOUNTAINS mid  uplift (up≈0.50): ' + mtnMidDist.toFixed(3));
console.log('  MOUNTAINS low  uplift (up≈0.07): ' + mtnLowDist.toFixed(3));
console.log('  VOLCANO cone            (up≈0.96): ' + volcDist.toFixed(3));
console.log('  LOWLAND plains-like     (e=0.50) : ' + lowDist.toFixed(3));

// A) High mountains show clear banding: mean distance well below smooth
//    baseline. The blend is intentionally gentle (cap ~55% snap, per the
//    "6割程度のブレンド" design note), and the post-terrace canyon/river
//    passes add continuous variation that partly dilutes the grid signal, so
//    we expect the mean distance to drop to roughly ~0.78*baseline rather than
//    collapse toward 0. A < 0.85*baseline threshold confirms real banding.
check('MOUNTAINS high uplift shows terrace banding (mean dist < 0.85*baseline)',
  mtnHighDist < baseline * 0.85);
// B) Volcano is smooth — mean distance near baseline, and clearly above the
//    banded mountain case (both sampled at the same high uplift, so the only
//    difference is the terracing code path).
check('VOLCANO cone stays smooth (mean dist near baseline)',
  volcDist > baseline * 0.90);
check('VOLCANO banding clearly weaker than MOUNTAINS high banding',
  mtnHighDist < volcDist * 0.88);
// C) Lowland has no banding (mean distance near baseline)
check('LOWLAND plains has no unintended terraces (mean dist near baseline)',
  lowDist > baseline * 0.90);
// D) Monotonic ramp with up: low >= mid >= high (banding grows with uplift,
//    so mean distance shrinks)
check('Terracing ramps with uplift (low >= mid >= high)',
  mtnLowDist >= mtnMidDist - 0.05 && mtnMidDist >= mtnHighDist - 0.05);
check('Foothills (low uplift) essentially un-banded',
  mtnLowDist > baseline * 0.95);

// E) MAX_STEP < terraceStep so thermal erosion won't fully erase bands
const maxStep = getGlobal('typeof MAX_STEP!=="undefined"?MAX_STEP:null');
// MAX_STEP is local to generateClimateAndHeight; re-derive from source to be safe.
const src = fs.readFileSync(path.join(__dirname,'..','js','world','world.js'),'utf8');
const msMatch = src.match(/MAX_STEP=([0-9.]+)/);
const maxStepVal = msMatch ? parseFloat(msMatch[1]) : null;
console.log('  MAX_STEP (thermal erosion): ' + maxStepVal + ' | terraceStep: ' + STEP);
check('MAX_STEP parsed from source', maxStepVal !== null);
check('MAX_STEP < terraceStep (erosion won\'t fully erase bands)',
  maxStepVal !== null && maxStepVal < STEP);
// Also ensure MAX_STEP isn't so large that bands survive trivially but erosion
// is neutered elsewhere — just confirm it's within a sane band of the step.
check('MAX_STEP within sane range (>= step*0.5)',
  maxStepVal !== null && maxStepVal >= STEP*0.5);

let failed = 0;
for(const c of checks){ if(!c.ok)failed++; console.log(`  [${c.ok?'PASS':'FAIL'}] ${c.name}`); }
console.log(`\n${failed===0?'ALL CHECKS PASSED':failed+' CHECK(S) FAILED'}`);
process.exit(failed===0 ? 0 : 1);
