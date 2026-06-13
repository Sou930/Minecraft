"use strict";
// ===========================================================================
//  STRUCTURE GENERATION
//  Adds hand-crafted-feeling man-made features on top of the procedural
//  terrain:
//    • Villages  – clusters of timber houses joined by packed-dirt roads,
//                  with a central well, lamp posts, farms and a market.
//    • Mineshafts– abandoned wooden-framed tunnel networks deep underground,
//                  strewn with rails, cobwebs, support beams and loot chests.
//    • Strongholds– a buried stone-brick fortress of rooms and corridors,
//                  lit by torches, guarded by cobwebs, holding bookshelves
//                  and treasure chests.
//  All placement is seeded so a given world regenerates identically.
// ===========================================================================

// ---- low-level helpers ----------------------------------------------------
function inBounds(x,y,z){return x>=0&&x<WORLD_W&&y>=0&&y<WORLD_H&&z>=0&&z<WORLD_D;}
// Set a block only inside the world; used by every builder below.
function sBlock(x,y,z,id){if(inBounds(x,y,z))world[blockIndex(x,y,z)]=id;}
// Set a block only when the target is currently air/leaves (don't smash through
// existing solid structure parts – useful for decorations).
function sBlockSoft(x,y,z,id){if(!inBounds(x,y,z))return;const cur=world[blockIndex(x,y,z)];if(cur===B.AIR||cur===B.LEAVES||cur===B.BIRCH_LEAVES||cur===B.WATER)world[blockIndex(x,y,z)]=id;}
// Carve a box to air (interior hollowing).
function fillBox(x0,y0,z0,x1,y1,z1,id){for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)sBlock(x,y,z,id);}

// A village is allowed on broadly flat, dry-ish, land biomes only.
function isVillageBiome(b){return b===BIOME.PLAINS||b===BIOME.FOREST||b===BIOME.SNOWY||b===BIOME.DESERT;}

// ===========================================================================
//  VILLAGES
// ===========================================================================
function placeVillages(){
  const rng=mulberry32((SEED^0x5bd1e995)>>>0);
  // Aim for a handful of villages on a big map; scale with area.
  const target=Math.max(3,Math.floor((WORLD_W*WORLD_D)/90000));
  const placed=[];
  let attempts=0;
  while(placed.length<target&&attempts<2000){
    attempts++;
    const cx=24+Math.floor(rng()*(WORLD_W-48));
    const cz=24+Math.floor(rng()*(WORLD_D-48));
    // keep villages apart
    let tooClose=false;
    for(const p of placed){if(Math.abs(p.x-cx)<60&&Math.abs(p.z-cz)<60){tooClose=true;break;}}
    if(tooClose)continue;
    if(tryBuildVillage(cx,cz,rng))placed.push({x:cx,z:cz});
  }
  return placed;
}

// Flatness test: sample the height map over the footprint and require the
// span between min/max surface to be small and above sea level (dry land).
function siteIsFlat(cx,cz,radius){
  let lo=999,hi=-999,total=0,bad=0;
  for(let dx=-radius;dx<=radius;dx+=3){
    for(let dz=-radius;dz<=radius;dz+=3){
      const x=cx+dx,z=cz+dz;if(x<2||x>=WORLD_W-2||z<2||z>=WORLD_D-2)return false;
      total++;
      const b=biomeMap[colIndex(x,z)];
      const h=heightMap[colIndex(x,z)];
      // tolerate a few "wrong" cells (biome fringe / a dip) at the edges, since
      // the builder levels and re-surfaces the whole plaza afterwards.
      if(!isVillageBiome(b)||h<=SEA_LEVEL){bad++;continue;}
      if(h<lo)lo=h;if(h>hi)hi=h;
    }
  }
  if(lo>hi)return false;                         // no usable cells at all
  if(bad>total*0.18)return false;                // mostly water / wrong biome
  // The village builder fully levels the site to a single ground height, so a
  // moderately rolling footprint is fine — we only reject genuinely steep land.
  return (hi-lo)<=12;
}

