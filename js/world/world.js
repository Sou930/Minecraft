const world=new Uint8Array(WORLD_W*WORLD_H*WORLD_D);function blockIndex(x,y,z){return(y*WORLD_D+z)*WORLD_W+x;}
function getBlock(x,y,z){if(y<0)return B.BEDROCK;if(y>=WORLD_H)return B.AIR;if(x<0||x>=WORLD_W||z<0||z>=WORLD_D)return B.STONE;return world[blockIndex(x,y,z)];}
function isCrop(id){const d=BLOCKS[id];return!!(d&&d.crop);}
function isCrossPlant(id){const d=BLOCKS[id];return!!(d&&d.crossPlant);}
function isBamboo(id){const d=BLOCKS[id];return!!(d&&d.bamboo);}
function isDoor(id){const d=BLOCKS[id];return!!(d&&d.door);}
function isDoorOpen(id){const d=BLOCKS[id];return!!(d&&d.door&&d.doorOpen);}
// Open doors are non-solid (walk-through); closed doors block movement like a wall.
function isSlab(id){const d=BLOCKS[id];return!!(d&&d.slab);}
function isFence(id){const d=BLOCKS[id];return!!(d&&(d.fence||d.fenceGate));}
function isWall(id){const d=BLOCKS[id];return!!(d&&d.wall);}
function isSolid(id){if(id===B.AIR||id===B.WATER||id===B.LAVA||id===B.SEAWEED)return false;if(isCrossPlant(id)||isCrop(id)||isBamboo(id)||isDoorOpen(id))return false;// flat redstone components are not solid (walkable through)
if(id===B.LEVER||id===B.REDSTONE_DUST||id===B.REPEATER||id===B.PISTON_HEAD||id===B.PISTON_HEAD_STICKY)return false;
return true;}
// Crops, cross-shaped plants (grass/flowers) and thin bamboo stalks are
// targetable even though non-solid (so they can be broken / passed through).
function isRedstoneBlock(id){return id===B.LEVER||id===B.REDSTONE_DUST||id===B.REDSTONE_TORCH_OFF||id===B.REDSTONE_TORCH_ON||id===B.REPEATER||id===B.PISTON||id===B.PISTON_STICKY||id===B.PISTON_HEAD||id===B.PISTON_HEAD_STICKY||id===B.DISPENSER||id===B.DROPPER||id===B.HOPPER||id===B.OBSERVER;}
function isTargetable(id){return isSolid(id)||isCrop(id)||isCrossPlant(id)||isBamboo(id)||isDoor(id)||isRedstoneBlock(id);}
// Skylight: returns 0 if block above is opaque (underground)
function blocksSky(id){if(id===B.AIR||id===B.WATER||id===B.LAVA)return false;const d=BLOCKS[id];if(d&&(d.transparent||d.crop||d.crossPlant||d.bamboo))return false;return true;}
function skyExposed(x,y,z){for(let yy=y+1;yy<WORLD_H;yy++){if(blocksSky(getBlock(x,yy,z)))return false;}return true;}
// Sky light level 0..1; 1=open sky, gradient near cave entrances
function skyLightAt(x,y,z){if(skyExposed(x,y,z))return 1;let best=0;const offs=[[1,0],[-1,0],[0,1],[0,-1]];for(const[dx,dz]of offs){if(skyExposed(x+dx,y+1,z+dz)){best=Math.max(best,0.55);}}return best;}
// Block light: flood-fill from emissive blocks (torches/lava/etc), 0..15 range
const BLOCKLIGHT_MAX=15;
const BLOCKLIGHT_DEFS_CACHE={};
function blockLightEmission(id){
  if(id in BLOCKLIGHT_DEFS_CACHE)return BLOCKLIGHT_DEFS_CACHE[id];
  let v=0;
  if(id===B.LAVA)v=15;
  else if(id===B.LANTERN)v=15;
  else if(id===B.TORCH)v=15;
  else if(id===B.REDSTONE_TORCH_ON)v=7;
  else if(id===B.AMETHYST_CLUSTER)v=8;
  else if(id===B.GLOW_LICHEN)v=7;
  BLOCKLIGHT_DEFS_CACHE[id]=v;return v;
}
// Returns true if light can pass through this block
function lightPasses(id){if(id===B.AIR)return true;const d=BLOCKS[id];if(!d)return true;if(d.transparent||d.crop||d.crossPlant||d.cross||d.fluid||d.torch||d.redstoneTorch||d.lanternBox||d.flat||d.bamboo||d.slab||d.fence||d.fenceGate||d.wall||d.pistonHead)return true;return false;}

