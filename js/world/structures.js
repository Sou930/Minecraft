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

// ---------------------------------------------------------------------------
//  GLOBAL STRUCTURE PLACEMENT REGISTRY
//  Tracks every placed structure (any type) with its centre and the radius it
//  occupies, so new structures can avoid overlapping earlier ones regardless of
//  type. The pre-existing builders each only check minimum distance against
//  their OWN kind (e.g. villages vs. villages); this cross-type registry fills
//  that gap so a desert pyramid doesn't land on top of a village, a mineshaft
//  corridor doesn't cross through a stronghold, etc.
//  Cleared at the start of placeStructures().
// ---------------------------------------------------------------------------
const placedStructures=[]; // {x, z, radius, type}
function registerStructure(x,z,radius,type){
  placedStructures.push({x,z,radius,type});
}
function overlapsExisting(x,z,radius){
  for(const s of placedStructures){
    const minDist=radius+s.radius;
    if(Math.abs(s.x-x)<minDist&&Math.abs(s.z-z)<minDist)return true;
  }
  return false;
}

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
    // keep villages apart (use the largest radius so a town never crowds
    // another village's edge)
    let tooClose=false;
    for(const p of placed){if(Math.abs(p.x-cx)<60&&Math.abs(p.z-cz)<60){tooClose=true;break;}}
    if(tooClose)continue;
    // Roll the village size class BEFORE building, so the flatness test and
    // the cross-type overlap margin can use this class's own radius. Two
    // villages in the same playthrough can now come out as a small hamlet,
    // a standard village or a larger town — meaningfully different footprints
    // rather than always the fixed R=30 layout.
    const sizeRoll=rng();
    const sizeClass=sizeRoll<0.35?'hamlet':(sizeRoll<0.75?'village':'town');
    const sizeRadius=sizeClassRadius(sizeClass);
    // Cross-type overlap check: don't build a village on top of an
    // already-placed stronghold/mineshaft/etc. Use the size-class radius
    // plus a small margin.
    if(overlapsExisting(cx,cz,sizeRadius+6))continue;
    if(tryBuildVillage(cx,cz,rng,sizeClass)){
      placed.push({x:cx,z:cz});
      registerStructure(cx,cz,sizeRadius+6,'village:'+sizeClass);
    }
  }
  return placed;
}

// Radius each village size class occupies. Used for the flatness test, the
// cross-type overlap margin and the registry entry so hamlets (small) need
// less flat land than towns (large).
function sizeClassRadius(sizeClass){
  if(sizeClass==='hamlet')return 18;
  if(sizeClass==='town')  return 40;
  return 30;                       // 'village' (the original default)
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

function tryBuildVillage(cx,cz,rng,sizeClass){
  // Default to the medium 'village' class if a caller forgot to pass one, so
  // the function stays backward-compatible with any direct callers.
  if(!sizeClass)sizeClass='village';
  const R=sizeClassRadius(sizeClass);
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
  // 4) buildings laid out in concentric rings around the well, all facing
  //    inward toward the plaza. The set of ring positions, the farm target
  //    and whether a market / windmill are guaranteed all depend on the size
  //    class, so a hamlet, a village and a town now have visibly different
  //    layouts and building counts instead of one shared skeleton.
  const houseSpots=villageHouseSpots(sizeClass);
  // Per-class amenity policy.
  const FARM_TARGET =(sizeClass==='hamlet')?1:(sizeClass==='town'?4:3);
  const MARKET_OK   =sizeClass!=='hamlet';   // hamlets have no market
  const WINDMILL_OK =sizeClass!=='hamlet';   // hamlets get no guaranteed windmill
  const MARKET_RING =sizeClass==='town'?12:4;// towns may place the market further out
  const FARM_RING   =sizeClass==='hamlet'?4:8;
  let farms=0,builtMarket=false,builtWindmill=false;
  // Remember the last farm we placed so the windmill can be raised right beside
  // a crop field — a classic "風車のある農場" (farm with a windmill) scene.
  let lastFarm=null;
  for(let i=0;i<houseSpots.length;i++){
    const hx=cx+houseSpots[i][0],hz=cz+houseSpots[i][1];
    if(hx<R+2||hx>=WORLD_W-R-2||hz<R+2||hz>=WORLD_D-R-2)continue;
    const r=rng();
    // Farms prefer the roomier outer ring(s).
    if(farms<FARM_TARGET&&i>=FARM_RING&&r<0.45){buildFarm(hx,hz,ground,desert);lastFarm=[hx,hz];farms++;continue;}
    if(MARKET_OK&&!builtMarket&&i>=MARKET_RING&&r<0.3){buildMarket(hx,hz,ground,desert);builtMarket=true;continue;}
    buildHouse(hx,hz,ground,rng,desert,snowy,cx,cz);
    // a lamp post beside most houses
    if(rng()<0.7)buildLampPost(hx+(houseSpots[i][0]<0?3:-3),hz+2,ground);
  }
  // Guarantee at least one farm even if the random rolls skipped them.
  if(farms===0){
    const fx=cx-(sizeClass==='hamlet'?14:22),fz=cz+10;
    if(fx>=R+2&&fx<WORLD_W-R-2){buildFarm(fx,fz,ground,desert);lastFarm=[fx,fz];farms++;}
  }
  // Towns always get a market even if the loop rolls skipped it.
  if(sizeClass==='town'&&!builtMarket){
    const mx=cx+12,mz=cz-12;
    if(mx>=R+2&&mx<WORLD_W-R-2){buildMarket(mx,mz,ground,desert);builtMarket=true;}
  }
  // Every village (except hamlets) gets one windmill mill-house, raised on the
  // village fringe next to a farm field so its turning sails overlook the crops.
  if(WINDMILL_OK&&!builtWindmill&&lastFarm){
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

// Building ring positions per village size class. Each class has a distinct
// layout skeleton:
//   hamlet  — a tight cluster of 8 close-together spots (6–8 buildings).
//   village — the original 20-position two-ring layout (inner + outer).
//   town    — the village layout plus an additional outer ring of 12 slots so
//             a town has the most buildings and the widest footprint.
function villageHouseSpots(sizeClass){
  if(sizeClass==='hamlet'){
    // 8 close-together spots forming a single tight ring around the well.
    return [
      [-8,-8],[8,-8],[-8,8],[8,8],
      [0,-11],[0,11],[-11,0],[11,0],
    ];
  }
  // The shared medium/large base: inner ring (8) + outer ring (12).
  const base=[
    // inner ring
    [-10,-10],[10,-10],[-10,10],[10,10],
    [0,-13],[0,13],[-13,0],[13,0],
    // outer ring
    [-22,-10],[22,-10],[-22,10],[22,10],
    [-10,-22],[10,-22],[-10,22],[10,22],
    [-22,-22],[22,-22],[-22,22],[22,22],
    [0,-24],[0,24],[-24,0],[24,0],
  ];
  if(sizeClass==='town'){
    // Additional outer ring of 12 slots, further out, for a larger town.
    return base.concat([
      [-33,-16],[33,-16],[-33,16],[33,16],
      [-16,-33],[16,-33],[-16,33],[16,33],
      [-33,-33],[33,-33],[-33,33],[33,33],
    ]);
  }
  return base;                     // 'village'
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

// Minecraft-style village well: cobblestone rim, oak log posts, plank roof,
// lantern, and a water shaft.
function buildWell(cx,cz,gy,desert){
  const wall=desert?B.SANDSTONE:B.COBBLE;
  const postMat=desert?B.SANDSTONE:B.LOG;
  // dig a 3x3 shaft and fill the bottom with water
  fillBox(cx-1,gy-5,cz-1,cx+1,gy-1,cz+1,B.AIR);
  fillBox(cx-1,gy-5,cz-1,cx+1,gy-4,cz+1,B.WATER);
  // cobblestone shaft walls
  for(let y=gy-3;y<=gy-1;y++){
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
      if(Math.abs(dx)===1||Math.abs(dz)===1)sBlock(cx+dx,y,cz+dz,wall);
    }
  }
  // Well rim: 2 blocks above ground (Minecraft style)
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
    if(Math.abs(dx)===1||Math.abs(dz)===1){
      sBlock(cx+dx,gy,cz+dz,wall);
      sBlock(cx+dx,gy+1,cz+dz,wall);
    }
  }
  // 4 log corner pillars above the rim
  for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
    sBlock(cx+dx,gy+2,cz+dz,postMat);
    sBlock(cx+dx,gy+3,cz+dz,postMat);
  }
  // Plank roof slabs
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)
    sBlock(cx+dx,gy+4,cz+dz,B.PLANKS);
  // Peaked center roof
  sBlock(cx,gy+5,cz,B.PLANKS);
  // Horizontal beam across the top (like a real well crossbeam)
  sBlock(cx-1,gy+4,cz,B.LOG);sBlock(cx,gy+4,cz,B.LOG);sBlock(cx+1,gy+4,cz,B.LOG);
  // Lantern hanging under the crossbeam
  sBlock(cx,gy+3,cz,B.LANTERN);
}

