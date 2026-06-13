const world=new Uint8Array(WORLD_W*WORLD_H*WORLD_D);function blockIndex(x,y,z){return(y*WORLD_D+z)*WORLD_W+x;}
function getBlock(x,y,z){if(y<0)return B.BEDROCK;if(y>=WORLD_H)return B.AIR;if(x<0||x>=WORLD_W||z<0||z>=WORLD_D)return B.STONE;return world[blockIndex(x,y,z)];}
function isCrop(id){const d=BLOCKS[id];return!!(d&&d.crop);}
function isSolid(id){return id!==B.AIR&&id!==B.WATER&&id!==B.LAVA&&id!==B.SEAWEED&&id!==B.DEAD_BUSH&&!isCrop(id);}
// raycast 用: 衝突しない作物もブロック選択（破壊・操作）のターゲットにする。
function isTargetable(id){return isSolid(id)||isCrop(id);}
// === 天空光(skylight) ===
// あるセルの真上に不透明ブロックがあるか（空が見えないか）を調べる。
// 空が見えない＝地下/室内とみなし、洞窟内を「真っ暗」にするために使う。
// 透明ブロック(葉・ガラス等)と流体は遮蔽に数えない。
function blocksSky(id){if(id===B.AIR||id===B.WATER||id===B.LAVA)return false;const d=BLOCKS[id];if(d&&(d.transparent||d.crop||d.crossPlant))return false;return true;}
function skyExposed(x,y,z){for(let yy=y+1;yy<WORLD_H;yy++){if(blocksSky(getBlock(x,yy,z)))return false;}return true;}
// セル(x,y,z)の「天空光レベル」を 0..1 で返す。直上が空に開けていれば 1。
// そうでなければ近傍（上方含む斜め）を少しだけ参照し、洞窟入口付近をなだらかにする。
function skyLightAt(x,y,z){if(skyExposed(x,y,z))return 1;let best=0;const offs=[[1,0],[-1,0],[0,1],[0,-1]];for(const[dx,dz]of offs){if(skyExposed(x+dx,y+1,z+dz)){best=Math.max(best,0.55);}}return best;}
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
function heightAtRaw(x,z){
  const c=climateAt(x,z);
  // multi-octave rolling base around sea level
  const base=SEA_LEVEL+2+fbm2(x,z,11,4,1/40,0.5,2.0)*26-10+fbm2(x,z,77,2,1/12,0.5,2.0)*8-4;
  // Two layers of fine detail give the surface a more eroded, natural look:
  // broad undulation plus a higher-frequency "weathering" ripple.
  const detail=fbm2(x,z,23,3,1/24,0.5,2.0)*6-3+fbm2(x,z,29,2,1/7,0.5,2.0)*2-1;
  const e=c.continental,t=c.temperature,m=c.moisture,w=c.weirdness;
  let h=base+detail;
  if(e<0.40){
    // OCEAN & COAST: rather than snapping to a fixed depth at the biome border
    // (which made an abrupt underwater cliff), blend smoothly from the rolling
    // land height down into the sea. A wide [0.32,0.40] coastal band eases the
    // shoreline so beaches slope gently below the waterline, and the basin only
    // deepens gradually toward the continental lows for a natural sea floor.
    const oceanFloor=SEA_LEVEL-2-Math.pow((0.32-Math.min(e,0.32))/0.32,1.6)*26;
    // coastal blend weight: 0 at e=0.40 (full land) -> 1 at e<=0.32 (full sea)
    const coast=smoothstep(Math.max(0,Math.min(1,(0.40-e)/0.08)));
    h=h*(1-coast)+oceanFloor*coast;
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
// floor 済みの整数高さ(従来 API)。スムージング前の生値が欲しい場合は
// heightAtRaw() を使う。
function heightAt(x,z){return Math.floor(Math.max(2,Math.min(WORLD_H-6,heightAtRaw(x,z))));}
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
function generateWorld(){generateClimateAndHeight();generateTerrainColumns(0,WORLD_W);carveCaves();carveLargeCaves();carveCaveFeatures();placeAmethystGeodes();placeOresAndGravel();placeVegetation();if(typeof placeStructures==='function')placeStructures();}
// --- Split phases so generation can be driven asynchronously --------------
function generateClimateAndHeight(){
  // 1) 各列の高さ(float)とバイオームを計算。floor する前の値を一時保持して
  //    スムージングの精度を上げる(整数化による段差ノイズを防ぐ)。
  const tmp=new Float32Array(WORLD_W*WORLD_D);
  for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){tmp[colIndex(x,z)]=heightAtRaw(x,z);biomeMap[colIndex(x,z)]=biomeAt(x,z);}}
  // 2) 軽いスムージングパス: 隣接列との高度差が大きい “荒い段差/トゲ” を、
  //    近傍 3x3 のガウシアン気味の重み付き平均で緩和する。海岸の崖や山肌など
  //    本来の大きな起伏は、急峻な部分ほど元の値を残す重みにして保持する。
  const smoothed=new Float32Array(WORLD_W*WORLD_D);
  // 9近傍ガウシアン重み(中心4, 辺2, 角1 / 合計16)
  const W=[[1,2,1],[2,4,2],[1,2,1]];
  for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){
    const c=tmp[colIndex(x,z)];
    let sum=0,wsum=0,maxDiff=0;
    for(let dz=-1;dz<=1;dz++){for(let dx=-1;dx<=1;dx++){
      const xx=Math.min(WORLD_W-1,Math.max(0,x+dx));
      const zz=Math.min(WORLD_D-1,Math.max(0,z+dz));
      const v=tmp[colIndex(xx,zz)];
      const w=W[dz+1][dx+1];
      sum+=v*w;wsum+=w;
      const d=Math.abs(v-c);if(d>maxDiff)maxDiff=d;
    }}
    const avg=sum/wsum;
    // ブレンド率: 段差が小さい所(=細かい地形ノイズ)ほど強く平滑化し、
    // 急峻な所(崖・山)は元の形を残す。0.65→急峻でほぼ0へフェード。
    const blend=0.65*(1-Math.min(1,maxDiff/8));
    smoothed[colIndex(x,z)]=c*(1-blend)+avg*blend;
  }}
  // 3) 整数化して最終 heightMap へ確定。
  for(let x=0;x<WORLD_W;x++){for(let z=0;z<WORLD_D;z++){
    heightMap[colIndex(x,z)]=Math.floor(Math.max(2,Math.min(WORLD_H-6,smoothed[colIndex(x,z)])));
  }}
}
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
// ===========================================================================
//  TASK8 — 渓谷・洞窟強化:  鍾乳洞・溶岩湖・地下水湖・アメジスト晶洞
//  carveLargeCaves() で掘った大空洞を、種で決まる位置に再走査して装飾する。
//  ・LIMESTONE CAVERN(鍾乳洞)… 天井から鍾乳石、床から石筍、苔・ヒカリゴケ。
//  ・LAVA LAKE(溶岩湖)        … 深部の大空洞の床を溶岩で満たす。
//  ・WATER LAKE(地下水湖)      … 中層の大空洞の床を水で満たす。
//  ・AMETHYST GEODE(晶洞)      … 玄武岩→方解石→アメジストの層構造の球殻。
// ===========================================================================