// Compute block light for a region using BFS flood-fill
function computeBlockLight(bx0,by0,bz0,sx,sy,sz){
  const N=sx*sy*sz;const lv=new Uint8Array(N);
  const idx=(x,y,z)=>((y*sz)+z)*sx+x;
  // Seed emissive blocks
  let queue=[];
  for(let y=0;y<sy;y++)for(let z=0;z<sz;z++)for(let x=0;x<sx;x++){
    const wx=bx0+x,wy=by0+y,wz=bz0+z;
    const id=getBlock(wx,wy,wz);
    const e=blockLightEmission(id);
    if(e>0){const i=idx(x,y,z);lv[i]=e;queue.push(i);}
  }
  // BFS flood-fill in 6 directions
  const NEI=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  let head=0;
  while(head<queue.length){
    const i=queue[head++];const cur=lv[i];
    if(cur<=1)continue;
    const x=i%sx,z=(((i-x)/sx)|0)%sz,y=(((i-x)/sx-z)/sz)|0;
    for(const[dx,dy,dz]of NEI){
      const nx=x+dx,ny=y+dy,nz=z+dz;
      if(nx<0||nx>=sx||ny<0||ny>=sy||nz<0||nz>=sz)continue;
      const wx=bx0+nx,wy=by0+ny,wz=bz0+nz;
      if(wy<0||wy>=WORLD_H)continue;
      if(!lightPasses(getBlock(wx,wy,wz)))continue;
      const ni=idx(nx,ny,nz);const nl=cur-1;
      if(lv[ni]<nl){lv[ni]=nl;queue.push(ni);}
    }
  }
  return {lv,bx0,by0,bz0,sx,sy,sz,idx};
}
// Biome-aware terrain height. A gentle rolling base is modulated per biome so
// mountains tower, oceans sink below sea level, mesas form flat plateaus and
// volcanoes build steep cones — all blended smoothly via the climate fields.
// River network mask. A winding ridged-noise line snakes across the whole map;
// where the mask is near its ridge we are "in" a river. Returns 0 (no river)
// up to 1 (river centre line). Large wavelength keeps rivers long & meandering.
// A gentle domain warp displaces the sampling point so the channels wiggle in a
// more organic, less mathematically-straight way.
function riverMaskAt(x,z){
  // domain warp: nudge the lookup with a second low-freq noise field
  const wx=x+(fbm2(x,z,151,2,1/120,0.5,2.0)-0.5)*40;
  const wz=z+(fbm2(x,z,157,2,1/120,0.5,2.0)-0.5)*40;
  const rn=fbm2(wx,wz,137,3,1/170,0.5,2.0);  // slow, large-scale winding field
  const ridge=1-Math.abs(rn*2-1);            // 0..1, peaks along winding lines
  if(ridge<=0.82)return 0;
  return (ridge-0.82)/0.18;                   // 0..1 inside the river corridor
}
// Lake mask. Big, smoothly-varying blobs of "low" noise become circular-ish
// basins. Returns 0 (no lake) up to 1 (lake centre / deepest). Lakes only form
// where the field dips well below its mean, giving sparse, natural ponds.
function lakeMaskAt(x,z){
  const wx=x+(fbm2(x,z,171,2,1/90,0.5,2.0)-0.5)*30;
  const wz=z+(fbm2(x,z,173,2,1/90,0.5,2.0)-0.5)*30;
  const n=fbm2(wx,wz,167,3,1/110,0.5,2.0);   // smooth blobby field
  if(n>=0.30)return 0;                         // only deep dips become lakes
  return (0.30-n)/0.30;                        // 0..1, 1 at the basin centre
}
// `c` is an optional precomputed climate object so the generation pass can
// share a single climateAt evaluation with biomeAt/craterLavaLevelAt.
function heightAtRaw(x,z,c){
  if(!c)c=climateAt(x,z);
  // multi-octave rolling base around sea level — boosted amplitude & freq for
  // more dramatic, Minecraft-style rolling hills (was *26, now *36 base + extra
  // high-freq micro-detail for a rougher, blockier surface feel).
  const base=SEA_LEVEL+2+fbm2(x,z,11,5,1/48,0.5,2.0)*36-14+fbm2(x,z,77,3,1/14,0.5,2.0)*10-5;
  // Two layers of fine detail give the surface a more eroded, natural look:
  // broad undulation plus a higher-frequency "weathering" ripple.
  const detail=fbm2(x,z,23,4,1/28,0.5,2.0)*8-4+fbm2(x,z,29,2,1/7,0.5,2.0)*3-1.5;
  const e=c.continental,t=c.temperature,m=c.moisture,w=c.weirdness;
  let h=base+detail;
  if(e<0.40){
    // OCEAN & COAST: rather than snapping to a fixed depth at the biome border
    // (which made an abrupt underwater cliff), blend smoothly from the rolling
    // land height down into the sea. A wide [0.32,0.40] coastal band eases the
    // shoreline so beaches slope gently below the waterline, and the basin only
    // deepens gradually toward the continental lows for a natural sea floor.
    const oceanFloor=SEA_LEVEL-2-Math.pow((0.32-Math.min(e,0.32))/0.32,1.6)*32;
    // coastal blend weight: 0 at e=0.40 (full land) -> 1 at e<=0.32 (full sea)
    const coast=smoothstep(Math.max(0,Math.min(1,(0.40-e)/0.08)));
    h=h*(1-coast)+oceanFloor*coast;
  }else if(e>0.72){
    // MOUNTAINS / VOLCANO: very strong uplift with ridged detail for towering,
    // Minecraft-style mountain ranges. Peaks now soar much higher than before.
    const up=(e-0.72)/0.28;                // 0..1
    const ridge=1-Math.abs(fbm2(x,z,83,5,1/32,0.55,2.1)*2-1); // ridged noise
    // Towering peaks: steeper curve + ridged noise pushes summits very high.
    h=base+up*up*up*110+ridge*ridge*34;
    if(t>0.55&&m<0.50){
      // VOLCANO cone: a MASSIVE, broad shield-and-cone that climbs far higher
      // than the surrounding mountains, with a wide, pronounced crater bowl at
      // the apex that we later flood with a large lava lake.
      const cone=fbm2(x,z,95,4,1/45,0.5,2.0);     // broad flank undulation
      h=base+52+up*up*84+cone*12;
      // Wide crater: the dip begins lower on the cone (0.70) and plunges deep,
      // carving a large summit caldera rather than a tiny pit.
      const crater=Math.max(0,(up-0.68))/0.32;
      h-=crater*crater*48;
    }else{
      // MOUNTAIN CANYONS: a ridged-noise "river" channel carves deep, steep
      // valleys through the high terrain. Where the channel mask is near its
      // ridge line we subtract a large amount of height, producing gorges.
      const cn=fbm2(x,z,131,4,1/100,0.5,2.0);
      const canyon=1-Math.abs(cn*2-1);      // 0..1, peaks along winding lines
      if(canyon>0.76){
        const depth=(canyon-0.76)/0.24;     // 0..1 inside the gorge
        h-=depth*depth*54;                  // deeper mountain gorges
      }
    }
  }else if(t>0.60&&m<0.40&&w>0.55){
    // MESA: flat-topped plateaus with taller, more dramatic banding
    const plat=base+22+fbm2(x,z,89,2,1/55,0.5,2.0)*20;
    h=Math.round(plat/4)*4;
  }else if((m>0.60&&e<0.46)){
    // SWAMP / MANGROVE: very flat, just around / slightly below sea level so
    // shallow water threads between the soggy hummocks.
    h=SEA_LEVEL-1+fbm2(x,z,91,2,1/30,0.5,2.0)*3;
  }
  // OASIS basin: inside the rare desert oasis pockets, scoop a shallow circular
  // bowl that dips to just below sea level so it fills with a small pool of
  // water, ringed by palms. Detected with the same noise field as biomeAt.
  if(t>0.50&&m<0.52&&w<=0.62){
    const oa=fbm2(x,z,211,3,1/70,0.5,2.0);
    if(oa>0.70){
      const dip=Math.min(1,(oa-0.70)/0.18);          // 0..1 toward oasis centre
      const bed=SEA_LEVEL-2-dip*2;                     // shallow central pool
      const tt=smoothstep(dip);
      h=h*(1-tt)+bed*tt;
    }
  }
  // RIVERS: carve winding channels down toward (and just below) sea level so
  // water threads through plains, forests and hills. Skip oceans (already
  // submerged) and the very steepest peaks where a river would look odd.
  // The valley is a smooth U-shape: a flat-ish bed at the centre line that
  // rises gently into grassy banks, so rivers read as natural waterways
  // rather than knife-thin slots.
  if(e>=0.40&&e<=0.82&&h>SEA_LEVEL-3){
    const rm=riverMaskAt(x,z);
    if(rm>0){
      const bedTarget=SEA_LEVEL-2;              // desired riverbed floor
      // ease toward the bed: full carve at the centre, tapering to the banks
      const t=smoothstep(Math.min(1,rm*1.15));
      h=h*(1-t)+bedTarget*t;
      if(h<bedTarget)h=bedTarget;
    }
  }
  // LAKES: flood broad shallow basins. Instead of stamping a basin floor with a
  // sharp rim, ease the surrounding land smoothly down to (and below) the water
  // line so the banks read as a continuous gentle slope rather than a dug-out
  // hole. The blend weight ramps in slowly from the lake edge, giving wide
  // shallow margins that deepen gradually toward a still central pool.
  if(e>=0.40&&e<=0.82){
    const lm=lakeMaskAt(x,z);
    if(lm>0&&h>SEA_LEVEL-6){
      const bedTarget=SEA_LEVEL-2-lm*lm*5;       // deeper toward the centre
      const t=smoothstep(smoothstep(Math.min(1,lm*0.95)));
      h=h*(1-t)+bedTarget*t;
    }
  }
  return h;
}
function heightAt(x,z){return Math.floor(Math.max(2,Math.min(WORLD_H-6,heightAtRaw(x,z))));}
// Lava level inside a volcano crater. Returns the height the molten pool fills
// up to (the crater rim), or -1 when this column is not a flooded crater.
// Mirrors the VOLCANO branch of heightAt() but keeps the un-dipped rim height.
function craterLavaLevelAt(x,z,c){
  if(!c)c=climateAt(x,z);
  const e=c.continental,t=c.temperature,m=c.moisture,w=c.weirdness;
  if(!(e>0.72&&t>0.55&&m<0.50))return -1;
  const base=SEA_LEVEL+2+fbm2(x,z,11,4,1/40,0.5,2.0)*26-10+fbm2(x,z,77,2,1/12,0.5,2.0)*8-4;
  const up=(e-0.72)/0.28;
  const cone=fbm2(x,z,95,4,1/45,0.5,2.0);
  const apex=base+46+up*up*72+cone*10;      // height without the crater dip
  const crater=Math.max(0,(up-0.70))/0.30;  // 0..1 strength of the crater dip
  if(crater<=0.30)return -1;                // only the broad summit is a crater
  // fill to just below the rim so a ring of rock surrounds a large lava lake
  const level=Math.floor(apex-4);
  if(level<SEA_LEVEL+40)return -1;
  return Math.min(WORLD_H-6,level);
}
const heightMap=new Int16Array(WORLD_W*WORLD_D);const biomeMap=new Uint8Array(WORLD_W*WORLD_D);
// Volcano crater lava level per column (or -1). Precomputed during the climate
// pass (while the climate object is already hot) so generateTerrainColumns can
// read it from the map instead of recomputing climateAt for every volcano column.
const lavaLevelMap=new Int16Array(WORLD_W*WORLD_D);
function colIndex(x,z){return z*WORLD_W+x;}
// Synchronous full generation (kept for reference / fallback).
function generateWorld(){generateClimateAndHeight();generateTerrainColumns(0,WORLD_W);carveCaves();carveLargeCaves();carveCaveFeatures();carveRavines();placeCaveBiomes();placeAmethystGeodes();placeOresAndGravel();placeVegetation();if(typeof placeStructures==='function')placeStructures();}
// --- Split phases so generation can be driven asynchronously --------------
function generateClimateAndHeight(){
  const tmp=new Float32Array(WORLD_W*WORLD_D);
  // Compute the climate fields ONCE per column and feed the single object to
  // heightAtRaw, biomeAt AND craterLavaLevelAt. Previously each of those three
  // recomputed climateAt() (13 valueNoise evals) independently for the same
  // (x,z), so the climate was evaluated up to 3x per column. Sharing it removes
  // ~2/3 of the most expensive work in the whole generation pass.
  // We also precompute the volcano crater lava level here (the climate object is
  // already hot) so generateTerrainColumns can read it from lavaLevelMap instead
  // of recomputing climateAt for every volcano column.
  const cl={temperature:0,moisture:0,continental:0,weirdness:0};
  for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){
    const i=colIndex(x,z);
    climateAtInto(x,z,cl);
    tmp[i]=heightAtRaw(x,z,cl);
    biomeMap[i]=biomeAt(x,z,cl);
    lavaLevelMap[i]=craterLavaLevelAt(x,z,cl);
  }}
  // --- Pass 1: weighted 3x3 box blur -----------------------------------
  // Previously the blur was *weakened* where neighbours differed a lot, which
  // left the very places that needed it (cliff edges) almost untouched. We now
  // blur the whole field uniformly so abrupt steps start to soften.
  let cur=tmp;
  const smoothed=new Float32Array(WORLD_W*WORLD_D);
  const W=[[1,2,1],[2,4,2],[1,2,1]];
  for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){
    let sum=0,wsum=0;
    for(let dz=-1;dz<=1;dz++){for(let dx=-1;dx<=1;dx++){
      const xx=Math.min(WORLD_W-1,Math.max(0,x+dx));
      const zz=Math.min(WORLD_D-1,Math.max(0,z+dz));
      const w=W[dz+1][dx+1];
      sum+=cur[colIndex(xx,zz)]*w;wsum+=w;
    }}
    smoothed[colIndex(x,z)]=sum/wsum;
  }}
  cur=smoothed;
  // --- Pass 2: thermal-erosion slope limiter ---------------------------
  // Walk the map several times and, wherever the height step to a 4-neighbour
  // exceeds MAX_STEP (the "talus angle"), shovel material from the high column
  // down onto the low one. This caps the maximum slope so towering vertical
  // cliffs collapse into walkable, gently terraced hillsides while leaving
  // already-gentle terrain essentially untouched.
  const h2=new Float32Array(WORLD_W*WORLD_D);h2.set(cur);
  const MAX_STEP=2.8;        // largest allowed height difference per block (raised for steeper terrain)
  const TALUS=0.45;          // fraction of the excess moved each iteration
  const ITER=5;
  const NB=[[1,0],[-1,0],[0,1],[0,-1]];
  for(let it=0;it<ITER;it++){
    for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){
      const i=colIndex(x,z);const ch=h2[i];
      let lowest=ch,li=-1;
      for(const[dx,dz]of NB){
        const xx=x+dx,zz=z+dz;
        if(xx<0||xx>=WORLD_W||zz<0||zz>=WORLD_D)continue;
        const v=h2[colIndex(xx,zz)];
        if(v<lowest){lowest=v;li=colIndex(xx,zz);}
      }
      if(li<0)continue;
      const diff=ch-lowest;
      if(diff>MAX_STEP){
        const move=(diff-MAX_STEP)*TALUS;
        h2[i]-=move;h2[li]+=move;
      }
    }}
  }
  cur=h2;
  for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){
    heightMap[colIndex(x,z)]=Math.floor(Math.max(2,Math.min(WORLD_H-6,cur[colIndex(x,z)])));
  }}
}
// Build terrain blocks for columns in the x-range [x0,x1).
function generateTerrainColumns(x0,x1){for(let x=x0;x<x1;x++){for(let z=0;z<WORLD_D;z++){const h=heightMap[colIndex(x,z)];const biome=biomeMap[colIndex(x,z)];const beach=h<=SEA_LEVEL+1;
const highRock=h>=SEA_LEVEL+38;            // bare stone above this on mountains (raised for taller terrain)
const soilDepth=3+Math.floor(valueNoise(x/6,z/6,301)*3);   // 3..5
// Snow caps the loftiest peaks. With taller terrain, the snow line is higher
// so only genuine summits stay white year-round.
const snowLine=SEA_LEVEL+64+Math.floor(valueNoise(x/5,z/5,303)*10);
for(let y=0;y<=h&&y<WORLD_H;y++){let id;
if(y===0)id=B.BEDROCK;
else if(y<=2&&hash3(x,y,z,305)<0.6)id=B.BEDROCK;
else if((biome===BIOME.DESERT||biome===BIOME.MESA||biome===BIOME.OASIS)&&!beach){
  // sandy column with sandstone banding (mesa adds wider banding)
  if(y>=h-1)id=B.SAND;else if(y>=h-(biome===BIOME.MESA?8:5))id=B.SANDSTONE;else id=B.STONE;
}
else if(biome===BIOME.VOLCANO&&!beach){
  // Giant volcanic cones: smooth-basalt flanks, an obsidian-crusted upper
  // cone, and a glassy obsidian rim around the high summit/crater.
  if(y>=h-1&&h>=SEA_LEVEL+58)id=B.OBSIDIAN;
  else if(y>=h-2&&h>=SEA_LEVEL+40)id=(valueNoise(x/5,z/5,311)>0.5?B.OBSIDIAN:B.SMOOTH_BASALT);
  else if(y>=h-3)id=B.SMOOTH_BASALT;
  else id=B.STONE;
}
else if((biome===BIOME.MOUNTAINS)&&highRock){
  if(y>=h){ if(h>=snowLine)id=B.SNOW; else if(valueNoise(x/4,z/4,307)>0.62)id=B.GRASS; else id=B.STONE; }
  else if(y>=h-1&&h<snowLine&&valueNoise(x/4,z/4,307)>0.62)id=B.DIRT;
  else id=B.STONE;
}
else if(y<h-soilDepth)id=B.STONE;
else if(y<h)id=beach?B.SAND:B.DIRT;
else{ // surface block (y===h)
  if(beach)id=(biome===BIOME.SNOWY?B.SNOW:B.SAND);
  else if(biome===BIOME.SNOWY)id=B.SNOW;
  else if(biome===BIOME.OCEAN)id=B.SAND;   // ocean floor
  else if(biome===BIOME.SAVANNA)id=B.DRY_GRASS;  // golden savanna grass
  else if(biome===BIOME.OASIS)id=B.SAND;   // desert oasis pool/banks are sandy
  else id=B.GRASS;
}
world[blockIndex(x,y,z)]=id;}
for(let y=h+1;y<=SEA_LEVEL;y++)world[blockIndex(x,y,z)]=B.WATER;
if(biome===BIOME.SNOWY&&h<SEA_LEVEL)world[blockIndex(x,SEA_LEVEL,z)]=B.ICE;
// VOLCANO crater lava lake: flood the summit bowl up to the rim with lava.
if(biome===BIOME.VOLCANO){const lv=lavaLevelMap[colIndex(x,z)];if(lv>h){for(let y=h+1;y<=lv&&y<WORLD_H;y++)world[blockIndex(x,y,z)]=B.LAVA;}}}}}
function carveCaves(){for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){const h=heightMap[colIndex(x,z)];const yMax=Math.min(h-4,WORLD_H-1);for(let y=2;y<=yMax;y++){const n1=valueNoise3(x/11,y/7,z/11,71);if(n1<=0.54)continue;if(n1>0.70){world[blockIndex(x,y,z)]=B.AIR;continue;}
const n2=valueNoise3(x/23,y/13,z/23,73);if(n1>0.565&&n2>0.575)world[blockIndex(x,y,z)]=B.AIR;
// secondary spaghetti cave layer for denser interconnected tunnels
else{const n3=valueNoise3(x/17,y/9,z/17,77),n4=valueNoise3(x/31,y/15,z/31,79);if(n3>0.66&&n4>0.64)world[blockIndex(x,y,z)]=B.AIR;}}}}}
// Hollow out a block only if it is part of the solid underground (never the
// surface skin or bedrock). Below y<=4 we leave a lava floor for atmosphere.
function caveDig(x,y,z){if(x<1||x>=WORLD_W-1||z<1||z>=WORLD_D-1||y<=1||y>=WORLD_H)return;const h=heightMap[colIndex(x,z)];if(y>h-3)return;const cur=world[blockIndex(x,y,z)];if(cur===B.AIR||cur===B.WATER||cur===B.LAVA||cur===B.BEDROCK)return;world[blockIndex(x,y,z)]=(y<=4)?B.LAVA:B.AIR;}
// THREE distinct large cave systems, scattered deterministically by seed:
//   1) CAVERNS  – big roughly-spherical chambers (great open rooms)
//   2) TUNNELS  – long winding "worm" tunnels that snake through the rock
//   3) SHAFTS   – near-vertical circular shafts dropping deep underground
function carveLargeCaves(){
  const rng=mulberry32((SEED^0x9e3779b9)>>>0);
  // --- 1) CAVERNS: large ellipsoidal chambers — bigger and deeper than before
  const cavernCount=Math.floor((WORLD_W*WORLD_D)/45000)+14;
  for(let i=0;i<cavernCount;i++){
    const cx=2+Math.floor(rng()*(WORLD_W-4));
    const cz=2+Math.floor(rng()*(WORLD_D-4));
    const cy=6+Math.floor(rng()*34);                         // deeper range
    const rx=10+Math.floor(rng()*12),ry=6+Math.floor(rng()*7),rz=10+Math.floor(rng()*12);
    for(let dx=-rx;dx<=rx;dx++)for(let dy=-ry;dy<=ry;dy++)for(let dz=-rz;dz<=rz;dz++){
      const wob=valueNoise3((cx+dx)/9,(cy+dy)/9,(cz+dz)/9,201)*0.45;
      const d=(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)+(dz*dz)/(rz*rz);
      if(d<=1-wob+0.28)caveDig(cx+dx,cy+dy,cz+dz);
    }
  }
  // --- 2) TUNNELS: meandering worm tunnels — longer and wider than before ---
  const tunnelCount=Math.floor((WORLD_W*WORLD_D)/32000)+18;
  for(let i=0;i<tunnelCount;i++){
    let x=2+rng()*(WORLD_W-4),z=2+rng()*(WORLD_D-4),y=8+rng()*46;
    let yaw=rng()*Math.PI*2,pitch=(rng()-0.5)*0.45;
    const steps=160+Math.floor(rng()*240);                   // longer tunnels
    for(let s=0;s<steps;s++){
      yaw+=(rng()-0.5)*0.55;pitch+=(rng()-0.5)*0.28;pitch=Math.max(-0.75,Math.min(0.75,pitch));
      x+=Math.cos(yaw)*Math.cos(pitch)*1.5;z+=Math.sin(yaw)*Math.cos(pitch)*1.5;y+=Math.sin(pitch)*1.1;
      if(x<2||x>=WORLD_W-2||z<2||z>=WORLD_D-2||y<3||y>WORLD_H-6)break;
      const r=2+Math.floor(rng()*3);const ix=Math.round(x),iy=Math.round(y),iz=Math.round(z);
      for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)for(let dz=-r;dz<=r;dz++)
        if(dx*dx+dy*dy+dz*dz<=r*r+1)caveDig(ix+dx,iy+dy,iz+dz);
    }
  }
  // --- 3) SHAFTS: deep vertical wells -----------------------------------
  const shaftCount=Math.floor((WORLD_W*WORLD_D)/65000)+10;
  for(let i=0;i<shaftCount;i++){
    const cx=3+Math.floor(rng()*(WORLD_W-6));
    const cz=3+Math.floor(rng()*(WORLD_D-6));
    const top=heightMap[colIndex(cx,cz)]-4;const bottom=3+Math.floor(rng()*8);
    if(top<=bottom+8)continue;
    const r=2+Math.floor(rng()*3);
    for(let y=bottom;y<=top;y++){
      const ox=Math.round(Math.sin(y*0.3)*1.5),oz=Math.round(Math.cos(y*0.27)*1.5);
      for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)
        if(dx*dx+dz*dz<=r*r)caveDig(cx+ox+dx,y,cz+oz+dz);
    }
  }
}
// ===========================================================================
// RAVINES — giant surface-to-deep gashes that slice through the terrain,
// exposing the underground layers to open air. Each ravine is a long,
// sinuous trench carved from near the surface down toward bedrock: the
// walls are nearly vertical, the floor is jagged, and the sky is visible
// from deep inside — the Minecraft 1.17+ ravine aesthetic.
// ===========================================================================
function carveRavines(){
  const rng=mulberry32((SEED^0x19a4c387)>>>0);
  const area=WORLD_W*WORLD_D;
  // One ravine per ~160 000 blocks of surface area; a 2416×2416 world gets ~36
  const count=Math.floor(area/160000)+14;
  for(let i=0;i<count;i++){
    // Seed the ravine on a random surface column
    const sx=8+Math.floor(rng()*(WORLD_W-16));
    const sz=8+Math.floor(rng()*(WORLD_D-16));
    const surfY=heightMap[colIndex(sx,sz)];
    // Ravines start ~6..12 blocks below the surface so the surface crust
    // stays intact (you discover them at the rim of the crack).
    const topY=surfY-4-Math.floor(rng()*8);
    // Floor near bedrock level (y 3..8) with a slight random variation
    const botY=3+Math.floor(rng()*6);
    if(topY-botY<18)continue;          // skip shallow spots

    // Width profile: the ravine is widest at mid-depth and tapers toward
    // both top and bottom, giving the iconic narrowed-crack silhouette.
    const maxW=4+Math.floor(rng()*5);  // half-width at widest point: 4..8

    // Direction the ravine runs horizontally. A gentle yaw drift makes it
    // meander naturally rather than going perfectly straight.
    let yaw=rng()*Math.PI*2;
    const segLen=2+Math.floor(rng()*2); // step size along the path
    // Total path length determines how long the ravine is
    const steps=60+Math.floor(rng()*80); // 120..300 blocks long

    let cx=sx,cz=sz;
    for(let s=0;s<steps;s++){
      // Gentle curve
      yaw+=(rng()-0.5)*0.18;
      cx+=Math.cos(yaw)*segLen;
      cz+=Math.sin(yaw)*segLen;
      const ix=Math.round(cx),iz=Math.round(cz);
      if(ix<4||ix>=WORLD_W-4||iz<4||iz>=WORLD_D-4)break;

      // Vertical noise offsets the effective top/bottom at each segment so
      // the floor and ceiling are uneven and organic-looking.
      const nTop=Math.round(valueNoise3(cx/22,0,cz/22,317)*8-4);
      const nBot=Math.round(valueNoise3(cx/18,1,cz/18,319)*6-3);
      const segTop=Math.min(surfY-3,topY+nTop);
      const segBot=Math.max(2,botY+nBot);

      // Width also varies per segment using noise for organic edges
      const wNoise=valueNoise3(cx/16,2,cz/16,321)*0.6+0.4; // 0.4..1.0

      for(let y=segBot;y<=segTop;y++){
        // Width tapers: widest at 40% up from the floor, narrow at top & bottom
        const frac=(y-segBot)/(segTop-segBot);           // 0=floor, 1=top
        const profile=Math.sin(frac*Math.PI);            // bell curve 0→1→0
        const w=Math.max(1,Math.round(maxW*profile*wNoise));

        // Horizontal cross-section is an ellipse on x/z, with noise wobble
        for(let dx=-w;dx<=w;dx++)for(let dz=-w;dz<=w;dz++){
          const wob=valueNoise3((ix+dx)/8,(y)/12,(iz+dz)/8,323)*0.35;
          const dd=(dx*dx+dz*dz)/(w*w);
          if(dd>1+wob-0.1)continue;
          caveDig(ix+dx,y,iz+dz);
        }
      }
    }
  }
}