// Minecraft-style village house:
//   - Stone cobblestone foundation ring (1 block tall)
//   - Oak plank walls with log corner posts (classic half-timber framing)
//   - Cobblestone chimney on the back wall
//   - Glass pane windows with oak trim
//   - Sloped plank/stair roof
//   - Door facing village centre
//   - Interior: chest, bed, crafting table, furnace, torches
function buildHouse(hx,hz,gy,rng,desert,snowy,villageX,villageZ){
  // 5 distinct layouts: 0=small,1=medium,2=large (single-room), 3=two-story,
  // 4=L-shaped. All rolls come from the village's deterministic rng so a given
  // world seed reproduces an identical village layout.
  const houseType=Math.floor(rng()*5);
  const furnishVariant=Math.floor(rng()*3);      // 0-2: shifts bed/chest corners + extras
  const roofStyle=rng()<0.30?'leanto':'pitched'; // ~30% lean-to, ~70% pitched
  if(houseType===3){buildTwoStoryHouse(hx,hz,gy,rng,desert,snowy,villageX,villageZ,furnishVariant,roofStyle);return;}
  if(houseType===4){buildLHouse(hx,hz,gy,rng,desert,snowy,villageX,villageZ,furnishVariant,roofStyle);return;}
  // 0/1/2: existing single-room code path (structure unchanged); the roof
  // style and furnishing layout are now driven by the rolled variants.
  const w=(houseType===2?8:(houseType===1?7:6));
  const d=(houseType===2?8:(houseType===1?6:5));
  const wallH=4; // Minecraft houses are 4 walls tall
  const x0=hx-((w-1)>>1),z0=hz-((d-1)>>1);
  const x1=x0+w-1,z1=z0+d-1;
  const wallMat=desert?B.SANDSTONE:(snowy?B.SNOW_BLOCK:B.PLANKS);
  const cornerMat=desert?B.SANDSTONE:B.LOG;
  const foundMat=desert?B.SANDSTONE:B.COBBLE;
  const roofMat=desert?B.SANDSTONE:(snowy?B.SNOW_BLOCK:B.LOG);

  // clear space above
  fillBox(x0-1,gy+1,z0-1,x1+1,gy+wallH+5,z1+1,B.AIR);

  // === FOUNDATION (cobblestone base ring) ===
  for(let x=x0;x<=x1;x++){sBlock(x,gy,z0,foundMat);sBlock(x,gy,z1,foundMat);}
  for(let z=z0;z<=z1;z++){sBlock(x0,gy,z,foundMat);sBlock(x1,gy,z,foundMat);}
  // Fill interior floor with planks
  fillBox(x0+1,gy,z0+1,x1-1,gy,z1-1,desert?B.SANDSTONE:B.PLANKS);

  // === WALLS ===
  for(let y=gy+1;y<=gy+wallH;y++){
    for(let x=x0;x<=x1;x++){sBlock(x,y,z0,wallMat);sBlock(x,y,z1,wallMat);}
    for(let z=z0;z<=z1;z++){sBlock(x0,y,z,wallMat);sBlock(x1,y,z,wallMat);}
  }
  // === LOG CORNER POSTS (full height) ===
  for(let y=gy+1;y<=gy+wallH;y++){
    sBlock(x0,y,z0,cornerMat);sBlock(x1,y,z0,cornerMat);
    sBlock(x0,y,z1,cornerMat);sBlock(x1,y,z1,cornerMat);
  }
  // === Horizontal log bands at mid-height (half-timber style) ===
  const midY=gy+2;
  for(let x=x0;x<=x1;x++){sBlock(x,midY,z0,cornerMat);sBlock(x,midY,z1,cornerMat);}
  for(let z=z0;z<=z1;z++){sBlock(x0,midY,z,cornerMat);sBlock(x1,midY,z,cornerMat);}

  // === WINDOWS (glass panes – 2 per long wall, with log trim above/below) ===
  const wy=gy+3; // window level
  // Front/back walls
  const midX=Math.floor((x0+x1)/2);
  sBlock(midX-1,wy,z0,B.GLASS);sBlock(midX+1,wy,z0,B.GLASS);
  sBlock(midX-1,wy,z1,B.GLASS);sBlock(midX+1,wy,z1,B.GLASS);
  // Side walls (if wide enough)
  if(d>=6){const midZ=Math.floor((z0+z1)/2);sBlock(x0,wy,midZ,B.GLASS);sBlock(x1,wy,midZ,B.GLASS);}

  // === CHIMNEY (cobblestone, 3 blocks tall above roof) ===
  if(!desert){
    const chX=x1-1,chZ=z0+1;
    for(let y=gy+wallH+1;y<=gy+wallH+4;y++)sBlock(chX,y,chZ,B.COBBLE);
    // soot/torch inside
    sBlock(chX,gy+1,chZ,B.FURNACE);
  }

  // === DOOR ===
  let doorX,doorZ,doorBottom,doorTop,frontDX=0,frontDZ=0;
  const toCx=(villageX!==undefined)?villageX-hx:0;
  const toCz=(villageZ!==undefined)?villageZ-hz:1;
  if(Math.abs(toCz)>=Math.abs(toCx)){
    doorX=hx;
    if(toCz>=0){doorZ=z1;doorBottom=B.DOOR_BOTTOM_S_CLOSED;doorTop=B.DOOR_TOP_S_CLOSED;frontDZ=1;}
    else       {doorZ=z0;doorBottom=B.DOOR_BOTTOM_N_CLOSED;doorTop=B.DOOR_TOP_N_CLOSED;frontDZ=-1;}
  }else{
    doorZ=hz;
    if(toCx>=0){doorX=x1;doorBottom=B.DOOR_BOTTOM_E_CLOSED;doorTop=B.DOOR_TOP_E_CLOSED;frontDX=1;}
    else       {doorX=x0;doorBottom=B.DOOR_BOTTOM_W_CLOSED;doorTop=B.DOOR_TOP_W_CLOSED;frontDX=-1;}
  }
  sBlock(doorX,gy+1,doorZ,doorBottom);
  sBlock(doorX,gy+2,doorZ,doorTop);
  sBlock(doorX+frontDX,gy+1,doorZ+frontDZ,B.AIR);
  sBlock(doorX+frontDX,gy+2,doorZ+frontDZ,B.AIR);
  // Small stone step/stair in front of door
  sBlock(doorX+frontDX,gy,doorZ+frontDZ,B.COBBLE);

  // === ROOF === (style rolled per house: pitched is the common case, the
  // single-slope lean-to is a minority variant for visual variety)
  if(roofStyle==='leanto')buildLeanToRoof(x0,z0,x1,z1,gy+wallH+1,desert,snowy);
  else buildRoofMinecraft(x0,z0,x1,z1,gy+wallH+1,desert,snowy);

  // === INTERIOR FURNISHINGS === (layout rolled per house so neighbours don't
  // look like exact mirrors: chest/bed/crafting corners shift, a bookshelf or
  // an extra torch may appear)
  placeHouseFurnishings(x0,z0,x1,z1,gy,wallH,furnishVariant,midX,desert);
}

// ---------------------------------------------------------------------------
//  HOUSE VARIETY HELPERS (two-story, L-shaped, lean-to roof, furnishing layout)
//  These reuse the existing wall/window/door/roof building blocks rather than
//  reimplementing them, so the new shapes stay visually consistent with the
//  single-room houses. All randomness is drawn from the village's own rng so a
//  given world seed reproduces an identical layout.
// ---------------------------------------------------------------------------

// Per-house furnishing layout: variant 0 keeps the original corner placement,
// variants 1–2 shift which corner the bed & chest go in and may add a
// bookshelf (B.BOOKSHELF) or a second torch for variety.
function placeHouseFurnishings(x0,z0,x1,z1,gy,wallH,variant,midX,desert){
  const floorMat=desert?B.SANDSTONE:B.PLANKS;
  if(variant===0){
    // original layout (chest front-left, bed back-right, crafting front-right)
    sBlock(x0+1,gy+1,z0+1,B.CHEST);
    sBlock(x1-1,gy+wallH,z0+1,B.TORCH);
    sBlock(x0+1,gy+wallH,z1-1,B.TORCH);
    sBlock(x1-1,gy+1,z1-1,B.WOOL_RED);sBlock(x1-2,gy+1,z1-1,B.WOOL_WHITE);
    sBlock(x0+1,gy+1,z1-1,B.CRAFTING);
  }else if(variant===1){
    // mirrored layout: chest back-left, bed front-right, crafting back-right,
    // plus a bookshelf against a wall for a lived-in study feel.
    sBlock(x0+1,gy+1,z1-1,B.CHEST);
    sBlock(x1-1,gy+wallH,z0+1,B.TORCH);
    sBlock(x0+1,gy+wallH,z0+1,B.TORCH);
    sBlock(x1-1,gy+1,z0+1,B.WOOL_RED);sBlock(x1-2,gy+1,z0+1,B.WOOL_WHITE);
    sBlock(x0+1,gy+1,z0+1,B.CRAFTING);
    sBlock(x1-1,gy+1,z1-1,B.BOOKSHELF);
  }else{
    // variant 2: chest front-right, bed back-left, crafting front-left, an
    // extra wall torch + a bookshelf.
    sBlock(x1-1,gy+1,z0+1,B.CHEST);
    sBlock(x1-1,gy+wallH,z1-1,B.TORCH);
    sBlock(x0+1,gy+wallH,z0+1,B.TORCH);
    sBlock(x0+1,gy+wallH,z1-1,B.TORCH);
    sBlock(x0+1,gy+1,z1-1,B.WOOL_RED);sBlock(x0+2,gy+1,z1-1,B.WOOL_WHITE);
    sBlock(x1-1,gy+1,z1-1,B.CRAFTING);
    sBlock(x0+1,gy+1,z0+1,B.BOOKSHELF);
  }
  // Flower pot hint on windowsill (use dandelion) — kept on all variants.
  sBlockSoft(midX,gy+3,z0-1,B.FLOWER_DANDELION);
}

