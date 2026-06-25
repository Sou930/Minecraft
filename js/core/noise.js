function mulberry32(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function hash2(x,z,salt){let n=(Math.imul(x,374761393)+Math.imul(z,668265263)+Math.imul(SEED+(salt|0),987654071))|0;n=Math.imul(n^(n>>>13),1274126177);n^=n>>>16;return(n>>>0)/4294967296;}
function smoothstep(t){return t*t*(3-2*t);}
function valueNoise(x,z,salt){const xi=Math.floor(x),zi=Math.floor(z);const xf=x-xi,zf=z-zi;const a=hash2(xi,zi,salt),b=hash2(xi+1,zi,salt);const c=hash2(xi,zi+1,salt),d=hash2(xi+1,zi+1,salt);const u=smoothstep(xf),v=smoothstep(zf);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function hash3(x,y,z,salt){let n=(Math.imul(x,374761393)+Math.imul(y,217645177)+Math.imul(z,668265263)+Math.imul(SEED+(salt|0),987654071))|0;n=Math.imul(n^(n>>>13),1274126177);n^=n>>>16;return(n>>>0)/4294967296;}
function lerp(a,b,t){return a+(b-a)*t;}
function valueNoise3(x,y,z,salt){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);const u=smoothstep(x-xi),v=smoothstep(y-yi),w=smoothstep(z-zi);const c000=hash3(xi,yi,zi,salt),c100=hash3(xi+1,yi,zi,salt);const c010=hash3(xi,yi+1,zi,salt),c110=hash3(xi+1,yi+1,zi,salt);const c001=hash3(xi,yi,zi+1,salt),c101=hash3(xi+1,yi,zi+1,salt);const c011=hash3(xi,yi+1,zi+1,salt),c111=hash3(xi+1,yi+1,zi+1,salt);return lerp(lerp(lerp(c000,c100,u),lerp(c010,c110,u),v),lerp(lerp(c001,c101,u),lerp(c011,c111,u),v),w);}
const BIOME={PLAINS:0,FOREST:1,DESERT:2,SNOWY:3,MOUNTAINS:4,OCEAN:5,JUNGLE:6,SWAMP:7,MESA:8,VOLCANO:9,SAVANNA:10,TAIGA:11,GIANT_FOREST:12,CHERRY:13,MANGROVE:14,OASIS:15,AUTUMN:16,FLOWER_FIELD:17,LUSH_CAVES:18,DRIPSTONE_CAVES:19,CRYSTAL_PLAINS:20,WITHERED_FOREST:21,CORAL_TIDELANDS:22};
const BIOME_NAME=['🌾 Plains','🌲 Forest','🏜 Desert','⛄ Snowy','⛰ Mountains','🌊 Ocean','🌴 Jungle','🐊 Swamp','🏔 Mesa','🌋 Volcano','🦒 Savanna','🌲 Taiga','🌳 Giant Forest','🌸 Cherry Grove','🌿 Mangrove Swamp','🏝 Oasis','🍁 Autumn Forest','🌷 Flower Field','🌿 Lush Caves','🪨 Dripstone Caves','💎 Crystal Plains','🍄 Withered Forest','🪸 Coral Tidelands'];
// Fractal Brownian Motion — multi-octave value noise
function fbm2(x,z,salt,octaves,baseFreq,persistence,lacunarity){
  let amp=1,freq=baseFreq,sum=0,norm=0;
  for(let o=0;o<octaves;o++){
    sum+=valueNoise(x*freq,z*freq,salt+o*131)*amp;
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
  // Mountains / volcano. The volcano footprint is widened (temp 0.60→0.55,
  // moist 0.45→0.50, weirdness gate removed) so the molten cone covers a much
  // larger swathe of the highlands — a genuinely giant volcanic region.
  if(e>0.72){
    if(t>0.55&&m<0.50) return BIOME.VOLCANO;
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