// ===========================================================================
// ===========================================================================

function isCaveAir(x,y,z){return getBlock(x,y,z)===B.AIR;}
function ceilingAbove(x,y,z,maxUp){for(let dy=1;dy<=maxUp;dy++){const id=getBlock(x,y+dy,z);if(id===B.AIR)continue;if(id===B.WATER||id===B.LAVA)return -1;return y+dy-1;}return -1;}
function floorBelow(x,y,z,maxDown){for(let dy=1;dy<=maxDown;dy++){const id=getBlock(x,y-dy,z);if(id===B.AIR)continue;if(id===B.WATER||id===B.LAVA)return -1;return y-dy+1;}return -1;}

function growStalactite(x,topY,z,len){for(let i=0;i<len;i++){const yy=topY-i;if(yy<=1)break;if(getBlock(x,yy,z)!==B.AIR)break;world[blockIndex(x,yy,z)]=B.DRIPSTONE;}}
function growStalagmite(x,botY,z,len){for(let i=0;i<len;i++){const yy=botY+i;if(yy>=WORLD_H-1)break;if(getBlock(x,yy,z)!==B.AIR)break;world[blockIndex(x,yy,z)]=B.DRIPSTONE;}}

function decorateChamber(cx,cy,cz,rx,ry,rz,opts){
  const rng=opts.rng;
  const x0=Math.max(2,cx-rx-1),x1=Math.min(WORLD_W-3,cx+rx+1);
  const z0=Math.max(2,cz-rz-1),z1=Math.min(WORLD_D-3,cz+rz+1);
  const yTop=Math.min(WORLD_H-2,cy+ry+1),yBot=Math.max(2,cy-ry-1);
  if(opts.lake){
    const liquid=opts.lake;             // B.LAVA or B.WATER
    const level=cy-ry+1+Math.floor((ry)*0.55);
    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
      let floorY=-1;
      for(let y=yBot;y<=cy+ry;y++){ if(getBlock(x,y,z)===B.AIR){ if(getBlock(x,y-1,z)!==B.AIR){floorY=y;} break; } }
      if(floorY<0)continue;
      const d=((x-cx)*(x-cx))/(rx*rx)+((z-cz)*(z-cz))/(rz*rz);
      if(d>1.05)continue;
      for(let y=floorY;y<=level&&y<WORLD_H;y++){ if(getBlock(x,y,z)===B.AIR)world[blockIndex(x,y,z)]=liquid; }
    }
  }
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
    const d=((x-cx)*(x-cx))/(rx*rx)+((z-cz)*(z-cz))/(rz*rz);
    if(d>1.05)continue;
    let ceil=-1,flr=-1;
    for(let y=yTop;y>=yBot;y--){ if(getBlock(x,y,z)===B.AIR&&getBlock(x,y+1,z)!==B.AIR&&getBlock(x,y+1,z)!==B.WATER&&getBlock(x,y+1,z)!==B.LAVA){ceil=y;break;} }
    for(let y=yBot;y<=yTop;y++){ const below=getBlock(x,y-1,z); if(getBlock(x,y,z)===B.AIR&&below!==B.AIR){flr=y;break;} }
    if(ceil>0&&rng()<opts.dripP){ growStalactite(x,ceil,z,1+Math.floor(rng()*opts.dripLen)); }
    if(flr>0){
      const ground=getBlock(x,flr-1,z);
      if(ground!==B.WATER&&ground!==B.LAVA){
        if(rng()<opts.dripP*0.8){ growStalagmite(x,flr,z,1+Math.floor(rng()*opts.dripLen)); }
        else if(opts.moss&&rng()<opts.mossP){ world[blockIndex(x,flr-1,z)]=B.MOSS; if(rng()<0.25&&getBlock(x,flr,z)===B.AIR)world[blockIndex(x,flr,z)]=B.GLOW_LICHEN; }
      }
    }
    if(opts.lichen&&ceil>0&&rng()<opts.lichenP&&getBlock(x,ceil,z)===B.AIR){ world[blockIndex(x,ceil,z)]=B.GLOW_LICHEN; }
  }
}