// A flatter single-slope "lean-to" roof: a minority variant (~30%) that slopes
// in just one direction instead of pitching from a central ridge. Reuses the
// stair-block approach from buildRoofMinecraft so it renders consistently.
function buildLeanToRoof(x0,z0,x1,z1,baseY,desert,snowy){
  const capMat=desert?B.SANDSTONE:(snowy?B.SNOW_BLOCK:B.PLANKS);
  const ridgeMat=B.LOG;
  // slope runs along Z from the high back (z0-1) down to the low front (z1+1).
  const span=(z1-z0)+3;
  for(let layer=0;layer<span;layer++){
    const y=baseY+layer;
    const zLine=z0-1+layer;             // a single sloping line, not a pair
    for(let x=x0-1;x<=x1+1;x++){
      if(desert||snowy) sBlock(x,y,zLine,capMat);
      else              sBlock(x,y,zLine,B.STAIRS_S);
    }
  }
  // a low ridge log along the high edge to cap the slope
  for(let x=x0-1;x<=x1+1;x++)sBlock(x,baseY,z0-1,ridgeMat);
  if(snowy){for(let x=x0-1;x<=x1+1;x++)sBlock(x,baseY+1,z0-1,B.SNOW);}
}

// Two-story house (layout type 3): same footprint as "medium" (7×6), but with a
// second floor stacked above the first. A plank floor slab separates the
// storeys; a STAIRS block against an interior wall gives vertical access (the
// palette has no LADDER block, so stairs stand in for it). The upper floor gets
// its own window row and is capped with the rolled roof style.
function buildTwoStoryHouse(hx,hz,gy,rng,desert,snowy,villageX,villageZ,furnishVariant,roofStyle){
  const w=7,d=6;                       // medium footprint
  const wallH=4;                       // each floor is 4 walls tall
  const x0=hx-((w-1)>>1),z0=hz-((d-1)>>1);
  const x1=x0+w-1,z1=z0+d-1;
  const wallMat=desert?B.SANDSTONE:(snowy?B.SNOW_BLOCK:B.PLANKS);
  const cornerMat=desert?B.SANDSTONE:B.LOG;
  const foundMat=desert?B.SANDSTONE:B.COBBLE;
  const midX=Math.floor((x0+x1)/2);

  // clear a taller column (two floors + roof + chimney)
  fillBox(x0-1,gy+1,z0-1,x1+1,gy+wallH*2+6,z1+1,B.AIR);

  // === FOUNDATION + ground floor ===
  for(let x=x0;x<=x1;x++){sBlock(x,gy,z0,foundMat);sBlock(x,gy,z1,foundMat);}
  for(let z=z0;z<=z1;z++){sBlock(x0,gy,z,foundMat);sBlock(x1,gy,z,foundMat);}
  fillBox(x0+1,gy,z0+1,x1-1,gy,z1-1,desert?B.SANDSTONE:B.PLANKS);

  // ground-floor walls + corner posts + mid band (mirrors single-room builder)
  for(let y=gy+1;y<=gy+wallH;y++){
    for(let x=x0;x<=x1;x++){sBlock(x,y,z0,wallMat);sBlock(x,y,z1,wallMat);}
    for(let z=z0;z<=z1;z++){sBlock(x0,y,z,wallMat);sBlock(x1,y,z,wallMat);}
  }
  for(let y=gy+1;y<=gy+wallH;y++){
    sBlock(x0,y,z0,cornerMat);sBlock(x1,y,z0,cornerMat);
    sBlock(x0,y,z1,cornerMat);sBlock(x1,y,z1,cornerMat);
  }
  const midY1=gy+2;
  for(let x=x0;x<=x1;x++){sBlock(x,midY1,z0,cornerMat);sBlock(x,midY1,z1,cornerMat);}
  for(let z=z0;z<=z1;z++){sBlock(x0,midY1,z,cornerMat);sBlock(x1,midY1,z,cornerMat);}
  // ground-floor windows
  const wy1=gy+3;
  sBlock(midX-1,wy1,z0,B.GLASS);sBlock(midX+1,wy1,z0,B.GLASS);
  sBlock(midX-1,wy1,z1,B.GLASS);sBlock(midX+1,wy1,z1,B.GLASS);

  // === INTERMEDIATE PLANK FLOOR SLAB (separates storeys) ===
  fillBox(x0+1,gy+wallH+1,z0+1,x1-1,gy+wallH+1,z1-1,desert?B.SANDSTONE:B.PLANKS);

  // === SECOND FLOOR walls + corners + mid band ===
  const f2y0=gy+wallH+2, f2y1=gy+wallH*2+1;
  for(let y=f2y0;y<=f2y1;y++){
    for(let x=x0;x<=x1;x++){sBlock(x,y,z0,wallMat);sBlock(x,y,z1,wallMat);}
    for(let z=z0;z<=z1;z++){sBlock(x0,y,z,wallMat);sBlock(x1,y,z,wallMat);}
  }
  for(let y=f2y0;y<=f2y1;y++){
    sBlock(x0,y,z0,cornerMat);sBlock(x1,y,z0,cornerMat);
    sBlock(x0,y,z1,cornerMat);sBlock(x1,y,z1,cornerMat);
  }
  const midY2=f2y0+1;
  for(let x=x0;x<=x1;x++){sBlock(x,midY2,z0,cornerMat);sBlock(x,midY2,z1,cornerMat);}
  for(let z=z0;z<=z1;z++){sBlock(x0,midY2,z,cornerMat);sBlock(x1,midY2,z,cornerMat);}
  // upper-floor window row (an extra window row, as required)
  const wy2=f2y0+1;
  sBlock(midX-1,wy2,z0,B.GLASS);sBlock(midX+1,wy2,z0,B.GLASS);
  sBlock(midX-1,wy2,z1,B.GLASS);sBlock(midX+1,wy2,z1,B.GLASS);

  // === CHIMNEY ===
  if(!desert){
    const chX=x1-1,chZ=z0+1;
    for(let y=f2y1+1;y<=f2y1+4;y++)sBlock(chX,y,chZ,B.COBBLE);
    sBlock(chX,gy+1,chZ,B.FURNACE);
  }

  // === DOOR facing the village centre (ground floor only) ===
  let doorX,doorZ,doorBottom,doorTop,frontDX=0,frontDZ=0;
  const toCx=(villageX!==undefined)?villageX-hx:0;
  const toCz=(villageZ!==undefined)?villageZ-hz:1;
  if(Math.abs(toCz)>=Math.abs(toCx)){
    doorX=hx;
    if(toCz>=0){doorZ=z1;doorBottom=B.DOOR_BOTTOM_S_CLOSED;doorTop=B.DOOR_TOP_S_CLOSED;frontDZ=1;}
    else       {doorZ=z0;doorBottom=B.DOOR_BOTTOM_N_CLOSED;doorTop=B.DOOR_TOP_N_CLOSED;frontDZ=-1;}
  }else{
    doorZ=hz;
    if(toCx>=0){doorX=x1;doorBottom=B.DOOR_BOTTOM_E_CLOSED;doorTop=B.DOOR_TOP_E_CLOSED;frontDX=1;}
    else       {doorX=x0;doorBottom=B.DOOR_BOTTOM_W_CLOSED;doorTop=B.DOOR_TOP_W_CLOSED;frontDX=-1;}
  }
  sBlock(doorX,gy+1,doorZ,doorBottom);
  sBlock(doorX,gy+2,doorZ,doorTop);
  sBlock(doorX+frontDX,gy+1,doorZ+frontDZ,B.AIR);
  sBlock(doorX+frontDX,gy+2,doorZ+frontDZ,B.AIR);
  sBlock(doorX+frontDX,gy,doorZ+frontDZ,B.COBBLE);

  // === STAIRS BLOCK for vertical access between floors ===
  // Place an interior stair against the back wall so the player can climb to
  // the second floor. STAIRS_N faces "up toward north" — sit it so its low end
  // is on the ground floor and it climbs toward the floor slab.
  sBlock(x0+1,gy+wallH,z1-1,B.STAIRS_N);
  // punch a hole in the floor slab above the stair so the player can step up
  sBlock(x0+1,gy+wallH+1,z1-1,B.AIR);

  // === ROOF on the upper floor ===
  if(roofStyle==='leanto')buildLeanToRoof(x0,z0,x1,z1,f2y1+1,desert,snowy);
  else buildRoofMinecraft(x0,z0,x1,z1,f2y1+1,desert,snowy);

  // === FURNISHINGS === ground floor uses the rolled variant layout; the
  // upper floor gets a bed + an extra chest so the two-storey house reads as a
  // home with an upstairs bedroom.
  placeHouseFurnishings(x0,z0,x1,z1,gy,wallH,furnishVariant,midX,desert);
  // upstairs bedroom: bed in a back corner + a chest
  sBlock(x1-1,f2y0,z1-1,B.WOOL_RED);sBlock(x1-2,f2y0,z1-1,B.WOOL_WHITE);
  sBlock(x0+1,f2y0,z0+1,B.CHEST);
  sBlock(x1-1,f2y1,z0+1,B.TORCH);
}