function tryBuildVillage(cx,cz,rng){
  const R=22;
  if(!siteIsFlat(cx,cz,R))return false;
  const ground=heightMap[colIndex(cx,cz)];      // common ground level
  const biome=biomeMap[colIndex(cx,cz)];
  const desert=biome===BIOME.DESERT;
  const snowy=biome===BIOME.SNOWY;
  // 1) flatten + lay a packed-dirt plaza foundation under the whole village.
  const topMat=desert?B.SAND:(snowy?B.SNOW:B.GRASS);
  for(let dx=-R;dx<=R;dx++){
    for(let dz=-R;dz<=R;dz++){
      if(dx*dx+dz*dz>R*R)continue;
      const x=cx+dx,z=cz+dz;
      // clear everything (trees, hills) above the chosen ground level
      for(let y=ground+1;y<=ground+8;y++)sBlock(x,y,z,B.AIR);
      // fill any dip below ground with dirt so the plaza is truly level
      for(let y=ground-1;y>=ground-6;y--){const cur=world[blockIndex(x,y,z)];if(cur===B.AIR||cur===B.WATER)sBlock(x,y,z,B.DIRT);else break;}
      // ensure a solid top at ground level
      sBlock(x,ground,z,topMat);
    }
  }
  // 2) road network: a cross plus a ring connect the houses.
  layVillageRoads(cx,cz,ground,R,desert);
  // 3) central well at the crossroads.
  buildWell(cx,cz,ground,desert);
  // 4) ring of buildings around the well, facing inward.
  const houseSpots=[
    [-12,-12],[12,-12],[-12,12],[12,12],
    [0,-15],[0,15],[-15,0],[15,0],
    [-8,8],[8,-8],
  ];
  let builtFarm=false,builtMarket=false;
  for(let i=0;i<houseSpots.length;i++){
    const hx=cx+houseSpots[i][0],hz=cz+houseSpots[i][1];
    const gy=heightMap[colIndex(Math.max(0,Math.min(WORLD_W-1,hx)),Math.max(0,Math.min(WORLD_D-1,hz)))];
    const r=rng();
    if(!builtFarm&&i>=4&&r<0.5){buildFarm(hx,hz,ground,desert);builtFarm=true;continue;}
    if(!builtMarket&&i>=4&&r<0.35){buildMarket(hx,hz,ground,desert);builtMarket=true;continue;}
    buildHouse(hx,hz,ground,rng,desert,snowy);
    // a lamp post beside most houses
    if(rng()<0.7)buildLampPost(hx+(houseSpots[i][0]<0?3:-3),hz+2,ground);
  }
  // a few standalone lamp posts along the main road
  buildLampPost(cx+6,cz,ground);buildLampPost(cx-6,cz,ground);
  buildLampPost(cx,cz+6,ground);buildLampPost(cx,cz-6,ground);
  return true;
}

// Packed-dirt (PATH) roads: a plus-shaped main street + an outer ring.
function layVillageRoads(cx,cz,gy,R,desert){
  const road=desert?B.SANDSTONE:B.PATH;
  // main cross (3 wide)
  for(let d=-R;d<=R;d++){
    for(let w=-1;w<=1;w++){
      sBlock(cx+d,gy,cz+w,road);
      sBlock(cx+w,gy,cz+d,road);
    }
  }
  // outer ring road
  const rr=R-4;
  for(let a=0;a<360;a+=2){
    const rad=a*Math.PI/180;
    const x=Math.round(cx+Math.cos(rad)*rr),z=Math.round(cz+Math.sin(rad)*rr);
    sBlock(x,gy,z,road);
    sBlock(x+1,gy,z,road);sBlock(x,gy,z+1,road);
  }
}

// A stone well with a wooden roof and a pool of water at the bottom.
function buildWell(cx,cz,gy,desert){
  const wall=desert?B.SANDSTONE:B.COBBLE;
  // dig a shaft and fill the bottom with water
  for(let y=gy-1;y>=gy-4;y--)fillBox(cx-1,y,cz-1,cx+1,y,cz+1,B.AIR);
  fillBox(cx-1,gy-4,cz-1,cx+1,gy-4,cz+1,B.WATER);
  fillBox(cx-1,gy-3,cz-1,cx+1,gy-3,cz+1,B.WATER);
  // stone rim, 1 block high above ground
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
    if(Math.abs(dx)===1||Math.abs(dz)===1){sBlock(cx+dx,gy,cz+dz,wall);sBlock(cx+dx,gy+1,cz+dz,wall);}
  }
  // four corner posts + roof
  for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
    sBlock(cx+dx,gy+2,cz+dz,B.LOG);sBlock(cx+dx,gy+3,cz+dz,B.LOG);
  }
  fillBox(cx-1,gy+4,cz-1,cx+1,gy+4,cz+1,B.PLANKS);
  sBlock(cx,gy+5,cz,B.PLANKS);
  // a lantern hung under the roof
  sBlock(cx,gy+3,cz,B.LANTERN);
}