function carveCaveFeatures(){
  const rng=mulberry32((SEED^0x68bc21ab)>>>0);
  const area=WORLD_W*WORLD_D;
  // --- Generic lime-decorated chambers (moss, glow lichen, dripstone) ------
  const limeCount=Math.floor(area/65000)+8;
  for(let i=0;i<limeCount;i++){
    const cx=6+Math.floor(rng()*(WORLD_W-12));
    const cz=6+Math.floor(rng()*(WORLD_D-12));
    const cy=10+Math.floor(rng()*30);
    const rx=10+Math.floor(rng()*10),ry=6+Math.floor(rng()*5),rz=10+Math.floor(rng()*10);
    if(heightMap[colIndex(cx,cz)]<cy+ry+4)continue;
    for(let dx=-rx;dx<=rx;dx++)for(let dy=-ry;dy<=ry;dy++)for(let dz=-rz;dz<=rz;dz++){
      const wob=valueNoise3((cx+dx)/8,(cy+dy)/8,(cz+dz)/8,211)*0.4;
      const d=(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)+(dz*dz)/(rz*rz);
      if(d<=1-wob+0.22)caveDig(cx+dx,cy+dy,cz+dz);
    }
    decorateChamber(cx,cy,cz,rx,ry,rz,{rng,dripP:0.30,dripLen:6,moss:true,mossP:0.18,lichen:true,lichenP:0.10});
  }
  // --- Deep lava chambers ---------------------------------------------------
  const lavaCount=Math.floor(area/110000)+5;
  for(let i=0;i<lavaCount;i++){
    const cx=6+Math.floor(rng()*(WORLD_W-12));
    const cz=6+Math.floor(rng()*(WORLD_D-12));
    const cy=5+Math.floor(rng()*10);
    const rx=12+Math.floor(rng()*10),ry=5+Math.floor(rng()*4),rz=12+Math.floor(rng()*10);
    if(heightMap[colIndex(cx,cz)]<cy+ry+6)continue;
    for(let dx=-rx;dx<=rx;dx++)for(let dy=-ry;dy<=ry;dy++)for(let dz=-rz;dz<=rz;dz++){
      const wob=valueNoise3((cx+dx)/9,(cy+dy)/9,(cz+dz)/9,221)*0.4;
      const d=(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)+(dz*dz)/(rz*rz);
      if(d<=1-wob+0.28)caveDig(cx+dx,cy+dy,cz+dz);
    }
    decorateChamber(cx,cy,cz,rx,ry,rz,{rng,dripP:0.14,dripLen:4,moss:false,mossP:0,lichen:false,lichenP:0,lake:B.LAVA});
  }
  // --- Underground lakes (water chambers) ----------------------------------
  const waterCount=Math.floor(area/110000)+5;
  for(let i=0;i<waterCount;i++){
    const cx=6+Math.floor(rng()*(WORLD_W-12));
    const cz=6+Math.floor(rng()*(WORLD_D-12));
    const cy=16+Math.floor(rng()*22);
    const rx=12+Math.floor(rng()*10),ry=5+Math.floor(rng()*4),rz=12+Math.floor(rng()*10);
    if(heightMap[colIndex(cx,cz)]<cy+ry+6)continue;
    for(let dx=-rx;dx<=rx;dx++)for(let dy=-ry;dy<=ry;dy++)for(let dz=-rz;dz<=rz;dz++){
      const wob=valueNoise3((cx+dx)/9,(cy+dy)/9,(cz+dz)/9,231)*0.4;
      const d=(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)+(dz*dz)/(rz*rz);
      if(d<=1-wob+0.28)caveDig(cx+dx,cy+dy,cz+dz);
    }
    decorateChamber(cx,cy,cz,rx,ry,rz,{rng,dripP:0.18,dripLen:5,moss:true,mossP:0.22,lichen:true,lichenP:0.12,lake:B.WATER});
  }
}

// ===========================================================================
// LUSH CAVES — warm, damp underground biome filled with azalea roots above,
// spore blossoms on the ceiling, hanging vines, lush green moss on every
// surface, and a tranquil underground pool. Lit gently by glow lichen.
// DRIPSTONE CAVES — cold limestone chambers decorated with massive pointed
// stalactites hanging from the ceiling and stalagmites rising from the floor,
// calcite-banded walls, and occasional underground streams.
// Both cave biomes carve their own large chambers and fill them with their
// signature decorations.
// ===========================================================================

// Place a block safely, only overwriting stone/dirt/gravel/air
function cavePlaceFloor(x,y,z,id){
  if(x<1||x>=WORLD_W-1||z<1||z>=WORLD_D-1||y<1||y>=WORLD_H-1)return;
  const cur=world[blockIndex(x,y,z)];
  if(cur===B.AIR||cur===B.STONE||cur===B.DIRT||cur===B.GRAVEL)world[blockIndex(x,y,z)]=id;
}
// Hang vines down from a ceiling block — reuse GLOW_LICHEN for spore blossoms
// and TALL_GRASS texture already cross-shaped for vines
function hangVines(x,ceilY,z,len){
  for(let i=1;i<=len;i++){
    const yy=ceilY-i;
    if(yy<2)break;
    const cur=getBlock(x,yy,z);
    if(cur!==B.AIR)break;
    // alternate glow lichen (luminescent) and moss for the vine strip
    world[blockIndex(x,yy,z)]=(i===1)?B.GLOW_LICHEN:B.MOSS;
  }
}