// L-shaped house (layout type 4): two overlapping rectangular wings of
// different sizes sharing one corner — a 6×5 main wing and a 4×4 side wing.
// Each wing is walled/roofed with the existing helpers, then a doorway is cut
// between them so the interior is continuous.
function buildLHouse(hx,hz,gy,rng,desert,snowy,villageX,villageZ,furnishVariant,roofStyle){
  const wallH=4;
  const wallMat=desert?B.SANDSTONE:(snowy?B.SNOW_BLOCK:B.PLANKS);
  const cornerMat=desert?B.SANDSTONE:B.LOG;
  const foundMat=desert?B.SANDSTONE:B.COBBLE;
  // Main wing: 6×5, centred on (hx,hz).
  const mw=6,md=5;
  const mx0=hx-((mw-1)>>1),mz0=hz-((md-1)>>1);
  const mx1=mx0+mw-1,mz1=mz0+md-1;
  // Side wing: 4×4, sharing the main wing's south-east corner and extending
  // outward in +x/+z so the two boxes form an L.
  const sw=4,sd=4;
  const sx0=mx1-1,sz0=mz1-1;             // shared corner
  const sx1=sx0+sw-1,sz1=sz0+sd-1;

  // clear the combined footprint
  fillBox(Math.min(mx0,sx0)-1,gy+1,Math.min(mz0,sz0)-1,
          Math.max(mx1,sx1)+1,gy+wallH+5,Math.max(mz1,sz1)+1,B.AIR);

  // Helper: lay a rectangular wing's foundation, walls, corner posts, mid band,
  // windows and roof. Reuses the same block choices as the single-room builder.
  const buildWing=(x0,z0,x1,z1,doRoof)=>{
    // foundation ring + plank floor
    for(let x=x0;x<=x1;x++){sBlock(x,gy,z0,foundMat);sBlock(x,gy,z1,foundMat);}
    for(let z=z0;z<=z1;z++){sBlock(x0,gy,z,foundMat);sBlock(x1,gy,z,foundMat);}
    fillBox(x0+1,gy,z0+1,x1-1,gy,z1-1,desert?B.SANDSTONE:B.PLANKS);
    // walls
    for(let y=gy+1;y<=gy+wallH;y++){
      for(let x=x0;x<=x1;x++){sBlock(x,y,z0,wallMat);sBlock(x,y,z1,wallMat);}
      for(let z=z0;z<=z1;z++){sBlock(x0,y,z,wallMat);sBlock(x1,y,z,wallMat);}
    }
    // corner posts
    for(let y=gy+1;y<=gy+wallH;y++){
      sBlock(x0,y,z0,cornerMat);sBlock(x1,y,z0,cornerMat);
      sBlock(x0,y,z1,cornerMat);sBlock(x1,y,z1,cornerMat);
    }
    // mid band
    const midY=gy+2;
    for(let x=x0;x<=x1;x++){sBlock(x,midY,z0,cornerMat);sBlock(x,midY,z1,cornerMat);}
    for(let z=z0;z<=z1;z++){sBlock(x0,midY,z,cornerMat);sBlock(x1,midY,z,cornerMat);}
    // windows (skip very small walls)
    const wy=gy+3;
    const midX=Math.floor((x0+x1)/2),midZ=Math.floor((z0+z1)/2);
    if(x1-x0>=4){sBlock(midX-1,wy,z0,B.GLASS);sBlock(midX+1,wy,z0,B.GLASS);}
    if(x1-x0>=4){sBlock(midX-1,wy,z1,B.GLASS);sBlock(midX+1,wy,z1,B.GLASS);}
    if(z1-z0>=4){sBlock(x0,wy,midZ,B.GLASS);sBlock(x1,wy,midZ,B.GLASS);}
    if(doRoof){
      if(roofStyle==='leanto')buildLeanToRoof(x0,z0,x1,z1,gy+wallH+1,desert,snowy);
      else buildRoofMinecraft(x0,z0,x1,z1,gy+wallH+1,desert,snowy);
    }
  };

  // Build the main wing with its roof, then the side wing with its own roof.
  buildWing(mx0,mz0,mx1,mz1,true);
  buildWing(sx0,sz0,sx1,sz1,true);

  // === CUT A DOORWAY BETWEEN THE TWO WINGS === so the L's interior is one
  // continuous space. The shared corner is around (mx1,mz1); open a 2-tall gap
  // in the wall that divides them.
  sBlock(mx1,gy+1,mz1,B.AIR);
  sBlock(mx1,gy+2,mz1,B.AIR);

  // === DOOR facing the village centre (on the main wing) ===
  let doorX,doorZ,doorBottom,doorTop,frontDX=0,frontDZ=0;
  const toCx=(villageX!==undefined)?villageX-hx:0;
  const toCz=(villageZ!==undefined)?villageZ-hz:1;
  if(Math.abs(toCz)>=Math.abs(toCx)){
    doorX=hx;
    if(toCz>=0){doorZ=mz1;doorBottom=B.DOOR_BOTTOM_S_CLOSED;doorTop=B.DOOR_TOP_S_CLOSED;frontDZ=1;}
    else       {doorZ=mz0;doorBottom=B.DOOR_BOTTOM_N_CLOSED;doorTop=B.DOOR_TOP_N_CLOSED;frontDZ=-1;}
  }else{
    doorZ=hz;
    if(toCx>=0){doorX=mx1;doorBottom=B.DOOR_BOTTOM_E_CLOSED;doorTop=B.DOOR_TOP_E_CLOSED;frontDX=1;}
    else       {doorX=mx0;doorBottom=B.DOOR_BOTTOM_W_CLOSED;doorTop=B.DOOR_TOP_W_CLOSED;frontDX=-1;}
  }
  sBlock(doorX,gy+1,doorZ,doorBottom);
  sBlock(doorX,gy+2,doorZ,doorTop);
  sBlock(doorX+frontDX,gy+1,doorZ+frontDZ,B.AIR);
  sBlock(doorX+frontDX,gy+2,doorZ+frontDZ,B.AIR);
  sBlock(doorX+frontDX,gy,doorZ+frontDZ,B.COBBLE);

  // === CHIMNEY on the main wing ===
  if(!desert){
    const chX=mx1-1,chZ=mz0+1;
    for(let y=gy+wallH+1;y<=gy+wallH+4;y++)sBlock(chX,y,chZ,B.COBBLE);
    sBlock(chX,gy+1,chZ,B.FURNACE);
  }

  // === FURNISHINGS in the main wing; the side wing gets a chest + bed so the
  // L reads as a main living area plus a bedroom wing.
  const midX=Math.floor((mx0+mx1)/2);
  placeHouseFurnishings(mx0,mz0,mx1,mz1,gy,wallH,furnishVariant,midX,desert);
  sBlock(sx0+1,gy+1,sz1-1,B.CHEST);
  sBlock(sx1-1,gy+1,sz0+1,B.WOOL_RED);sBlock(sx1-2,gy+1,sz0+1,B.WOOL_WHITE);
  sBlock(sx1-1,gy+wallH,sz0+1,B.TORCH);
}

// Minecraft-style pitched roof using stair blocks for proper angled eaves.
// The roof overhangs 1 block on all sides. Snowy biomes get a white wool cap.
function buildRoofMinecraft(x0,z0,x1,z1,baseY,desert,snowy){
  const capMat=desert?B.SANDSTONE:(snowy?B.SNOW_BLOCK:B.PLANKS);
  const ridgeMat=B.LOG;
  const midZ=Math.round((z0+z1)/2);
  const span=Math.ceil((z1-z0)/2)+2;
  for(let layer=0;layer<span;layer++){
    const y=baseY+layer;
    const za=z0-1+layer, zb=z1+1-layer;
    if(za>zb)break;
    for(let x=x0-1;x<=x1+1;x++){
      if(desert||snowy){
        sBlock(x,y,za,capMat);
        if(zb!==za)sBlock(x,y,zb,capMat);
      }else{
        sBlock(x,y,za,B.STAIRS_N);
        if(zb!==za)sBlock(x,y,zb,B.STAIRS_S);
      }
    }
    if(za>=zb-1){
      for(let x=x0-1;x<=x1+1;x++)sBlock(x,y,midZ,ridgeMat);
      if(snowy){for(let x=x0-1;x<=x1+1;x++)sBlock(x,y+1,midZ,B.SNOW);}
    }
  }
}

// Pitched roof (kept for witch hut / windmill back-compat).
function buildRoof(x0,z0,x1,z1,baseY,desert){
  const midZ=(z0+z1)/2;const span=Math.ceil((z1-z0)/2)+1;
  for(let layer=0;layer<span;layer++){
    const y=baseY+layer;
    const za=z0+layer, zb=z1-layer;
    for(let x=x0-1;x<=x1+1;x++){
      if(desert){sBlock(x,y,za,B.SANDSTONE);sBlock(x,y,zb,B.SANDSTONE);}
      else{sBlock(x,y,za,B.STAIRS_N);if(zb!==za)sBlock(x,y,zb,B.STAIRS_S);}
    }
    if(za>=zb-1){for(let x=x0-1;x<=x1+1;x++)sBlock(x,y,Math.round(midZ),B.LOG);}
  }
}

// Put a couple of useful items in a structure chest. The game doesn't model
// chest contents, so we represent loot by surrounding it with a hay/bookshelf
// flavour block; the chest itself is breakable for the chest item.
function fillContainerNearby(x,y,z){ /* visual loot hint only */ }