// Timber-framed cottage: planks walls, log corner posts, glass windows, a
// sloped plank roof, a door gap, and a cosy interior (chest + torch).
function buildHouse(hx,hz,gy,rng,desert,snowy){
  const w=5+(rng()<0.5?0:1);     // width  (x)
  const d=5+(rng()<0.5?0:1);     // depth  (z)
  const wallH=3+(rng()<0.4?1:0);
  const x0=hx-((w-1)>>1),z0=hz-((d-1)>>1);
  const x1=x0+w-1,z1=z0+d-1;
  const wallMat=desert?B.SANDSTONE:B.PLANKS;
  const cornerMat=desert?B.SANDSTONE:B.LOG;
  // clear & lay floor
  fillBox(x0,gy+1,z0,x1,gy+wallH+3,z1,B.AIR);
  fillBox(x0,gy,z0,x1,gy,z1,desert?B.SANDSTONE:B.PLANKS);
  // walls
  for(let y=gy+1;y<=gy+wallH;y++){
    for(let x=x0;x<=x1;x++){sBlock(x,y,z0,wallMat);sBlock(x,y,z1,wallMat);}
    for(let z=z0;z<=z1;z++){sBlock(x0,y,z,wallMat);sBlock(x1,y,z,wallMat);}
  }
  // log corner posts
  for(let y=gy+1;y<=gy+wallH;y++){
    sBlock(x0,y,z0,cornerMat);sBlock(x1,y,z0,cornerMat);
    sBlock(x0,y,z1,cornerMat);sBlock(x1,y,z1,cornerMat);
  }
  // windows (glass) on the long walls
  const wy=gy+2;
  sBlock(x0+1,wy,z0,B.GLASS);sBlock(x1-1,wy,z0,B.GLASS);
  sBlock(x0+1,wy,z1,B.GLASS);sBlock(x1-1,wy,z1,B.GLASS);
  sBlock(x0,wy,z0+1,B.GLASS);sBlock(x1,wy,z0+1,B.GLASS);
  // door on the wall facing the village centre (toward hx<0 etc.) – pick z0 side
  const doorX=hx,doorZ=z1;        // facing +z
  sBlock(doorX,gy+1,doorZ,B.AIR);sBlock(doorX,gy+2,doorZ,B.AIR);
  // pitched roof out of planks/logs
  buildRoof(x0,z0,x1,z1,gy+wallH+1,desert);
  // interior furnishings
  sBlock(x0+1,gy+1,z0+1,B.CHEST);
  fillContainerNearby(x0+1,gy+1,z0+1);
  sBlock(x1-1,gy+wallH,z0+1,B.TORCH);
  sBlock(x0+1,gy+wallH,z1-1,B.TORCH);
  // a bed (two red wool blocks) in a corner
  sBlock(x1-1,gy+1,z1-1,B.WOOL_RED);sBlock(x1-1,gy+1,z1-2,B.WOOL_WHITE);
  // a crafting table
  if(rng()<0.6)sBlock(x0+1,gy+1,z1-1,B.CRAFTING);
}

// Simple pitched roof: stepped planks rising to a ridge, with a log ridge beam.
function buildRoof(x0,z0,x1,z1,baseY,desert){
  const mat=desert?B.SANDSTONE:B.PLANKS;
  const midZ=(z0+z1)/2;const span=Math.ceil((z1-z0)/2)+1;
  for(let layer=0;layer<span;layer++){
    const y=baseY+layer;
    const za=z0+layer, zb=z1-layer;
    for(let x=x0-1;x<=x1+1;x++){
      sBlock(x,y,za,mat);sBlock(x,y,zb,mat);
    }
    if(za>=zb-1){ // ridge
      for(let x=x0-1;x<=x1+1;x++)sBlock(x,y,Math.round(midZ),B.LOG);
    }
  }
}