function placeCaveBiomes(){
  const rng=mulberry32((SEED^0x5d2bc3f1)>>>0);
  const area=WORLD_W*WORLD_D;

  // ---- LUSH CAVE chambers -------------------------------------------------
  // Wider, taller chambers, mid-depth (y 14..40), decorated with moss,
  // glow lichen ceiling, hanging vine strips, and small water pools.
  const lushCount=Math.floor(area/90000)+8;
  for(let i=0;i<lushCount;i++){
    const cx=8+Math.floor(rng()*(WORLD_W-16));
    const cz=8+Math.floor(rng()*(WORLD_D-16));
    const cy=14+Math.floor(rng()*26);
    const rx=12+Math.floor(rng()*10),ry=7+Math.floor(rng()*6),rz=12+Math.floor(rng()*10);
    if(heightMap[colIndex(cx,cz)]<cy+ry+5)continue;

    // Carve the chamber
    for(let dx=-rx;dx<=rx;dx++)for(let dy=-ry;dy<=ry;dy++)for(let dz=-rz;dz<=rz;dz++){
      const wob=valueNoise3((cx+dx)/9,(cy+dy)/9,(cz+dz)/9,411)*0.42;
      const d=(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)+(dz*dz)/(rz*rz);
      if(d<=1-wob+0.24)caveDig(cx+dx,cy+dy,cz+dz);
    }

    // Decorate: moss floors/walls, glow lichen ceiling, hanging vines, water pool
    const x0=Math.max(2,cx-rx-1),x1=Math.min(WORLD_W-3,cx+rx+1);
    const z0=Math.max(2,cz-rz-1),z1=Math.min(WORLD_D-3,cz+rz+1);
    const yTop=Math.min(WORLD_H-2,cy+ry+1),yBot=Math.max(2,cy-ry-1);

    // Water pool level: ~40% up from the floor
    const poolLevel=Math.floor(yBot+(cy-yBot)*0.55);

    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
      const dd=((x-cx)*(x-cx))/(rx*rx)+((z-cz)*(z-cz))/(rz*rz);
      if(dd>1.05)continue;

      // Find floor and ceiling inside the chamber
      let floorY=-1,ceilY=-1;
      for(let y=yBot;y<=yTop;y++){
        if(getBlock(x,y,z)===B.AIR&&getBlock(x,y-1,z)!==B.AIR&&floorY<0)floorY=y;
      }
      for(let y=yTop;y>=yBot;y--){
        if(getBlock(x,y,z)===B.AIR&&getBlock(x,y+1,z)!==B.AIR&&ceilY<0)ceilY=y;
      }

      // Floor: moss carpet covering stone/dirt floor
      if(floorY>0){
        const below=getBlock(x,floorY-1,z);
        if(below!==B.AIR&&below!==B.WATER&&below!==B.LAVA&&below!==B.BEDROCK){
          // Replace stone/dirt/gravel floor with moss
          if(below===B.STONE||below===B.DIRT||below===B.GRAVEL)
            world[blockIndex(x,floorY-1,z)]=B.MOSS;
          // Small water pool at the centre depression
          const poolDist=((x-cx)*(x-cx))/(rx*rx*0.25)+((z-cz)*(z-cz))/(rz*rz*0.25);
          if(poolDist<0.9&&floorY<=poolLevel&&getBlock(x,floorY,z)===B.AIR)
            world[blockIndex(x,floorY,z)]=B.WATER;
          // Occasional glow lichen on the floor surface
          else if(rng()<0.12&&getBlock(x,floorY,z)===B.AIR)
            world[blockIndex(x,floorY,z)]=B.GLOW_LICHEN;
        }
      }

      // Ceiling: dense glow lichen (spore blossom stand-in) + hanging vines
      if(ceilY>0){
        const ceilBlock=getBlock(x,ceilY+1,z);
        if(ceilBlock!==B.AIR&&ceilBlock!==B.WATER&&ceilBlock!==B.BEDROCK){
          // Replace ceiling stone with moss
          if(ceilBlock===B.STONE||ceilBlock===B.DIRT)
            world[blockIndex(x,ceilY+1,z)]=B.MOSS;
          // Spore blossoms (glow lichen) hang from the ceiling
          if(rng()<0.35&&getBlock(x,ceilY,z)===B.AIR)
            world[blockIndex(x,ceilY,z)]=B.GLOW_LICHEN;
          // Hanging vines (moss chains) dropping down
          else if(rng()<0.18&&getBlock(x,ceilY,z)===B.AIR)
            hangVines(x,ceilY,z,1+Math.floor(rng()*5));
        }
      }
    }

    // Azalea bush surface: replace surface blocks directly above lush caves
    // with grass/leaves to hint at the cave below (surface azalea indicator)
    const surfX=Math.max(3,cx-3),surfX1=Math.min(WORLD_W-4,cx+3);
    const surfZ=Math.max(3,cz-3),surfZ1=Math.min(WORLD_D-4,cz+3);
    for(let x=surfX;x<=surfX1;x++)for(let z=surfZ;z<=surfZ1;z++){
      const sh=heightMap[colIndex(x,z)];
      if(sh<SEA_LEVEL+1)continue;
      const sb=world[blockIndex(x,sh,z)];
      // Plant azalea (cherry leaves = pinkish-green stand-in) on surface
      if((sb===B.GRASS||sb===B.DIRT)&&getBlock(x,sh+1,z)===B.AIR&&rng()<0.25)
        world[blockIndex(x,sh+1,z)]=B.CHERRY_LEAVES;
    }
  }

  // ---- DRIPSTONE CAVE chambers -------------------------------------------
  // Large, jagged chambers with abundant massive stalactites and stalagmites,
  // calcite-banded walls, and a limestone (calcite) floor/ceiling treatment.
  const dripCount=Math.floor(area/80000)+10;
  for(let i=0;i<dripCount;i++){
    const cx=8+Math.floor(rng()*(WORLD_W-16));
    const cz=8+Math.floor(rng()*(WORLD_D-16));
    const cy=8+Math.floor(rng()*28);
    const rx=13+Math.floor(rng()*12),ry=8+Math.floor(rng()*7),rz=13+Math.floor(rng()*12);
    if(heightMap[colIndex(cx,cz)]<cy+ry+5)continue;

    // Carve the chamber — more irregular (higher wobble) for the jagged look
    for(let dx=-rx;dx<=rx;dx++)for(let dy=-ry;dy<=ry;dy++)for(let dz=-rz;dz<=rz;dz++){
      const wob=valueNoise3((cx+dx)/7,(cy+dy)/7,(cz+dz)/7,511)*0.50;
      const d=(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)+(dz*dz)/(rz*rz);
      if(d<=1-wob+0.28)caveDig(cx+dx,cy+dy,cz+dz);
    }

    // Line chamber walls/ceiling/floor with calcite (limestone banding)
    for(let dx=-rx-1;dx<=rx+1;dx++)for(let dy=-ry-1;dy<=ry+1;dy++)for(let dz=-rz-1;dz<=rz+1;dz++){
      const wob=valueNoise3((cx+dx)/7,(cy+dy)/7,(cz+dz)/7,511)*0.50;
      const d=(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)+(dz*dz)/(rz*rz);
      const onWall=d>1-wob+0.28&&d<=1-wob+0.55;
      if(!onWall)continue;
      const xx=cx+dx,yy=cy+dy,zz=cz+dz;
      if(xx<1||xx>=WORLD_W-1||yy<1||yy>=WORLD_H-1||zz<1||zz>=WORLD_D-1)continue;
      const cur=world[blockIndex(xx,yy,zz)];
      if(cur===B.STONE)world[blockIndex(xx,yy,zz)]=B.CALCITE;
    }

    // Massive stalactites from ceiling + stalagmites from floor
    const x0=Math.max(2,cx-rx-1),x1=Math.min(WORLD_W-3,cx+rx+1);
    const z0=Math.max(2,cz-rz-1),z1=Math.min(WORLD_D-3,cz+rz+1);
    const yTop=Math.min(WORLD_H-2,cy+ry+1),yBot=Math.max(2,cy-ry-1);

    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
      const dd=((x-cx)*(x-cx))/(rx*rx)+((z-cz)*(z-cz))/(rz*rz);
      if(dd>1.0)continue;

      let floorY=-1,ceilY=-1;
      for(let y=yBot;y<=yTop;y++){
        if(getBlock(x,y,z)===B.AIR&&getBlock(x,y-1,z)!==B.AIR&&floorY<0)floorY=y;
      }
      for(let y=yTop;y>=yBot;y--){
        if(getBlock(x,y,z)===B.AIR&&getBlock(x,y+1,z)!==B.AIR&&ceilY<0)ceilY=y;
      }

      // Ceiling stalactites — large, varied lengths, clusters
      if(ceilY>0&&rng()<0.55){
        const ceilBlock=getBlock(x,ceilY+1,z);
        if(ceilBlock===B.STONE||ceilBlock===B.CALCITE){
          // Replace ceiling with calcite for limestone look
          world[blockIndex(x,ceilY+1,z)]=B.CALCITE;
          // Large stalactite: up to 14 blocks long with wider base
          const len=3+Math.floor(rng()*12);
          for(let j=0;j<len;j++){
            const yy=ceilY-j;if(yy<2)break;
            if(getBlock(x,yy,z)!==B.AIR)break;
            world[blockIndex(x,yy,z)]=B.DRIPSTONE;
            // Widen the base: first few blocks get flanking stones
            if(j<2){
              const sides=[[1,0],[-1,0],[0,1],[0,-1]];
              for(const[ax,az]of sides){
                const sx=x+ax,sz=z+az;
                if(sx<1||sx>=WORLD_W-1||sz<1||sz>=WORLD_D-1)continue;
                if(j===0&&rng()<0.55&&getBlock(sx,yy,sz)===B.AIR)
                  world[blockIndex(sx,yy,sz)]=B.DRIPSTONE;
              }
            }
          }
        }
      }

      // Floor stalagmites — rising pillars, sometimes meeting stalactites
      if(floorY>0&&rng()<0.50){
        const floorBlock=getBlock(x,floorY-1,z);
        if(floorBlock===B.STONE||floorBlock===B.CALCITE||floorBlock===B.DIRT){
          world[blockIndex(x,floorY-1,z)]=B.CALCITE;
          const len=2+Math.floor(rng()*10);
          for(let j=0;j<len;j++){
            const yy=floorY+j;if(yy>=WORLD_H-1)break;
            if(getBlock(x,yy,z)!==B.AIR)break;
            world[blockIndex(x,yy,z)]=B.DRIPSTONE;
            // Widen the base
            if(j<2){
              const sides=[[1,0],[-1,0],[0,1],[0,-1]];
              for(const[ax,az]of sides){
                const sx=x+ax,sz=z+az;
                if(sx<1||sx>=WORLD_W-1||sz<1||sz>=WORLD_D-1)continue;
                if(j===0&&rng()<0.45&&getBlock(sx,yy,sz)===B.AIR)
                  world[blockIndex(sx,yy,sz)]=B.DRIPSTONE;
              }
            }
          }
        }
      }

      // Glow lichen patches on chamber walls for soft illumination
      if(rng()<0.08&&ceilY>0&&getBlock(x,ceilY,z)===B.AIR)
        world[blockIndex(x,ceilY,z)]=B.GLOW_LICHEN;
    }

    // Occasional underground water drip pool at the centre
    if(rng()<0.45){
      const poolR=3+Math.floor(rng()*4);
      for(let dx=-poolR;dx<=poolR;dx++)for(let dz=-poolR;dz<=poolR;dz++){
        if(dx*dx+dz*dz>poolR*poolR)continue;
        const px=cx+dx,pz=cz+dz;
        if(px<2||px>=WORLD_W-2||pz<2||pz>=WORLD_D-2)continue;
        // Find floor
        for(let y=yBot+1;y<=cy;y++){
          if(getBlock(px,y,pz)===B.AIR&&getBlock(px,y-1,pz)!==B.AIR){
            world[blockIndex(px,y,pz)]=B.WATER;break;
          }
        }
      }
    }
  }
}