// Minecraft-style lamp post: fence post column (shorter, more authentic look)
// topped with a lantern. Desert villages use sandstone pillars.
function buildLampPost(x,z,gy){
  if(!inBounds(x,gy+1,z))return;
  if(world[blockIndex(x,gy,z)]===B.WATER)return;
  // Base block (cobblestone / sandstone foundation)
  sBlock(x,gy,z,B.COBBLE);
  // Fence post shaft (3 tall) — reads as a thin iron-style post
  sBlock(x,gy+1,z,B.FENCE_OAK);
  sBlock(x,gy+2,z,B.FENCE_OAK);
  sBlock(x,gy+3,z,B.FENCE_OAK);
  // Lantern on top
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

// Minecraft-style village market stall: cobble base, log posts, plank counter,
// wool awning, chests and hay bales. A sign banner hangs over the entrance.
function buildMarket(cx,cz,gy,desert){
  const postMat=B.LOG;
  const counterMat=desert?B.SANDSTONE:B.PLANKS;
  const roofMat1=B.WOOL_RED;
  const roofMat2=B.WOOL_WHITE;

  // Cobblestone floor platform
  for(let dx=-3;dx<=3;dx++)for(let dz=-2;dz<=3;dz++)
    sBlock(cx+dx,gy,cz+dz,desert?B.SANDSTONE:B.COBBLE);

  // 4 corner log posts (full height)
  for(const [dx,dz] of [[-3,-2],[3,-2],[-3,3],[3,3]]){
    for(let y=gy+1;y<=gy+4;y++)sBlock(cx+dx,y,cz+dz,postMat);
  }

  // Plank counter/table on the south side (facing the plaza)
  for(let dx=-2;dx<=2;dx++){
    sBlock(cx+dx,gy+1,cz-1,counterMat);
    sBlock(cx+dx,gy+2,cz-1,B.AIR);// keep head height clear
  }
  // Back wall (north side)
  for(let dx=-3;dx<=3;dx++){
    sBlock(cx+dx,gy+1,cz+3,counterMat);
    sBlock(cx+dx,gy+2,cz+3,counterMat);
  }
  // Striped wool awning (checkerboard pattern = classic Minecraft market)
  for(let dx=-3;dx<=3;dx++)for(let dz=-2;dz<=3;dz++)
    sBlock(cx+dx,gy+4,cz+dz,((dx+dz)&1)?roofMat1:roofMat2);
  // Overhang on south side extends 1 more block
  for(let dx=-3;dx<=3;dx++)sBlock(cx+dx,gy+4,cz-2,((dx)&1)?roofMat1:roofMat2);

  // Goods: chest, hay bales, crafting
  sBlock(cx-2,gy+1,cz+1,B.CHEST);
  sBlock(cx+2,gy+1,cz+1,B.CHEST);
  sBlock(cx,gy+1,cz+2,B.HAY);
  sBlock(cx-1,gy+1,cz+2,B.HAY);
  sBlock(cx+1,gy+1,cz+2,B.HAY);
  // Decorative lanterns on posts
  sBlock(cx-3,gy+4,cz-2,B.LANTERN);
  sBlock(cx+3,gy+4,cz-2,B.LANTERN);
  // Banner above the entrance
  sBlock(cx,gy+4,cz-2,B.BANNER_RED);
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
    // Cross-type overlap check: skip the candidate if it lands on top of an
    // already-placed structure (e.g. the stronghold, registered first).
    if(overlapsExisting(cx,cz,70))continue;
    const cy=12+Math.floor(rng()*24);          // shallow-to-mid start depth
    buildMineshaftComplex(cx,cy,cz,rng);
    placed.push({x:cx,z:cz});
    registerStructure(cx,cz,70,'mineshaft');
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
  // Register the stronghold centre so mineshafts (placed next) avoid routing
  // their corridors straight through it. It's deep underground so it won't
  // visually clash with surface structures, but the registry keeps mineshaft
  // tunnels from carving through the fortress rooms.
  registerStructure(cx,cz,30,'stronghold');
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

// ===========================================================================
//  DESERT PYRAMID (砂漠の神殿)
//  A 21×21 sandstone pyramid with an underground TNT-trap chamber and loot.
// ===========================================================================
function placeDesertPyramids(){
  const rng=mulberry32((SEED^0xdeadbeef)>>>0);
  const count=Math.max(2,Math.floor((WORLD_W*WORLD_D)/160000));
  const placed=[];
  let attempts=0;
  while(placed.length<count&&attempts<count*15){
    attempts++;
    const cx=30+Math.floor(rng()*(WORLD_W-60));
    const cz=30+Math.floor(rng()*(WORLD_D-60));
    let tooClose=false;
    for(const p of placed){if(Math.abs(p.x-cx)<80&&Math.abs(p.z-cz)<80){tooClose=true;break;}}
    if(tooClose)continue;
    if(overlapsExisting(cx,cz,14))continue;          // pyramid half-width W=10 + margin
    const biome=biomeMap[colIndex(cx,cz)];
    if(biome!==BIOME.DESERT&&biome!==BIOME.MESA)continue;
    const h=heightMap[colIndex(cx,cz)];
    if(h<=SEA_LEVEL)continue;
    buildDesertPyramid(cx,h,cz);
    placed.push({x:cx,z:cz});
    registerStructure(cx,cz,14,'desertPyramid');
  }
}

function buildDesertPyramid(cx,gy,cz){
  const W=10; // half-width (21×21 total)
  // Clear area above ground
  for(let dx=-W-1;dx<=W+1;dx++)for(let dz=-W-1;dz<=W+1;dz++)
    for(let y=gy+1;y<=gy+16;y++)sBlock(cx+dx,y,cz+dz,B.AIR);
  // Build stepped pyramid: 5 layers, each 2 blocks tall, shrinking by 2 each side
  for(let layer=0;layer<5;layer++){
    const r=W-layer*2;
    const y0=gy+1+layer*2;
    for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
      const edge=(Math.abs(dx)===r||Math.abs(dz)===r);
      if(edge){
        sBlock(cx+dx,y0,cz+dz,B.SANDSTONE);
        sBlock(cx+dx,y0+1,cz+dz,B.SANDSTONE);
      } else {
        // hollow interior of lower layers (only solid at the outer ring)
        if(layer===0){
          // ground floor – always solid for foundation
          sBlock(cx+dx,y0,cz+dz,B.SAND);
        }
      }
    }
  }
  // Tip: chiseled sandstone top block
  sBlock(cx,gy+11,cz,B.SANDSTONE);

  // Colour accent: orange/blue terracotta cross on ground floor
  for(let d=-W+1;d<=W-1;d++){
    sBlock(cx+d,gy+1,cz,B.TERRACOTTA_ORANGE);
    sBlock(cx,gy+1,cz+d,B.TERRACOTTA_BLUE);
  }
  sBlock(cx,gy+1,cz,B.TERRACOTTA_ORANGE);

  // Entrance on the north face (z = cz - W)
  sBlock(cx,gy+1,cz-W,B.AIR);
  sBlock(cx,gy+2,cz-W,B.AIR);
  sBlock(cx-1,gy+1,cz-W,B.AIR);
  sBlock(cx+1,gy+1,cz-W,B.AIR);

  // Underground chamber: 9×9, 4 deep under center
  const cy=gy-4;
  for(let dx=-4;dx<=4;dx++)for(let dy=0;dy<=3;dy++)for(let dz=-4;dz<=4;dz++)
    sBlock(cx+dx,cy+dy,cz+dz,B.AIR);
  // Stone floor
  for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++)
    sBlock(cx+dx,cy-1,cz+dz,B.SANDSTONE);
  // 4 loot chests in the corners
  sBlock(cx-3,cy,cz-3,B.CHEST); sBlock(cx+3,cy,cz-3,B.CHEST);
  sBlock(cx-3,cy,cz+3,B.CHEST); sBlock(cx+3,cy,cz+3,B.CHEST);
  // TNT trap in the very center (3×3 grid, 2 layers)
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
    sBlock(cx+dx,cy,cz+dz,B.TNT);
    sBlock(cx+dx,cy+1,cz+dz,B.SAND); // pressure plate hides TNT
  }
  // Pressure plates on top of sand to trigger trap
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)
    sBlock(cx+dx,cy+2,cz+dz,B.PRESSURE_PLATE_STONE);
  // Torches on chamber walls
  sBlock(cx-4,cy+2,cz,B.TORCH); sBlock(cx+4,cy+2,cz,B.TORCH);
  sBlock(cx,cy+2,cz-4,B.TORCH); sBlock(cx,cy+2,cz+4,B.TORCH);
  // Staircase down from surface to chamber
  let sx=cx,sz=cz-W+1,sy=gy;
  while(sy>cy+3){
    sBlock(sx,sy,sz,B.AIR); sBlock(sx,sy+1,sz,B.AIR);
    sBlock(sx,sy-1,sz,B.SANDSTONE);
    sy--;sz++;
    if(sz>cz-1)break;
  }
  // fill down to chamber
  for(let y=sy;y>=cy+3;y--)sBlock(sx,y,sz,B.AIR);
}

// ===========================================================================
//  JUNGLE TEMPLE (ジャングルの神殿)
//  A 13×13 mossy-cobblestone temple hidden in the jungle with lever traps.
// ===========================================================================
function placeJungleTemples(){
  const rng=mulberry32((SEED^0x5e7c3a11)>>>0);
  const count=Math.max(2,Math.floor((WORLD_W*WORLD_D)/200000));
  const placed=[];
  let attempts=0;
  while(placed.length<count&&attempts<count*15){
    attempts++;
    const cx=30+Math.floor(rng()*(WORLD_W-60));
    const cz=30+Math.floor(rng()*(WORLD_D-60));
    let tooClose=false;
    for(const p of placed){if(Math.abs(p.x-cx)<90&&Math.abs(p.z-cz)<90){tooClose=true;break;}}
    if(tooClose)continue;
    if(overlapsExisting(cx,cz,10))continue;          // temple half-width W=6 + margin
    const biome=biomeMap[colIndex(cx,cz)];
    if(biome!==BIOME.JUNGLE)continue;
    const h=heightMap[colIndex(cx,cz)];
    if(h<=SEA_LEVEL)continue;
    buildJungleTemple(cx,h,cz,rng);
    placed.push({x:cx,z:cz});
    registerStructure(cx,cz,10,'jungleTemple');
  }
}

