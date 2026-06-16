const canvas=document.getElementById('game-canvas');const engine=new BABYLON.Engine(canvas,true,{stencil:false,preserveDrawingBuffer:false});const scene=new BABYLON.Scene(engine);scene.clearColor=new BABYLON.Color4(0.53,0.81,0.92,1);scene.ambientColor=new BABYLON.Color3(0,0,0);
// Performance: voxel chunks are non-pickable static meshes, so skip the
// per-frame pointer-move picking and collision passes Babylon runs by default.
scene.skipPointerMovePicking=true;scene.constantlyUpdateMeshUnderPointer=false;scene.autoClearDepthAndStencil=true;scene.blockMaterialDirtyMechanism=true;scene.fogMode=BABYLON.Scene.FOGMODE_LINEAR;scene.fogStart=140;scene.fogEnd=260;scene.fogColor=new BABYLON.Color3(0.53,0.81,0.92);const camera=new BABYLON.FreeCamera('cam',new BABYLON.Vector3(0,30,0),scene);camera.minZ=0.1;camera.maxZ=520;camera.fov=1.1;camera.inputs.clear();const hemiLight=new BABYLON.HemisphericLight('hemi',new BABYLON.Vector3(0,1,0),scene);hemiLight.intensity=0.8;hemiLight.specular=new BABYLON.Color3(0,0,0);hemiLight.groundColor=new BABYLON.Color3(0.35,0.32,0.3);const sunLight=new BABYLON.DirectionalLight('sun',new BABYLON.Vector3(-0.4,-1,-0.3),scene);sunLight.intensity=0.7;sunLight.specular=new BABYLON.Color3(0,0,0);function makeSkyBillboard(name,size,draw){const tex=new BABYLON.DynamicTexture(name+'Tex',{width:64,height:64},scene,false);tex.hasAlpha=true;const c=tex.getContext();c.clearRect(0,0,64,64);draw(c);tex.update();const mat=new BABYLON.StandardMaterial(name+'Mat',scene);mat.emissiveTexture=tex;mat.opacityTexture=tex;mat.diffuseColor=new BABYLON.Color3(0,0,0);mat.specularColor=new BABYLON.Color3(0,0,0);mat.disableLighting=true;mat.fogEnabled=false;mat.backFaceCulling=false;const mesh=BABYLON.MeshBuilder.CreatePlane(name,{size},scene);mesh.material=mat;mesh.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;mesh.isPickable=false;mesh.applyFog=false;mesh.renderingGroupId=0;return mesh;}
const sunMesh=makeSkyBillboard('sunMesh',34,(c)=>{const g=c.createRadialGradient(32,32,10,32,32,32);g.addColorStop(0,'rgba(255,244,180,0.95)');g.addColorStop(0.55,'rgba(255,220,90,0.55)');g.addColorStop(1,'rgba(255,200,40,0)');c.fillStyle=g;c.fillRect(0,0,64,64);c.fillStyle='#ffe24a';c.fillRect(17,17,30,30);c.fillStyle='#fff6b0';c.fillRect(21,21,22,22);});const moonMesh=makeSkyBillboard('moonMesh',22,(c)=>{c.fillStyle='#e8ecf2';c.fillRect(16,16,32,32);c.fillStyle='#c4ccda';c.fillRect(22,22,8,8);c.fillRect(36,30,6,6);c.fillRect(26,38,6,4);c.fillStyle='#f6f8fc';c.fillRect(34,20,8,6);});const atlasTex=new BABYLON.DynamicTexture('atlas',{width:ATLAS_W,height:ATLAS_H},scene,false,BABYLON.Texture.NEAREST_SAMPLINGMODE);atlasTex.getContext().drawImage(atlasCanvas,0,0);atlasTex.update(true);atlasTex.hasAlpha=true;atlasTex.wrapU=BABYLON.Texture.CLAMP_ADDRESSMODE;atlasTex.wrapV=BABYLON.Texture.CLAMP_ADDRESSMODE;const solidMat=new BABYLON.StandardMaterial('solidMat',scene);solidMat.diffuseTexture=atlasTex;solidMat.specularColor=new BABYLON.Color3(0,0,0);solidMat.emissiveColor=new BABYLON.Color3(0.03,0.03,0.03);solidMat.transparencyMode=BABYLON.Material.MATERIAL_ALPHATEST;solidMat.alphaCutOff=0.4;solidMat.backFaceCulling=false;solidMat.maxSimultaneousLights=8;const waterMat=new BABYLON.StandardMaterial('waterMat',scene);waterMat.diffuseTexture=atlasTex;waterMat.specularColor=new BABYLON.Color3(0,0,0);waterMat.emissiveColor=new BABYLON.Color3(0.1,0.15,0.3);waterMat.alpha=0.62;waterMat.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;waterMat.backFaceCulling=false;waterMat.maxSimultaneousLights=8;const lavaMat=new BABYLON.StandardMaterial('lavaMat',scene);lavaMat.diffuseTexture=atlasTex;lavaMat.specularColor=new BABYLON.Color3(0,0,0);lavaMat.emissiveColor=new BABYLON.Color3(0.95,0.45,0.12);lavaMat.disableLighting=true;lavaMat.backFaceCulling=false;const FACES=[{dir:[1,0,0],face:'side',shade:0.80,corners:[[1,0,1],[1,0,0],[1,1,0],[1,1,1]]},{dir:[-1,0,0],face:'side',shade:0.80,corners:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]]},{dir:[0,0,1],face:'side',shade:0.65,corners:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]},{dir:[0,0,-1],face:'side',shade:0.65,corners:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]},{dir:[0,1,0],face:'top',shade:1.00,corners:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]},{dir:[0,-1,0],face:'bottom',shade:0.50,corners:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]},];function tileForFace(def,face){if(def.all!==undefined)return def.all;if(face==='top')return def.top;if(face==='bottom')return def.bottom;return def.side;}
const CHUNKS_X=WORLD_W/CHUNK,CHUNKS_Z=WORLD_D/CHUNK;const chunkMeshes=[];function buildChunk(cx,cz){const old=chunkMeshes[cz*CHUNKS_X+cx];if(old){if(old.solid)old.solid.dispose();if(old.water)old.water.dispose();if(old.lava)old.lava.dispose();}
// ブロック光源(松明/溶岩 等)の明るさを「壁を貫通せず」周囲へ伝播させた値を、
// このチャンク + 余白(BLOCKLIGHT_MAX)分だけ範囲限定で計算する。チャンク境界を
// またいで光が漏れてくるケースを拾うために余白を取る。値は 0..15。
const _blMargin=(typeof BLOCKLIGHT_MAX!=='undefined')?BLOCKLIGHT_MAX:15;
const _blx0=Math.max(0,cx*CHUNK-_blMargin),_blz0=Math.max(0,cz*CHUNK-_blMargin);
const _blx1=Math.min(WORLD_W-1,cx*CHUNK+CHUNK-1+_blMargin),_blz1=Math.min(WORLD_D-1,cz*CHUNK+CHUNK-1+_blMargin);
const _blField=(typeof computeBlockLight!=='undefined')?computeBlockLight(_blx0,0,_blz0,_blx1-_blx0+1,WORLD_H,_blz1-_blz0+1):null;
// 任意セルのブロック光レベル(0..15)を返す（領域外は 0）。
function blockLightAt(x,y,z){if(!_blField)return 0;const lx=x-_blField.bx0,ly=y-_blField.by0,lz=z-_blField.bz0;if(lx<0||lx>=_blField.sx||ly<0||ly>=_blField.sy||lz<0||lz>=_blField.sz)return 0;return _blField.lv[_blField.idx(lx,ly,lz)];}
// ブロック光レベル(0..15)を明るさ倍率(0..~1)へ。Minecraft 同様、レベルを
// なめらかな減衰曲線に通して暗部でも視認できるようにする。
function blockLightMul(level){if(level<=0)return 0;const f=level/15;return f*f*0.85+f*0.15;}
const buf={pos:[],idx:[],nrm:[],uv:[],col:[]};const wbuf={pos:[],idx:[],nrm:[],uv:[],col:[]};const lbuf={pos:[],idx:[],nrm:[],uv:[],col:[]};function pushFace(b,x,y,z,f,tile,shade,alpha){const base=b.pos.length/3;const{u1,u2,v1,v2}=tileUV(tile);const uvs=[[u1,v1],[u2,v1],[u2,v2],[u1,v2]];for(let i=0;i<4;i++){const c=f.corners[i];b.pos.push(x+c[0],y+c[1],z+c[2]);b.nrm.push(f.dir[0],f.dir[1],f.dir[2]);b.uv.push(uvs[i][0],uvs[i][1]);b.col.push(shade,shade,shade,alpha);}
b.idx.push(base,base+1,base+2,base,base+2,base+3);}
// TASK7: 流体は上面を液量に応じて下げて描画する。corner の y==1 を topH に置き換え、
// 流れる水/溶岩が「浅い」見た目になるようにする(セルオートマトンの level を反映)。
function pushFluidFace(b,x,y,z,f,tile,shade,alpha,topH){const base=b.pos.length/3;const{u1,u2,v1,v2}=tileUV(tile);const uvs=[[u1,v1],[u2,v1],[u2,v2],[u1,v2]];for(let i=0;i<4;i++){const c=f.corners[i];const cy=c[1]===1?topH:c[1];b.pos.push(x+c[0],y+cy,z+c[2]);b.nrm.push(f.dir[0],f.dir[1],f.dir[2]);b.uv.push(uvs[i][0],uvs[i][1]);b.col.push(shade,shade,shade,alpha);}
b.idx.push(base,base+1,base+2,base,base+2,base+3);}
// 作物用のクロス(×字)描画: 対角に交差する2枚のクワッドを両面で出す。
// inset:四隅から内側へ寄せる量(0..0.5)。h:植物の高さ(0..1)。これにより
// クロス植物がブロック対角いっぱいに引き伸ばされず、Minecraftのように
// 中央付近に収まり、葉/サンゴの“黒い箱”状アーティファクトが出ない。
function pushCross(b,x,y,z,tile,shade,inset,h){const{u1,u2,v1,v2}=tileUV(tile);
  const lo=(inset||0),hi=1-(inset||0),top=(h===undefined?1:h);
  // 中央で交差する2枚の対角クワッド
  const planes=[[[lo,lo],[hi,hi]],[[lo,hi],[hi,lo]]];
  for(const[a,c]of planes){const corners=[[a[0],0,a[1]],[c[0],0,c[1]],[c[0],top,c[1]],[a[0],top,c[1]===a[1]?c[1]:a[1]]];
    // 上端は底辺と同じxz(縦の平面)。corners再定義:
    const q=[[a[0],0,a[1]],[c[0],0,c[1]],[c[0],top,c[1]],[a[0],top,a[1]]];
    const uvs=[[u1,v1],[u2,v1],[u2,v2],[u1,v2]];
    for(let side=0;side<2;side++){const base=b.pos.length/3;for(let i=0;i<4;i++){b.pos.push(x+q[i][0],y+q[i][1],z+q[i][2]);b.nrm.push(0,1,0);b.uv.push(uvs[i][0],uvs[i][1]);b.col.push(shade,shade,shade,1);}
    if(side===0)b.idx.push(base,base+1,base+2,base,base+2,base+3);else b.idx.push(base,base+2,base+1,base,base+3,base+2);}}}
// たいまつ/ランタン用: 細い四角柱(中央に立つ薄い箱)として描画する。
// 4側面 + 上面を出し、テクスチャの透明部分はアルファテストで抜ける。
function pushColumn(b,x,y,z,tile,shade,hw,top){const{u1,u2,v1,v2}=tileUV(tile);
  const a=0.5-hw,c=0.5+hw,t=(top===undefined?1:top);
  // 各側面 + 上面(下面は地面に接するので省略)
  const faces=[
    {n:[0,0,1], q:[[a,0,c],[c,0,c],[c,t,c],[a,t,c]]},
    {n:[0,0,-1],q:[[c,0,a],[a,0,a],[a,t,a],[c,t,a]]},
    {n:[1,0,0], q:[[c,0,c],[c,0,a],[c,t,a],[c,t,c]]},
    {n:[-1,0,0],q:[[a,0,a],[a,0,c],[a,t,c],[a,t,a]]},
    {n:[0,1,0], q:[[a,t,c],[c,t,c],[c,t,a],[a,t,a]]},
  ];
  const uvs=[[u1,v1],[u2,v1],[u2,v2],[u1,v2]];
  for(const f of faces){const base=b.pos.length/3;for(let i=0;i<4;i++){b.pos.push(x+f.q[i][0],y+f.q[i][1],z+f.q[i][2]);b.nrm.push(f.n[0],f.n[1],f.n[2]);b.uv.push(uvs[i][0],uvs[i][1]);b.col.push(shade,shade,shade,1);}b.idx.push(base,base+1,base+2,base,base+2,base+3);}}
// レール等の平板: 地表すぐ上に1枚の水平クワッドを置く(両面)。
function pushFlat(b,x,y,z,tile,shade){const{u1,u2,v1,v2}=tileUV(tile);const yy=0.02;const q=[[0,yy,1],[1,yy,1],[1,yy,0],[0,yy,0]];const uvs=[[u1,v1],[u2,v1],[u2,v2],[u1,v2]];for(let side=0;side<2;side++){const base=b.pos.length/3;for(let i=0;i<4;i++){b.pos.push(x+q[i][0],y+q[i][1],z+q[i][2]);b.nrm.push(0,1,0);b.uv.push(uvs[i][0],uvs[i][1]);b.col.push(shade,shade,shade,1);}if(side===0)b.idx.push(base,base+1,base+2,base,base+2,base+3);else b.idx.push(base,base+2,base+1,base,base+3,base+2);}}
// 洞窟の暗さ: 天空に開けていない面は skyMul で暗くする。emissive(発光)
// ブロックや溶岩は自発光なので暗くしない。CAVE_MIN は地下の最低明度(真っ暗寄り)。
const CAVE_MIN=0.10;function skyMulAt(x,y,z,def){if(def&&def.emissive)return 1;const s=skyLightAt(x,y,z);return CAVE_MIN+(1-CAVE_MIN)*s;}
// 天空光 + ブロック光源 を合成した最終的な明るさ倍率を返す。
// blx,bly,blz は「ブロック光を参照するセル」(立方体の面では隣接する空きセル)。
// 室内の松明は壁を貫通せず室内側だけを照らすので、面ごとに隣接セルの光を見ることで
// 「壁の外側だけ明るい」現象を防ぎ、室内が正しく明るくなる。
function litMulAt(x,y,z,def,blx,bly,blz){
  if(def&&def.emissive)return 1; // 自発光ブロックは常に最大
  const sky=skyMulAt(x,y,z,def);
  if(blx===undefined){blx=x;bly=y;blz=z;}
  const bl=blockLightMul(blockLightAt(blx,bly,blz));
  // 天空光とブロック光の大きい方を採用（足し算で白飛びしないように）。
  return Math.max(sky,CAVE_MIN+(1-CAVE_MIN)*bl);
}
// 立方体以外(クロス/松明/作物 等)はセル自身＋隣接の最大ブロック光を参照する。
function blockLightMaxNeighbor(x,y,z){let m=blockLightAt(x,y,z);const N=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];for(const[dx,dy,dz]of N){const v=blockLightAt(x+dx,y+dy,z+dz);if(v>m)m=v;}return m;}
const x0=cx*CHUNK,z0=cz*CHUNK;for(let x=x0;x<x0+CHUNK;x++){for(let z=z0;z<z0+CHUNK;z++){for(let y=0;y<WORLD_H;y++){const id=world[blockIndex(x,y,z)];if(id===B.AIR)continue;const def=BLOCKS[id];
// セル全体の明るさ(クロス/作物/平板など面方向を持たない描画に使用)。
// 天空光 + そのセル周辺のブロック光の大きい方。
const cellMul=(def&&def.emissive)?1:Math.max(skyMulAt(x,y,z,def),CAVE_MIN+(1-CAVE_MIN)*blockLightMul(blockLightMaxNeighbor(x,y,z)));
// 作物: クロス形状で成長段階に応じたタイルを描画する。
if(def&&def.crop){const tile=(typeof FARM!=='undefined')?FARM.stageTileAt(x,y,z,def):def.stages[def.stages.length-1];pushCross(buf,x,y,z,tile,0.95*cellMul,0.08,1);continue;}
// 枯れ木など非作物のクロス植物(×字)を平面2枚で描画する。
if(def&&def.crossPlant){pushCross(buf,x,y,z,def.all,0.92*cellMul,0.06,1);continue;}
// たいまつ/ランタン: 細い柱(箱)として描画。フルキューブの黒い箱にならない。
if(def&&def.torch){const sh=(def.emissive?1:0.95*cellMul);pushColumn(buf,x,y,z,def.all,sh,0.12,0.62);continue;}
if(def&&def.lanternBox){const sh=(def.emissive?1:0.95*cellMul);pushColumn(buf,x,y,z,def.all,sh,0.20,0.72);continue;}
// サンゴ・海藻・クモの巣・アメジストの塊・ヒカリゴケなどの×字クロス。
if(def&&def.cross){const sh=(def.emissive?1:0.94*cellMul);pushCross(buf,x,y,z,def.all,sh,0.04,1);continue;}
// レールなどの平板(水平1枚)。
if(def&&def.flat){pushFlat(buf,x,y,z,def.all,0.95*cellMul);continue;}
// TASK7: 液体セルは流体シミュレーションの量(level)に応じた上面高さで描画。
const isFluidCell=(id===B.WATER||id===B.LAVA);const topH=isFluidCell&&typeof FLUID!=='undefined'?FLUID.surfaceHeight(x,y,z):1;
for(const f of FACES){const nx=x+f.dir[0],ny=y+f.dir[1],nz=z+f.dir[2];const n=getBlock(nx,ny,nz);
// 面の明るさは「面が向いている隣接セル」のブロック光を参照する。これにより
// 壁の内側に光源があれば内向きの面が明るくなり、外側の面は外の暗さのままになる。
const faceMul=litMulAt(x,y,z,def,nx,ny,nz);
if(id===B.WATER){
// 隣が空気/透明、または “より浅い同種水” のとき面を出す(段差が見えるように)。
const nLower=(n===B.WATER&&f.face!=='top'&&typeof FLUID!=='undefined'&&FLUID.surfaceHeight(nx,ny,nz)<topH-0.02);
if(n===B.AIR||(BLOCKS[n]&&BLOCKS[n].transparent&&n!==B.WATER)||nLower){pushFluidFace(wbuf,x,y,z,f,T.WATER,f.shade*faceMul,1,topH);}}else if(id===B.LAVA){const nLower=(n===B.LAVA&&f.face!=='top'&&typeof FLUID!=='undefined'&&FLUID.surfaceHeight(nx,ny,nz)<topH-0.02);if(n===B.AIR||(BLOCKS[n]&&BLOCKS[n].transparent&&n!==B.LAVA)||nLower){pushFluidFace(lbuf,x,y,z,f,T.LAVA,1,1,topH);}}else{let visible=n===B.AIR||(BLOCKS[n]&&BLOCKS[n].transparent);if(visible&&n===id&&id===B.GLASS)visible=false;if(visible)pushFace(buf,x,y,z,f,tileForFace(def,f.face),f.shade*faceMul,1);}}}}}
function makeMesh(name,b,mat){if(b.idx.length===0)return null;const mesh=new BABYLON.Mesh(name,scene);const vd=new BABYLON.VertexData();vd.positions=b.pos;vd.indices=b.idx;vd.normals=b.nrm;vd.uvs=b.uv;vd.colors=b.col;vd.applyToMesh(mesh);mesh.material=mat;mesh.isPickable=false;mesh.freezeWorldMatrix();mesh.doNotSyncBoundingInfo=false;return mesh;}
chunkMeshes[cz*CHUNKS_X+cx]={solid:makeMesh(`chunk_s_${cx}_${cz}`,buf,solidMat),water:makeMesh(`chunk_w_${cx}_${cz}`,wbuf,waterMat),lava:makeMesh(`chunk_l_${cx}_${cz}`,lbuf,lavaMat),};chunkBuilt[cz*CHUNKS_X+cx]=1;}
const chunkBuilt=new Uint8Array(CHUNKS_X*CHUNKS_Z);
// View distance in chunks. Fog ends at ~120 units (≈7.5 chunks) so anything
// beyond ~7 chunks is invisible — meshing/keeping it enabled is wasted work.
// 描画距離を拡大: 遠くの地形も「視界内なら」描画されるようにする。
// フォグ終端(260)≒16チャンクまで見えるので、それに合わせて 14 チャンク描画する。
// Babylon のフラスタムカリングにより、視界外(背後/横)のチャンクは自動的に
// 描画スキップされるため、距離を伸ばしても見えている範囲だけが負荷になる。
const VIEW_DIST_CHUNKS=14;
// ロード画面で先に作る半径（小さめ）。残りはプレイ中に毎フレーム少しずつ
// ストリーミング生成する。これにより起動が速く、かつ最終的に遠方も描画される。
const INITIAL_LOAD_CHUNKS=7;
function updateChunkStreaming(budget,maxRadius){const maxR=(maxRadius===undefined)?VIEW_DIST_CHUNKS:maxRadius;const pcx=Math.floor(player.pos.x/CHUNK),pcz=Math.floor(player.pos.z/CHUNK);let built=0;for(let r=0;r<=maxR&&built<budget;r++){for(let dz=-r;dz<=r&&built<budget;dz++){for(let dx=-r;dx<=r&&built<budget;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;const cx=pcx+dx,cz=pcz+dz;if(cx<0||cx>=CHUNKS_X||cz<0||cz>=CHUNKS_Z)continue;if(chunkBuilt[cz*CHUNKS_X+cx])continue;buildChunk(cx,cz);built++;}}}
// Only toggle visibility for chunks within (or just outside) the view box,
// instead of scanning every chunk in the world each frame.
const lo_z=Math.max(0,pcz-VIEW_DIST_CHUNKS-1),hi_z=Math.min(CHUNKS_Z-1,pcz+VIEW_DIST_CHUNKS+1);const lo_x=Math.max(0,pcx-VIEW_DIST_CHUNKS-1),hi_x=Math.min(CHUNKS_X-1,pcx+VIEW_DIST_CHUNKS+1);for(let cz=lo_z;cz<=hi_z;cz++){for(let cx=lo_x;cx<=hi_x;cx++){const m=chunkMeshes[cz*CHUNKS_X+cx];if(!m)continue;const vis=Math.max(Math.abs(cx-pcx),Math.abs(cz-pcz))<=VIEW_DIST_CHUNKS;if(m.solid)m.solid.setEnabled(vis);if(m.water)m.water.setEnabled(vis);if(m.lava)m.lava.setEnabled(vis);}}return built;}
function setBlock(x,y,z,id){if(x<0||x>=WORLD_W||y<0||y>=WORLD_H||z<0||z>=WORLD_D)return;const prevId=world[blockIndex(x,y,z)];world[blockIndex(x,y,z)]=id;worldEdits[`${x},${y},${z}`]=id;scheduleSave();const cx=Math.floor(x/CHUNK),cz=Math.floor(z/CHUNK);buildChunk(cx,cz);if(x%CHUNK===0&&cx>0)buildChunk(cx-1,cz);if(x%CHUNK===CHUNK-1&&cx<CHUNKS_X-1)buildChunk(cx+1,cz);if(z%CHUNK===0&&cz>0)buildChunk(cx,cz-1);if(z%CHUNK===CHUNK-1&&cz<CHUNKS_Z-1)buildChunk(cx,cz+1);
// 光源(松明/ランタン/溶岩 等)の設置・破壊は周囲を照らす/暗くするので、
// 光が届く半径(BLOCKLIGHT_MAX)に重なる「既に生成済みの」チャンクを作り直して
// 室内/壁の明るさを更新する（範囲限定なので重くない）。
{const emitNow=(typeof blockLightEmission!=='undefined')?blockLightEmission(id):0;const emitPrev=(typeof blockLightEmission!=='undefined')?blockLightEmission(prevId):0;
// 壁(不透明)の付け外しも周囲の光の通り方を変えるため再計算が必要。
const opacityChanged=(typeof lightPasses!=='undefined')&&(lightPasses(prevId)!==lightPasses(id));
if(emitNow>0||emitPrev>0||opacityChanged){const R=(typeof BLOCKLIGHT_MAX!=='undefined')?BLOCKLIGHT_MAX:15;const rc=Math.ceil(R/CHUNK);for(let dz=-rc;dz<=rc;dz++)for(let dx=-rc;dx<=rc;dx++){if(dx===0&&dz===0)continue;const ncx=cx+dx,ncz=cz+dz;if(ncx<0||ncx>=CHUNKS_X||ncz<0||ncz>=CHUNKS_Z)continue;if(!chunkBuilt[ncz*CHUNKS_X+ncx])continue;buildChunk(ncx,ncz);}}}
// TASK7: ブロックが変わったら近傍の流体を起こして、流れ込み/抜けを再評価させる。
if(typeof FLUID!=='undefined')FLUID.notifyBlockChanged(x,y,z);
// 光源・照明: 光源ブロックの設置/破壊を照明システムへ通知。
if(typeof LIGHTING!=='undefined')LIGHTING.notifyBlockChanged(x,y,z);}
const highlightLines=(function(){const p=[[0,0,0],[1,0,0],[1,0,1],[0,0,1],[0,1,0],[1,1,0],[1,1,1],[0,1,1]];const e=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];const lines=e.map(([a,b])=>[new BABYLON.Vector3(p[a][0],p[a][1],p[a][2]).scaleInPlace(1.002),new BABYLON.Vector3(p[b][0],p[b][1],p[b][2]).scaleInPlace(1.002),]);const mesh=BABYLON.MeshBuilder.CreateLineSystem('highlight',{lines},scene);mesh.color=new BABYLON.Color3(0.05,0.05,0.05);mesh.isPickable=false;mesh.setEnabled(false);return mesh;})();function raycastVoxel(origin,dir,maxDist){let x=Math.floor(origin.x),y=Math.floor(origin.y),z=Math.floor(origin.z);const stepX=dir.x>0?1:-1,stepY=dir.y>0?1:-1,stepZ=dir.z>0?1:-1;const tDX=dir.x!==0?Math.abs(1/dir.x):Infinity;const tDY=dir.y!==0?Math.abs(1/dir.y):Infinity;const tDZ=dir.z!==0?Math.abs(1/dir.z):Infinity;let tMaxX=dir.x!==0?((dir.x>0?x+1-origin.x:origin.x-x)*tDX):Infinity;let tMaxY=dir.y!==0?((dir.y>0?y+1-origin.y:origin.y-y)*tDY):Infinity;let tMaxZ=dir.z!==0?((dir.z>0?z+1-origin.z:origin.z-z)*tDZ):Infinity;let px=x,py=y,pz=z,t=0;for(let i=0;i<256;i++){const id=getBlock(x,y,z);if(isTargetable(id)&&!(i===0))return{x,y,z,px,py,pz,id};px=x;py=y;pz=z;if(tMaxX<tMaxY&&tMaxX<tMaxZ){t=tMaxX;tMaxX+=tDX;x+=stepX;}
else if(tMaxY<tMaxZ){t=tMaxY;tMaxY+=tDY;y+=stepY;}
else{t=tMaxZ;tMaxZ+=tDZ;z+=stepZ;}
if(t>maxDist)return null;const id2=getBlock(x,y,z);if(isTargetable(id2))return{x,y,z,px,py,pz,id:id2};}
return null;}
// PLAYER は現在の姿勢に応じて height/eye が変化する（立ち/しゃがみ/匍匐）。
// POSES は各姿勢ごとの当たり判定の高さと視点(eye)の高さ。
const POSE={STAND:0,CROUCH:1,PRONE:2};
const POSES=[
  {height:1.8,eye:1.62,name:'立'},   // STAND
  {height:1.3,eye:1.12,name:'しゃがみ'}, // CROUCH
  {height:0.65,eye:0.5,name:'匍匐'},  // PRONE
];
const PLAYER={halfW:0.3,height:1.8,eye:1.62};
const player={pos:new BABYLON.Vector3(WORLD_W/2+0.5,40,WORLD_D/2+0.5),vel:new BABYLON.Vector3(0,0,0),yaw:Math.PI*0.25,pitch:0,onGround:false,flying:false,hp:20,hunger:20,fallStartY:null,dead:false,eatCooldown:0,regenTimer:0,starveTimer:0,hungerTimer:0,idleTimer:0,pose:POSE.STAND,};
// 指定した姿勢に頭上の空間が足りるか（立ち上がれるか）を判定。
function poseFits(poseIndex){const h=POSES[poseIndex].height;const box={minX:player.pos.x-PLAYER.halfW,maxX:player.pos.x+PLAYER.halfW,minY:player.pos.y,maxY:player.pos.y+h,minZ:player.pos.z-PLAYER.halfW,maxZ:player.pos.z+PLAYER.halfW};let blocked=false;forEachOverlapBlock(box,()=>{blocked=true;return true;});return !blocked;}
// 現在の pose を PLAYER.height / PLAYER.eye に反映する。
function applyPose(){const p=POSES[player.pose];PLAYER.height=p.height;PLAYER.eye=p.eye;}let spawnPoint=null;function findSpawn(){const cx=Math.floor(WORLD_W/2),cz=Math.floor(WORLD_D/2);let best=null;for(let r=0;r<20&&!best;r++){for(let dx=-r;dx<=r&&!best;dx++){for(let dz=-r;dz<=r&&!best;dz++){const x=cx+dx,z=cz+dz;if(x<2||x>=WORLD_W-2||z<2||z>=WORLD_D-2)continue;for(let y=WORLD_H-2;y>0;y--){const id=getBlock(x,y,z);if(id===B.WATER)break;if(isSolid(id)){if(getBlock(x,y+1,z)===B.AIR&&getBlock(x,y+2,z)===B.AIR)
best=new BABYLON.Vector3(x+0.5,y+1.01,z+0.5);break;}}}}}
return best||new BABYLON.Vector3(cx+0.5,WORLD_H-5,cz+0.5);}
function playerAABB(pos){return{minX:pos.x-PLAYER.halfW,maxX:pos.x+PLAYER.halfW,minY:pos.y,maxY:pos.y+PLAYER.height,minZ:pos.z-PLAYER.halfW,maxZ:pos.z+PLAYER.halfW,};}
// 足元の四隅のいずれかにブロックがあるか（スニーク時の落下防止に使用）。
function footSupported(){const y=Math.floor(player.pos.y-0.05);const xs=[player.pos.x-PLAYER.halfW+0.02,player.pos.x+PLAYER.halfW-0.02];const zs=[player.pos.z-PLAYER.halfW+0.02,player.pos.z+PLAYER.halfW-0.02];for(const x of xs)for(const z of zs){if(isSolid(getBlock(Math.floor(x),y,Math.floor(z))))return true;}return false;}
function forEachOverlapBlock(box,cb){const x0=Math.floor(box.minX),x1=Math.floor(box.maxX);const y0=Math.floor(box.minY),y1=Math.floor(box.maxY);const z0=Math.floor(box.minZ),z1=Math.floor(box.maxZ);for(let x=x0;x<=x1;x++)
for(let y=y0;y<=y1;y++)
for(let z=z0;z<=z1;z++)
if(isSolid(getBlock(x,y,z))){if(cb(x,y,z))return;}}