function placeAmethystGeodes(){
  const rng=mulberry32((SEED^0x3c6ef372)>>>0);
  const count=Math.floor((WORLD_W*WORLD_D)/170000)+3;
  for(let i=0;i<count;i++){
    const cx=8+Math.floor(rng()*(WORLD_W-16));
    const cz=8+Math.floor(rng()*(WORLD_D-16));
    const r=5+Math.floor(rng()*3);
    const cy=r+4+Math.floor(rng()*22);
    if(cy+r+3>=heightMap[colIndex(cx,cz)])continue;
    buildGeode(cx,cy,cz,r,rng);
  }
}
function buildGeode(cx,cy,cz,r,rng){
  const outer=r+2, mid=r+1, inner=r;
  for(let dx=-outer;dx<=outer;dx++)for(let dy=-outer;dy<=outer;dy++)for(let dz=-outer;dz<=outer;dz++){
    const x=cx+dx,y=cy+dy,z=cz+dz;
    if(x<1||x>=WORLD_W-1||y<1||y>=WORLD_H-1||z<1||z>=WORLD_D-1)continue;
    const wob=valueNoise3(x/6,y/6,z/6,241)*0.6;
    const dist=Math.sqrt(dx*dx+dy*dy+dz*dz)+wob;
    if(dist>outer+0.5)continue;
    if(dist>mid+0.5){ if(getBlock(x,y,z)!==B.BEDROCK)world[blockIndex(x,y,z)]=B.SMOOTH_BASALT; }
    else if(dist>inner+0.5){ world[blockIndex(x,y,z)]=B.CALCITE; }
    else if(dist>inner-0.6){ world[blockIndex(x,y,z)]=B.AMETHYST_BLOCK; }
    else { world[blockIndex(x,y,z)]=B.AIR; }
  }
  for(let dx=-inner;dx<=inner;dx++)for(let dy=-inner;dy<=inner;dy++)for(let dz=-inner;dz<=inner;dz++){
    const x=cx+dx,y=cy+dy,z=cz+dz;
    if(getBlock(x,y,z)!==B.AIR)continue;
    const nb=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    let touch=false;for(const[ax,ay,az] of nb){ if(getBlock(x+ax,y+ay,z+az)===B.AMETHYST_BLOCK){touch=true;break;} }
    if(touch&&rng()<0.55)world[blockIndex(x,y,z)]=B.AMETHYST_CLUSTER;
  }
}