function buildJungleTemple(cx,gy,cz,rng){
  const W=6; // half-width = 13×13
  // Clear vegetation above
  for(let dx=-W-1;dx<=W+1;dx++)for(let dz=-W-1;dz<=W+1;dz++)
    for(let y=gy+1;y<=gy+15;y++)sBlock(cx+dx,y,cz+dz,B.AIR);
  // Foundation on uneven jungle floor
  for(let dx=-W;dx<=W;dx++)for(let dz=-W;dz<=W;dz++){
    sBlock(cx+dx,gy,cz+dz,B.MOSSY_COBBLE);
    // fill down a bit for uneven terrain
    for(let y=gy-1;y>=gy-3;y--){const cur=world[blockIndex(cx+dx,y,cz+dz)];if(cur===B.AIR||cur===B.WATER)sBlock(cx+dx,y,cz+dz,B.COBBLE);}
  }
  // Walls (3 thick, 3 tall external, inner hollow)
  for(let y=gy+1;y<=gy+3;y++){
    for(let dx=-W;dx<=W;dx++){
      const onEdge=(Math.abs(dx)===W);
      sBlock(cx+dx,y,cz-W,onEdge?B.STONE_BRICK:B.MOSSY_COBBLE);
      sBlock(cx+dx,y,cz+W,onEdge?B.STONE_BRICK:B.MOSSY_COBBLE);
    }
    for(let dz=-W;dz<=W;dz++){
      const onEdge=(Math.abs(dz)===W);
      sBlock(cx-W,y,cz+dz,onEdge?B.STONE_BRICK:B.MOSSY_COBBLE);
      sBlock(cx+W,y,cz+dz,onEdge?B.STONE_BRICK:B.MOSSY_COBBLE);
    }
  }
  // Roof
  for(let dx=-W;dx<=W;dx++)for(let dz=-W;dz<=W;dz++)
    sBlock(cx+dx,gy+4,cz+dz,B.MOSSY_COBBLE);
  // Second tier (smaller)
  for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){
    const edge=(Math.abs(dx)===3||Math.abs(dz)===3);
    if(edge){sBlock(cx+dx,gy+5,cz+dz,B.STONE_BRICK);sBlock(cx+dx,gy+6,cz+dz,B.MOSSY_COBBLE);}
  }
  sBlock(cx,gy+7,cz,B.MOSSY_COBBLE);
  // Entrance (south)
  sBlock(cx,gy+1,cz+W,B.AIR); sBlock(cx,gy+2,cz+W,B.AIR);
  sBlock(cx-1,gy+1,cz+W,B.AIR); sBlock(cx+1,gy+1,cz+W,B.AIR);
  // Interior
  for(let dx=-W+1;dx<=W-1;dx++)for(let dy=1;dy<=3;dy++)for(let dz=-W+1;dz<=W-1;dz++)
    sBlock(cx+dx,gy+dy,cz+dz,B.AIR);
  // Loot chests
  sBlock(cx-W+2,gy+1,cz-W+2,B.CHEST);
  sBlock(cx+W-2,gy+1,cz-W+2,B.CHEST);
  // Lever trap wires: 3 levers on the north wall
  for(let dx=-2;dx<=2;dx+=2){
    sBlock(cx+dx,gy+2,cz-W+1,B.BUTTON_STONE); // button triggers arrow trap
  }
  // Cobweb decoration (vines grown in)
  const rng2=mulberry32((cx*17+cz*31)>>>0);
  for(let i=0;i<8;i++){
    const rx=cx-W+1+Math.floor(rng2()*((W-1)*2));
    const rz=cz-W+1+Math.floor(rng2()*((W-1)*2));
    const ry=gy+1+Math.floor(rng2()*2);
    sBlockSoft(rx,ry+3,rz,B.COBWEB);
  }
  // Torches inside
  sBlock(cx-3,gy+3,cz-3,B.TORCH); sBlock(cx+3,gy+3,cz-3,B.TORCH);
  sBlock(cx-3,gy+3,cz+3,B.TORCH); sBlock(cx+3,gy+3,cz+3,B.TORCH);
  // Glazed terracotta pattern on the floor
  for(let dx=-W+1;dx<=W-1;dx++)for(let dz=-W+1;dz<=W-1;dz++){
    const pat=(Math.abs(dx)+Math.abs(dz))%3;
    const id=pat===0?B.GLAZED_TERRACOTTA_CYAN:(pat===1?B.GLAZED_TERRACOTTA_LIME:B.MOSSY_COBBLE);
    sBlock(cx+dx,gy,cz+dz,id);
  }
}

// ===========================================================================
//  RUINED PORTAL (廃れたネザーポータル)
//  A partially broken obsidian portal frame scattered on the surface.
// ===========================================================================
function placeRuinedPortals(){
  const rng=mulberry32((SEED^0x6f34a8c2)>>>0);
  const count=Math.max(3,Math.floor((WORLD_W*WORLD_D)/130000));
  const placed=[];
  let attempts=0;
  while(placed.length<count&&attempts<count*15){
    attempts++;
    const cx=20+Math.floor(rng()*(WORLD_W-40));
    const cz=20+Math.floor(rng()*(WORLD_D-40));
    let tooClose=false;
    for(const p of placed){if(Math.abs(p.x-cx)<60&&Math.abs(p.z-cz)<60){tooClose=true;break;}}
    if(tooClose)continue;
    if(overlapsExisting(cx,cz,8))continue;           // portal frame ~4 wide + rubble margin
    const biome=biomeMap[colIndex(cx,cz)];
    if(biome===BIOME.OCEAN)continue;
    const h=heightMap[colIndex(cx,cz)];
    if(h<=SEA_LEVEL-2)continue;
    const buried=rng()<0.3; // 30% chance: half-buried underground portal
    buildRuinedPortal(cx,h,cz,rng,buried);
    placed.push({x:cx,z:cz});
    registerStructure(cx,cz,8,'ruinedPortal');
  }
}

function buildRuinedPortal(cx,gy,cz,rng,buried){
  // Standard portal frame: 4×5 obsidian frame (standing up along x-axis)
  // Frame positions relative to (cx,gy,cz) in the xz plane, portal in z-direction
  const frameY=buried?gy-2:gy;
  // If buried, sink it
  if(buried){
    // clear space
    for(let dx=-3;dx<=3;dx++)for(let dy=0;dy<=6;dy++)for(let dz=-1;dz<=1;dz++)
      sBlock(cx+dx,frameY+dy,cz+dz,B.AIR);
  }
  // Portal frame pieces (some missing = broken look)
  const frame=[
    // bottom bar
    [0,0,0],[1,0,0],[2,0,0],[3,0,0],
    // left side
    [0,1,0],[0,2,0],[0,3,0],
    // right side
    [3,1,0],[3,2,0],[3,3,0],
    // top bar (partly missing)
    [1,4,0],[2,4,0],
  ];
  // Randomly remove some blocks to make it ruined
  const keepChance=0.65+rng()*0.20;
  for(const[dx,dy,dz] of frame){
    if(rng()<keepChance){
      const isCrying=rng()<0.2;
      sBlock(cx+dx,frameY+dy,cz+dz,isCrying?B.CRYING_OBSIDIAN:B.OBSIDIAN);
    }
  }
  // Scattered netherrack and crying obsidian rubble around the base
  const rng2=mulberry32((cx*43+cz*7)>>>0);
  for(let i=0;i<8;i++){
    const rx=cx-3+Math.floor(rng2()*9);
    const rz=cz-2+Math.floor(rng2()*5);
    const ry=heightMap[colIndex(Math.max(0,Math.min(WORLD_W-1,rx)),Math.max(0,Math.min(WORLD_D-1,rz)))];
    const id=rng2()<0.4?B.NETHERRACK:(rng2()<0.5?B.CRYING_OBSIDIAN:B.OBSIDIAN);
    sBlockSoft(rx,ry+1,rz,id);
  }
  // Gold block on top (loot hint)
  if(rng()<0.7)sBlock(cx+1,frameY+1,cz,B.GOLD_ORE);
  // Loot chest nearby
  sBlock(cx-1,frameY,cz,B.CHEST);
  // Nether brick base fragments
  for(let dx=-1;dx<=4;dx++)for(let dz=-1;dz<=1;dz++){
    if(rng()<0.5)sBlock(cx+dx,frameY-1,cz+dz,B.NETHER_BRICK);
  }
}

// ===========================================================================
//  IGLOO (イグルー)
//  A snow-dome igloo in snowy biomes with a hidden basement.
// ===========================================================================
function placeIgloos(){
  const rng=mulberry32((SEED^0xabc12345)>>>0);
  const count=Math.max(2,Math.floor((WORLD_W*WORLD_D)/180000));
  const placed=[];
  let attempts=0;
  while(placed.length<count&&attempts<count*15){
    attempts++;
    const cx=20+Math.floor(rng()*(WORLD_W-40));
    const cz=20+Math.floor(rng()*(WORLD_D-40));
    let tooClose=false;
    for(const p of placed){if(Math.abs(p.x-cx)<70&&Math.abs(p.z-cz)<70){tooClose=true;break;}}
    if(tooClose)continue;
    if(overlapsExisting(cx,cz,8))continue;           // igloo R=4 dome + basement margin
    const biome=biomeMap[colIndex(cx,cz)];
    if(biome!==BIOME.SNOWY)continue;
    const h=heightMap[colIndex(cx,cz)];
    if(h<=SEA_LEVEL)continue;
    buildIgloo(cx,h,cz);
    placed.push({x:cx,z:cz});
    registerStructure(cx,cz,8,'igloo');
  }
}