// 指定座標が「空洞内の空気」で、上下に固い天井/床があるかを調べる小道具。
function isCaveAir(x,y,z){return getBlock(x,y,z)===B.AIR;}
// 天井(上向きに最初に当たる固体)を探す。見つからなければ -1。
function ceilingAbove(x,y,z,maxUp){for(let dy=1;dy<=maxUp;dy++){const id=getBlock(x,y+dy,z);if(id===B.AIR)continue;if(id===B.WATER||id===B.LAVA)return -1;return y+dy-1;}return -1;}
// 床(下向きに最初に当たる固体)を探す。
function floorBelow(x,y,z,maxDown){for(let dy=1;dy<=maxDown;dy++){const id=getBlock(x,y-dy,z);if(id===B.AIR)continue;if(id===B.WATER||id===B.LAVA)return -1;return y-dy+1;}return -1;}

// 1本の鍾乳石(天井から下垂)を生やす。長さ len。
function growStalactite(x,topY,z,len){for(let i=0;i<len;i++){const yy=topY-i;if(yy<=1)break;if(getBlock(x,yy,z)!==B.AIR)break;world[blockIndex(x,yy,z)]=B.DRIPSTONE;}}
// 1本の石筍(床から上昇)を生やす。
function growStalagmite(x,botY,z,len){for(let i=0;i<len;i++){const yy=botY+i;if(yy>=WORLD_H-1)break;if(getBlock(x,yy,z)!==B.AIR)break;world[blockIndex(x,yy,z)]=B.DRIPSTONE;}}

