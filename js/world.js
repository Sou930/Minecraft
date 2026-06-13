const world=new Uint8Array(WORLD_W*WORLD_H*WORLD_D);function blockIndex(x,y,z){return(y*WORLD_D+z)*WORLD_W+x;}
function getBlock(x,y,z){if(y<0)return B.BEDROCK;if(y>=WORLD_H)return B.AIR;if(x<0||x>=WORLD_W||z<0||z>=WORLD_D)return B.STONE;return world[blockIndex(x,y,z)];}
function isSolid(id){return id!==B.AIR&&id!==B.WATER&&id!==B.LAVA&&id!==B.SEAWEED;}
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
      // VOLCANO cone: tall, steeper, with a pronounced crater dip near the apex
      // so the very top forms a bowl that we later flood with lava.
      h=base+34+up*up*46;
      const crater=Math.max(0,(up-0.82))/0.18;
      h-=crater*crater*20;
    }else{
      // MOUNTAIN CANYONS: a ridged-noise "river" channel carves deep, steep
      // valleys through the high terrain. Where the channel mask is near its
      // ridge line we subtract a large amount of height, producing gorges.
      const cn=fbm2(x,z,131,3,1/90,0.5,2.0);
      const canyon=1-Math.abs(cn*2-1);      // 0..1, peaks along winding lines
      if(canyon>0.78){
        const depth=(canyon-0.78)/0.22;     // 0..1 inside the gorge
        h-=depth*depth*42;
      }
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
// Lava level inside a volcano crater. Returns the height the molten pool fills
// up to (the crater rim), or -1 when this column is not a flooded crater.
// Mirrors the VOLCANO branch of heightAt() but keeps the un-dipped rim height.
function craterLavaLevelAt(x,z){
  const c=climateAt(x,z);
  const e=c.continental,t=c.temperature,m=c.moisture,w=c.weirdness;
  if(!(e>0.72&&t>0.60&&m<0.45&&w>0.5))return -1;
  const base=SEA_LEVEL+2+fbm2(x,z,11,4,1/40,0.5,2.0)*26-10+fbm2(x,z,77,2,1/12,0.5,2.0)*8-4;
  const up=(e-0.72)/0.28;
  const apex=base+34+up*up*46;             // height without the crater dip
  const crater=Math.max(0,(up-0.82))/0.18; // 0..1 strength of the crater dip
  if(crater<=0.18)return -1;               // only the very summit is a crater
  // fill to just below the rim so a ring of rock surrounds the lava lake
  const level=Math.floor(apex-3);
  if(level<SEA_LEVEL+34)return -1;
  return Math.min(WORLD_H-6,level);
}
const heightMap=new Int16Array(WORLD_W*WORLD_D);const biomeMap=new Uint8Array(WORLD_W*WORLD_D);function colIndex(x,z){return z*WORLD_W+x;}
// Synchronous full generation (kept for reference / fallback).
function generateWorld(){generateClimateAndHeight();generateTerrainColumns(0,WORLD_W);carveCaves();carveLargeCaves();placeOresAndGravel();placeVegetation();}
// --- Split phases so generation can be driven asynchronously --------------
function generateClimateAndHeight(){for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){heightMap[colIndex(x,z)]=heightAt(x,z);biomeMap[colIndex(x,z)]=biomeAt(x,z);}}}
// Build terrain blocks for columns in the x-range [x0,x1).
function generateTerrainColumns(x0,x1){for(let x=x0;x<x1;x++){for(let z=0;z<WORLD_D;z++){const h=heightMap[colIndex(x,z)];const biome=biomeMap[colIndex(x,z)];const beach=h<=SEA_LEVEL+1;
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
if(biome===BIOME.SNOWY&&h<SEA_LEVEL)world[blockIndex(x,SEA_LEVEL,z)]=B.ICE;
// VOLCANO crater lava lake: flood the summit bowl up to the rim with lava.
if(biome===BIOME.VOLCANO){const lv=craterLavaLevelAt(x,z);if(lv>h){for(let y=h+1;y<=lv&&y<WORLD_H;y++)world[blockIndex(x,y,z)]=B.LAVA;}}}}}
function carveCaves(){for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){const h=heightMap[colIndex(x,z)];const yMax=Math.min(h-4,WORLD_H-1);for(let y=2;y<=yMax;y++){const n1=valueNoise3(x/11,y/7,z/11,71);if(n1<=0.6)continue;if(n1>0.745){world[blockIndex(x,y,z)]=B.AIR;continue;}
const n2=valueNoise3(x/23,y/13,z/23,73);if(n1>0.62&&n2>0.63)world[blockIndex(x,y,z)]=B.AIR;}}}}
// Hollow out a block only if it is part of the solid underground (never the
// surface skin or bedrock). Below y<=4 we leave a lava floor for atmosphere.
function caveDig(x,y,z){if(x<1||x>=WORLD_W-1||z<1||z>=WORLD_D-1||y<=1||y>=WORLD_H)return;const h=heightMap[colIndex(x,z)];if(y>h-3)return;const cur=world[blockIndex(x,y,z)];if(cur===B.AIR||cur===B.WATER||cur===B.LAVA||cur===B.BEDROCK)return;world[blockIndex(x,y,z)]=(y<=4)?B.LAVA:B.AIR;}
// THREE distinct large cave systems, scattered deterministically by seed:
//   1) CAVERNS  – big roughly-spherical chambers (great open rooms)
//   2) TUNNELS  – long winding "worm" tunnels that snake through the rock
//   3) SHAFTS   – near-vertical circular shafts dropping deep underground
function carveLargeCaves(){
  const rng=mulberry32((SEED^0x9e3779b9)>>>0);
  // --- 1) CAVERNS: large ellipsoidal chambers --------------------------
  const cavernCount=Math.floor((WORLD_W*WORLD_D)/90000)+6;
  for(let i=0;i<cavernCount;i++){
    const cx=2+Math.floor(rng()*(WORLD_W-4));
    const cz=2+Math.floor(rng()*(WORLD_D-4));
    const cy=8+Math.floor(rng()*26);
    const rx=8+Math.floor(rng()*9),ry=5+Math.floor(rng()*5),rz=8+Math.floor(rng()*9);
    for(let dx=-rx;dx<=rx;dx++)for(let dy=-ry;dy<=ry;dy++)for(let dz=-rz;dz<=rz;dz++){
      const wob=valueNoise3((cx+dx)/9,(cy+dy)/9,(cz+dz)/9,201)*0.4;
      const d=(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)+(dz*dz)/(rz*rz);
      if(d<=1-wob+0.25)caveDig(cx+dx,cy+dy,cz+dz);
    }
  }
  // --- 2) TUNNELS: meandering worm tunnels -----------------------------
  const tunnelCount=Math.floor((WORLD_W*WORLD_D)/70000)+8;
  for(let i=0;i<tunnelCount;i++){
    let x=2+rng()*(WORLD_W-4),z=2+rng()*(WORLD_D-4),y=10+rng()*36;
    let yaw=rng()*Math.PI*2,pitch=(rng()-0.5)*0.5;
    const steps=120+Math.floor(rng()*180);
    for(let s=0;s<steps;s++){
      yaw+=(rng()-0.5)*0.5;pitch+=(rng()-0.5)*0.25;pitch=Math.max(-0.7,Math.min(0.7,pitch));
      x+=Math.cos(yaw)*Math.cos(pitch)*1.4;z+=Math.sin(yaw)*Math.cos(pitch)*1.4;y+=Math.sin(pitch)*1.0;
      if(x<2||x>=WORLD_W-2||z<2||z>=WORLD_D-2||y<3||y>WORLD_H-6)break;
      const r=2+Math.floor(rng()*2);const ix=Math.round(x),iy=Math.round(y),iz=Math.round(z);
      for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)for(let dz=-r;dz<=r;dz++)
        if(dx*dx+dy*dy+dz*dz<=r*r+1)caveDig(ix+dx,iy+dy,iz+dz);
    }
  }
  // --- 3) SHAFTS: deep vertical wells -----------------------------------
  const shaftCount=Math.floor((WORLD_W*WORLD_D)/130000)+5;
  for(let i=0;i<shaftCount;i++){
    const cx=3+Math.floor(rng()*(WORLD_W-6));
    const cz=3+Math.floor(rng()*(WORLD_D-6));
    const top=heightMap[colIndex(cx,cz)]-4;const bottom=3+Math.floor(rng()*6);
    if(top<=bottom+6)continue;
    const r=2+Math.floor(rng()*2);
    for(let y=bottom;y<=top;y++){
      const ox=Math.round(Math.sin(y*0.3)*1.2),oz=Math.round(Math.cos(y*0.27)*1.2);
      for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)
        if(dx*dx+dz*dz<=r*r)caveDig(cx+ox+dx,y,cz+oz+dz);
    }
  }
}
function placeOresAndGravel(){for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){const h=heightMap[colIndex(x,z)];for(let y=1;y<Math.min(h-2,WORLD_H);y++){if(world[blockIndex(x,y,z)]!==B.STONE)continue;const cx=x>>1,cy=y>>1,cz=z>>1;if(y<=8&&hash3(cx,cy,cz,96)<0.06)world[blockIndex(x,y,z)]=B.OBSIDIAN;else if(y<=16&&hash3(cx,cy,cz,94)<0.013)world[blockIndex(x,y,z)]=B.DIAMOND_ORE;else if(y<=28&&hash3(cx,cy,cz,93)<0.016)world[blockIndex(x,y,z)]=B.GOLD_ORE;else if(y<=50&&hash3(cx,cy,cz,92)<0.028)world[blockIndex(x,y,z)]=B.IRON_ORE;else if(y>=14&&hash3(cx,cy,cz,91)<0.04)world[blockIndex(x,y,z)]=B.COAL_ORE;else if(hash3(cx,cy,cz,95)<0.022)world[blockIndex(x,y,z)]=B.GRAVEL;}
if(h<=SEA_LEVEL+2&&valueNoise(x/9,z/9,57)>0.76){for(let y=Math.max(1,h-1);y<=h;y++)
if(world[blockIndex(x,y,z)]===B.SAND||world[blockIndex(x,y,z)]===B.DIRT)
world[blockIndex(x,y,z)]=B.GRAVEL;}}}}
function placeVegetation(){placeReef();placeDeadTrees();for(let x=3;x<WORLD_W-3;x++){for(let z=3;z<WORLD_D-3;z++){const h=heightMap[colIndex(x,z)];if(h<=SEA_LEVEL+1||h+8>=WORLD_H)continue;const biome=biomeMap[colIndex(x,z)];const surf=world[blockIndex(x,h,z)];
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
// OCEAN reef: scatter colourful coral and tall seaweed across shallow,
// sunlit ocean floors so diving the sea has something to discover.
function placeReef(){const CORALS=[B.CORAL_PINK,B.CORAL_PURPLE,B.CORAL_BLUE];
for(let x=2;x<WORLD_W-2;x++){for(let z=2;z<WORLD_D-2;z++){const h=heightMap[colIndex(x,z)];
// only shallow, submerged sea floor (must have water above the floor)
if(h>=SEA_LEVEL||h<SEA_LEVEL-14)continue;if(biomeMap[colIndex(x,z)]!==BIOME.OCEAN)continue;
const floor=world[blockIndex(x,h,z)];if(floor!==B.SAND&&floor!==B.GRAVEL&&floor!==B.DIRT)continue;
if(world[blockIndex(x,h+1,z)]!==B.WATER)continue;
const r=hash2(x+311,z+733,21);
if(r<0.05){
  // coral bommie: a small clump of coral rising from the floor
  const ch=1+Math.floor(hash2(x,z,22)*3);const col=CORALS[Math.floor(hash2(x,z,23)*3)%3];
  for(let y=1;y<=ch;y++){const yy=h+y;if(yy>=SEA_LEVEL)break;if(world[blockIndex(x,yy,z)]===B.WATER)world[blockIndex(x,yy,z)]=col;}
}else if(r<0.14){
  // seaweed strand: waving green column up toward the surface
  const sh=2+Math.floor(hash2(x,z,24)*4);
  for(let y=1;y<=sh;y++){const yy=h+y;if(yy>=SEA_LEVEL)break;if(world[blockIndex(x,yy,z)]===B.WATER)world[blockIndex(x,yy,z)]=B.SEAWEED;}
}}}}
// SWAMP dead trees: leafless grey trunks standing in the marsh, sometimes a
// short branch, for a desolate wetland feel.
function placeDeadTrees(){for(let x=3;x<WORLD_W-3;x++){for(let z=3;z<WORLD_D-3;z++){
if(biomeMap[colIndex(x,z)]!==BIOME.SWAMP)continue;const h=heightMap[colIndex(x,z)];if(h+6>=WORLD_H)continue;
// stand only on land that pokes above the waterline (avoid floating in water)
if(h<SEA_LEVEL)continue;const surf=world[blockIndex(x,h,z)];if(surf!==B.GRASS&&surf!==B.DIRT&&surf!==B.SAND)continue;
if(world[blockIndex(x,h+1,z)]!==B.AIR)continue;
if(hash2(x+717,z-313,25)>0.05)continue;          // sparse but visible
const th=3+Math.floor(hash2(x,z,26)*4);
world[blockIndex(x,h,z)]=B.DIRT;
for(let y=1;y<=th;y++){const yy=h+y;if(yy<WORLD_H&&world[blockIndex(x,yy,z)]===B.AIR)world[blockIndex(x,yy,z)]=B.DEAD_LOG;}
// a couple of bare side branches near the top
const by=h+th-1;const dirs=[[1,0],[-1,0],[0,1],[0,-1]];for(let d=0;d<dirs.length;d++){if(hash2(x*7+d,z*5,27)<0.4){const bx=x+dirs[d][0],bz=z+dirs[d][1];if(bx>0&&bx<WORLD_W&&bz>0&&bz<WORLD_D&&world[blockIndex(bx,by,bz)]===B.AIR)world[blockIndex(bx,by,bz)]=B.DEAD_LOG;}}
}}}
// Asynchronous world generation: runs the heavy phases across several frames
// so the browser stays responsive and we can show a progress bar instead of a
// frozen "endless reload". onProgress(fraction0to1, label) is called between
// steps; returns a Promise that resolves when generation is complete.
function generateWorldAsync(onProgress){
  const nextFrame=()=>new Promise(r=>requestAnimationFrame(()=>r()));
  const report=(f,label)=>{if(onProgress)onProgress(Math.max(0,Math.min(1,f)),label);};
  return (async()=>{
    report(0.02,'気候・地形を計算中...');
    await nextFrame();
    generateClimateAndHeight();
    // Terrain blocks, sliced into vertical bands so each frame stays short.
    const BAND=16; // columns of x processed per frame
    for(let x0=0;x0<WORLD_W;x0+=BAND){
      generateTerrainColumns(x0,Math.min(WORLD_W,x0+BAND));
      report(0.05+0.55*(x0/WORLD_W),'地形を生成中...');
      await nextFrame();
    }
    report(0.62,'洞窟を掘削中...');
    await nextFrame();
    carveCaves();
    report(0.74,'大洞窟を生成中...');
    await nextFrame();
    carveLargeCaves();
    report(0.84,'鉱石を配置中...');
    await nextFrame();
    placeOresAndGravel();
    report(0.92,'植生を配置中...');
    await nextFrame();
    placeVegetation();
    report(1.0,'完了');
    await nextFrame();
  })();
}
let worldEdits={};function loadEdits(){try{worldEdits=JSON.parse(localStorage.getItem('bw_edits')||"{}");}catch(e){worldEdits={};}
for(const key in worldEdits){const[x,y,z]=key.split(',').map(Number);if(x>=0&&x<WORLD_W&&y>=0&&y<WORLD_H&&z>=0&&z<WORLD_D)
world[blockIndex(x,y,z)]=worldEdits[key];}}
let saveTimer=null;function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem('bw_edits',JSON.stringify(worldEdits));}catch(e){}},800);}
