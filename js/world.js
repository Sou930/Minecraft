const world=new Uint8Array(WORLD_W*WORLD_H*WORLD_D);function blockIndex(x,y,z){return(y*WORLD_D+z)*WORLD_W+x;}
function getBlock(x,y,z){if(y<0)return B.BEDROCK;if(y>=WORLD_H)return B.AIR;if(x<0||x>=WORLD_W||z<0||z>=WORLD_D)return B.STONE;return world[blockIndex(x,y,z)];}
function isSolid(id){return id!==B.AIR&&id!==B.WATER;}
// Biome-aware terrain height. A gentle rolling base is modulated per biome so
// mountains tower, oceans sink below sea level, mesas form flat plateaus and
// volcanoes build steep cones — all blended smoothly via the climate fields.
function heightAt(x,z){
  const c=climateAt(x,z);
  // multi-octave rolling base around sea level
  const base=SEA_LEVEL+2+fbm2(x,z,11,4,1/40,0.5,2.0)*26-10+fbm2(x,z,77,2,1/12,0.5,2.0)*8-4;
  const detail=fbm2(x,z,23,3,1/24,0.5,2.0)*6-3;
  const e=c.continental,t=c.temperature,m=c.moisture,w=c.weirdness;
  let h=base+detail;
  if(e<0.32){
    // OCEAN: descend below sea level, deeper toward continental lows
    const depth=(0.32-e)/0.32;             // 0..1
    h=SEA_LEVEL-2-depth*depth*26;
  }else if(e>0.72){
    // MOUNTAINS / VOLCANO: strong uplift with ridged detail
    const up=(e-0.72)/0.28;                // 0..1
    const ridge=Math.abs(fbm2(x,z,83,4,1/30,0.5,2.0)*2-1);
    h=base+up*up*54+ridge*18;
    if(t>0.60&&m<0.45&&w>0.5){
      // VOLCANO cone: tall, steeper, with a hint of a crater dip near the apex
      h=base+34+up*up*46;
      const crater=Math.max(0,(up-0.85))/0.15;
      h-=crater*crater*14;
    }
  }else if(t>0.60&&m<0.40&&w>0.55){
    // MESA: flat-topped plateaus (quantised height bands)
    const plat=base+18+fbm2(x,z,89,2,1/55,0.5,2.0)*16;
    h=Math.round(plat/4)*4;
  }else if((m>0.60&&e<0.46)){
    // SWAMP: very flat, just around / slightly below sea level
    h=SEA_LEVEL-1+fbm2(x,z,91,2,1/30,0.5,2.0)*3;
  }
  return Math.floor(Math.max(2,Math.min(WORLD_H-6,h)));
}
const heightMap=new Int16Array(WORLD_W*WORLD_D);const biomeMap=new Uint8Array(WORLD_W*WORLD_D);function colIndex(x,z){return z*WORLD_W+x;}
function generateWorld(){for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){heightMap[colIndex(x,z)]=heightAt(x,z);biomeMap[colIndex(x,z)]=biomeAt(x,z);}}
for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){const h=heightMap[colIndex(x,z)];const biome=biomeMap[colIndex(x,z)];const beach=h<=SEA_LEVEL+1;
const highRock=h>=SEA_LEVEL+34;            // bare stone above this on mountains
for(let y=0;y<=h&&y<WORLD_H;y++){let id;
if(y===0)id=B.BEDROCK;
else if((biome===BIOME.DESERT||biome===BIOME.MESA)&&!beach){
  // sandy column with sandstone banding (mesa adds wider banding)
  if(y>=h-1)id=B.SAND;else if(y>=h-(biome===BIOME.MESA?8:5))id=B.SANDSTONE;else id=B.STONE;
}
else if(biome===BIOME.VOLCANO&&!beach){
  // volcanic cones are bare stone with obsidian near the very top
  if(y>=h-1&&h>=SEA_LEVEL+30)id=B.OBSIDIAN;else if(y<h-3)id=B.STONE;else id=B.STONE;
}
else if((biome===BIOME.MOUNTAINS)&&highRock){
  // high mountain peaks: stone, snow-capped at the very surface
  if(y>=h&&h>=SEA_LEVEL+44)id=B.SNOW;else id=B.STONE;
}
else if(y<h-3)id=B.STONE;
else if(y<h)id=beach?B.SAND:B.DIRT;
else{ // surface block (y===h)
  if(beach)id=(biome===BIOME.SNOWY?B.SNOW:B.SAND);
  else if(biome===BIOME.SNOWY)id=B.SNOW;
  else if(biome===BIOME.OCEAN)id=B.SAND;   // ocean floor
  else id=B.GRASS;
}
world[blockIndex(x,y,z)]=id;}
for(let y=h+1;y<=SEA_LEVEL;y++)world[blockIndex(x,y,z)]=B.WATER;
if(biome===BIOME.SNOWY&&h<SEA_LEVEL)world[blockIndex(x,SEA_LEVEL,z)]=B.ICE;}}
carveCaves();placeOresAndGravel();placeVegetation();}
function carveCaves(){for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){const h=heightMap[colIndex(x,z)];const yMax=Math.min(h-4,WORLD_H-1);for(let y=2;y<=yMax;y++){const n1=valueNoise3(x/11,y/7,z/11,71);if(n1<=0.6)continue;if(n1>0.745){world[blockIndex(x,y,z)]=B.AIR;continue;}
const n2=valueNoise3(x/23,y/13,z/23,73);if(n1>0.62&&n2>0.63)world[blockIndex(x,y,z)]=B.AIR;}}}}
function placeOresAndGravel(){for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){const h=heightMap[colIndex(x,z)];for(let y=1;y<Math.min(h-2,WORLD_H);y++){if(world[blockIndex(x,y,z)]!==B.STONE)continue;const cx=x>>1,cy=y>>1,cz=z>>1;if(y<=8&&hash3(cx,cy,cz,96)<0.06)world[blockIndex(x,y,z)]=B.OBSIDIAN;else if(y<=16&&hash3(cx,cy,cz,94)<0.013)world[blockIndex(x,y,z)]=B.DIAMOND_ORE;else if(y<=28&&hash3(cx,cy,cz,93)<0.016)world[blockIndex(x,y,z)]=B.GOLD_ORE;else if(y<=50&&hash3(cx,cy,cz,92)<0.028)world[blockIndex(x,y,z)]=B.IRON_ORE;else if(y>=14&&hash3(cx,cy,cz,91)<0.04)world[blockIndex(x,y,z)]=B.COAL_ORE;else if(hash3(cx,cy,cz,95)<0.022)world[blockIndex(x,y,z)]=B.GRAVEL;}
if(h<=SEA_LEVEL+2&&valueNoise(x/9,z/9,57)>0.76){for(let y=Math.max(1,h-1);y<=h;y++)
if(world[blockIndex(x,y,z)]===B.SAND||world[blockIndex(x,y,z)]===B.DIRT)
world[blockIndex(x,y,z)]=B.GRAVEL;}}}}
function placeVegetation(){for(let x=3;x<WORLD_W-3;x++){for(let z=3;z<WORLD_D-3;z++){const h=heightMap[colIndex(x,z)];if(h<=SEA_LEVEL+1||h+8>=WORLD_H)continue;const biome=biomeMap[colIndex(x,z)];const surf=world[blockIndex(x,h,z)];
// Biomes with no (tree) vegetation: oceans, bare mountains, volcanoes, mesas.
if(biome===BIOME.OCEAN||biome===BIOME.VOLCANO||biome===BIOME.MOUNTAINS||biome===BIOME.MESA)continue;
if(biome===BIOME.DESERT){if(surf!==B.SAND||hash2(x+555,z+333,6)<=0.994)continue;const ch=1+Math.floor(hash2(x,z,7)*3);for(let y=1;y<=ch;y++)
if(world[blockIndex(x,h+y,z)]===B.AIR)world[blockIndex(x,h+y,z)]=B.CACTUS;continue;}
// Tree spawn probability per biome (lower threshold => denser forest).
const treeP=biome===BIOME.JUNGLE?0.9:(biome===BIOME.FOREST?0.962:(biome===BIOME.SWAMP?0.985:(biome===BIOME.PLAINS?0.995:0.9965)));
if(hash2(x+999,z-777,5)<=treeP)continue;
const ground=biome===BIOME.SNOWY?B.SNOW:B.GRASS;if(surf!==ground)continue;
const birchP=biome===BIOME.SNOWY?0.5:(biome===BIOME.FOREST?0.3:(biome===BIOME.JUNGLE?0.05:0.2));
const isBirch=hash2(x+123,z+456,8)<birchP;const logId=isBirch?B.BIRCH_LOG:B.LOG,leafId=isBirch?B.BIRCH_LEAVES:B.LEAVES;
// Jungle trees are noticeably taller; swamp trees a touch shorter.
const baseTrunk=biome===BIOME.JUNGLE?7:(biome===BIOME.SWAMP?3:(isBirch?5:4));
const trunkH=baseTrunk+Math.floor(hash2(x,z,9)*(biome===BIOME.JUNGLE?4:2));
world[blockIndex(x,h,z)]=B.DIRT;for(let y=1;y<=trunkH;y++)world[blockIndex(x,h+y,z)]=logId;for(let dy=trunkH-2;dy<=trunkH+1;dy++){const r=dy>=trunkH?1:2;for(let dx=-r;dx<=r;dx++){for(let dz=-r;dz<=r;dz++){if(dx===0&&dz===0&&dy<=trunkH)continue;if(Math.abs(dx)===r&&Math.abs(dz)===r&&hash2(x+dx,z+dz,dy)<0.5)continue;const yy=h+dy,xx=x+dx,zz=z+dz;if(yy<WORLD_H&&world[blockIndex(xx,yy,zz)]===B.AIR)
world[blockIndex(xx,yy,zz)]=leafId;}}}}}}
let worldEdits={};function loadEdits(){try{worldEdits=JSON.parse(localStorage.getItem('bw_edits')||"{}");}catch(e){worldEdits={};}
for(const key in worldEdits){const[x,y,z]=key.split(',').map(Number);if(x>=0&&x<WORLD_W&&y>=0&&y<WORLD_H&&z>=0&&z<WORLD_D)
world[blockIndex(x,y,z)]=worldEdits[key];}}
let saveTimer=null;function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem('bw_edits',JSON.stringify(worldEdits));}catch(e){}},800);}