// 大空洞1つを装飾する。中心(cx,cy,cz)と半径(rx,ry,rz)を与え、内部の
// 空気セルを走査して天井に鍾乳石・床に石筍・苔・発光地衣を散らす。
// flood>=0 のときはその高さまで床を溶岩/水で満たす(湖)。
function decorateChamber(cx,cy,cz,rx,ry,rz,opts){
  const rng=opts.rng;
  const x0=Math.max(2,cx-rx-1),x1=Math.min(WORLD_W-3,cx+rx+1);
  const z0=Math.max(2,cz-rz-1),z1=Math.min(WORLD_D-3,cz+rz+1);
  const yTop=Math.min(WORLD_H-2,cy+ry+1),yBot=Math.max(2,cy-ry-1);
  // --- 湖(溶岩/地下水): 空洞の底の窪みに液体を溜める ---
  if(opts.lake){
    const liquid=opts.lake;             // B.LAVA or B.WATER
    const level=cy-ry+1+Math.floor((ry)*0.55); // 床から少し上まで満たす
    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
      // この柱で床面を探す
      let floorY=-1;
      for(let y=yBot;y<=cy+ry;y++){ if(getBlock(x,y,z)===B.AIR){ if(getBlock(x,y-1,z)!==B.AIR){floorY=y;} break; } }
      if(floorY<0)continue;
      // 楕円体内かざっくり判定
      const d=((x-cx)*(x-cx))/(rx*rx)+((z-cz)*(z-cz))/(rz*rz);
      if(d>1.05)continue;
      for(let y=floorY;y<=level&&y<WORLD_H;y++){ if(getBlock(x,y,z)===B.AIR)world[blockIndex(x,y,z)]=liquid; }
    }
  }
  // --- 鍾乳石・石筍・苔・発光地衣 ---
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
    const d=((x-cx)*(x-cx))/(rx*rx)+((z-cz)*(z-cz))/(rz*rz);
    if(d>1.05)continue;
    // この柱の天井と床
    let ceil=-1,flr=-1;
    for(let y=yTop;y>=yBot;y--){ if(getBlock(x,y,z)===B.AIR&&getBlock(x,y+1,z)!==B.AIR&&getBlock(x,y+1,z)!==B.WATER&&getBlock(x,y+1,z)!==B.LAVA){ceil=y;break;} }
    for(let y=yBot;y<=yTop;y++){ const below=getBlock(x,y-1,z); if(getBlock(x,y,z)===B.AIR&&below!==B.AIR){flr=y;break;} }
    // 天井から鍾乳石
    if(ceil>0&&rng()<opts.dripP){ growStalactite(x,ceil,z,1+Math.floor(rng()*opts.dripLen)); }
    // 床から石筍(立てる土台が固体のときだけ)
    if(flr>0){
      const ground=getBlock(x,flr-1,z);
      if(ground!==B.WATER&&ground!==B.LAVA){
        if(rng()<opts.dripP*0.8){ growStalagmite(x,flr,z,1+Math.floor(rng()*opts.dripLen)); }
        else if(opts.moss&&rng()<opts.mossP){ world[blockIndex(x,flr-1,z)]=B.MOSS; if(rng()<0.25&&getBlock(x,flr,z)===B.AIR)world[blockIndex(x,flr,z)]=B.GLOW_LICHEN; }
      }
    }
    // 壁/天井のヒカリゴケ(雰囲気照明)
    if(opts.lichen&&ceil>0&&rng()<opts.lichenP&&getBlock(x,ceil,z)===B.AIR){ world[blockIndex(x,ceil,z)]=B.GLOW_LICHEN; }
  }
}