function buildIgloo(cx,gy,cz){
  const R=4; // radius
  // Build a snow dome using distance-based voxels
  for(let dx=-R;dx<=R;dx++)for(let dy=0;dy<=R+1;dy++)for(let dz=-R;dz<=R;dz++){
    const d=Math.sqrt(dx*dx+dy*dy*0.8+dz*dz);
    if(d<=R&&d>=R-1.5){
      sBlock(cx+dx,gy+dy,cz+dz,B.SNOW);
    }
  }
  // Hollow interior
  for(let dx=-R+1;dx<=R-1;dx++)for(let dy=1;dy<=R;dy++)for(let dz=-R+1;dz<=R-1;dz++){
    const d=Math.sqrt(dx*dx+dy*dy*0.8+dz*dz);
    if(d<R-1)sBlock(cx+dx,gy+dy,cz+dz,B.AIR);
  }
  // Snow block floor
  for(let dx=-R+1;dx<=R-1;dx++)for(let dz=-R+1;dz<=R-1;dz++)
    sBlock(cx+dx,gy,cz+dz,B.SNOW_BLOCK);
  // Entrance tunnel (south)
  sBlock(cx,gy+1,cz+R,B.AIR); sBlock(cx,gy+2,cz+R,B.AIR);
  sBlock(cx-1,gy+1,cz+R,B.AIR); sBlock(cx+1,gy+1,cz+R,B.AIR);
  // entrance cover
  sBlock(cx,gy+3,cz+R,B.SNOW); sBlock(cx-1,gy+3,cz+R,B.SNOW); sBlock(cx+1,gy+3,cz+R,B.SNOW);
  // Interior furnishings
  sBlock(cx-1,gy+1,cz-1,B.CHEST);     // supply chest
  sBlock(cx+1,gy+1,cz-1,B.FURNACE);   // furnace for warmth
  sBlock(cx,gy+1,cz+1,B.CRAFTING);    // crafting table
  sBlock(cx-2,gy+2,cz,B.TORCH);       // torch lighting
  sBlock(cx+2,gy+2,cz,B.TORCH);
  // Bed (wool)
  sBlock(cx,gy+1,cz-2,B.WOOL_WHITE); sBlock(cx,gy+1,cz-3,B.WOOL_LIGHT_BLUE);
  // Hidden basement: ladder-accessible room below the floor
  // Trapdoor hint: remove one floor block
  sBlock(cx,gy,cz,B.AIR);
  // Dig basement
  for(let dx=-2;dx<=2;dx++)for(let dy=-4;dy<=-1;dy++)for(let dz=-2;dz<=2;dz++)
    sBlock(cx+dx,gy+dy,cz+dz,B.AIR);
  // Basement floor (stone brick)
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)
    sBlock(cx+dx,gy-5,cz+dz,B.STONE_BRICK);
  // Basement walls
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
    const edge=(Math.abs(dx)===2||Math.abs(dz)===2);
    if(edge)for(let dy=-4;dy<=-1;dy++)sBlockSoft(cx+dx,gy+dy,cz+dz,B.STONE_BRICK);
  }
  // Basement furnishings: loot chest, brewing stand hint (hay), lantern
  sBlock(cx-1,gy-4,cz-1,B.CHEST);
  sBlock(cx+1,gy-4,cz-1,B.HAY);
  sBlock(cx,gy-2,cz,B.LANTERN);
  // "Captive" occupant hint: extra chest
  sBlock(cx,gy-4,cz+1,B.CHEST);
  // Blue ice floor accent
  sBlock(cx-1,gy-5,cz-1,B.BLUE_ICE); sBlock(cx+1,gy-5,cz+1,B.BLUE_ICE);
}

// ===========================================================================
//  WITCH HUT (魔女の小屋)
//  A dark-wood hut on stilts in swamp biomes.
// ===========================================================================
function placeWitchHuts(){
  const rng=mulberry32((SEED^0x13579bdf)>>>0);
  const count=Math.max(2,Math.floor((WORLD_W*WORLD_D)/200000));
  const placed=[];
  let attempts=0;
  while(placed.length<count&&attempts<count*15){
    attempts++;
    const cx=20+Math.floor(rng()*(WORLD_W-40));
    const cz=20+Math.floor(rng()*(WORLD_D-40));
    let tooClose=false;
    for(const p of placed){if(Math.abs(p.x-cx)<80&&Math.abs(p.z-cz)<80){tooClose=true;break;}}
    if(tooClose)continue;
    if(overlapsExisting(cx,cz,10))continue;          // hut W=3/D=3 + stilts margin
    const biome=biomeMap[colIndex(cx,cz)];
    if(biome!==BIOME.SWAMP&&biome!==BIOME.MANGROVE)continue;
    const h=heightMap[colIndex(cx,cz)];
    buildWitchHut(cx,h,cz);
    placed.push({x:cx,z:cz});
    registerStructure(cx,cz,10,'witchHut');
  }
}

function buildWitchHut(cx,gy,cz){
  const W=3, D=3; // hut interior 7×7
  const stilts=3; // stilt height
  const gy2=gy+stilts; // floor level
  // 4 corner stilts (dark wood)
  for(const [dx,dz] of [[-W,-D],[W,-D],[-W,D],[W,D]]){
    for(let y=gy+1;y<=gy2;y++)sBlock(cx+dx,y,cz+dz,B.DEAD_LOG);
  }
  // Floor platform
  for(let dx=-W;dx<=W;dx++)for(let dz=-D;dz<=D;dz++)
    sBlock(cx+dx,gy2,cz+dz,B.PLANKS);
  // Walls (3 tall)
  for(let y=gy2+1;y<=gy2+3;y++){
    for(let dx=-W;dx<=W;dx++){
      sBlock(cx+dx,y,cz-D,B.DEAD_LOG);
      sBlock(cx+dx,y,cz+D,B.DEAD_LOG);
    }
    for(let dz=-D;dz<=D;dz++){
      sBlock(cx-W,y,cz+dz,B.DEAD_LOG);
      sBlock(cx+W,y,cz+dz,B.DEAD_LOG);
    }
  }
  // Windows (glass)
  sBlock(cx-1,gy2+2,cz-D,B.GLASS); sBlock(cx+1,gy2+2,cz-D,B.GLASS);
  sBlock(cx-1,gy2+2,cz+D,B.GLASS); sBlock(cx+1,gy2+2,cz+D,B.GLASS);
  // Door (south)
  sBlock(cx,gy2+1,cz+D,B.DOOR_BOTTOM_S_CLOSED); sBlock(cx,gy2+2,cz+D,B.DOOR_TOP_S_CLOSED);
  // Interior
  for(let dx=-W+1;dx<=W-1;dx++)for(let dy=1;dy<=3;dy++)for(let dz=-D+1;dz<=D-1;dz++)
    sBlock(cx+dx,gy2+dy,cz+dz,B.AIR);
  // Witch-hut furnishings
  sBlock(cx-1,gy2+1,cz-1,B.CHEST);         // ingredient chest
  sBlock(cx+1,gy2+1,cz-1,B.FURNACE);       // brewing stand (furnace proxy)
  sBlock(cx-1,gy2+1,cz+1,B.CRAFTING);      // crafting
  sBlock(cx,gy2+1,cz-2,B.HAY);             // herb stores (hay bale proxy)
  sBlock(cx,gy2+3,cz,B.LANTERN);           // hanging lantern
  // Cobwebs in corners
  sBlock(cx-W+1,gy2+3,cz-D+1,B.COBWEB); sBlock(cx+W-1,gy2+3,cz-D+1,B.COBWEB);
  sBlock(cx-W+1,gy2+3,cz+D-1,B.COBWEB); sBlock(cx+W-1,gy2+3,cz+D-1,B.COBWEB);
  // Roof (black/purple wool = witch aesthetic)
  buildRoof(cx-W,cz-D,cx+W,cz+D,gy2+4,false);
  // Banner outside on south wall
  sBlockSoft(cx,gy2+3,cz+D,B.BANNER_BLACK);
  // Potion hint: amethyst cluster on the floor (proxy for brewing ingredient)
  sBlock(cx,gy2+1,cz,B.AMETHYST_CLUSTER);
}

// ===========================================================================
//  OCEAN MONUMENT (海底神殿)
//  A flooded prismarine-style box monument rising from the deep ocean floor.
//  No dedicated prismarine block exists in the palette, so we substitute with
//  a mix of the closest bluish/stone blocks: SMOOTH_BASALT (cool grey-blue),
//  STONE_BRICK, MOSSY_BRICK and a little AMETHYST_BLOCK / SANDSTONE for trim.
//  The interior is hollowed to air (a couple of small rooms) while the
//  surroundings stay flooded with water.
// ===========================================================================
function placeOceanMonuments(){
  const rng=mulberry32((SEED^0x8a5c3e91)>>>0);
  const count=Math.max(1,Math.floor((WORLD_W*WORLD_D)/250000));
  const placed=[];
  let attempts=0;
  while(placed.length<count&&attempts<count*20){
    attempts++;
    const cx=30+Math.floor(rng()*(WORLD_W-60));
    const cz=30+Math.floor(rng()*(WORLD_D-60));
    // Same-type spacing (wide, since these are big landmarks).
    let tooClose=false;
    for(const p of placed){if(Math.abs(p.x-cx)<90&&Math.abs(p.z-cz)<90){tooClose=true;break;}}
    if(tooClose)continue;
    // Cross-type overlap check.
    if(overlapsExisting(cx,cz,14))continue;
    // Placement condition: the centre must be OCEAN and a ~20-block radius
    // around it must be almost entirely OCEAN too (deep open water, not shore).
    const surf=biomeMap[colIndex(cx,cz)];
    if(surf!==BIOME.OCEAN&&surf!==BIOME.CORAL_TIDELANDS)continue;
    const h0=heightMap[colIndex(cx,cz)];
    if(h0>SEA_LEVEL-6)continue;            // needs to be genuinely underwater
    // surround check
    let oceanCells=0,totalCells=0;
    for(let dx=-20;dx<=20;dx+=4){
      for(let dz=-20;dz<=20;dz+=4){
        const x=cx+dx,z=cz+dz;
        if(x<2||x>=WORLD_W-2||z<2||z>=WORLD_D-2)continue;
        totalCells++;
        const b=biomeMap[colIndex(x,z)];
        if(b===BIOME.OCEAN||b===BIOME.CORAL_TIDELANDS)oceanCells++;
      }
    }
    if(totalCells===0||oceanCells<totalCells*0.85)continue;
    buildOceanMonument(cx,h0,cz,rng);
    placed.push({x:cx,z:cz});
    registerStructure(cx,cz,14,'oceanMonument');
  }
}