function placeOresAndGravel(){for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){const h=heightMap[colIndex(x,z)];for(let y=1;y<Math.min(h-2,WORLD_H);y++){if(world[blockIndex(x,y,z)]!==B.STONE)continue;const cx=x>>1,cy=y>>1,cz=z>>1;if(y<=8&&hash3(cx,cy,cz,96)<0.06)world[blockIndex(x,y,z)]=B.OBSIDIAN;else if(y<=16&&hash3(cx,cy,cz,94)<0.013)world[blockIndex(x,y,z)]=B.DIAMOND_ORE;else if(y<=28&&hash3(cx,cy,cz,93)<0.016)world[blockIndex(x,y,z)]=B.GOLD_ORE;else if(y<=50&&hash3(cx,cy,cz,92)<0.028)world[blockIndex(x,y,z)]=B.IRON_ORE;else if(y>=14&&hash3(cx,cy,cz,91)<0.04)world[blockIndex(x,y,z)]=B.COAL_ORE;else if(hash3(cx,cy,cz,95)<0.022)world[blockIndex(x,y,z)]=B.GRAVEL;}
if(h<=SEA_LEVEL+2&&valueNoise(x/9,z/9,57)>0.76){for(let y=Math.max(1,h-1);y<=h;y++)
if(world[blockIndex(x,y,z)]===B.SAND||world[blockIndex(x,y,z)]===B.DIRT)
world[blockIndex(x,y,z)]=B.GRAVEL;}}}}
// Place a leaf block only into empty air (never overwrite logs/terrain).
function setLeaf(x,y,z,id){if(x<0||x>=WORLD_W||z<0||z>=WORLD_D||y<1||y>=WORLD_H)return;if(world[blockIndex(x,y,z)]===B.AIR)world[blockIndex(x,y,z)]=id;}
// ACACIA tree: a short bare trunk that forks near the top into a wide, flat
// umbrella canopy — the signature silhouette of the savanna.
function buildAcaciaTree(x,h,z){
  const trunkH=4+Math.floor(hash2(x,z,41)*3);            // 4..6 bare trunk
  world[blockIndex(x,h,z)]=B.DIRT;
  for(let y=1;y<=trunkH;y++)world[blockIndex(x,h+y,z)]=B.ACACIA_LOG;
  // lean the top a step to one side so the canopy sits off-centre like a real acacia
  const dx=hash2(x,z,42)<0.5?-1:1,dz=hash2(x,z,43)<0.5?-1:1;
  const tx=x+dx,tz=z+dz,ty=h+trunkH;
  if(ty+1<WORLD_H){world[blockIndex(tx,ty+1,tz)]=B.ACACIA_LOG;}
  const cy=ty+1;
  // a flat 5x5 (rounded) plate of leaves, 1-2 blocks thick
  for(let layer=0;layer<2;layer++){const r=layer===0?2:1;
    for(let ddx=-r-1;ddx<=r+1;ddx++)for(let ddz=-r-1;ddz<=r+1;ddz++){
      if(Math.abs(ddx)+Math.abs(ddz)>r+1)continue;
      setLeaf(tx+ddx,cy+layer,tz+ddz,B.ACACIA_LEAVES);
    }
  }
}
// SPRUCE tree: tall, narrow conifer with tiered rings of needles that taper to
// a pointed tip — the classic taiga look.
function buildSpruceTree(x,h,z){
  const trunkH=7+Math.floor(hash2(x,z,44)*5);            // 7..11 tall
  world[blockIndex(x,h,z)]=B.DIRT;
  for(let y=1;y<=trunkH;y++)world[blockIndex(x,h+y,z)]=B.SPRUCE_LOG;
  // rings of needles every layer, radius pulsing wide->narrow up the trunk
  let ring=0;
  for(let y=trunkH-1;y>=2;y--){
    // wider rings every other layer near the bottom, shrinking toward the top
    const frac=(y-2)/(trunkH-2);                          // 1 at bottom .. 0 at top
    const r=(ring%2===0)?(frac>0.6?2:(frac>0.25?2:1)):1;
    ring++;
    for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
      if(dx===0&&dz===0)continue;
      if(Math.abs(dx)+Math.abs(dz)>r)continue;
      setLeaf(x+dx,h+y,z+dz,B.SPRUCE_LEAVES);
    }
  }
  // pointed tip
  setLeaf(x,h+trunkH+1,z,B.SPRUCE_LEAVES);
  setLeaf(x,h+trunkH,z,B.SPRUCE_LEAVES);
}
// GIANT tree: a colossal 2x2 oak trunk soaring 20m+ with a vast spherical
// canopy. Dwarfs everything around it and casts the forest floor into shade.
function buildGiantTree(x,h,z){
  const trunkH=20+Math.floor(hash2(x,z,45)*9);           // 20..28 blocks tall
  // 2x2 trunk footprint
  const cols=[[0,0],[1,0],[0,1],[1,1]];
  for(const[ox,oz]of cols){if(x+ox<WORLD_W&&z+oz<WORLD_D){world[blockIndex(x+ox,h,z+oz)]=B.DIRT;for(let y=1;y<=trunkH;y++)world[blockIndex(x+ox,h+y,z+oz)]=B.LOG;}}
  // big rounded canopy centred just above the trunk top, between the 4 columns
  const ccx=x+0.5,ccz=z+0.5,ccy=h+trunkH+2;
  const R=6+Math.floor(hash2(x,z,46)*3);                 // 6..8 canopy radius
  for(let dy=-R+1;dy<=R;dy++)for(let dx=-R;dx<=R;dx++)for(let dz=-R;dz<=R;dz++){
    const d=Math.sqrt((dx)*(dx)+(dy*1.15)*(dy*1.15)+(dz)*(dz));
    if(d>R)continue;
    if(d>R-1.2&&hash2(x+dx*13,z+dz*7,(dy+30))<0.45)continue; // ragged edge
    setLeaf(Math.round(ccx+dx),Math.round(ccy+dy),Math.round(ccz+dz),B.LEAVES);
  }
  // a few branches reaching out from the trunk into the canopy
  for(let b=0;b<5;b++){const by=h+trunkH-2-Math.floor(hash2(x+b,z,47)*6);const ang=hash2(x,z+b,48)*Math.PI*2;
    let bx=x+0.5,bz=z+0.5;for(let s=1;s<=4;s++){bx+=Math.cos(ang);bz+=Math.sin(ang);
      const ix=Math.round(bx),iz=Math.round(bz),iy=by+Math.floor(s/2);
      if(ix>=0&&ix<WORLD_W&&iz>=0&&iz<WORLD_D&&iy>0&&iy<WORLD_H&&world[blockIndex(ix,iy,iz)]===B.AIR)world[blockIndex(ix,iy,iz)]=B.LOG;}}
}
// CHERRY tree: a softly-rounded oak-like tree wreathed in bright pink blossom
// leaves, with a few hanging petal strands beneath the canopy.
function buildCherryTree(x,h,z){
  const trunkH=5+Math.floor(hash2(x,z,49)*3);            // 5..7
  world[blockIndex(x,h,z)]=B.DIRT;
  for(let y=1;y<=trunkH;y++)world[blockIndex(x,h+y,z)]=B.CHERRY_LOG;
  const cy=h+trunkH;
  const canopy=[[-1,3],[0,3],[1,2],[2,1]];
  for(const[dyo,r]of canopy){const yy=cy+dyo;
    for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
      if(dx===0&&dz===0&&dyo<0)continue;
      const dist=Math.sqrt(dx*dx+dz*dz);
      if(dist>r+0.3)continue;
      if(dist>r-0.6&&hash2(x+dx*5,z+dz*5,dyo*3+7)<0.4)continue;
      setLeaf(x+dx,yy,z+dz,B.CHERRY_LEAVES);
    }
  }
  // hanging blossom strands (petal cross-plants) drooping from the lower canopy
  for(let i=0;i<4;i++){const ang=hash2(x,z+i,50)*Math.PI*2;const ddx=Math.round(Math.cos(ang)*2),ddz=Math.round(Math.sin(ang)*2);
    const sx=x+ddx,sz=z+ddz;let sy=cy-2;
    if(sx>=0&&sx<WORLD_W&&sz>=0&&sz<WORLD_D&&world[blockIndex(sx,sy,sz)]===B.AIR&&world[blockIndex(sx,sy+1,sz)]===B.CHERRY_LEAVES){world[blockIndex(sx,sy,sz)]=B.CHERRY_PETALS;}}
}
// MANGROVE tree: a tree that rises out of shallow water on a tangle of prop
// roots. A small spread of MANGROVE_ROOTS blocks is raised from the submerged
// floor up to ~1 block above the waterline so you can hop across the swamp on
// them; the trunk climbs above that into a rounded green canopy.
function buildMangroveTree(x,h,z){
  // root pad: the column itself plus a few neighbours raised to a walkable level
  const rootTop=SEA_LEVEL+1;                              // walk surface, 1 above water
  const roots=[[0,0],[1,0],[-1,0],[0,1],[0,-1]];
  for(const[ox,oz]of roots){const rx=x+ox,rz=z+oz;if(rx<0||rx>=WORLD_W||rz<0||rz>=WORLD_D)continue;
    const rh=heightMap[colIndex(rx,rz)];
    // skip far-flung roots sometimes so the tangle looks organic
    if((ox!==0||oz!==0)&&hash2(rx*3,rz*3,55)<0.35)continue;
    for(let y=rh+1;y<=rootTop;y++){if(y<1||y>=WORLD_H)continue;const cur=world[blockIndex(rx,y,rz)];if(cur===B.WATER||cur===B.AIR)world[blockIndex(rx,y,rz)]=B.MANGROVE_ROOTS;}
  }
  // trunk grows up from the root pad
  const base=rootTop+1;const trunkH=4+Math.floor(hash2(x,z,56)*3); // 4..6
  for(let y=0;y<trunkH;y++){const yy=base+y;if(yy>=WORLD_H)break;world[blockIndex(x,yy,z)]=B.MANGROVE_LOG;}
  // rounded leafy canopy on top
  const cy=base+trunkH;
  const canopy=[[-1,2],[0,2],[1,1]];
  for(const[dyo,r]of canopy){const yy=cy+dyo;
    for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
      if(Math.abs(dx)+Math.abs(dz)>r+0)continue;
      setLeaf(x+dx,yy,z+dz,B.MANGROVE_LEAVES);
    }
  }
  setLeaf(x,cy+2,z,B.MANGROVE_LEAVES);
}
// PALM tree (oasis): a slender, slightly leaning trunk topped by a radiating
// crown of frond leaves — the classic desert-oasis silhouette.
function buildPalmTree(x,h,z){
  const trunkH=5+Math.floor(hash2(x,z,57)*3);             // 5..7
  world[blockIndex(x,h,z)]=B.SAND;
  // lean the trunk gently to one side as it climbs
  const dir=hash2(x,z,58)<0.5?-1:1;let tx=x;
  for(let y=1;y<=trunkH;y++){if(y>trunkH-2&&y%1===0)tx+=0;const cx=x+Math.round((y/trunkH)*dir);const yy=h+y;if(yy>=WORLD_H)break;world[blockIndex(cx,yy,z)]=B.PALM_LOG;tx=cx;}
  const topX=x+Math.round(dir),topY=h+trunkH;
  // radiating fronds: 4 arms reaching out & drooping down
  setLeaf(topX,topY+1,z,B.PALM_LEAVES);
  const arms=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const[ax,az]of arms){
    setLeaf(topX+ax,topY+1,z+az,B.PALM_LEAVES);
    setLeaf(topX+ax*2,topY,z+az*2,B.PALM_LEAVES);
    setLeaf(topX+ax*2,topY-1,z+az*2,B.PALM_LEAVES);
  }
}
// MAPLE tree (autumn forest): an oak-shaped tree wearing fiery autumn foliage.
// Each tree picks one of red/orange/yellow leaves so a grove reads as a warm
// patchwork of autumn colour.
function buildMapleTree(x,h,z){
  const leafChoices=[B.MAPLE_LEAVES_RED,B.MAPLE_LEAVES_ORANGE,B.MAPLE_LEAVES_YELLOW];
  const leafId=leafChoices[Math.floor(hash2(x,z,59)*3)%3];
  const trunkH=4+Math.floor(hash2(x,z,60)*3);             // 4..6
  world[blockIndex(x,h,z)]=B.DIRT;
  for(let y=1;y<=trunkH;y++)world[blockIndex(x,h+y,z)]=B.MAPLE_LOG;
  const cy=h+trunkH;
  const canopy=[[-1,2],[0,2],[1,1]];
  for(const[dyo,r]of canopy){const yy=cy+dyo;
    for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
      if(dx===0&&dz===0&&dyo<0)continue;
      const dist=Math.abs(dx)+Math.abs(dz);
      if(dist>r&&hash2(x+dx*7,z+dz*7,dyo*3+61)<0.55)continue;
      setLeaf(x+dx,yy,z+dz,leafId);
    }
  }
  setLeaf(x,cy+2,z,leafId);
}
function placeVegetation(){placeReef();placeDeadTrees();for(let x=3;x<WORLD_W-3;x++){for(let z=3;z<WORLD_D-3;z++){const h=heightMap[colIndex(x,z)];const biome=biomeMap[colIndex(x,z)];
// MANGROVE & OASIS grow out of / beside water, so they must run before the
// generic "skip submerged columns" guard below.
if(biome===BIOME.MANGROVE){
  // trees rise from shallow water; need a submerged-or-low floor and headroom
  if(h>=SEA_LEVEL+2||h+12>=WORLD_H)continue;
  if(hash2(x+999,z-777,5)<=0.984)continue;             // sparse stilted trees
  buildMangroveTree(x,h,z);continue;
}
if(biome===BIOME.OASIS){
  // palms ring the pool: only on the sandy banks just above the waterline
  if(h<=SEA_LEVEL||h+10>=WORLD_H)continue;
  const surf0=world[blockIndex(x,h,z)];if(surf0!==B.SAND)continue;
  if(world[blockIndex(x,h+1,z)]!==B.AIR)continue;
  if(hash2(x+999,z-777,5)<=0.965)continue;
  buildPalmTree(x,h,z);continue;
}
if(h<=SEA_LEVEL+1||h+8>=WORLD_H)continue;const surf=world[blockIndex(x,h,z)];
// Biomes with no (tree) vegetation: oceans, bare mountains, volcanoes, mesas.
if(biome===BIOME.OCEAN||biome===BIOME.VOLCANO||biome===BIOME.MOUNTAINS||biome===BIOME.MESA)continue;
if(biome===BIOME.DESERT){if(surf!==B.SAND||hash2(x+555,z+333,6)<=0.994)continue;const ch=1+Math.floor(hash2(x,z,7)*3);for(let y=1;y<=ch;y++)
if(world[blockIndex(x,h+y,z)]===B.AIR)world[blockIndex(x,h+y,z)]=B.CACTUS;continue;}
// --- New biome trees -------------------------------------------------------
if(biome===BIOME.SAVANNA){
  // sparse acacia groves on the golden grass
  if(surf!==B.DRY_GRASS||hash2(x+999,z-777,5)<=0.991)continue;
  buildAcaciaTree(x,h,z);continue;
}
if(biome===BIOME.TAIGA){
  // moderately dense spruce forest
  if(surf!==B.GRASS||hash2(x+999,z-777,5)<=0.95)continue;
  if(h+13>=WORLD_H)continue;
  buildSpruceTree(x,h,z);continue;
}
if(biome===BIOME.GIANT_FOREST){
  // rare colossal trees; needs 2x2 of grass and plenty of headroom
  if(surf!==B.GRASS||hash2(x+999,z-777,5)<=0.992)continue;
  if(h+34>=WORLD_H)continue;
  if(world[blockIndex(x+1,h,z)]!==B.GRASS||world[blockIndex(x,h,z+1)]!==B.GRASS||world[blockIndex(x+1,h,z+1)]!==B.GRASS)continue;
  buildGiantTree(x,h,z);continue;
}
if(biome===BIOME.CHERRY){
  // blossoming grove — fairly dense pink trees
  if(surf!==B.GRASS||hash2(x+999,z-777,5)<=0.955)continue;
  if(h+12>=WORLD_H)continue;
  buildCherryTree(x,h,z);continue;
}
if(biome===BIOME.AUTUMN){
  // autumn forest — fairly dense maples in red/orange/yellow
  if(surf!==B.GRASS||hash2(x+999,z-777,5)<=0.95)continue;
  if(h+11>=WORLD_H)continue;
  buildMapleTree(x,h,z);continue;
}
if(biome===BIOME.FLOWER_FIELD){
  // flower fields are open meadows — only the rare scattered oak, the rest is
  // dense ground-cover flowers placed later.
  if(surf!==B.GRASS||hash2(x+999,z-777,5)<=0.997)continue;
}
// Tree spawn probability per biome (lower threshold => denser forest).
const treeP=biome===BIOME.JUNGLE?0.9:(biome===BIOME.FOREST?0.962:(biome===BIOME.SWAMP?0.985:(biome===BIOME.PLAINS?0.995:0.9965)));
if(hash2(x+999,z-777,5)<=treeP)continue;
const ground=biome===BIOME.SNOWY?B.SNOW:B.GRASS;if(surf!==ground)continue;
const birchP=biome===BIOME.SNOWY?0.5:(biome===BIOME.FOREST?0.3:(biome===BIOME.JUNGLE?0.05:0.2));
const isBirch=hash2(x+123,z+456,8)<birchP;const logId=isBirch?B.BIRCH_LOG:B.LOG,leafId=isBirch?B.BIRCH_LEAVES:B.LEAVES;
// Jungle trees are noticeably taller; swamp trees a touch shorter.
const baseTrunk=biome===BIOME.JUNGLE?7:(biome===BIOME.SWAMP?3:(isBirch?5:4));
const trunkH=baseTrunk+Math.floor(hash2(x,z,9)*(biome===BIOME.JUNGLE?4:2));
world[blockIndex(x,h,z)]=B.DIRT;for(let y=1;y<=trunkH;y++)world[blockIndex(x,h+y,z)]=logId;
const canopy=[[trunkH-2,2],[trunkH-1,2],[trunkH,1],[trunkH+1,1]];
for(const[dy,r]of canopy){for(let dx=-r;dx<=r;dx++){for(let dz=-r;dz<=r;dz++){
  if(dx===0&&dz===0&&dy<=trunkH)continue;
  const dist=Math.abs(dx)+Math.abs(dz);
  if(dist>r&&hash2(x+dx*7,z+dz*7,dy*3)<(dy>=trunkH?0.75:0.5))continue;
  const yy=h+dy,xx=x+dx,zz=z+dz;
  if(yy<WORLD_H&&world[blockIndex(xx,yy,zz)]===B.AIR)world[blockIndex(xx,yy,zz)]=leafId;
}}}
if(h+trunkH+2<WORLD_H&&world[blockIndex(x,h+trunkH+2,z)]===B.AIR&&hash2(x,z,99)<0.6)world[blockIndex(x,h+trunkH+2,z)]=leafId;
}}placeBamboo();placeGroundCover();}
// BAMBOO GROVES: dense thickets of slim, single-block-wide bamboo canes growing
// straight up. Each stalk is a vertical stack of BAMBOO blocks (3..7 tall).
// Groves are seeded as soft circular blobs of low-frequency noise inside warm,
// humid jungles so the canes cluster into believable bamboo forests rather than
// dotting the whole map. Placed after trees so canes fill the open gaps.
function placeBamboo(){
  for(let x=3;x<WORLD_W-3;x++){for(let z=3;z<WORLD_D-3;z++){
    const biome=biomeMap[colIndex(x,z)];
    if(biome!==BIOME.JUNGLE)continue;                 // bamboo lives in the jungle
    const h=heightMap[colIndex(x,z)];
    if(h<SEA_LEVEL||h+9>=WORLD_H)continue;            // skip submerged / too-tall columns
    if(world[blockIndex(x,h,z)]!==B.GRASS)continue;   // only on grassy ground
    if(world[blockIndex(x,h+1,z)]!==B.AIR)continue;   // keep clear of trunks/leaves
    // Grove mask: smooth blobs across the jungle become dense bamboo thickets.
    const grove=valueNoise(x/26,z/26,401);
    if(grove<0.58)continue;                            // outside a grove -> bare
    // Within a grove, fill most columns but leave organic gaps.
    const local=(grove-0.58)/0.42;                     // 0..1 toward grove centre
    const density=0.35+0.5*local;                      // denser at the core
    if(hash2(x+613,z-247,402)>density)continue;
    // Stalk height: taller toward the grove centre, with per-stalk jitter.
    const hgt=3+Math.floor(local*3)+Math.floor(hash2(x,z,403)*3); // 3..8
    for(let y=1;y<=hgt;y++){
      const yy=h+y;if(yy>=WORLD_H)break;
      if(world[blockIndex(x,yy,z)]!==B.AIR)break;
      world[blockIndex(x,yy,z)]=B.BAMBOO;
    }
  }}
}
// OCEAN reef: scatter colourful coral and tall seaweed across shallow,
// sunlit ocean floors so diving the sea has something to discover.
function placeReef(){const CORALS=[B.CORAL_PINK,B.CORAL_PURPLE,B.CORAL_BLUE];
for(let x=2;x<WORLD_W-2;x++){for(let z=2;z<WORLD_D-2;z++){const h=heightMap[colIndex(x,z)];
// Coral only forms in genuinely deep ocean: the sea floor must sit at least
// 5 blocks beneath the surface (h<=SEA_LEVEL-5) so shallow coastal flats stay
// bare. Still skip the very deepest abyss where light wouldn't reach.
if(h>SEA_LEVEL-5||h<SEA_LEVEL-16)continue;if(biomeMap[colIndex(x,z)]!==BIOME.OCEAN)continue;
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
// SWAMP dead bushes: like Minecraft's dead shrub, a single 1-block-high
// leafless plant dotting the dry patches of the marsh for a desolate feel.
function placeDeadTrees(){for(let x=3;x<WORLD_W-3;x++){for(let z=3;z<WORLD_D-3;z++){
if(biomeMap[colIndex(x,z)]!==BIOME.SWAMP)continue;const h=heightMap[colIndex(x,z)];if(h+2>=WORLD_H)continue;
// stand only on land that pokes above the waterline (avoid floating in water)
if(h<SEA_LEVEL)continue;const surf=world[blockIndex(x,h,z)];if(surf!==B.GRASS&&surf!==B.DIRT&&surf!==B.SAND)continue;
if(world[blockIndex(x,h+1,z)]!==B.AIR)continue;
if(hash2(x+717,z-313,25)>0.06)continue;          // sparse but visible
// a single dead bush block sitting on the surface (1 block tall, like MC)
world[blockIndex(x,h+1,z)]=B.DEAD_BUSH;
}}}
// GROUND COVER: scatter tufts of tall grass and the occasional flower across
// grassy biomes (plains/forest/jungle/swamp/snowy), Minecraft-style. Each is a
// single 1-block-tall cross plant resting on a grass/snow surface with air above.
const FLOWERS=[B.FLOWER_DANDELION,B.FLOWER_POPPY,B.FLOWER_CORNFLOWER];
// A richer palette used by the dedicated FLOWER FIELD biome (and sprinkled
// elsewhere) so the meadows burst with many flower kinds.
const FIELD_FLOWERS=[B.FLOWER_DANDELION,B.FLOWER_POPPY,B.FLOWER_CORNFLOWER,B.FLOWER_ALLIUM,B.FLOWER_TULIP,B.FLOWER_OXEYE];
function placeGroundCover(){for(let x=3;x<WORLD_W-3;x++){for(let z=3;z<WORLD_D-3;z++){
  const biome=biomeMap[colIndex(x,z)];
  // only lush, grassy land gets ground cover
  if(biome!==BIOME.PLAINS&&biome!==BIOME.FOREST&&biome!==BIOME.JUNGLE&&biome!==BIOME.SWAMP&&biome!==BIOME.SNOWY&&biome!==BIOME.SAVANNA&&biome!==BIOME.TAIGA&&biome!==BIOME.GIANT_FOREST&&biome!==BIOME.CHERRY&&biome!==BIOME.AUTUMN&&biome!==BIOME.FLOWER_FIELD&&biome!==BIOME.MANGROVE)continue;
  const h=heightMap[colIndex(x,z)];if(h<SEA_LEVEL||h+2>=WORLD_H)continue;
  const surf=world[blockIndex(x,h,z)];const ground=biome===BIOME.SNOWY?B.SNOW:(biome===BIOME.SAVANNA?B.DRY_GRASS:B.GRASS);
  if(surf!==ground)continue;                       // skip dirt/sand/paths under trees etc.
  if(world[blockIndex(x,h+1,z)]!==B.AIR)continue;   // don't bury trunks/leaves/water
  // Plains are flowery meadows; flower fields are denser still; forests grassy.
  const density=biome===BIOME.FLOWER_FIELD?0.55:(biome===BIOME.PLAINS?0.30:(biome===BIOME.JUNGLE?0.40:(biome===BIOME.FOREST?0.22:(biome===BIOME.SWAMP?0.20:(biome===BIOME.MANGROVE?0.22:(biome===BIOME.SAVANNA?0.34:(biome===BIOME.TAIGA?0.16:(biome===BIOME.CHERRY?0.30:(biome===BIOME.AUTUMN?0.26:(biome===BIOME.GIANT_FOREST?0.18:0.08))))))))));
  if(hash2(x+421,z-869,30)>density)continue;
  // Roughly 1 in 7 patches is a flower, the rest are grass tufts. In cherry
  // groves a good share of the cover is fallen pink petals carpeting the floor.
  let plant;
  if(biome===BIOME.CHERRY&&hash2(x-91,z+57,33)<0.45){
    plant=B.CHERRY_PETALS;
  }else if(biome===BIOME.FLOWER_FIELD){
    // mostly flowers, from the full colourful palette, with a little grass
    if(hash2(x-271,z+613,31)<0.78){
      plant=FIELD_FLOWERS[Math.floor(hash2(x+57,z+91,32)*FIELD_FLOWERS.length)%FIELD_FLOWERS.length];
    }else plant=B.TALL_GRASS;
  }else if(hash2(x-271,z+613,31)<(biome===BIOME.PLAINS?0.22:(biome===BIOME.AUTUMN?0.18:(biome===BIOME.SAVANNA?0.10:0.12)))){
    const pal=(biome===BIOME.PLAINS||biome===BIOME.AUTUMN)?FIELD_FLOWERS:FLOWERS;
    plant=pal[Math.floor(hash2(x+57,z+91,32)*pal.length)%pal.length];
  }else{
    plant=B.TALL_GRASS;
  }
  world[blockIndex(x,h+1,z)]=plant;
}}}
// Asynchronous world generation: runs the heavy phases across several frames
// so the browser stays responsive and we can show a progress bar instead of a
// frozen "endless reload". onProgress(fraction0to1, label) is called between
// steps; returns a Promise that resolves when generation is complete.
function generateWorldAsync(onProgress){
  const nextFrame=()=>new Promise(r=>requestAnimationFrame(()=>r()));
  const report=(f,label)=>{if(onProgress)onProgress(Math.max(0,Math.min(1,f)),label);};
  return (async()=>{
    report(0.02,'Calculating climate & terrain...');
    await nextFrame();
    generateClimateAndHeight();
    // Terrain blocks, sliced into vertical bands so each frame stays short.
    const BAND=16; // columns of x processed per frame
    for(let x0=0;x0<WORLD_W;x0+=BAND){
      generateTerrainColumns(x0,Math.min(WORLD_W,x0+BAND));
      report(0.05+0.55*(x0/WORLD_W),'Generating terrain...');
      await nextFrame();
    }
    report(0.62,'Carving caves...');
    await nextFrame();
    carveCaves();
    report(0.74,'Generating large caves...');
    await nextFrame();
    carveLargeCaves();
    report(0.78,'Generating caverns & lava lakes...');
    await nextFrame();
    carveCaveFeatures();
    report(0.80,'Carving ravines...');
    await nextFrame();
    carveRavines();
    report(0.82,'Generating lush & dripstone caves...');
    await nextFrame();
    placeCaveBiomes();
    report(0.84,'Generating amethyst geodes...');
    await nextFrame();
    placeAmethystGeodes();
    report(0.86,'Placing ores...');
    await nextFrame();
    placeOresAndGravel();
    report(0.89,'Placing vegetation...');
    await nextFrame();
    placeVegetation();
    report(0.93,'Building villages...');
    await nextFrame();
    let _placedVillages=[];
    if(typeof placeVillages==='function')_placedVillages=placeVillages()||[];
    report(0.96,'Digging mineshafts...');
    await nextFrame();
    if(typeof placeMineshafts==='function')placeMineshafts();
    report(0.98,'Building strongholds...');
    await nextFrame();
    if(typeof placeStronghold==='function')placeStronghold();
    report(1.0,'Done');
    await nextFrame();
    // Spawn villagers at village centres (delayed so Babylon scene is ready)
    if(typeof spawnVillagersAtVillages==='function'&&_placedVillages.length){
      setTimeout(()=>spawnVillagersAtVillages(_placedVillages),500);
    }
  })();
}
let worldEdits={};function loadEdits(){try{worldEdits=JSON.parse(WORLDS.getItem('edits')||"{}");}catch(e){worldEdits={};}
for(const key in worldEdits){const[x,y,z]=key.split(',').map(Number);if(x>=0&&x<WORLD_W&&y>=0&&y<WORLD_H&&z>=0&&z<WORLD_D)
world[blockIndex(x,y,z)]=worldEdits[key];}}
let saveTimer=null;function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{WORLDS.setItem('edits',JSON.stringify(worldEdits));}catch(e){}},800);}
// Copper oxidation: every ~5 in-game minutes (300 real seconds) a random
// exposed copper block advances one oxidation stage. Checks a small sample
// each frame for performance.
const COPPER_STAGES=[B.COPPER,B.COPPER_EXPOSED,B.COPPER_WEATHERED,B.COPPER_OXIDIZED];
let _copperTimer=0;
function updateCopperOxidation(dt){
  _copperTimer+=dt;
  // Check ~once every 60 seconds of real time
  if(_copperTimer<60)return;
  _copperTimer=0;
  // Sample a handful of worldEdits entries (player-placed copper blocks only)
  const keys=Object.keys(worldEdits);
  const checked=Math.min(keys.length,30);
  for(let i=0;i<checked;i++){
    const key=keys[Math.floor(Math.random()*keys.length)];
    const id=worldEdits[key];
    const stageIdx=COPPER_STAGES.indexOf(id);
    if(stageIdx<0||stageIdx>=3)continue; // not copper or already max oxidized
    // 25% chance per 60-second tick to advance one stage
    if(Math.random()>0.25)continue;
    const[x,y,z]=key.split(',').map(Number);
    const newId=COPPER_STAGES[stageIdx+1];
    setBlock(x,y,z,newId);
  }
}