// Put a couple of useful items in a structure chest. The game doesn't model
// chest contents, so we represent loot by surrounding it with a hay/bookshelf
// flavour block; the chest itself is breakable for the chest item.
function fillContainerNearby(x,y,z){ /* visual loot hint only */ }

// A lamp post: a log column topped with a lantern, lighting the streets.
function buildLampPost(x,z,gy){
  if(!inBounds(x,gy+1,z))return;
  if(world[blockIndex(x,gy,z)]===B.WATER)return;
  sBlock(x,gy+1,z,B.LOG);sBlock(x,gy+2,z,B.LOG);sBlock(x,gy+3,z,B.LOG);
  sBlock(x,gy+4,z,B.LANTERN);
}

// A small fenced farm: tilled rows of hay (crops) bordered by log posts and a
// water trench for irrigation.
function buildFarm(cx,cz,gy,desert){
  const R=4;
  for(let dx=-R;dx<=R;dx++)for(let dz=-R;dz<=R;dz++){
    const x=cx+dx,z=cz+dz;
    if(Math.abs(dx)===R||Math.abs(dz)===R){sBlock(x,gy+1,z,B.LOG);} // fence posts
    else if(dz===0){sBlock(x,gy,z,B.WATER);}                        // central canal
    else {sBlock(x,gy,z,desert?B.SAND:B.DIRT);sBlock(x,gy+1,z,(Math.abs(dz)%1===0)?B.HAY:B.AIR);}
  }
  // hay only on the crop rows (avoid burying the canal)
  for(let dx=-R+1;dx<=R-1;dx++)for(let dz=-R+1;dz<=R-1;dz++){
    if(dz===0)continue;sBlock(cx+dx,gy+1,cz+dz,B.HAY);
  }
}

// A little market stall: planks counter under a wool awning on log posts.
function buildMarket(cx,cz,gy,desert){
  for(const [dx,dz] of [[-2,-2],[2,-2],[-2,2],[2,2]]){
    sBlock(cx+dx,gy+1,cz+dz,B.LOG);sBlock(cx+dx,gy+2,cz+dz,B.LOG);sBlock(cx+dx,gy+3,cz+dz,B.LOG);
  }
  // counter
  for(let dx=-2;dx<=2;dx++)sBlock(cx+dx,gy+1,cz-2,B.PLANKS);
  // striped wool awning
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)
    sBlock(cx+dx,gy+4,cz+dz,((dx+dz)&1)?B.WOOL_RED:B.WOOL_WHITE);
  sBlock(cx-1,gy+1,cz,B.CHEST);
  sBlock(cx+1,gy+1,cz+1,B.HAY);
}

// ===========================================================================
//  ABANDONED MINESHAFTS
// ===========================================================================
function placeMineshafts(){
  const rng=mulberry32((SEED^0x27d4eb2f)>>>0);
  const count=Math.max(2,Math.floor((WORLD_W*WORLD_D)/150000));
  for(let i=0;i<count;i++){
    const cx=20+Math.floor(rng()*(WORLD_W-40));
    const cz=20+Math.floor(rng()*(WORLD_D-40));
    const cy=10+Math.floor(rng()*22);          // shallow-to-mid depth
    buildMineshaft(cx,cy,cz,rng);
  }
}

