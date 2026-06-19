function mulberry32(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function hash2(x,z,salt){let n=(Math.imul(x,374761393)+Math.imul(z,668265263)+Math.imul(SEED+(salt|0),987654071))|0;n=Math.imul(n^(n>>>13),1274126177);n^=n>>>16;return(n>>>0)/4294967296;}
function smoothstep(t){return t*t*(3-2*t);}
function valueNoise(x,z,salt){const xi=Math.floor(x),zi=Math.floor(z);const xf=x-xi,zf=z-zi;const a=hash2(xi,zi,salt),b=hash2(xi+1,zi,salt);const c=hash2(xi,zi+1,salt),d=hash2(xi+1,zi+1,salt);const u=smoothstep(xf),v=smoothstep(zf);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function hash3(x,y,z,salt){let n=(Math.imul(x,374761393)+Math.imul(y,217645177)+Math.imul(z,668265263)+Math.imul(SEED+(salt|0),987654071))|0;n=Math.imul(n^(n>>>13),1274126177);n^=n>>>16;return(n>>>0)/4294967296;}
function lerp(a,b,t){return a+(b-a)*t;}
function valueNoise3(x,y,z,salt){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);const u=smoothstep(x-xi),v=smoothstep(y-yi),w=smoothstep(z-zi);const c000=hash3(xi,yi,zi,salt),c100=hash3(xi+1,yi,zi,salt);const c010=hash3(xi,yi+1,zi,salt),c110=hash3(xi+1,yi+1,zi,salt);const c001=hash3(xi,yi,zi+1,salt),c101=hash3(xi+1,yi,zi+1,salt);const c011=hash3(xi,yi+1,zi+1,salt),c111=hash3(xi+1,yi+1,zi+1,salt);return lerp(lerp(lerp(c000,c100,u),lerp(c010,c110,u),v),lerp(lerp(c001,c101,u),lerp(c011,c111,u),v),w);}
const BIOME={PLAINS:0,FOREST:1,DESERT:2,SNOWY:3,MOUNTAINS:4,OCEAN:5,JUNGLE:6,SWAMP:7,MESA:8,VOLCANO:9,SAVANNA:10,TAIGA:11,GIANT_FOREST:12,CHERRY:13};
const BIOME_NAME=['🌾 Plains','🌲 Forest','🏜 Desert','⛄ Snowy','⛰ Mountains','🌊 Ocean','🌴 Jungle','🐊 Swamp','🏔 Mesa','🌋 Volcano','🦒 Savanna','🌲 Taiga','🌳 Giant Forest','🌸 Cherry Grove'];
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
function climateAt(x,z){
  const temperature  = fbm2(x,z,41,4,1/520,0.55,2.0);
  const moisture     = fbm2(x,z,47,4,1/470,0.55,2.0);
  const continental  = fbm2(x,z,59,3,1/300,0.50,2.1);
  const weirdness    = fbm2(x,z,67,2,1/180,0.50,2.0);
  return {temperature,moisture,continental,weirdness};
}
function biomeAt(x,z){
  const c=climateAt(x,z);
  const t=c.temperature,m=c.moisture,e=c.continental,w=c.weirdness;
  // Oceans
  if(e<0.32) return BIOME.OCEAN;
  // Mountains / volcano
  if(e>0.72){
    if(t>0.60&&m<0.45&&w>0.5) return BIOME.VOLCANO;
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
    return BIOME.DESERT;
  }
  // Jungle
  if(t>0.55&&m>0.62) return BIOME.JUNGLE;
  // GIANT FOREST: the lushest, wettest temperate woodland — produces a rare
  // grove of colossal oaks (20m+ thick trunks) under a dim canopy.
  if(m>0.74&&e<0.66&&t>=0.40&&t<=0.62) return BIOME.GIANT_FOREST;
  // CHERRY GROVE: a mild, gentle climate pocket selected by the weirdness field
  // so blossoming groves appear as occasional surprises among the forests.
  if(t>=0.42&&t<=0.58&&m>=0.50&&m<0.74&&w>0.60) return BIOME.CHERRY;
  // Swamp
  if(m>0.60&&e<0.46) return BIOME.SWAMP;
  // Forest
  if(m>0.50) return BIOME.FOREST;
  // Default: plains
  return BIOME.PLAINS;
}