// 鍾乳洞・溶岩湖・地下水湖を、種で決まる場所に生成する。
function carveCaveFeatures(){
  const rng=mulberry32((SEED^0x68bc21ab)>>>0);
  const area=WORLD_W*WORLD_D;
  // --- 1) 鍾乳洞(石灰質の大空洞) ---
  const limeCount=Math.floor(area/120000)+4;
  for(let i=0;i<limeCount;i++){
    const cx=6+Math.floor(rng()*(WORLD_W-12));
    const cz=6+Math.floor(rng()*(WORLD_D-12));
    const cy=12+Math.floor(rng()*24);
    const rx=9+Math.floor(rng()*8),ry=5+Math.floor(rng()*4),rz=9+Math.floor(rng()*8);
    if(heightMap[colIndex(cx,cz)]<cy+ry+4)continue;   // 地表に近すぎる所は避ける
    // まず楕円の空洞を掘る(wobble付き)
    for(let dx=-rx;dx<=rx;dx++)for(let dy=-ry;dy<=ry;dy++)for(let dz=-rz;dz<=rz;dz++){
      const wob=valueNoise3((cx+dx)/8,(cy+dy)/8,(cz+dz)/8,211)*0.4;
      const d=(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)+(dz*dz)/(rz*rz);
      if(d<=1-wob+0.2)caveDig(cx+dx,cy+dy,cz+dz);
    }
    decorateChamber(cx,cy,cz,rx,ry,rz,{rng,dripP:0.30,dripLen:5,moss:true,mossP:0.18,lichen:true,lichenP:0.10});
  }
  // --- 2) 溶岩湖(深部 y<18) ---
  const lavaCount=Math.floor(area/200000)+3;
  for(let i=0;i<lavaCount;i++){
    const cx=6+Math.floor(rng()*(WORLD_W-12));
    const cz=6+Math.floor(rng()*(WORLD_D-12));
    const cy=6+Math.floor(rng()*9);
    const rx=10+Math.floor(rng()*9),ry=4+Math.floor(rng()*3),rz=10+Math.floor(rng()*9);
    if(heightMap[colIndex(cx,cz)]<cy+ry+6)continue;
    for(let dx=-rx;dx<=rx;dx++)for(let dy=-ry;dy<=ry;dy++)for(let dz=-rz;dz<=rz;dz++){
      const wob=valueNoise3((cx+dx)/9,(cy+dy)/9,(cz+dz)/9,221)*0.4;
      const d=(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)+(dz*dz)/(rz*rz);
      if(d<=1-wob+0.25)caveDig(cx+dx,cy+dy,cz+dz);
    }
    decorateChamber(cx,cy,cz,rx,ry,rz,{rng,dripP:0.16,dripLen:4,moss:false,mossP:0,lichen:false,lichenP:0,lake:B.LAVA});
  }
  // --- 3) 地下水湖(中層 y 18..40) ---
  const waterCount=Math.floor(area/200000)+3;
  for(let i=0;i<waterCount;i++){
    const cx=6+Math.floor(rng()*(WORLD_W-12));
    const cz=6+Math.floor(rng()*(WORLD_D-12));
    const cy=18+Math.floor(rng()*18);
    const rx=10+Math.floor(rng()*9),ry=4+Math.floor(rng()*3),rz=10+Math.floor(rng()*9);
    if(heightMap[colIndex(cx,cz)]<cy+ry+6)continue;
    for(let dx=-rx;dx<=rx;dx++)for(let dy=-ry;dy<=ry;dy++)for(let dz=-rz;dz<=rz;dz++){
      const wob=valueNoise3((cx+dx)/9,(cy+dy)/9,(cz+dz)/9,231)*0.4;
      const d=(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)+(dz*dz)/(rz*rz);
      if(d<=1-wob+0.25)caveDig(cx+dx,cy+dy,cz+dz);
    }
    decorateChamber(cx,cy,cz,rx,ry,rz,{rng,dripP:0.18,dripLen:4,moss:true,mossP:0.22,lichen:true,lichenP:0.12,lake:B.WATER});
  }
}