function buildMineshaft(sx,sy,sz,rng){
  // A handful of straight corridors radiating/branching from a hub, each lined
  // with wooden support frames at intervals, a rail down the middle, cobwebs
  // and the occasional chest.
  const corridors=4+Math.floor(rng()*4);
  let bx=sx,by=sy,bz=sz;
  for(let c=0;c<corridors;c++){
    const horiz=rng()<0.5;                       // run along x or z
    const dir=rng()<0.5?1:-1;
    const len=14+Math.floor(rng()*22);
    let x=bx,z=bz,y=by;
    // gentle vertical drift so the network spans several depths
    const yDrift=(rng()<0.5?0:(rng()<0.5?1:-1));
    for(let s=0;s<len;s++){
      if(horiz)x+=dir;else z+=dir;
      if(s%5===0&&yDrift!==0)y+=yDrift;
      if(x<2||x>=WORLD_W-2||z<2||z>=WORLD_D-2||y<4||y>WORLD_H-8)break;
      carveCorridorSlice(x,y,z,horiz,s);
    }
    // next corridor branches from somewhere along this one
    bx=Math.max(2,Math.min(WORLD_W-2,horiz?x-dir*Math.floor(len/2):bx));
    bz=Math.max(2,Math.min(WORLD_D-2,horiz?bz:z-dir*Math.floor(len/2)));
    by=y;
    // a loot chest at the end of some corridors
    if(rng()<0.6){const fy=y;sBlockSoft(x,fy,z,B.CHEST);sBlockSoft(x,fy+1,z,B.TORCH);}
  }
  // hub room
  fillBox(sx-2,sy,sz-2,sx+2,sy+2,sz+2,B.AIR);
  for(const [dx,dz] of [[-2,-2],[2,-2],[-2,2],[2,2]]){
    sBlock(sx+dx,sy,sz+dz,B.LOG);sBlock(sx+dx,sy+1,sz+dz,B.LOG);sBlock(sx+dx,sy+2,sz+dz,B.PLANKS);
  }
  sBlockSoft(sx,sy+2,sz,B.TORCH);
  sBlockSoft(sx+1,sy,sz+1,B.CHEST);
}

// Carve a 3-wide, 3-tall corridor slice and decorate it. `axis` true=x-run.
function carveCorridorSlice(x,y,z,axisX,step){
  // tunnel cross-section (perpendicular to travel direction)
  for(let dy=0;dy<=2;dy++){
    for(let dp=-1;dp<=1;dp++){
      const xx=axisX?x:x+dp, zz=axisX?z+dp:z;
      const cur=getBlock(xx,y+dy,zz);
      if(cur!==B.BEDROCK&&cur!==B.AIR)sBlock(xx,y+dy,zz,B.AIR);
    }
  }
  // floor planks
  const fx0=axisX?x:x-1, fz0=axisX?z-1:z;
  sBlock(fx0,y-1>=0?y-1:0,fz0,B.PLANKS);
  for(let dp=-1;dp<=1;dp++){const xx=axisX?x:x+dp,zz=axisX?z+dp:z;if(getBlock(xx,y-1,zz)===B.AIR)sBlock(xx,y-1,zz,B.PLANKS);}
  // rail down the centre
  if(getBlock(x,y,z)===B.AIR)sBlock(x,y,z,B.RAIL);
  // support frames every few blocks: two posts + a beam across the top
  if(step%4===0){
    const lx=axisX?x:x-1, lz=axisX?z-1:z;
    const rx=axisX?x:x+1, rz=axisX?z+1:z;
    sBlock(lx,y,lz,B.LOG);sBlock(lx,y+1,lz,B.LOG);
    sBlock(rx,y,rz,B.LOG);sBlock(rx,y+1,rz,B.LOG);
    for(let dp=-1;dp<=1;dp++){const xx=axisX?x:x+dp,zz=axisX?z+dp:z;sBlock(xx,y+2,zz,B.PLANKS);}
  }
  // cobwebs in the upper corners, occasionally
  if(step%3===0){
    const cx=axisX?x:x+(step%2?1:-1), cz=axisX?z+(step%2?1:-1):z;
    if(getBlock(cx,y+2,cz)===B.AIR&&hash3(cx,y,cz,310)<0.6)sBlock(cx,y+2,cz,B.COBWEB);
  }
}

// ===========================================================================
//  STRONGHOLD (buried stone-brick fortress)
// ===========================================================================
function placeStronghold(){
  const rng=mulberry32((SEED^0x165667b1)>>>0);
  // one grand stronghold, placed away from the very edges, fairly deep.
  const cx=Math.floor(WORLD_W*0.3+rng()*WORLD_W*0.4);
  const cz=Math.floor(WORLD_D*0.3+rng()*WORLD_D*0.4);
  const cy=8+Math.floor(rng()*10);
  buildStronghold(cx,cy,cz,rng);
}

