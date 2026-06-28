function mulberry32(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function hash2i(x,z,salt){let n=(Math.imul(x,374761393)+Math.imul(z,668265263)+Math.imul(SEED+(salt|0),987654071))|0;n=Math.imul(n^(n>>>13),1274126177);n^=n>>>16;return n>>>0;}
function hash2(x,z,salt){return hash2i(x,z,salt)/4294967296;}
function smoothstep(t){return t*t*(3-2*t);}
function valueNoise(x,z,salt){const xi=Math.floor(x),zi=Math.floor(z);const xf=x-xi,zf=z-zi;const a=hash2(xi,zi,salt),b=hash2(xi+1,zi,salt);const c=hash2(xi,zi+1,salt),d=hash2(xi+1,zi+1,salt);const u=smoothstep(xf),v=smoothstep(zf);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function hash3i(x,y,z,salt){let n=(Math.imul(x,374761393)+Math.imul(y,217645177)+Math.imul(z,668265263)+Math.imul(SEED+(salt|0),987654071))|0;n=Math.imul(n^(n>>>13),1274126177);n^=n>>>16;return n>>>0;}
function hash3(x,y,z,salt){return hash3i(x,y,z,salt)/4294967296;}
function lerp(a,b,t){return a+(b-a)*t;}
function valueNoise3(x,y,z,salt){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);const u=smoothstep(x-xi),v=smoothstep(y-yi),w=smoothstep(z-zi);const c000=hash3(xi,yi,zi,salt),c100=hash3(xi+1,yi,zi,salt);const c010=hash3(xi,yi+1,zi,salt),c110=hash3(xi+1,yi+1,zi,salt);const c001=hash3(xi,yi,zi+1,salt),c101=hash3(xi+1,yi,zi+1,salt);const c011=hash3(xi,yi+1,zi+1,salt),c111=hash3(xi+1,yi+1,zi+1,salt);return lerp(lerp(lerp(c000,c100,u),lerp(c010,c110,u),v),lerp(lerp(c001,c101,u),lerp(c011,c111,u),v),w);}
// ─── Simplex noise ───────────────────────────────────────────────────────────
// Replaces value noise in the hot generation paths. Simplex uses a skew/wrapped
// simplex lattice instead of an axis-aligned grid, which removes the 0°/45°/90°
// directional artifacts value noise (and fbm over it) tends to show.
//
// Output range normalization:
//   Raw 2D simplex ∈ ≈[-1, 1]; we map → 0..1 via  n*0.5 + 0.5.
//   Raw 3D simplex ∈ ≈[-1, 1]; same mapping. The theoretical max contribution
//   is slightly below 1 (≈0.866² in 2D, ≈0.866² in 3D), so the *effective*
//   output spread is ~[-0.7, 0.7] → [0.15, 0.85]; mean ≈ 0.5, which matches the
//   value-noise distribution the existing biome thresholds (e.g. e<0.32) were
//   tuned against. Confirmed by a 100k-sample harness (see test/noise_stats.js).
//
// SEED / salt handling:
//   SEED is a live global (config.js) that changes per world via
//   loadActiveWorld(), so it must NOT be baked into a precomputed table — the
//   table would go stale on world load. Instead only the SEED-independent
//   gradient vector tables (SIMP_GRAD2 / SIMP_GRAD3) are precomputed once at
//   module load; on the hot path each lattice corner picks its gradient via the
//   existing integer hashes hash2i()/hash3i(), which already fold in live
//   SEED + salt. This preserves per-world determinism + per-salt streams, keeps
//   the hot path to array/bit ops only (no table rebuild), and is actually
//   cheaper than value noise (2D: 3 hashes vs 4; 3D: 4 hashes vs 8).
// Gradient tables: 8 directions (2D) / 16 directions (3D), length-normalized.
// Precomputed once at module load — SEED-independent, so they never go stale.
const SIMP_GRAD2=[[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
const SIMP_F2=0.5*(Math.sqrt(3)-1),SIMP_G2=(3-Math.sqrt(3))/6;
const SIMP_GRAD3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],[1,1,0],[-1,1,0],[0,-1,1],[0,1,-1]];
const SIMP_F3=1/3,SIMP_G3=1/6;
function simplex2(x,z,salt){
  // Skew input to simplex lattice space
  const s=(x+z)*SIMP_F2;const i=Math.floor(x+s),j=Math.floor(z+s);
  const t=(i+j)*SIMP_G2;const X0=x-(i-t),Y0=z-(j-t);  // unskewed offset from origin
  // Determine which simplex triangle we're in
  let i1,j1;
  if(X0>Y0){i1=1;j1=0;}else{i1=0;j1=1;}
  const x1=X0-i1+SIMP_G2,y1=Y0-j1+SIMP_G2,x2=X0-1+2*SIMP_G2,y2=Y0-1+2*SIMP_G2;
  // Hash the three lattice corners to pick gradient indices (folds SEED+salt)
  const gi0=hash2i(i,j,salt)&7,gi1=hash2i(i+i1,j+j1,salt)&7,gi2=hash2i(i+1,j+1,salt)&7;
  // Contribution from each corner: max(0, 0.5 - r²)⁴ · dot(grad, offset)
  let n0=0,n1=0,n2=0;
  let t0=0.5-X0*X0-Y0*Y0;if(t0>=0){t0*=t0;const g=SIMP_GRAD2[gi0];n0=t0*t0*(g[0]*X0+g[1]*Y0);}
  let t1=0.5-x1*x1-y1*y1;if(t1>=0){t1*=t1;const g=SIMP_GRAD2[gi1];n1=t1*t1*(g[0]*x1+g[1]*y1);}
  let t2=0.5-x2*x2-y2*y2;if(t2>=0){t2*=t2;const g=SIMP_GRAD2[gi2];n2=t2*t2*(g[0]*x2+g[1]*y2);}
  const n=(n0+n1+n2)*70;  // scale raw simplex to ≈[-1,1]
  return n*0.5+0.5;       // → 0..1, matching valueNoise's range
}
function simplex3(x,y,z,salt){
  // Skew input to simplex lattice space
  const s=(x+y+z)*SIMP_F3;const i=Math.floor(x+s),j=Math.floor(y+s),k=Math.floor(z+s);
  const t=(i+j+k)*SIMP_G3;const X0=x-(i-t),Y0=y-(j-t),Z0=z-(k-t);
  // Determine which simplex tetrahedron we're in (6 cases)
  let i1,j1,k1,i2,j2,k2;
  if(X0>=Y0){
    if(Y0>=Z0){i1=1;j1=0;k1=0;i2=1;j2=1;k2=0;}
    else if(X0>=Z0){i1=1;j1=0;k1=0;i2=1;j2=0;k2=1;}
    else{i1=0;j1=0;k1=1;i2=1;j2=0;k2=1;}
  }else{
    if(Y0<Z0){i1=0;j1=0;k1=1;i2=0;j2=1;k2=1;}
    else if(X0<Z0){i1=0;j1=1;k1=0;i2=0;j2=1;k2=1;}
    else{i1=0;j1=1;k1=0;i2=1;j2=1;k2=0;}
  }
  const x1=X0-i1+SIMP_G3,y1=Y0-j1+SIMP_G3,z1=Z0-k1+SIMP_G3;
  const x2=X0-i2+2*SIMP_G3,y2=Y0-j2+2*SIMP_G3,z2=Z0-k2+2*SIMP_G3;
  const x3=X0-1+3*SIMP_G3,y3=Y0-1+3*SIMP_G3,z3=Z0-1+3*SIMP_G3;
  const gi0=hash3i(i,j,k,salt)&15,gi1=hash3i(i+i1,j+j1,k+k1,salt)&15,gi2=hash3i(i+i2,j+j2,k+k2,salt)&15,gi3=hash3i(i+1,j+1,k+1,salt)&15;
  let n0=0,n1=0,n2=0,n3=0;
  let t0=0.6-X0*X0-Y0*Y0-Z0*Z0;if(t0>=0){t0*=t0;const g=SIMP_GRAD3[gi0];n0=t0*t0*(g[0]*X0+g[1]*Y0+g[2]*Z0);}
  let t1=0.6-x1*x1-y1*y1-z1*z1;if(t1>=0){t1*=t1;const g=SIMP_GRAD3[gi1];n1=t1*t1*(g[0]*x1+g[1]*y1+g[2]*z1);}
  let t2=0.6-x2*x2-y2*y2-z2*z2;if(t2>=0){t2*=t2;const g=SIMP_GRAD3[gi2];n2=t2*t2*(g[0]*x2+g[1]*y2+g[2]*z2);}
  let t3=0.6-x3*x3-y3*y3-z3*z3;if(t3>=0){t3*=t3;const g=SIMP_GRAD3[gi3];n3=t3*t3*(g[0]*x3+g[1]*y3+g[2]*z3);}
  const n=(n0+n1+n2+n3)*32;  // scale raw simplex to ≈[-1,1]
  return n*0.5+0.5;          // → 0..1, matching valueNoise3's range
}
const BIOME={PLAINS:0,FOREST:1,DESERT:2,SNOWY:3,MOUNTAINS:4,OCEAN:5,JUNGLE:6,SWAMP:7,MESA:8,VOLCANO:9,SAVANNA:10,TAIGA:11,GIANT_FOREST:12,CHERRY:13,MANGROVE:14,OASIS:15,AUTUMN:16,FLOWER_FIELD:17,LUSH_CAVES:18,DRIPSTONE_CAVES:19,CRYSTAL_PLAINS:20,WITHERED_FOREST:21,CORAL_TIDELANDS:22,FLOATING_ISLES:23};
const BIOME_NAME=['🌾 Plains','🌲 Forest','🏜 Desert','⛄ Snowy','⛰ Mountains','🌊 Ocean','🌴 Jungle','🐊 Swamp','🏔 Mesa','🌋 Volcano','🦒 Savanna','🌲 Taiga','🌳 Giant Forest','🌸 Cherry Grove','🌿 Mangrove Swamp','🏝 Oasis','🍁 Autumn Forest','🌷 Flower Field','🌿 Lush Caves','🪨 Dripstone Caves','💎 Crystal Plains','🍄 Withered Forest','🪸 Coral Tidelands','🏝 Floating Isles'];
// Fractal Brownian Motion — multi-octave Simplex noise.
// Signature unchanged from the old value-noise version; only the per-octave
// primitive was swapped (valueNoise → simplex2). Output is still 0..1 with a
// mean ≈ 0.5, so existing absolute biome/height thresholds (e.g. e<0.32) hold.
function fbm2(x,z,salt,octaves,baseFreq,persistence,lacunarity){
  let amp=1,freq=baseFreq,sum=0,norm=0;
  for(let o=0;o<octaves;o++){
    sum+=simplex2(x*freq,z*freq,salt+o*131)*amp;
    norm+=amp;amp*=persistence;freq*=lacunarity;
  }
  return sum/norm;
}
// Three climate fields: temperature, moisture, continental
// Fill a reusable climate object in place. The 4 fbm2 fields are the single
// most expensive part of terrain generation; computing them once and sharing
// the result (via the optional `c` arg on heightAtRaw/biomeAt/craterLavaLevelAt)
// roughly halves the generation cost and avoids per-column allocation.
function climateAtInto(x,z,o){
  // バイオームスケールを約2倍にするため全周波数を1/2に (より大きく固まったバイオーム)
  o.temperature =fbm2(x,z,41,4,1/1040,0.55,2.0);
  o.moisture    =fbm2(x,z,47,4,1/940,0.55,2.0);
  o.continental =fbm2(x,z,59,3,1/600,0.50,2.1);
  o.weirdness   =fbm2(x,z,67,2,1/360,0.50,2.0);
  return o;
}
function climateAt(x,z){return climateAtInto(x,z,{});}
// `c` is an optional precomputed climate object so the generation pass can share
// a single climateAt evaluation with heightAtRaw/craterLavaLevelAt.
function biomeAt(x,z,c){
  if(!c)c=climateAt(x,z);
  const t=c.temperature,m=c.moisture,e=c.continental,w=c.weirdness;
  // Oceans
  if(e<0.32) return BIOME.OCEAN;
  // Mountains / volcano. The volcano footprint is widened further so volcanoes
  // appear more frequently: temperature threshold lowered (0.55→0.48),
  // moisture threshold raised (0.50→0.58), making volcanic regions ~3x larger.
  if(e>0.72){
    if(t>0.48&&m<0.58) return BIOME.VOLCANO;
    return BIOME.MOUNTAINS;
  }
  // Cold
  if(t<0.32) return BIOME.SNOWY;
  // TAIGA: the cool transitional band just warmer than the snowfields — cold but
  // not frozen, fairly moist. Sits between SNOWY and the temperate forests and
  // is dotted with tall, narrow spruce conifers.
  if(t<0.40&&m>0.42) return BIOME.TAIGA;
  // Hot & dry — desert. Thresholds widened (temp 0.60→0.50, moist 0.40→0.52)
  // to roughly double the desert's footprint across the world.
  if(t>0.50&&m<0.52){
    if(w>0.62) return BIOME.MESA;
    // SAVANNA: hot grassland on the moister fringe of the desert belt — dry
    // golden grass with sparse, flat-topped acacia groves.
    if(m>0.36) return BIOME.SAVANNA;
    // OASIS: rare lush water-and-palm pockets dotted through the dry desert,
    // selected by sharp peaks of a dedicated noise field so they are special,
    // sparse surprises rather than common.
    {const oa=fbm2(x,z,211,3,1/70,0.5,2.0);if(oa>0.74)return BIOME.OASIS;}
    return BIOME.DESERT;
  }
  // Jungle
  if(t>0.55&&m>0.62) return BIOME.JUNGLE;
  // GIANT FOREST: the lushest, wettest temperate woodland — produces a rare
  // grove of colossal oaks (20m+ thick trunks) under a dim canopy.
  if(m>0.74&&e<0.66&&t>=0.40&&t<=0.62) return BIOME.GIANT_FOREST;
  // CHERRY GROVE: a mild, gentle climate pocket selected by the weirdness field
  // so blossoming groves appear as occasional surprises among the forests.
  if(t>=0.42&&t<=0.58&&m>=0.50&&m<0.74&&w>0.55) return BIOME.CHERRY;
  // AUTUMN FOREST: a warm, moderately-moist temperate woodland pocket dressed in
  // fiery red/orange/yellow maple foliage. Selected by a dedicated noise field so
  // splashes of autumn colour surface among the green forests.
  // クラスタリング改善: 低周波数(1/200→1/280)のノイズで大きな塊を形成
  if(t>=0.40&&t<=0.62&&m>=0.50&&m<0.74){const au=fbm2(x,z,217,4,1/280,0.5,2.0);if(au>0.56)return BIOME.AUTUMN;}
  // CORAL TIDELANDS: shallow coastal zone between OCEAN and MANGROVE — warm,
  // wet, near coast. Dense coral in shallow tidal flats.
  if(e>=0.32&&e<0.42&&t>0.52&&m>0.55) return BIOME.CORAL_TIDELANDS;
  // MANGROVE SWAMP: a warm, very wet marsh — the lush upgrade of the plain swamp.
  // Sits in the same low, soggy lowlands but only where it is genuinely warm,
  // producing root-tangled trees standing in shallow water.
  if(m>0.60&&e<0.46&&t>0.50) return BIOME.MANGROVE;
  // Swamp
  if(m>0.60&&e<0.46) return BIOME.SWAMP;
  // CRYSTAL PLAINS: a rare, cool-to-temperate area selected by weirdness field —
  // amethyst crystals protrude from white calcite ground, glowing at night.
  if(t>=0.32&&t<=0.55&&m<0.44){const cr=fbm2(x,z,229,3,1/200,0.5,2.0);if(cr>0.68)return BIOME.CRYSTAL_PLAINS;}
  // WITHERED FOREST: cold, damp, eerie biome with grey dead trees and toxic mushrooms.
  // Selected by a dedicated noise field in cool-moist regions.
  if(t>=0.32&&t<0.44&&m>=0.50){const wf=fbm2(x,z,233,3,1/190,0.5,2.0);if(wf>0.63)return BIOME.WITHERED_FOREST;}
  // FLOATING ISLES: sky islands biome — moderate climate, weirdness-driven.
  // Only in continental mid-range (not ocean, not mountains) with high weirdness.
  if(e>=0.44&&e<=0.70&&t>=0.35&&t<=0.65&&w>0.72){const fi=fbm2(x,z,251,3,1/160,0.5,2.0);if(fi>0.67)return BIOME.FLOATING_ISLES;}
  // FLOWER FIELD: a denser, more colourful variant of the plains, chosen by a
  // dedicated noise field so vivid wildflower meadows appear here and there.
  if(m>0.50){
    const ff=fbm2(x,z,223,3,1/220,0.5,2.0);if(ff>0.62&&t>=0.40&&t<=0.62)return BIOME.FLOWER_FIELD;
    // Forest: クラスタリングを強化するため低周波ノイズで大きなまとまりを形成
    return BIOME.FOREST;
  }
  // Default: plains — occasionally a flower field
  {const ff=fbm2(x,z,223,3,1/220,0.5,2.0);if(ff>0.62)return BIOME.FLOWER_FIELD;}
  return BIOME.PLAINS;
}