// --- 4) アメジスト晶洞(geode) ---------------------------------------------
// 球状の層構造:外殻=滑らかな玄武岩、中間層=方解石、内張り=アメジスト
// ブロック、中空の内部にアメジストの塊が内向きに群生する。
function placeAmethystGeodes(){
  const rng=mulberry32((SEED^0x3c6ef372)>>>0);
  const count=Math.floor((WORLD_W*WORLD_D)/170000)+3;
  for(let i=0;i<count;i++){
    const cx=8+Math.floor(rng()*(WORLD_W-16));
    const cz=8+Math.floor(rng()*(WORLD_D-16));
    const r=5+Math.floor(rng()*3);                 // 内部半径
    const cy=r+4+Math.floor(rng()*22);             // 地中深め
    if(cy+r+3>=heightMap[colIndex(cx,cz)])continue; // 必ず地表より下
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
    if(dist>mid+0.5){ if(getBlock(x,y,z)!==B.BEDROCK)world[blockIndex(x,y,z)]=B.SMOOTH_BASALT; }      // 外殻
    else if(dist>inner+0.5){ world[blockIndex(x,y,z)]=B.CALCITE; }                                    // 中間層
    else if(dist>inner-0.6){ world[blockIndex(x,y,z)]=B.AMETHYST_BLOCK; }                              // 内張り
    else { world[blockIndex(x,y,z)]=B.AIR; }                                                           // 中空
  }
  // 内張りの表面にアメジストの塊を内向きに生やす
  for(let dx=-inner;dx<=inner;dx++)for(let dy=-inner;dy<=inner;dy++)for(let dz=-inner;dz<=inner;dz++){
    const x=cx+dx,y=cy+dy,z=cz+dz;
    if(getBlock(x,y,z)!==B.AIR)continue;
    // 隣接にアメジストブロックがあれば、その空気側に塊を置く
    const nb=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    let touch=false;for(const[ax,ay,az] of nb){ if(getBlock(x+ax,y+ay,z+az)===B.AMETHYST_BLOCK){touch=true;break;} }
    if(touch&&rng()<0.55)world[blockIndex(x,y,z)]=B.AMETHYST_CLUSTER;
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
    report(0.78,'鍾乳洞・溶岩湖・地下水湖を生成中...');
    await nextFrame();
    carveCaveFeatures();
    report(0.82,'アメジスト晶洞を生成中...');
    await nextFrame();
    placeAmethystGeodes();
    report(0.84,'鉱石を配置中...');
    await nextFrame();
    placeOresAndGravel();
    report(0.88,'植生を配置中...');
    await nextFrame();
    placeVegetation();
    report(0.93,'村を建設中...');
    await nextFrame();
    if(typeof placeVillages==='function')placeVillages();
    report(0.96,'廃坑を掘削中...');
    await nextFrame();
    if(typeof placeMineshafts==='function')placeMineshafts();
    report(0.98,'要塞を建造中...');
    await nextFrame();
    if(typeof placeStronghold==='function')placeStronghold();
    report(1.0,'完了');
    await nextFrame();
  })();
}
let worldEdits={};function loadEdits(){try{worldEdits=JSON.parse(localStorage.getItem('bw_edits')||"{}");}catch(e){worldEdits={};}
for(const key in worldEdits){const[x,y,z]=key.split(',').map(Number);if(x>=0&&x<WORLD_W&&y>=0&&y<WORLD_H&&z>=0&&z<WORLD_D)
world[blockIndex(x,y,z)]=worldEdits[key];}}
let saveTimer=null;function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem('bw_edits',JSON.stringify(worldEdits));}catch(e){}},800);}
