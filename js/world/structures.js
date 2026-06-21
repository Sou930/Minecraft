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

// ---------------------------------------------------------------------------
//  WINDMILL REGISTRY
//  Each windmill mill-house records where its blade hub sits and which way the
//  hub faces, so the entity layer (js/entities/entities.js) can attach a set of
//  animated rotating blade meshes once the scene/Babylon are ready. Block
//  generation runs during world-gen (before the renderer is up), so we only
//  remember the hub here and spawn the spinning sails later/lazily.
//    hub : {x,y,z}  world-space centre of the blade hub (block coords + 0.5)
//    axis: 'x' | 'z'  the wall the sails are mounted on; blades spin in the
//                     plane perpendicular to this axis.
// ---------------------------------------------------------------------------
const villageWindmills=[];

// ===========================================================================
//  VILLAGES
// ===========================================================================
function placeVillages(){
  // Fresh windmill registry for this generation pass (avoids duplicate spinning
  // sails if villages are ever rebuilt within the same session).
  villageWindmills.length=0;
  if(typeof clearWindmillBlades==='function')clearWindmillBlades();
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
  const R=30;     // larger footprint so the expanded village fits comfortably
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
  // 4) buildings laid out in two concentric rings around the well, all facing
  //    inward toward the plaza. The expanded village has ~20 structures plus
  //    multiple farm fields and a market, making it feel like a real town.
  const houseSpots=[
    // inner ring
    [-10,-10],[10,-10],[-10,10],[10,10],
    [0,-13],[0,13],[-13,0],[13,0],
    // outer ring
    [-22,-10],[22,-10],[-22,10],[22,10],
    [-10,-22],[10,-22],[-10,22],[10,22],
    [-22,-22],[22,-22],[-22,22],[22,22],
    [0,-24],[0,24],[-24,0],[24,0],
  ];
  let farms=0,builtMarket=false,builtWindmill=false;
  const FARM_TARGET=3;          // multiple crop fields per village
  // Remember the last farm we placed so the windmill can be raised right beside
  // a crop field — a classic "風車のある農場" (farm with a windmill) scene.
  let lastFarm=null;
  for(let i=0;i<houseSpots.length;i++){
    const hx=cx+houseSpots[i][0],hz=cz+houseSpots[i][1];
    if(hx<R+2||hx>=WORLD_W-R-2||hz<R+2||hz>=WORLD_D-R-2)continue;
    const r=rng();
    // Farms prefer the roomier outer ring (i>=8).
    if(farms<FARM_TARGET&&i>=8&&r<0.45){buildFarm(hx,hz,ground,desert);lastFarm=[hx,hz];farms++;continue;}
    if(!builtMarket&&i>=4&&r<0.3){buildMarket(hx,hz,ground,desert);builtMarket=true;continue;}
    buildHouse(hx,hz,ground,rng,desert,snowy,cx,cz);
    // a lamp post beside most houses
    if(rng()<0.7)buildLampPost(hx+(houseSpots[i][0]<0?3:-3),hz+2,ground);
  }
  // Guarantee at least one farm even if the random rolls skipped them.
  if(farms===0){buildFarm(cx-22,cz+10,ground,desert);lastFarm=[cx-22,cz+10];farms++;}
  // Every village gets one windmill mill-house, raised on the village fringe
  // next to a farm field so its turning sails overlook the crops.
  if(!builtWindmill&&lastFarm){
    // Offset the windmill a few blocks outward from the farm centre toward the
    // village edge so its tall tower & sails have clear sky around them.
    const ox=lastFarm[0]+(lastFarm[0]>=cx?7:-7);
    const oz=lastFarm[1]+(lastFarm[1]>=cz?2:-2);
    if(ox>=R+3&&ox<WORLD_W-R-3&&oz>=R+3&&oz<WORLD_D-R-3){
      buildWindmill(ox,oz,ground,rng,desert,snowy,cx,cz);
      builtWindmill=true;
    }
  }
  // lamp posts lining the main cross road for an evenly-lit town centre
  for(let d=6;d<=R-6;d+=8){
    buildLampPost(cx+d,cz+2,ground);buildLampPost(cx-d,cz-2,ground);
    buildLampPost(cx+2,cz+d,ground);buildLampPost(cx-2,cz-d,ground);
  }
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
function buildHouse(hx,hz,gy,rng,desert,snowy,villageX,villageZ){
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
  // Doorway: a real 2-tall wooden door set into the wall that faces the village
  // centre, so every entrance opens toward the plaza. Facings: N=0,E=1,S=2,W=3
  // with +Z=South and +X=East (matching doorFacing in config / player.js).
  // Desert (sandstone) cottages get a door too so every house has an entrance.
  let doorX,doorZ,doorBottom,doorTop,frontDX=0,frontDZ=0;
  const toCx=(villageX!==undefined)?villageX-hx:0;
  const toCz=(villageZ!==undefined)?villageZ-hz:1; // default: face +z
  if(Math.abs(toCz)>=Math.abs(toCx)){
    // door on a z-facing wall (north or south)
    doorX=hx;
    if(toCz>=0){ doorZ=z1; doorBottom=B.DOOR_BOTTOM_S_CLOSED; doorTop=B.DOOR_TOP_S_CLOSED; frontDZ=1; }
    else        { doorZ=z0; doorBottom=B.DOOR_BOTTOM_N_CLOSED; doorTop=B.DOOR_TOP_N_CLOSED; frontDZ=-1; }
  }else{
    // door on an x-facing wall (east or west)
    doorZ=hz;
    if(toCx>=0){ doorX=x1; doorBottom=B.DOOR_BOTTOM_E_CLOSED; doorTop=B.DOOR_TOP_E_CLOSED; frontDX=1; }
    else        { doorX=x0; doorBottom=B.DOOR_BOTTOM_W_CLOSED; doorTop=B.DOOR_TOP_W_CLOSED; frontDX=-1; }
  }
  sBlock(doorX,gy+1,doorZ,doorBottom);
  sBlock(doorX,gy+2,doorZ,doorTop);
  // keep the step just outside the door clear so the player can walk through
  sBlock(doorX+frontDX,gy+1,doorZ+frontDZ,B.AIR);
  sBlock(doorX+frontDX,gy+2,doorZ+frontDZ,B.AIR);
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

// Pitched roof made of wooden stairs: each layer rises one block toward the
// central ridge, with stair blocks giving the slope a clean angled silhouette
// instead of a blocky staircase of full cubes. Desert (sandstone) cottages keep
// solid blocks since there are no sandstone stairs. The two slopes face inward
// (north slope faces S/2 toward the ridge, south slope faces N/0), and a log
// ridge beam caps the apex.
function buildRoof(x0,z0,x1,z1,baseY,desert){
  const midZ=(z0+z1)/2;const span=Math.ceil((z1-z0)/2)+1;
  for(let layer=0;layer<span;layer++){
    const y=baseY+layer;
    const za=z0+layer, zb=z1-layer;
    for(let x=x0-1;x<=x1+1;x++){
      if(desert){sBlock(x,y,za,B.SANDSTONE);sBlock(x,y,zb,B.SANDSTONE);}
      else{
        // North eave row slopes up toward the ridge (high step on the +z side → facing N/0);
        // South eave row mirrors it (high step on the -z side → facing S/2).
        sBlock(x,y,za,B.STAIRS_N);
        if(zb!==za)sBlock(x,y,zb,B.STAIRS_S);
      }
    }
    if(za>=zb-1){ // ridge beam
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

// A Minecraft-style crop field: a rectangular plot of tilled (wet) farmland
// bordered by a low log/fence frame, irrigated by a central water canal, and
// planted with neat rows of mature crops (wheat / carrots / potatoes). Crop
// blocks placed straight into the terrain (with no FARM growth entry) render at
// their final maturity stage, so the field reads as a fully-grown harvest.
function buildFarm(cx,cz,gy,desert){
  const RX=5, RZ=4;                  // plot half-extents (10x8 interior + border)
  // Pick one crop type per field so rows look uniform, like a Minecraft farm.
  // (desert villages still get crops — irrigated farmland works on sand too.)
  const cropChoices=[B.WHEAT,B.CARROT,B.POTATO];
  const crop=cropChoices[Math.abs((cx*31+cz*17))%cropChoices.length];
  for(let dx=-RX;dx<=RX;dx++){
    for(let dz=-RZ;dz<=RZ;dz++){
      const x=cx+dx,z=cz+dz;
      // clear any vegetation / debris above the plot
      for(let y=gy+1;y<=gy+3;y++)sBlock(x,y,z,B.AIR);
      const edge=(Math.abs(dx)===RX||Math.abs(dz)===RZ);
      if(edge){
        // Border frame: oak-log fence posts at the corners + along the rim,
        // sitting on a packed-dirt path so the field has a tidy walkway edge.
        sBlock(x,gy,z,desert?B.SANDSTONE:B.PATH);
        sBlock(x,gy+1,z,B.LOG);
        continue;
      }
      // Central irrigation canal runs the length of the plot (dx===0 column).
      if(dx===0){
        sBlock(x,gy,z,B.WATER);
        sBlock(x,gy+1,z,B.AIR);
        continue;
      }
      // Everywhere else: wet farmland topped with a mature crop. Leave a 1-wide
      // gap right beside the canal so the player can walk the rows.
      sBlock(x,gy,z,B.FARMLAND_WET);
      if(Math.abs(dx)===1){ sBlock(x,gy+1,z,B.AIR); }   // tending path beside canal
      else { sBlock(x,gy+1,z,crop); }
    }
  }
  // A couple of hay bales & a scarecrow-ish lantern post at one corner give the
  // field that lived-in village look.
  sBlock(cx-RX+1,gy+1,cz-RZ+1,B.HAY);
  sBlock(cx-RX+1,gy+2,cz-RZ+1,B.HAY);
  sBlock(cx+RX-1,gy+1,cz+RZ-1,B.LOG);
  sBlock(cx+RX-1,gy+2,cz+RZ-1,B.LANTERN);
}

// ===========================================================================
//  WINDMILL MILL-HOUSE  (風車小屋)
// ===========================================================================
// A tall, tapering stone-and-timber mill tower topped with a plank cap, ringed
// by glass windows, with a working interior (millstone hint = hay/log + a chest
// of "flour" and a lantern). A set of four big rotating sails is mounted on the
// wall facing away from the village centre; the blades themselves are animated
// Babylon meshes created by the entity layer from `villageWindmills`. The block
// build here only frames the tower + a flush "hub" block the sails pivot on.
function buildWindmill(cx,cz,gy,rng,desert,snowy,villageX,villageZ){
  const wallMat=desert?B.SANDSTONE:B.COBBLE;       // sturdy lower mill body
  const trimMat=desert?B.SANDSTONE:B.LOG;          // timber corner posts
  const H=8+(rng()<0.5?0:1);                        // tower body height
  const R0=3;                                       // base radius (footprint ~7x7)
  // 1) clear the column and lay a stone foundation ring.
  for(let dx=-R0-1;dx<=R0+1;dx++)for(let dz=-R0-1;dz<=R0+1;dz++){
    const x=cx+dx,z=cz+dz;
    for(let y=gy+1;y<=gy+H+6;y++)sBlock(x,y,z,B.AIR);
  }
  // 2) build the tapering round-ish tower out of stacked rings. The radius
  //    shrinks slightly toward the top so the mill reads as a proper windmill
  //    body rather than a plain box tower.
  for(let layer=0;layer<H;layer++){
    const y=gy+1+layer;
    const rad=R0-(layer/H)*1.1;          // taper from R0 down to ~R0-1.1
    const rr=rad*rad;
    for(let dx=-R0;dx<=R0;dx++)for(let dz=-R0;dz<=R0;dz++){
      const d=dx*dx+dz*dz;
      // ring shell: within the radius band → wall; inside → hollow.
      if(d<=rr&&d>(rad-1)*(rad-1)){
        // timber bands every few layers for that half-timbered look.
        const band=(layer%3===2);
        sBlock(cx+dx,y,cz+dz,band?trimMat:wallMat);
      }
    }
  }
  // 3) solid stone floor + hollow interior.
  for(let dx=-R0;dx<=R0;dx++)for(let dz=-R0;dz<=R0;dz++){
    if(dx*dx+dz*dz<=R0*R0)sBlock(cx+dx,gy,cz+dz,desert?B.SANDSTONE:B.COBBLE);
  }
  // 4) glass windows around the upper body for the look of a lit mill at night.
  const wy=gy+H-2;
  for(const [dx,dz] of [[R0,0],[-R0,0],[0,R0],[0,-R0],[R0-1,R0-1],[-(R0-1),R0-1],[R0-1,-(R0-1)],[-(R0-1),-(R0-1)]]){
    sBlock(cx+dx,wy,cz+dz,B.GLASS);
  }
  // 5) a doorway facing the village centre.
  let dDX=0,dDZ=1;
  const toCx=(villageX!==undefined)?villageX-cx:0, toCz=(villageZ!==undefined)?villageZ-cz:1;
  let doorBottom,doorTop,doorX=cx,doorZ=cz;
  if(Math.abs(toCz)>=Math.abs(toCx)){
    if(toCz>=0){doorZ=cz+R0;doorBottom=B.DOOR_BOTTOM_S_CLOSED;doorTop=B.DOOR_TOP_S_CLOSED;dDX=0;dDZ=1;}
    else        {doorZ=cz-R0;doorBottom=B.DOOR_BOTTOM_N_CLOSED;doorTop=B.DOOR_TOP_N_CLOSED;dDX=0;dDZ=-1;}
  }else{
    if(toCx>=0){doorX=cx+R0;doorBottom=B.DOOR_BOTTOM_E_CLOSED;doorTop=B.DOOR_TOP_E_CLOSED;dDX=1;dDZ=0;}
    else        {doorX=cx-R0;doorBottom=B.DOOR_BOTTOM_W_CLOSED;doorTop=B.DOOR_TOP_W_CLOSED;dDX=-1;dDZ=0;}
  }
  sBlock(doorX,gy+1,doorZ,doorBottom);
  sBlock(doorX,gy+2,doorZ,doorTop);
  sBlock(doorX+dDX,gy+1,doorZ+dDZ,B.AIR);
  sBlock(doorX+dDX,gy+2,doorZ+dDZ,B.AIR);
  // 6) conical plank cap (the mill "roof") rising above the tower body.
  const capBase=gy+1+H;
  for(let layer=0;layer<=R0+1;layer++){
    const y=capBase+layer;
    const rad=(R0+1)-layer;
    const rr=rad*rad;
    for(let dx=-R0-1;dx<=R0+1;dx++)for(let dz=-R0-1;dz<=R0+1;dz++){
      if(dx*dx+dz*dz<=rr)sBlock(cx+dx,y,cz+dz,B.PLANKS);
    }
  }
  // 7) interior fittings: a millstone hint (hay + log "shaft"), a flour chest
  //    and a lantern for warmth.
  sBlock(cx,gy+1,cz,B.LOG);                 // central grinding shaft
  sBlock(cx+1,gy+1,cz,B.HAY);               // sacks of grain
  sBlock(cx-1,gy+1,cz,B.CHEST);             // flour store
  sBlock(cx,gy+H-1,cz,B.LANTERN);           // hanging lantern lights the mill
  fillContainerNearby(cx-1,gy+1,cz);
  // 8) mount the blade hub flush on the wall that faces AWAY from the village
  //    (the "windward" side), so the sweeping sails have open sky/field in front.
  //    axis = the wall normal direction; blades spin in the perpendicular plane.
  let hdx=-dDX, hdz=-dDZ;                    // opposite the door = open field side
  if(hdx===0&&hdz===0){hdx=0;hdz=-1;}
  const hubAxis=(hdx!==0)?'x':'z';
  const hubY=gy+H-1;                         // hub sits high on the upper body
  const hubX=cx+hdx*(R0+0.6), hubZ=cz+hdz*(R0+0.6);
  // a small protruding "hub" block (log) on the wall the sails bolt onto.
  sBlock(cx+hdx*R0,hubY,cz+hdz*R0,B.LOG);
  villageWindmills.push({hub:{x:hubX+0.0,y:hubY+0.5,z:hubZ+0.0},axis:hubAxis,spawned:false});
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
//  ABANDONED MINESHAFTS  (large-scale, realistic, multi-level networks)
// ===========================================================================
//  A mineshaft is now a sprawling, organic network rather than a few straight
//  spokes.  Each complex is grown from a hub by recursively spawning corridor
//  "segments" that:
//      • run for a stretch in one of the cardinal directions, gently drifting
//        in height so the network spans many depths,
//      • spawn branch corridors and the occasional staircase that drops to a
//        deeper level,
//      • are framed with periodic timber supports (posts + cross-beam + fence-
//        rail planks), planked or partially-collapsed floors, centre rails,
//        cobwebs, hanging supports, and scattered lanterns / torches,
//      • terminate (or pass through) hand-built rooms: cross intersections,
//        storage cellars with loot, mineshaft "stations" with parallel rails,
//        and large open dig-site caverns supported by wooden scaffolding.
//  Everything is seeded so a world regenerates identically.
// ===========================================================================
function placeMineshafts(){
  const rng=mulberry32((SEED^0x27d4eb2f)>>>0);
  // More, bigger complexes than before.
  const count=Math.max(4,Math.floor((WORLD_W*WORLD_D)/95000));
  const placed=[];
  let attempts=0;
  while(placed.length<count&&attempts<count*8){
    attempts++;
    const cx=24+Math.floor(rng()*(WORLD_W-48));
    const cz=24+Math.floor(rng()*(WORLD_D-48));
    // keep complexes reasonably apart so they don't fully overlap
    let tooClose=false;
    for(const p of placed){if(Math.abs(p.x-cx)<70&&Math.abs(p.z-cz)<70){tooClose=true;break;}}
    if(tooClose)continue;
    const cy=12+Math.floor(rng()*24);          // shallow-to-mid start depth
    buildMineshaftComplex(cx,cy,cz,rng);
    placed.push({x:cx,z:cz});
  }
}

// ---- mineshaft block palette ----------------------------------------------
// Weathered floor: mostly oak planks, with gaps (air = collapsed) and a little
// gravel/dirt that has caved in over the ages.
function mineFloorBlock(x,y,z,rng){
  const r=hash3(x,y,z,991);
  if(r<0.12)return B.AIR;        // collapsed hole in the walkway
  if(r<0.18)return B.GRAVEL;     // caved-in rubble
  return B.PLANKS;
}

// Carve a hollow box (interior to air) but DON'T smash bedrock.
function mineHollow(x0,y0,z0,x1,y1,z1){
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){
    if(getBlock(x,y,z)!==B.BEDROCK)sBlock(x,y,z,B.AIR);
  }
}

// ---------------------------------------------------------------------------
//  COMPLEX GROWTH
// ---------------------------------------------------------------------------
function buildMineshaftComplex(sx,sy,sz,rng){
  const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
  // budget controls overall size: number of corridor segments allowed.
  let budget=46+Math.floor(rng()*40);
  const builtRooms=[];     // remember room centres to avoid stacking

  // central hub: a cross-intersection station with rails both ways + supports
  buildIntersection(sx,sy,sz,rng);
  buildStationRoom(sx,sy,sz,rng);
  builtRooms.push({x:sx,y:sy,z:sz});

  // a queue of growth heads radiating from the hub
  const heads=[];
  const startDirs=DIRS.slice();
  // shuffle deterministically
  for(let i=startDirs.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[startDirs[i],startDirs[j]]=[startDirs[j],startDirs[i]];}
  const startN=3+Math.floor(rng()*2);
  for(let i=0;i<startN;i++){
    const d=startDirs[i%startDirs.length];
    heads.push({x:sx+d[0]*2,y:sy,z:sz+d[1]*2,dx:d[0],dz:d[1],depth:0});
  }

  // optional surface entrance from the hub
  if(rng()<0.85)buildMineEntrance(sx,sy,sz,rng);

  let guard=0;
  while(heads.length&&budget>0&&guard<400){
    guard++;
    const h=heads.shift();
    if(budget<=0)break;
    const seg=growCorridor(h.x,h.y,h.z,h.dx,h.dz,rng,h.depth);
    budget--;
    if(!seg)continue;

    // chance to terminate in a room
    const wantRoom=rng()<0.45&&seg.steps>=6;
    if(wantRoom){
      let ok=true;
      for(const r of builtRooms){if(Math.abs(r.x-seg.x)<10&&Math.abs(r.z-seg.z)<10&&Math.abs(r.y-seg.y)<6){ok=false;break;}}
      if(ok){
        const roll=rng();
        if(roll<0.4)buildStorageCellar(seg.x,seg.y,seg.z,rng);
        else if(roll<0.72)buildIntersection(seg.x,seg.y,seg.z,rng);
        else buildDigSiteCavern(seg.x,seg.y,seg.z,rng);
        builtRooms.push({x:seg.x,y:seg.y,z:seg.z});
      }
    }

    // branch generation: keep going straight, turn, and sometimes descend.
    if(h.depth<5){
      // continue forward
      if(budget>0&&rng()<0.78)heads.push({x:seg.x,y:seg.y,z:seg.z,dx:h.dx,dz:h.dz,depth:h.depth+1});
      // side branch (perpendicular)
      if(budget>0&&rng()<0.6){
        const perp=(h.dx!==0)?[0,(rng()<0.5?1:-1)]:[(rng()<0.5?1:-1),0];
        heads.push({x:seg.x,y:seg.y,z:seg.z,dx:perp[0],dz:perp[1],depth:h.depth+1});
      }
      // staircase down to a deeper level, then continue
      if(budget>1&&rng()<0.4&&seg.y>8){
        const nd=DIRS[Math.floor(rng()*4)];
        const drop=buildStaircase(seg.x,seg.y,seg.z,nd[0],nd[1],rng);
        budget--;
        if(drop)heads.push({x:drop.x,y:drop.y,z:drop.z,dx:nd[0],dz:nd[1],depth:h.depth+1});
      }
    }
  }
}

// ---------------------------------------------------------------------------
//  CORRIDOR (a single run of tunnel in one direction)
//  Returns {x,y,z,steps} of the end point, or null if it couldn't start.
// ---------------------------------------------------------------------------
function growCorridor(x,y,z,dx,dz,rng,depth){
  const len=10+Math.floor(rng()*16);
  // gentle vertical drift so corridors aren't perfectly flat
  let drift=0;const driftEvery=4+Math.floor(rng()*4);
  let steps=0;
  for(let s=0;s<len;s++){
    x+=dx;z+=dz;
    if(s>0&&s%driftEvery===0){
      const dd=(rng()<0.5)?0:(rng()<0.5?1:-1);
      if(dd!==0&&y+dd>5&&y+dd<WORLD_H-9){y+=dd;}
    }
    if(x<3||x>=WORLD_W-3||z<3||z>=WORLD_D-3||y<5||y>WORLD_H-9)break;
    carveCorridorSlice(x,y,z,dx!==0,s,rng);
    steps++;
  }
  if(steps===0)return null;
  return {x,y,z,steps};
}

// Carve a 3-wide, 3-tall corridor slice and decorate it. axisX true => running
// along the X axis (cross-section spans Z), else running along Z.
function carveCorridorSlice(x,y,z,axisX,step,rng){
  // hollow tunnel cross-section (3 wide x 3 tall)
  for(let dy=0;dy<=2;dy++){
    for(let dp=-1;dp<=1;dp++){
      const xx=axisX?x:x+dp, zz=axisX?z+dp:z;
      if(getBlock(xx,y+dy,zz)!==B.BEDROCK)sBlock(xx,y+dy,zz,B.AIR);
    }
  }
  // weathered floor under the whole width
  for(let dp=-1;dp<=1;dp++){
    const xx=axisX?x:x+dp, zz=axisX?z+dp:z;
    if(getBlock(xx,y-1,zz)!==B.BEDROCK){
      const fb=mineFloorBlock(xx,y-1,zz,rng);
      // don't leave a floating air hole over lava/void unnecessarily: still ok,
      // collapsed gaps add character.
      sBlock(xx,y-1,zz,fb);
    }
  }
  // rail down the centre (only over solid floor, not over a collapsed hole)
  if(getBlock(x,y,z)===B.AIR&&getBlock(x,y-1,z)!==B.AIR){
    // occasional missing rail for that abandoned look
    if(hash3(x,y,z,920)>0.18)sBlock(x,y,z,B.RAIL);
  }
  // periodic timber support frame: two posts + a beam, with plank "fence" caps
  if(step%5===0){
    const lx=axisX?x:x-1, lz=axisX?z-1:z;
    const rx=axisX?x:x+1, rz=axisX?z+1:z;
    sBlock(lx,y,lz,B.LOG);sBlock(lx,y+1,lz,B.LOG);
    sBlock(rx,y,rz,B.LOG);sBlock(rx,y+1,rz,B.LOG);
    for(let dp=-1;dp<=1;dp++){const xx=axisX?x:x+dp,zz=axisX?z+dp:z;sBlock(xx,y+2,zz,B.PLANKS);}
    // a lantern hanging from the beam occasionally lights the way
    if(hash3(x,y,z,930)<0.18)sBlockSoft(x,y+1,z,B.LANTERN);
  }
  // hanging cobweb clusters in the corners
  if(step%3===0){
    const r=hash3(x,y,z,310);
    if(r<0.55){
      const cx=axisX?x:x+(step%2?1:-1), cz=axisX?z+(step%2?1:-1):z;
      sBlockSoft(cx,y+2,cz,B.COBWEB);
      if(r<0.22)sBlockSoft(cx,y+1,cz,B.COBWEB);
    }
  }
  // rare wall torch
  if(step%7===0&&hash3(x,y,z,940)<0.4){
    const tx=axisX?x:x+1, tz=axisX?z+1:z;
    sBlockSoft(tx,y+1,tz,B.TORCH);
  }
  // occasional caved-in rubble pile (gravel) partially blocking the way
  if(step%9===0&&hash3(x,y,z,950)<0.25){
    sBlockSoft(x,y,z,B.GRAVEL);
  }
}

// ---------------------------------------------------------------------------
//  STAIRCASE: a descending stepped tunnel dropping ~5 levels, framed in wood.
//  Returns the landing {x,y,z} or null.
// ---------------------------------------------------------------------------
function buildStaircase(x,y,z,dx,dz,rng){
  const drop=4+Math.floor(rng()*3);
  const axisX=dx!==0;
  let cx=x,cy=y,cz=z;
  for(let i=0;i<drop;i++){
    // each step: advance 1, descend 1
    cx+=dx;cz+=dz;
    if(cx<3||cx>=WORLD_W-3||cz<3||cz>=WORLD_D-3)return null;
    // carve a 3-wide, 4-tall headroom column at each step
    for(let dy=0;dy<=3;dy++)for(let dp=-1;dp<=1;dp++){
      const xx=axisX?cx:cx+dp, zz=axisX?cz+dp:cz;
      if(getBlock(xx,cy+dy,zz)!==B.BEDROCK)sBlock(xx,cy+dy,zz,B.AIR);
    }
    // a plank step block as the tread
    for(let dp=-1;dp<=1;dp++){
      const xx=axisX?cx:cx+dp, zz=axisX?cz+dp:cz;
      if(getBlock(xx,cy-1,zz)!==B.BEDROCK)sBlock(xx,cy-1,zz,B.PLANKS);
    }
    // side posts every other step
    if(i%2===0){
      const lx=axisX?cx:cx-1, lz=axisX?cz-1:cz;
      const rx=axisX?cx:cx+1, rz=axisX?cz+1:cz;
      sBlock(lx,cy,lz,B.LOG);sBlock(rx,cy,rz,B.LOG);
    }
    cy-=1;
    if(cy<5)break;
  }
  return {x:cx,y:cy,z:cz};
}

// ---------------------------------------------------------------------------
//  ROOMS
// ---------------------------------------------------------------------------
// A 4-way cross intersection with rails through both axes and corner supports.
function buildIntersection(cx,cy,cz,rng){
  mineHollow(cx-2,cy,cz-2,cx+2,cy+2,cz+2);
  // floor
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
    if(getBlock(cx+dx,cy-1,cz+dz)!==B.BEDROCK)sBlock(cx+dx,cy-1,cz+dz,mineFloorBlock(cx+dx,cy-1,cz+dz,rng));
  }
  // corner timber columns + beams
  for(const [dx,dz] of [[-2,-2],[2,-2],[-2,2],[2,2]]){
    sBlock(cx+dx,cy,cz+dz,B.LOG);sBlock(cx+dx,cy+1,cz+dz,B.LOG);sBlock(cx+dx,cy+2,cz+dz,B.PLANKS);
  }
  // beams across the top edges
  for(let d=-2;d<=2;d++){
    sBlockSoft(cx+d,cy+2,cz-2,B.PLANKS);sBlockSoft(cx+d,cy+2,cz+2,B.PLANKS);
    sBlockSoft(cx-2,cy+2,cz+d,B.PLANKS);sBlockSoft(cx+2,cy+2,cz+d,B.PLANKS);
  }
  // rails crossing through the middle
  for(let d=-2;d<=2;d++){
    if(getBlock(cx+d,cy,cz)===B.AIR&&getBlock(cx+d,cy-1,cz)!==B.AIR)sBlock(cx+d,cy,cz,B.RAIL);
    if(getBlock(cx,cy,cz+d)===B.AIR&&getBlock(cx,cy-1,cz+d)!==B.AIR)sBlock(cx,cy,cz+d,B.RAIL);
  }
  sBlockSoft(cx,cy+1,cz,B.LANTERN);
  // cobwebs in the corners
  sBlockSoft(cx-2,cy+1,cz-2,B.COBWEB);sBlockSoft(cx+2,cy+1,cz+2,B.COBWEB);
}

// A station: parallel rail platform with chests / minecart loot area.
function buildStationRoom(cx,cy,cz,rng){
  mineHollow(cx-3,cy,cz-2,cx+3,cy+3,cz+2);
  for(let dx=-3;dx<=3;dx++)for(let dz=-2;dz<=2;dz++){
    if(getBlock(cx+dx,cy-1,cz+dz)!==B.BEDROCK)sBlock(cx+dx,cy-1,cz+dz,B.PLANKS);
  }
  // support frames along the long walls
  for(let dx=-3;dx<=3;dx+=3){
    sBlock(cx+dx,cy,cz-2,B.LOG);sBlock(cx+dx,cy+1,cz-2,B.LOG);
    sBlock(cx+dx,cy,cz+2,B.LOG);sBlock(cx+dx,cy+1,cz+2,B.LOG);
    sBlockSoft(cx+dx,cy+2,cz-2,B.PLANKS);sBlockSoft(cx+dx,cy+2,cz+2,B.PLANKS);
  }
  // double rail lines along x
  for(let dx=-3;dx<=3;dx++){
    sBlockSoft(cx+dx,cy,cz-1,B.RAIL);
    sBlockSoft(cx+dx,cy,cz+1,B.RAIL);
  }
  // central loot platform
  sBlockSoft(cx,cy,cz,B.CHEST);
  if(rng()<0.6)sBlockSoft(cx-2,cy,cz,B.CHEST);
  sBlockSoft(cx,cy+2,cz,B.LANTERN);
  sBlockSoft(cx+3,cy+1,cz-2,B.COBWEB);
  sBlockSoft(cx-3,cy+1,cz+2,B.COBWEB);
}

// A storage cellar: walled-off room with shelves, barrels (planks), loot.
function buildStorageCellar(cx,cy,cz,rng){
  const w=2+Math.floor(rng()*2),d=2+Math.floor(rng()*2);
  mineHollow(cx-w,cy,cz-d,cx+w,cy+2,cz+d);
  for(let dx=-w;dx<=w;dx++)for(let dz=-d;dz<=d;dz++){
    if(getBlock(cx+dx,cy-1,cz+dz)!==B.BEDROCK)sBlock(cx+dx,cy-1,cz+dz,B.PLANKS);
  }
  // corner posts
  for(const [sxn,szn] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
    const px=cx+sxn*w,pz=cz+szn*d;
    sBlock(px,cy,pz,B.LOG);sBlock(px,cy+1,pz,B.LOG);
  }
  // stacked crates (planks) and bookshelf-like storage along a wall
  for(let dx=-w+1;dx<=w-1;dx++){
    if(rng()<0.5)sBlockSoft(cx+dx,cy,cz-d,B.PLANKS);
    if(rng()<0.4){sBlockSoft(cx+dx,cy,cz+d,B.PLANKS);sBlockSoft(cx+dx,cy+1,cz+d,B.PLANKS);}
  }
  // loot
  sBlockSoft(cx,cy,cz,B.CHEST);
  if(rng()<0.5)sBlockSoft(cx+(rng()<0.5?1:-1),cy,cz+(rng()<0.5?1:-1),B.CHEST);
  sBlockSoft(cx,cy+2,cz,B.LANTERN);
  // age it with cobwebs
  sBlockSoft(cx-w,cy+1,cz-d,B.COBWEB);
  sBlockSoft(cx+w,cy+1,cz+d,B.COBWEB);
}

// A big open dig-site cavern: irregular hollow supported by wooden scaffolding
// pillars, with ore veins exposed, a central loot pile and lots of cobwebs.
function buildDigSiteCavern(cx,cy,cz,rng){
  const rx=4+Math.floor(rng()*3),rz=4+Math.floor(rng()*3),ry=3+Math.floor(rng()*2);
  for(let dx=-rx;dx<=rx;dx++)for(let dy=-1;dy<=ry;dy++)for(let dz=-rz;dz<=rz;dz++){
    const d=(dx*dx)/(rx*rx)+(dz*dz)/(rz*rz)+(dy*dy)/(ry*ry*0.8);
    const wob=hash3(cx+dx,cy+dy,cz+dz,961)*0.35;
    if(d<=1+wob){
      if(getBlock(cx+dx,cy+dy,cz+dz)!==B.BEDROCK)sBlock(cx+dx,cy+dy,cz+dz,B.AIR);
    }
  }
  // wooden scaffolding pillars supporting the roof
  for(const [ox,oz] of [[-2,-2],[2,2],[-2,2],[2,-2],[0,0]]){
    for(let dy=0;dy<=ry;dy++){
      if(getBlock(cx+ox,cy+dy,cz+oz)===B.AIR)sBlock(cx+ox,cy+dy,cz+oz,B.LOG);
    }
    // cross-braces at the top
    sBlockSoft(cx+ox,cy+ry,cz+oz,B.PLANKS);
  }
  // floor planks under the centre platform
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
    if(getBlock(cx+dx,cy-1,cz+dz)===B.AIR)sBlock(cx+dx,cy-1,cz+dz,B.PLANKS);
  }
  // expose some ores in the walls for that "they were mining here" feel
  for(let i=0;i<10;i++){
    const ax=cx+Math.floor((rng()-0.5)*rx*2);
    const az=cz+Math.floor((rng()-0.5)*rz*2);
    const ay=cy+Math.floor(rng()*ry);
    if(getBlock(ax,ay,az)===B.STONE){
      const o=rng();
      sBlock(ax,ay,az,o<0.5?B.COAL_ORE:o<0.8?B.IRON_ORE:o<0.95?B.GOLD_ORE:B.DIAMOND_ORE);
    }
  }
  // central loot + light
  sBlockSoft(cx,cy,cz,B.CHEST);
  sBlockSoft(cx,cy+1,cz,B.LANTERN);
  // lots of cobwebs around the edges
  for(let i=0;i<8;i++){
    const wx=cx+Math.floor((rng()-0.5)*rx*2);
    const wz=cz+Math.floor((rng()-0.5)*rz*2);
    const wy=cy+1+Math.floor(rng()*ry);
    sBlockSoft(wx,wy,wz,B.COBWEB);
  }
  // a rail spur leading out of the cavern
  for(let dx=-rx;dx<=rx;dx++)if(getBlock(cx+dx,cy,cz)===B.AIR&&getBlock(cx+dx,cy-1,cz)!==B.AIR)sBlockSoft(cx+dx,cy,cz,B.RAIL);
}

// ---------------------------------------------------------------------------
//  SURFACE ENTRANCE: a timber-framed shaft head rising to the surface, with a
//  ladder of rails / steps down to the hub.
// ---------------------------------------------------------------------------
function buildMineEntrance(hubX,hubY,hubZ,rng){
  let ex=hubX, ez=hubZ;
  let found=false;
  for(let tries=0;tries<10;tries++){
    const tx=hubX+Math.floor((rng()-0.5)*8),tz=hubZ+Math.floor((rng()-0.5)*8);
    if(tx<3||tx>=WORLD_W-3||tz<3||tz>=WORLD_D-3)continue;
    const gy=heightMap[colIndex(tx,tz)];
    const top=world[blockIndex(tx,gy,tz)];
    if(top!==B.WATER&&top!==B.LAVA&&gy>hubY+5){ ex=tx; ez=tz; found=true; break; }
  }
  if(!found)return;
  const gy=heightMap[colIndex(ex,ez)];
  if(gy<=hubY+4)return;
  // a little timber shaft head poking above the ground
  for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
    sBlock(ex+dx,gy+1,ez+dz,B.LOG);
    sBlock(ex+dx,gy+2,ez+dz,B.LOG);
  }
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
    if(Math.abs(dx)===1&&Math.abs(dz)===1)continue;
    sBlock(ex+dx,gy+3,ez+dz,B.PLANKS);
  }
  sBlock(ex,gy+1,ez,B.AIR);
  sBlockSoft(ex+1,gy+1,ez,B.TORCH);
  if(rng()<0.6)sBlockSoft(ex-1,gy+1,ez+1,B.CHEST);
  // dig the descending shaft, framed every few blocks, with rails as a "ladder"
  for(let y=gy;y>=hubY;y--){
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
      if(getBlock(ex+dx,y,ez+dz)!==B.BEDROCK)sBlock(ex+dx,y,ez+dz,B.AIR);
    }
    if((gy-y)%4===0){
      sBlock(ex-1,y,ez,B.LOG);sBlock(ex+1,y,ez,B.LOG);
      sBlockSoft(ex,y,ez,B.RAIL);
    }
    if((gy-y)%5===0)sBlockSoft(ex,y,ez,B.LANTERN);
    if((gy-y)%3===0&&rng()<0.5)sBlockSoft(ex+(rng()<0.5?1:-1),y,ez+(rng()<0.5?1:-1),B.COBWEB);
  }
  // connect the shaft bottom to the hub with a short air channel
  fillBox(Math.min(ex,hubX),hubY+1,Math.min(ez,hubZ),Math.max(ex,hubX),hubY+2,Math.max(ez,hubZ),B.AIR);
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