function buildOceanMonument(cx,floorH,cz,rng){
  // Floor height = seafloor height at the centre (below sea level).
  const HW=7;          // half-width → ~15 wide
  const height=6+(rng()<0.5?1:0); // 6–7 tall
  const H=height;
  const topY=floorH+height;        // monument roof sits below the waves
  // Pick a palette per-monument (deterministic via rng) for a little variety.
  const baseMat =B.SMOOTH_BASALT;
  const trimMat =rng()<0.5?B.STONE_BRICK:B.SANDSTONE;
  const darkMat  =B.MOSSY_BRICK;
  const accentMat=B.AMETHYST_BLOCK;
  // 1) clear the water column above the footprint down to the roof, so the
  //    monument reads as a solid structure standing on the seabed.
  for(let dx=-HW-1;dx<=HW+1;dx++)for(let dz=-HW-1;dz<=HW+1;dz++){
    for(let y=floorH+1;y<=topY;y++)sBlock(cx+dx,y,cz+dz,B.AIR);
  }
  // 2) Build the solid box shell (walls + roof + floor), then hollow the
  //    interior. Corner pillars use the trim block for a classic monument
  //    "frame" look.
  for(let dx=-HW;dx<=HW;dx++)for(let dz=-HW;dz<=HW;dz++){
    const edge=(Math.abs(dx)===HW||Math.abs(dz)===HW);
    // solid floor slab on the seafloor
    sBlock(cx+dx,floorH,cz+dz,baseMat);
    // solid roof slab
    sBlock(cx+dx,topY,cz+dz,baseMat);
    if(edge){
      // walls
      for(let y=floorH+1;y<=topY-1;y++){
        // weathered variety on the shell for a submerged, aged look
        const r=hash3(cx+dx,y,cz+dz,712);
        let id=baseMat;
        if(r<0.12)id=darkMat; else if(r<0.18)id=trimMat;
        sBlock(cx+dx,y,cz+dz,id);
      }
    }
  }
  // 3) corner pillars in trim block, full height
  for(const [dx,dz] of [[-HW,-HW],[HW,-HW],[-HW,HW],[HW,HW]]){
    for(let y=floorH+1;y<=topY-1;y++)sBlock(cx+dx,y,cz+dz,trimMat);
  }
  // 4) hollow the interior to air (one big chamber)
  for(let dx=-HW+1;dx<=HW-1;dx++)for(let dz=-HW+1;dz<=HW-1;dz++){
    for(let y=floorH+1;y<=topY-1;y++)sBlock(cx+dx,y,cz+dz,B.AIR);
  }
  // 5) carve 1–2 small interior rooms with their own walls, splitting the
  //    big chamber into a couple of compartments (central + side).
  const rooms=1+(rng()<0.6?1:0);
  for(let r=0;r<rooms;r++){
    const rx=cx+Math.floor((rng()-0.5)*(HW-2));
    const rz=cz+Math.floor((rng()-0.5)*(HW-2));
    const rw=2+Math.floor(rng()*2), rh=2+Math.floor(rng()*2);
    const ry0=floorH+1, ry1=topY-1;
    // room walls
    for(let dx=-rw;dx<=rw;dx++)for(let dz=-rh;dz<=rh;dz++){
      const onWall=(Math.abs(dx)===rw||Math.abs(dz)===rh);
      if(onWall)for(let y=ry0;y<=ry1;y++)sBlockSoft(rx+dx,y,rz+dz,trimMat);
    }
    // hollow the room
    for(let dx=-rw+1;dx<=rw-1;dx++)for(let dz=-rh+1;dz<=rh-1;dz++)
      for(let y=ry0;y<=ry1;y++)sBlock(rx+dx,y,rz+dz,B.AIR);
    // a chest in each room
    sBlock(rx,ry0,rz,B.CHEST);
    // a glow accent (sea-lantern proxy) on the room ceiling
    sBlock(rx,ry1,rz,accentMat);
  }
  // 6) a couple of accent pillars on the roof for that monument silhouette
  for(const [dx,dz] of [[-HW,-HW],[HW,HW],[-HW,HW],[HW,-HW]]){
    for(let y=topY+1;y<=topY+2;y++)sBlock(cx+dx,y,cz+dz,trimMat);
  }
  // 7) central treasure chest on the floor of the main chamber
  sBlock(cx,floorH+1,cz,B.CHEST);
  // a gold block hint beside it (loot marker)
  sBlock(cx+1,floorH+1,cz,B.GOLD_ORE);
  // 8) surround with water again above the roof (re-flood the cleared column)
  for(let dx=-HW-1;dx<=HW+1;dx++)for(let dz=-HW-1;dz<=HW+1;dz++){
    for(let y=topY+1;y<=SEA_LEVEL+1;y++)sBlock(cx+dx,y,cz+dz,B.WATER);
  }
}

// ===========================================================================
//  RUINED TOWER (廃塔)
//  A small, crumbling stone-brick landmark (6–10 blocks tall) standing
//  sparsely on land biomes. Mixes STONE_BRICK / MOSSY_BRICK / CRACKED_BRICK
//  for a decayed look, randomly omits blocks (keepChance pattern, same trick
//  as buildRuinedPortal) so the tower reads as broken/collapsed, and hides a
//  loot chest inside or at its base.
// ===========================================================================
function placeRuinedTowers(){
  const rng=mulberry32((SEED^0x4b7e2a55)>>>0);
  const count=Math.max(3,Math.floor((WORLD_W*WORLD_D)/130000));
  const placed=[];
  let attempts=0;
  while(placed.length<count&&attempts<count*20){
    attempts++;
    const cx=20+Math.floor(rng()*(WORLD_W-40));
    const cz=20+Math.floor(rng()*(WORLD_D-40));
    let tooClose=false;
    for(const p of placed){if(Math.abs(p.x-cx)<40&&Math.abs(p.z-cz)<40){tooClose=true;break;}}
    if(tooClose)continue;
    if(overlapsExisting(cx,cz,7))continue;        // tower footprint ~5 + margin
    const biome=biomeMap[colIndex(cx,cz)];
    // Land biomes only — exclude ocean/water and the non-land special biomes.
    if(biome===BIOME.OCEAN||biome===BIOME.SWAMP||biome===BIOME.MANGROVE||
       biome===BIOME.CORAL_TIDELANDS||biome===BIOME.VOLCANO)continue;
    const h=heightMap[colIndex(cx,cz)];
    if(h<=SEA_LEVEL)continue;
    buildRuinedTower(cx,h,cz,rng);
    placed.push({x:cx,z:cz});
    registerStructure(cx,cz,7,'ruinedTower');
  }
}

function buildRuinedTower(cx,gy,cz,rng){
  const HW=2;                              // ~5×5 footprint
  const height=6+Math.floor(rng()*5);      // 6–10 blocks tall
  const keepChance=0.7+rng()*0.18;         // 70–88% of blocks survive
  // Clear vegetation above the footprint.
  for(let dx=-HW-1;dx<=HW+1;dx++)for(let dz=-HW-1;dz<=HW+1;dz++)
    for(let y=gy+1;y<=gy+height+2;y++)sBlock(cx+dx,y,cz+dz,B.AIR);
  // Build the hollow tower shell, randomly omitting blocks for the ruined look.
  for(let y=gy+1;y<=gy+height;y++){
    for(let dx=-HW;dx<=HW;dx++)for(let dz=-HW;dz<=HW;dz++){
      const edge=(Math.abs(dx)===HW||Math.abs(dz)===HW);
      if(!edge)continue;                   // hollow interior
      // randomly skip a block (collapse/decay)
      if(rng()>keepChance)continue;
      // pick a weathered brick variant for a decayed texture mix
      const r=rng();
      let id=B.STONE_BRICK;
      if(r<0.30)id=B.CRACKED_BRICK; else if(r<0.55)id=B.MOSSY_BRICK;
      sBlock(cx+dx,y,cz+dz,id);
    }
  }
  // A partial stone-brick floor at the base (some tiles missing)
  for(let dx=-HW;dx<=HW;dx++)for(let dz=-HW;dz<=HW;dz++){
    if(rng()<keepChance)sBlock(cx+dx,gy,cz+dz,B.STONE_BRICK);
  }
  // Doorway opening on the south face (ground level) — always clear it so the
  // player can actually enter.
  sBlock(cx,gy+1,cz+HW,B.AIR);
  sBlock(cx,gy+2,cz+HW,B.AIR);
  // Loot chest inside, at the base, against the back wall.
  sBlock(cx,gy+1,cz-HW,B.CHEST);
  // A torch inside for a bit of light.
  sBlockSoft(cx,gy+height-1,cz-HW+1,B.TORCH);
  // Scatter a few fallen rubble blocks around the base for atmosphere.
  for(let i=0;i<6;i++){
    const rx=cx-HW-1+Math.floor(rng()*((HW+1)*2+2));
    const rz=cz-HW-1+Math.floor(rng()*((HW+1)*2+2));
    const r=rng();
    let id=B.STONE_BRICK;
    if(r<0.4)id=B.CRACKED_BRICK; else if(r<0.7)id=B.MOSSY_BRICK;
    sBlockSoft(rx,gy+1,rz,id);
  }
}

// ---- top-level driver ------------------------------------------------------
function placeStructures(){
  // Reset the cross-type placement registry at the start of every generation
  // pass so structures from a previous world don't block placement of new ones.
  placedStructures.length=0;
  placeStronghold();
  placeMineshafts();
  placeVillages();
  placeDesertPyramids();
  placeJungleTemples();
  placeRuinedPortals();
  placeIgloos();
  placeWitchHuts();
  placeOceanMonuments();
  placeRuinedTowers();
}