function buildStronghold(cx,cy,cz,rng){
  const rooms=[];
  // central great hall
  makeRoom(cx,cy,cz,7,5,7,rng,true);
  rooms.push({x:cx,z:cz});
  // branching rooms connected by corridors in the 4 cardinal directions
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(let i=0;i<dirs.length;i++){
    const dist=9+Math.floor(rng()*4);
    const rx=cx+dirs[i][0]*dist, rz=cz+dirs[i][1]*dist;
    const ry=cy+(rng()<0.5?0:(rng()<0.5?2:-2));
    makeCorridor(cx,cy,cz,rx,ry,rz);
    const rw=5+Math.floor(rng()*3),rd=5+Math.floor(rng()*3);
    makeRoom(rx,ry,rz,rw,4+Math.floor(rng()*2),rd,rng,false);
    rooms.push({x:rx,z:rz});
    // second-tier rooms off two of the branches
    if(i<2){
      const r2x=rx+dirs[i][0]*9, r2z=rz+dirs[i][1]*9;
      makeCorridor(rx,ry,rz,r2x,ry,r2z);
      makeRoom(r2x,ry,r2z,5,4,5,rng,false);
    }
  }
}

// A stone-brick room: brick shell, hollow interior, brick floor/ceiling, with
// scattered mossy/cracked bricks for age, corner torches, and loot.
function makeRoom(cx,cy,cz,w,h,d,rng,grand){
  const x0=cx-(w>>1),z0=cz-(d>>1),x1=x0+w-1,z1=z0+d-1;
  const y0=cy,y1=cy+h-1;
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){
    const shell=(x===x0||x===x1||y===y0||y===y1||z===z0||z===z1);
    if(shell){
      // weathered brick variety
      const r=hash3(x,y,z,401);
      let id=B.STONE_BRICK;
      if(r<0.16)id=B.MOSSY_BRICK;else if(r<0.26)id=B.CRACKED_BRICK;
      sBlock(x,y,z,id);
    }else{
      sBlock(x,y,z,B.AIR);
    }
  }
  // corner torches on the walls just below the ceiling
  sBlockSoft(x0+1,y1-1,z0+1,B.TORCH);
  sBlockSoft(x1-1,y1-1,z0+1,B.TORCH);
  sBlockSoft(x0+1,y1-1,z1-1,B.TORCH);
  sBlockSoft(x1-1,y1-1,z1-1,B.TORCH);
  if(grand){
    // great hall: bookshelf walls + a central treasure chest + cobweb corners
    for(let x=x0+1;x<=x1-1;x++){sBlockSoft(x,y0+1,z0,B.BOOKSHELF);sBlockSoft(x,y0+1,z1,B.BOOKSHELF);}
    sBlock(cx,y0+1,cz,B.CHEST);
    sBlockSoft(x0+1,y1-1,z0+1,B.COBWEB);sBlockSoft(x1-1,y1-1,z1-1,B.COBWEB);
  }else{
    // ordinary room: maybe a chest + a few cobwebs
    if(rng()<0.5)sBlock(cx,y0+1,cz,B.CHEST);
    if(rng()<0.7)sBlockSoft(x0+1,y0+1,z0+1,B.COBWEB);
    if(rng()<0.4)sBlockSoft(x1-1,y0+1,z1-1,B.COBWEB);
  }
}

// A 3x3 stone-brick corridor connecting two room centres (L-shaped).
function makeCorridor(ax,ay,az,bx,by,bz){
  let x=ax,y=ay,z=az;
  const stepTo=(tx,ty,tz)=>{
    const sx=Math.sign(tx-x),sz=Math.sign(tz-z),sy=Math.sign(ty-y);
    while(x!==tx||z!==tz||y!==ty){
      if(x!==tx)x+=sx;else if(z!==tz)z+=sz;else if(y!==ty)y+=sy;
      carveStrongholdSlice(x,y,z);
    }
  };
  stepTo(bx,by,bz);
}

function carveStrongholdSlice(x,y,z){
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=2;dy++)for(let dz=-1;dz<=1;dz++){
    const xx=x+dx,yy=y+dy,zz=z+dz;
    const wall=(dx===-1||dx===1||dz===-1||dz===1||dy===-1||dy===2);
    if(wall){const cur=getBlock(xx,yy,zz);if(cur!==B.AIR)sBlock(xx,yy,zz,B.STONE_BRICK);}
    else sBlock(xx,yy,zz,B.AIR);
  }
}

// ---- top-level driver ------------------------------------------------------
function placeStructures(){placeStronghold();placeMineshafts();placeVillages();}
