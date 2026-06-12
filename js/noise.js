function mulberry32(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function hash2(x,z,salt){let n=(Math.imul(x,374761393)+Math.imul(z,668265263)+Math.imul(SEED+(salt|0),987654071))|0;n=Math.imul(n^(n>>>13),1274126177);n^=n>>>16;return(n>>>0)/4294967296;}
function smoothstep(t){return t*t*(3-2*t);}
function valueNoise(x,z,salt){const xi=Math.floor(x),zi=Math.floor(z);const xf=x-xi,zf=z-zi;const a=hash2(xi,zi,salt),b=hash2(xi+1,zi,salt);const c=hash2(xi,zi+1,salt),d=hash2(xi+1,zi+1,salt);const u=smoothstep(xf),v=smoothstep(zf);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function hash3(x,y,z,salt){let n=(Math.imul(x,374761393)+Math.imul(y,217645177)+Math.imul(z,668265263)+Math.imul(SEED+(salt|0),987654071))|0;n=Math.imul(n^(n>>>13),1274126177);n^=n>>>16;return(n>>>0)/4294967296;}
function lerp(a,b,t){return a+(b-a)*t;}
function valueNoise3(x,y,z,salt){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);const u=smoothstep(x-xi),v=smoothstep(y-yi),w=smoothstep(z-zi);const c000=hash3(xi,yi,zi,salt),c100=hash3(xi+1,yi,zi,salt);const c010=hash3(xi,yi+1,zi,salt),c110=hash3(xi+1,yi+1,zi,salt);const c001=hash3(xi,yi,zi+1,salt),c101=hash3(xi+1,yi,zi+1,salt);const c011=hash3(xi,yi+1,zi+1,salt),c111=hash3(xi+1,yi+1,zi+1,salt);return lerp(lerp(lerp(c000,c100,u),lerp(c010,c110,u),v),lerp(lerp(c001,c101,u),lerp(c011,c111,u),v),w);}
const BIOME={PLAINS:0,FOREST:1,DESERT:2,SNOWY:3,MOUNTAINS:4,OCEAN:5,JUNGLE:6,SWAMP:7,MESA:8,VOLCANO:9};
const BIOME_NAME=['🌾 平原','🌲 森林','🏜 砂漠','⛄ 雪原','⛰ 山岳','🌊 海洋','🌴 密林','🐊 湿地','🏔 台地','🌋 火山'];
// --- Multi-octave (fractal) value noise ----------------------------------
// Sums several octaves of valueNoise at increasing frequency / decreasing
// amplitude, then normalises back to roughly [0,1]. This produces smoother,
// more natural large-scale features with fine detail layered on top.
function fbm2(x,z,salt,octaves,baseFreq,persistence,lacunarity){
  let amp=1,freq=baseFreq,sum=0,norm=0;
  for(let o=0;o<octaves;o++){
    sum+=valueNoise(x*freq,z*freq,salt+o*131)*amp;
    norm+=amp;amp*=persistence;freq*=lacunarity;
  }
  return sum/norm;
}
// Three independent climate fields drive biome selection (Whittaker-style):
//   temperature  cold -> hot
//   moisture     dry  -> wet
//   continental  controls oceans (low) vs uplift / mountains (high)
function climateAt(x,z){
  const temperature  = fbm2(x,z,41,4,1/220,0.55,2.0);
  const moisture     = fbm2(x,z,47,4,1/190,0.55,2.0);
  const continental  = fbm2(x,z,59,3,1/300,0.50,2.1);
  // small "weirdness" channel to break up boundaries / spawn rare biomes
  const weirdness    = fbm2(x,z,67,2,1/70 ,0.50,2.0);
  return {temperature,moisture,continental,weirdness};
}
function biomeAt(x,z){
  const c=climateAt(x,z);
  const t=c.temperature,m=c.moisture,e=c.continental,w=c.weirdness;
  // 1) Oceans: deep continental lows, regardless of climate.
  if(e<0.32) return BIOME.OCEAN;
  // 2) High uplift -> mountainous terrain. Hot + dry uplift = volcano.
  if(e>0.72){
    if(t>0.60&&m<0.45&&w>0.5) return BIOME.VOLCANO;
    return BIOME.MOUNTAINS;
  }
  // 3) Cold climates -> snowy plains / snowy peaks.
  if(t<0.32) return BIOME.SNOWY;
  // 4) Hot + dry -> desert, with banded mesa/plateau variant.
  if(t>0.60&&m<0.40){
    if(w>0.55) return BIOME.MESA;
    return BIOME.DESERT;
  }
  // 5) Hot + wet -> jungle (dense tropical).
  if(t>0.55&&m>0.62) return BIOME.JUNGLE;
  // 6) Wet lowlands near sea level -> swamp.
  if(m>0.60&&e<0.46) return BIOME.SWAMP;
  // 7) Temperate wet -> forest.
  if(m>0.50) return BIOME.FOREST;
  // 8) Default temperate grassland.
  return BIOME.PLAINS;
}
