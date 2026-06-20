const canvas=document.getElementById('game-canvas');const engine=new BABYLON.Engine(canvas,true,{stencil:false,preserveDrawingBuffer:false,antialias:false,powerPreference:'high-performance',doNotHandleContextLost:true});
// Cap the device-pixel ratio: on hi-DPI / mobile screens the default ratio can
// push the back-buffer to 2–3× the pixels, which is the single biggest FPS
// drain. Rendering at ~1× DPR and letting the browser upscale is far cheaper
// and barely noticeable on a blocky voxel art style. (Adaptive renderer below
// nudges this further when the frame budget is missed.)
engine.setHardwareScalingLevel(Math.max(1,Math.min(2,(window.devicePixelRatio||1))));
const scene=new BABYLON.Scene(engine);scene.clearColor=new BABYLON.Color4(0.53,0.81,0.92,1);scene.ambientColor=new BABYLON.Color3(0,0,0);
// Performance: voxel chunks are non-pickable static meshes, so skip the
// per-frame pointer-move picking and collision passes Babylon runs by default.
scene.skipPointerMovePicking=true;scene.constantlyUpdateMeshUnderPointer=false;scene.autoClearDepthAndStencil=true;scene.blockMaterialDirtyMechanism=true;
// Disable engine subsystems this voxel game never uses so Babylon skips their
// per-frame evaluation passes. (SFX uses its own Web Audio graph, so Babylon's
// audio engine is safe to switch off here.)
scene.collisionsEnabled=false;scene.spritesEnabled=false;scene.lensFlaresEnabled=false;scene.probesEnabled=false;scene.proceduralTexturesEnabled=false;scene.audioEnabled=false;scene.fogMode=BABYLON.Scene.FOGMODE_LINEAR;scene.fogStart=140;scene.fogEnd=260;scene.fogColor=new BABYLON.Color3(0.53,0.81,0.92);const camera=new BABYLON.FreeCamera('cam',new BABYLON.Vector3(0,30,0),scene);camera.minZ=0.1;camera.maxZ=520;camera.fov=1.1;camera.inputs.clear();const hemiLight=new BABYLON.HemisphericLight('hemi',new BABYLON.Vector3(0,1,0),scene);hemiLight.intensity=0.8;hemiLight.specular=new BABYLON.Color3(0,0,0);hemiLight.groundColor=new BABYLON.Color3(0.35,0.32,0.3);const sunLight=new BABYLON.DirectionalLight('sun',new BABYLON.Vector3(-0.4,-1,-0.3),scene);sunLight.intensity=0.7;sunLight.specular=new BABYLON.Color3(0,0,0);function makeSkyBillboard(name,size,draw){const tex=new BABYLON.DynamicTexture(name+'Tex',{width:64,height:64},scene,false);tex.hasAlpha=true;const c=tex.getContext();c.clearRect(0,0,64,64);draw(c);tex.update();const mat=new BABYLON.StandardMaterial(name+'Mat',scene);mat.emissiveTexture=tex;mat.opacityTexture=tex;mat.diffuseColor=new BABYLON.Color3(0,0,0);mat.specularColor=new BABYLON.Color3(0,0,0);mat.disableLighting=true;mat.fogEnabled=false;mat.backFaceCulling=false;const mesh=BABYLON.MeshBuilder.CreatePlane(name,{size},scene);mesh.material=mat;mesh.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;mesh.isPickable=false;mesh.applyFog=false;mesh.renderingGroupId=0;return mesh;}
const sunMesh=makeSkyBillboard('sunMesh',34,(c)=>{const g=c.createRadialGradient(32,32,10,32,32,32);g.addColorStop(0,'rgba(255,244,180,0.95)');g.addColorStop(0.55,'rgba(255,220,90,0.55)');g.addColorStop(1,'rgba(255,200,40,0)');c.fillStyle=g;c.fillRect(0,0,64,64);c.fillStyle='#ffe24a';c.fillRect(17,17,30,30);c.fillStyle='#fff6b0';c.fillRect(21,21,22,22);});const moonMesh=makeSkyBillboard('moonMesh',22,(c)=>{c.fillStyle='#e8ecf2';c.fillRect(16,16,32,32);c.fillStyle='#c4ccda';c.fillRect(22,22,8,8);c.fillRect(36,30,6,6);c.fillRect(26,38,6,4);c.fillStyle='#f6f8fc';c.fillRect(34,20,8,6);});const atlasTex=new BABYLON.DynamicTexture('atlas',{width:ATLAS_W,height:ATLAS_H},scene,false,BABYLON.Texture.NEAREST_SAMPLINGMODE);atlasTex.getContext().drawImage(atlasCanvas,0,0);atlasTex.update(true);
// Low-quality texture mode: redraw the atlas through a tiny buffer so each
// tile loses pixel detail (cheaper to sample / blurrier look). Re-uploads the
// atlas dynamic texture in place so all chunk materials update instantly.
function applyAtlasQuality(lowQuality){
  // Sampling-mode changes touch material state, so briefly unfreeze the chunk
  // materials, re-upload the atlas, then re-freeze for the steady-state path.
  if(typeof solidMat!=='undefined'&&solidMat.unfreeze){solidMat.unfreeze();waterMat.unfreeze();}
  const ctx=atlasTex.getContext();ctx.clearRect(0,0,ATLAS_W,ATLAS_H);
  if(lowQuality){
    // Down-sample each tile to ~1/4 resolution then scale it back up.
    const small=document.createElement('canvas');small.width=ATLAS_TILES*8;small.height=ATLAS_ROWS*8;
    const sctx=small.getContext('2d');sctx.imageSmoothingEnabled=true;sctx.drawImage(atlasCanvas,0,0,small.width,small.height);
    ctx.imageSmoothingEnabled=true;ctx.drawImage(small,0,0,ATLAS_W,ATLAS_H);
    atlasTex.updateSamplingMode(BABYLON.Texture.BILINEAR_SAMPLINGMODE);
  }else{
    ctx.imageSmoothingEnabled=false;ctx.drawImage(atlasCanvas,0,0);
    atlasTex.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);
  }
  atlasTex.update(true);
  if(typeof solidMat!=='undefined'&&solidMat.freeze){solidMat.freeze();waterMat.freeze();}
}atlasTex.hasAlpha=true;atlasTex.wrapU=BABYLON.Texture.CLAMP_ADDRESSMODE;atlasTex.wrapV=BABYLON.Texture.CLAMP_ADDRESSMODE;const solidMat=new BABYLON.StandardMaterial('solidMat',scene);solidMat.diffuseTexture=atlasTex;solidMat.specularColor=new BABYLON.Color3(0,0,0);solidMat.emissiveColor=new BABYLON.Color3(0.03,0.03,0.03);solidMat.useAlphaFromDiffuseTexture=true;solidMat.transparencyMode=BABYLON.Material.MATERIAL_ALPHATEST;solidMat.alphaCutOff=0.4;solidMat.backFaceCulling=false;solidMat.maxSimultaneousLights=2;const waterMat=new BABYLON.StandardMaterial('waterMat',scene);waterMat.diffuseTexture=atlasTex;waterMat.specularColor=new BABYLON.Color3(0,0,0);waterMat.emissiveColor=new BABYLON.Color3(0.1,0.15,0.3);waterMat.alpha=0.62;waterMat.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;waterMat.backFaceCulling=false;waterMat.maxSimultaneousLights=2;const lavaMat=new BABYLON.StandardMaterial('lavaMat',scene);lavaMat.diffuseTexture=atlasTex;lavaMat.specularColor=new BABYLON.Color3(0,0,0);lavaMat.emissiveColor=new BABYLON.Color3(0.95,0.45,0.12);lavaMat.disableLighting=true;lavaMat.backFaceCulling=false;
// Freeze the three chunk materials: their shader uniforms (textures, alpha,
// light count) never change at runtime, so freezing skips Babylon's per-frame
// "is this material dirty?" recompute and effect rebind. The atlas texture is
// updated in place via DynamicTexture.update(), which still works on a frozen
// material because only the texture content (not the material binding) changes.
solidMat.freeze();waterMat.freeze();lavaMat.freeze();
const FACES=[{dir:[1,0,0],face:'side',shade:0.80,corners:[[1,0,1],[1,0,0],[1,1,0],[1,1,1]]},{dir:[-1,0,0],face:'side',shade:0.80,corners:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]]},{dir:[0,0,1],face:'side',shade:0.65,corners:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]},{dir:[0,0,-1],face:'side',shade:0.65,corners:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]},{dir:[0,1,0],face:'top',shade:1.00,corners:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]},{dir:[0,-1,0],face:'bottom',shade:0.50,corners:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]},];function tileForFace(def,face){if(def.all!==undefined)return def.all;if(face==='top')return def.top;if(face==='bottom')return def.bottom;return def.side;}
// Day/night brightness for SKY light only (0=full night, 1=full day). Block
// light (torches/lava) is unaffected, so a torch genuinely lights up the dark.
// Baked into chunk vertex colours, so changing it requires rebuilding chunks
// (see maybeScheduleRelight / processRelightQueue, driven by the day cycle).
// Module-scoped so both the per-chunk meshing (skyMulAt) and the relight
// scheduler can read/update it.
let _dayLightFactor=1;
const NIGHT_SKY_MIN=0.16;   // how dark open sky gets at deep night
function _quantiseDay(f){return Math.round(Math.max(0,Math.min(1,f))*8);} // 9 steps
let _lastBakedDayStep=_quantiseDay(_dayLightFactor);
function setDayLight(f){_dayLightFactor=Math.max(0,Math.min(1,f));_lastBakedDayStep=_quantiseDay(_dayLightFactor);}
const CHUNKS_X=WORLD_W/CHUNK,CHUNKS_Z=WORLD_D/CHUNK;const chunkMeshes=[];function buildChunk(cx,cz){const old=chunkMeshes[cz*CHUNKS_X+cx];if(old){if(old.solid)old.solid.dispose();if(old.water)old.water.dispose();if(old.lava)old.lava.dispose();}
// Compute block light with margin for chunk border bleed
const _blMargin=(typeof BLOCKLIGHT_MAX!=='undefined')?BLOCKLIGHT_MAX:15;
const _blx0=Math.max(0,cx*CHUNK-_blMargin),_blz0=Math.max(0,cz*CHUNK-_blMargin);
const _blx1=Math.min(WORLD_W-1,cx*CHUNK+CHUNK-1+_blMargin),_blz1=Math.min(WORLD_D-1,cz*CHUNK+CHUNK-1+_blMargin);
const _blField=(typeof computeBlockLight!=='undefined')?computeBlockLight(_blx0,0,_blz0,_blx1-_blx0+1,WORLD_H,_blz1-_blz0+1):null;
function blockLightAt(x,y,z){if(!_blField)return 0;const lx=x-_blField.bx0,ly=y-_blField.by0,lz=z-_blField.bz0;if(lx<0||lx>=_blField.sx||ly<0||ly>=_blField.sy||lz<0||lz>=_blField.sz)return 0;return _blField.lv[_blField.idx(lx,ly,lz)];}
// Convert block light level to brightness multiplier
// Torch/block-light brightness boosted: ramps up fast and saturates near full
// so a single torch lights its surroundings strongly (clamped to 1.0 max).
function blockLightMul(level){if(level<=0)return 0;const f=level/15;return Math.min(1,(f*f*0.85+f*0.15)*4);}
const buf={pos:[],idx:[],nrm:[],uv:[],col:[]};const wbuf={pos:[],idx:[],nrm:[],uv:[],col:[]};const lbuf={pos:[],idx:[],nrm:[],uv:[],col:[]};function pushFace(b,x,y,z,f,tile,shade,alpha){const base=b.pos.length/3;const{u1,u2,v1,v2}=tileUV(tile);const uvs=[[u1,v1],[u2,v1],[u2,v2],[u1,v2]];for(let i=0;i<4;i++){const c=f.corners[i];b.pos.push(x+c[0],y+c[1],z+c[2]);b.nrm.push(f.dir[0],f.dir[1],f.dir[2]);b.uv.push(uvs[i][0],uvs[i][1]);b.col.push(shade,shade,shade,alpha);}
b.idx.push(base,base+1,base+2,base,base+2,base+3);}
// Fluid face: lower top height based on fluid level
function pushFluidFace(b,x,y,z,f,tile,shade,alpha,topH){const base=b.pos.length/3;const{u1,u2,v1,v2}=tileUV(tile);const uvs=[[u1,v1],[u2,v1],[u2,v2],[u1,v2]];for(let i=0;i<4;i++){const c=f.corners[i];const cy=c[1]===1?topH:c[1];b.pos.push(x+c[0],y+cy,z+c[2]);b.nrm.push(f.dir[0],f.dir[1],f.dir[2]);b.uv.push(uvs[i][0],uvs[i][1]);b.col.push(shade,shade,shade,alpha);}
b.idx.push(base,base+1,base+2,base,base+2,base+3);}
function pushCross(b,x,y,z,tile,shade,inset,h){const{u1,u2,v1,v2}=tileUV(tile);
  const lo=(inset||0),hi=1-(inset||0),top=(h===undefined?1:h);
  const planes=[[[lo,lo],[hi,hi]],[[lo,hi],[hi,lo]]];
  for(const[a,c]of planes){const corners=[[a[0],0,a[1]],[c[0],0,c[1]],[c[0],top,c[1]],[a[0],top,c[1]===a[1]?c[1]:a[1]]];
    const q=[[a[0],0,a[1]],[c[0],0,c[1]],[c[0],top,c[1]],[a[0],top,a[1]]];
    const uvs=[[u1,v1],[u2,v1],[u2,v2],[u1,v2]];
    for(let side=0;side<2;side++){const base=b.pos.length/3;for(let i=0;i<4;i++){b.pos.push(x+q[i][0],y+q[i][1],z+q[i][2]);b.nrm.push(0,1,0);b.uv.push(uvs[i][0],uvs[i][1]);b.col.push(shade,shade,shade,1);}
    if(side===0)b.idx.push(base,base+1,base+2,base,base+2,base+3);else b.idx.push(base,base+2,base+1,base,base+3,base+2);}}}
// Thin column (torch/lantern)
function pushColumn(b,x,y,z,tile,shade,hw,top,noTop){const{u1,u2,v1,v2}=tileUV(tile);
  const a=0.5-hw,c=0.5+hw,t=(top===undefined?1:top);
  const faces=[
    {n:[0,0,1], q:[[a,0,c],[c,0,c],[c,t,c],[a,t,c]]},
    {n:[0,0,-1],q:[[c,0,a],[a,0,a],[a,t,a],[c,t,a]]},
    {n:[1,0,0], q:[[c,0,c],[c,0,a],[c,t,a],[c,t,c]]},
    {n:[-1,0,0],q:[[a,0,a],[a,0,c],[a,t,c],[a,t,a]]},
  ];
  if(!noTop)faces.push({n:[0,1,0], q:[[a,t,c],[c,t,c],[c,t,a],[a,t,a]]});
  const uvs=[[u1,v1],[u2,v1],[u2,v2],[u1,v2]];
  for(const f of faces){const base=b.pos.length/3;for(let i=0;i<4;i++){b.pos.push(x+f.q[i][0],y+f.q[i][1],z+f.q[i][2]);b.nrm.push(f.n[0],f.n[1],f.n[2]);b.uv.push(uvs[i][0],uvs[i][1]);b.col.push(shade,shade,shade,1);}b.idx.push(base,base+1,base+2,base,base+2,base+3);}}
// Flat quad (rail)
function pushFlat(b,x,y,z,tile,shade){const{u1,u2,v1,v2}=tileUV(tile);const yy=0.02;const q=[[0,yy,1],[1,yy,1],[1,yy,0],[0,yy,0]];const uvs=[[u1,v1],[u2,v1],[u2,v2],[u1,v2]];for(let side=0;side<2;side++){const base=b.pos.length/3;for(let i=0;i<4;i++){b.pos.push(x+q[i][0],y+q[i][1],z+q[i][2]);b.nrm.push(0,1,0);b.uv.push(uvs[i][0],uvs[i][1]);b.col.push(shade,shade,shade,1);}if(side===0)b.idx.push(base,base+1,base+2,base,base+2,base+3);else b.idx.push(base,base+2,base+1,base,base+3,base+2);}}
// Wooden door: a thin (≈0.1) vertical slab spanning the full height of its
// cell, placed against the wall selected by `facing` (0=N,1=E,2=S,3=W). When
// `open` is true the slab is rotated 90° onto the adjacent wall so it tucks in
// beside the doorway. The slab is double-sided (both winding orders pushed)
// so it reads from inside and out. `tile` chooses the top/bottom texture.
function pushDoor(b,x,y,z,tile,facing,open,shade){const{u1,u2,v1,v2}=tileUV(tile);const TH=0.1;
  // Footprint rectangle in the cell's XZ plane: [ax,az]-[bx,bz]. The slab face
  // normal points along the door's depth; the long axis carries the texture U.
  let ax,az,bx,bz,nx,nz;
  // Closed: slab lies flat against the wall the door faces. Open: slab swings
  // to the perpendicular wall (hinge side), so swap to the rotated placement.
  const f=open?((facing+1)&3):facing;
  switch(f){
    case 0: ax=0;az=0;    bx=1;bz=TH;   nx=0;nz=-1; break; // north wall (z-)
    case 1: ax=1-TH;az=0; bx=1;bz=1;    nx=1;nz=0;  break; // east wall (x+)
    case 2: ax=0;az=1-TH; bx=1;bz=1;    nx=0;nz=1;  break; // south wall (z+)
    default:ax=0;az=0;    bx=TH;bz=1;   nx=-1;nz=0; break; // west wall (x-)
  }
  // Two parallel faces (front at the wall side, back offset by the thickness)
  // plus thin edge faces so the slab has visible depth from any angle.
  const faces=[];
  if(nx!==0){const xf=nx>0?bx:ax,xb=nx>0?ax:bx; // faces span Z, depth along X
    faces.push({n:[nx,0,0], q:[[xf,0,az],[xf,0,bz],[xf,1,bz],[xf,1,az]]});
    faces.push({n:[-nx,0,0],q:[[xb,0,bz],[xb,0,az],[xb,1,az],[xb,1,bz]]});
    faces.push({n:[0,0,-1],q:[[ax,0,az],[bx,0,az],[bx,1,az],[ax,1,az]]});
    faces.push({n:[0,0,1], q:[[bx,0,bz],[ax,0,bz],[ax,1,bz],[bx,1,bz]]});
  }else{const zf=nz>0?bz:az,zb=nz>0?az:bz; // faces span X, depth along Z
    faces.push({n:[0,0,nz], q:[[bx,0,zf],[ax,0,zf],[ax,1,zf],[bx,1,zf]]});
    faces.push({n:[0,0,-nz],q:[[ax,0,zb],[bx,0,zb],[bx,1,zb],[ax,1,zb]]});
    faces.push({n:[-1,0,0],q:[[ax,0,bz],[ax,0,az],[ax,1,az],[ax,1,bz]]});
    faces.push({n:[1,0,0], q:[[bx,0,az],[bx,0,bz],[bx,1,bz],[bx,1,az]]});
  }
  const uvs=[[u1,v2],[u2,v2],[u2,v1],[u1,v1]];
  for(const fc of faces){const base=b.pos.length/3;for(let i=0;i<4;i++){b.pos.push(x+fc.q[i][0],y+fc.q[i][1],z+fc.q[i][2]);b.nrm.push(fc.n[0],fc.n[1],fc.n[2]);b.uv.push(uvs[i][0],uvs[i][1]);b.col.push(shade,shade,shade,1);}b.idx.push(base,base+1,base+2,base,base+2,base+3);}}
// Cave darkness: min brightness for underground areas
const CAVE_MIN=0.10;
// Sky-light multiplier for one cell, scaled by the module-level day factor so
// open terrain darkens at night while block light (torches) fills back in.
function skyMulAt(x,y,z,def){if(def&&def.emissive)return 1;const s=skyLightAt(x,y,z);const sky=CAVE_MIN+(1-CAVE_MIN)*s;return sky*(NIGHT_SKY_MIN+(1-NIGHT_SKY_MIN)*_dayLightFactor);}
// Combined sky + block light multiplier
function litMulAt(x,y,z,def,blx,bly,blz){
  if(def&&def.emissive)return 1;
  const sky=skyMulAt(x,y,z,def);
  if(blx===undefined){blx=x;bly=y;blz=z;}
  const bl=blockLightMul(blockLightAt(blx,bly,blz));
  return Math.max(sky,CAVE_MIN+(1-CAVE_MIN)*bl);
}
// Max neighbor block light for non-cube shapes
function blockLightMaxNeighbor(x,y,z){let m=blockLightAt(x,y,z);const N=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];for(const[dx,dy,dz]of N){const v=blockLightAt(x+dx,y+dy,z+dz);if(v>m)m=v;}return m;}
const x0=cx*CHUNK,z0=cz*CHUNK;for(let x=x0;x<x0+CHUNK;x++){for(let z=z0;z<z0+CHUNK;z++){for(let y=0;y<WORLD_H;y++){const id=world[blockIndex(x,y,z)];if(id===B.AIR)continue;const def=BLOCKS[id];
// Cell brightness for non-cube shapes
const cellMul=(def&&def.emissive)?1:Math.max(skyMulAt(x,y,z,def),CAVE_MIN+(1-CAVE_MIN)*blockLightMul(blockLightMaxNeighbor(x,y,z)));
// Crop: cross shape with current growth stage
if(def&&def.crop){const tile=(typeof FARM!=='undefined')?FARM.stageTileAt(x,y,z,def):def.stages[def.stages.length-1];pushCross(buf,x,y,z,tile,0.95*cellMul,0.08,1);continue;}
// Non-crop cross plant
if(def&&def.crossPlant){pushCross(buf,x,y,z,def.all,0.92*cellMul,0.06,1);continue;}
// Bamboo: a slim full-height vertical cane (thin square column). Hide the top
// cap when another bamboo block sits above so a stalk reads as one tall cane.
if(def&&def.bamboo){const above=getBlock(x,y+1,z);pushColumn(buf,x,y,z,def.all,0.95*cellMul,0.17,1,above===id);continue;}
// Torch/lantern: thin column
if(def&&def.torch){const sh=(def.emissive?1:0.95*cellMul);pushColumn(buf,x,y,z,def.all,sh,0.12,0.62);continue;}
if(def&&def.lanternBox){const sh=(def.emissive?1:0.95*cellMul);pushColumn(buf,x,y,z,def.all,sh,0.20,0.72);continue;}
if(def&&def.cross){const sh=(def.emissive?1:0.94*cellMul);pushCross(buf,x,y,z,def.all,sh,0.04,1);continue;}
// Wooden door: thin slab using the top/bottom texture chosen by doorHalf,
// placed/rotated per doorFacing & doorOpen (geometry handled by pushDoor).
if(def&&def.door){const tile=(def.doorHalf==='top')?T.DOOR_TOP:T.DOOR_BOTTOM;pushDoor(buf,x,y,z,tile,def.doorFacing,def.doorOpen,0.9*cellMul);continue;}
if(def&&def.flat){pushFlat(buf,x,y,z,def.all,0.95*cellMul);continue;}
const isFluidCell=(id===B.WATER||id===B.LAVA);const topH=isFluidCell&&typeof FLUID!=='undefined'?FLUID.surfaceHeight(x,y,z):1;
for(const f of FACES){const nx=x+f.dir[0],ny=y+f.dir[1],nz=z+f.dir[2];const n=getBlock(nx,ny,nz);
const faceMul=litMulAt(x,y,z,def,nx,ny,nz);
if(id===B.WATER){
const nLower=(n===B.WATER&&f.face!=='top'&&typeof FLUID!=='undefined'&&FLUID.surfaceHeight(nx,ny,nz)<topH-0.02);
if(n===B.AIR||(BLOCKS[n]&&BLOCKS[n].transparent&&n!==B.WATER)||nLower){pushFluidFace(wbuf,x,y,z,f,T.WATER,f.shade*faceMul,1,topH);}}else if(id===B.LAVA){const nLower=(n===B.LAVA&&f.face!=='top'&&typeof FLUID!=='undefined'&&FLUID.surfaceHeight(nx,ny,nz)<topH-0.02);if(n===B.AIR||(BLOCKS[n]&&BLOCKS[n].transparent&&n!==B.LAVA)||nLower){pushFluidFace(lbuf,x,y,z,f,T.LAVA,1,1,topH);}}else{let visible=n===B.AIR||(BLOCKS[n]&&BLOCKS[n].transparent);if(visible&&n===id&&id===B.GLASS)visible=false;if(visible)pushFace(buf,x,y,z,f,tileForFace(def,f.face),f.shade*faceMul,1);}}}}}
function makeMesh(name,b,mat){if(b.idx.length===0)return null;const mesh=new BABYLON.Mesh(name,scene);const vd=new BABYLON.VertexData();vd.positions=b.pos;vd.indices=b.idx;vd.normals=b.nrm;vd.uvs=b.uv;vd.colors=b.col;vd.applyToMesh(mesh,false);mesh.material=mat;mesh.isPickable=false;
// Chunk meshes never move, so freeze the world matrix (skips per-frame matrix
// recompute) but keep frustum culling on — bounding info is computed once from
// the geometry above and never needs re-syncing, so we can skip the per-frame
// bounding-info sync entirely. cullingStrategy: cheap bounding-sphere-only test
// is plenty for axis-aligned chunk boxes and avoids the full clip-plane pass.
mesh.freezeWorldMatrix();mesh.doNotSyncBoundingInfo=true;mesh.cullingStrategy=BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;mesh.alwaysSelectAsActiveMesh=false;return mesh;}
chunkMeshes[cz*CHUNKS_X+cx]={solid:makeMesh(`chunk_s_${cx}_${cz}`,buf,solidMat),water:makeMesh(`chunk_w_${cx}_${cz}`,wbuf,waterMat),lava:makeMesh(`chunk_l_${cx}_${cz}`,lbuf,lavaMat),};chunkBuilt[cz*CHUNKS_X+cx]=1;}
const chunkBuilt=new Uint8Array(CHUNKS_X*CHUNKS_Z);
// View distance in chunks. Fog ends at ~120 units (≈7.5 chunks) so anything
// beyond ~7 chunks is invisible — meshing/keeping it enabled is wasted work.
let VIEW_DIST_CHUNKS=14;
const INITIAL_LOAD_CHUNKS=7;
// Allow the settings menu to change render distance at runtime.
function setViewDistance(chunks){const c=Math.max(2,Math.min(28,chunks|0));VIEW_DIST_CHUNKS=c;}
function updateChunkStreaming(budget,maxRadius){const maxR=(maxRadius===undefined)?VIEW_DIST_CHUNKS:maxRadius;const pcx=Math.floor(player.pos.x/CHUNK),pcz=Math.floor(player.pos.z/CHUNK);let built=0;for(let r=0;r<=maxR&&built<budget;r++){for(let dz=-r;dz<=r&&built<budget;dz++){for(let dx=-r;dx<=r&&built<budget;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;const cx=pcx+dx,cz=pcz+dz;if(cx<0||cx>=CHUNKS_X||cz<0||cz>=CHUNKS_Z)continue;if(chunkBuilt[cz*CHUNKS_X+cx])continue;buildChunk(cx,cz);built++;}}}
// Only toggle visibility for chunks within (or just outside) the view box,
// instead of scanning every chunk in the world each frame.
const lo_z=Math.max(0,pcz-VIEW_DIST_CHUNKS-1),hi_z=Math.min(CHUNKS_Z-1,pcz+VIEW_DIST_CHUNKS+1);const lo_x=Math.max(0,pcx-VIEW_DIST_CHUNKS-1),hi_x=Math.min(CHUNKS_X-1,pcx+VIEW_DIST_CHUNKS+1);for(let cz=lo_z;cz<=hi_z;cz++){for(let cx=lo_x;cx<=hi_x;cx++){const m=chunkMeshes[cz*CHUNKS_X+cx];if(!m)continue;const vis=Math.max(Math.abs(cx-pcx),Math.abs(cz-pcz))<=VIEW_DIST_CHUNKS;
// Only touch setEnabled when the visibility actually flips. setEnabled walks
// the mesh's child hierarchy and dirties scene caches, so calling it every
// frame for hundreds of already-correct chunks is pure overhead.
if(m._vis!==vis){m._vis=vis;if(m.solid)m.solid.setEnabled(vis);if(m.water)m.water.setEnabled(vis);if(m.lava)m.lava.setEnabled(vis);}}}return built;}
// --- Day/night relighting --------------------------------------------------
// Sky-light brightness is baked into chunk vertex colours, so when the day
// factor changes we must rebuild chunks for the new lighting to show. We do
// this in stepped quanta (so we don't rebuild every frame) and spread the work
// across frames in an outward ring from the player to avoid hitches.
let _relightQueue=null;
function maybeScheduleRelight(dayF){
  const step=_quantiseDay(dayF);
  if(step===_lastBakedDayStep)return;
  setDayLight(dayF); // updates _dayLightFactor + _lastBakedDayStep
  // Queue all currently-built chunks, sorted near→far from the player, so the
  // visible area relights first.
  const pcx=Math.floor(player.pos.x/CHUNK),pcz=Math.floor(player.pos.z/CHUNK);
  const list=[];
  for(let cz=0;cz<CHUNKS_Z;cz++)for(let cx=0;cx<CHUNKS_X;cx++){if(!chunkBuilt[cz*CHUNKS_X+cx])continue;const d=Math.max(Math.abs(cx-pcx),Math.abs(cz-pcz));if(d>VIEW_DIST_CHUNKS+1)continue;list.push({cx,cz,d});}
  list.sort((a,b)=>a.d-b.d);
  _relightQueue=list;
}
// Rebuild a budgeted slice of the relight queue each frame. Always keep the
// global _dayLightFactor in sync with the latest requested factor so newly
// streamed chunks bake at the right brightness immediately.
function processRelightQueue(budget){
  if(!_relightQueue||_relightQueue.length===0){_relightQueue=null;return;}
  let n=0;
  while(_relightQueue.length&&n<budget){const c=_relightQueue.shift();if(chunkBuilt[c.cz*CHUNKS_X+c.cx]){buildChunk(c.cx,c.cz);n++;}}
  if(_relightQueue.length===0)_relightQueue=null;
}
function setBlock(x,y,z,id){if(x<0||x>=WORLD_W||y<0||y>=WORLD_H||z<0||z>=WORLD_D)return;const prevId=world[blockIndex(x,y,z)];world[blockIndex(x,y,z)]=id;worldEdits[`${x},${y},${z}`]=id;scheduleSave();const cx=Math.floor(x/CHUNK),cz=Math.floor(z/CHUNK);buildChunk(cx,cz);if(x%CHUNK===0&&cx>0)buildChunk(cx-1,cz);if(x%CHUNK===CHUNK-1&&cx<CHUNKS_X-1)buildChunk(cx+1,cz);if(z%CHUNK===0&&cz>0)buildChunk(cx,cz-1);if(z%CHUNK===CHUNK-1&&cz<CHUNKS_Z-1)buildChunk(cx,cz+1);
{const emitNow=(typeof blockLightEmission!=='undefined')?blockLightEmission(id):0;const emitPrev=(typeof blockLightEmission!=='undefined')?blockLightEmission(prevId):0;
const opacityChanged=(typeof lightPasses!=='undefined')&&(lightPasses(prevId)!==lightPasses(id));
if(emitNow>0||emitPrev>0||opacityChanged){const R=(typeof BLOCKLIGHT_MAX!=='undefined')?BLOCKLIGHT_MAX:15;const rc=Math.ceil(R/CHUNK);for(let dz=-rc;dz<=rc;dz++)for(let dx=-rc;dx<=rc;dx++){if(dx===0&&dz===0)continue;const ncx=cx+dx,ncz=cz+dz;if(ncx<0||ncx>=CHUNKS_X||ncz<0||ncz>=CHUNKS_Z)continue;if(!chunkBuilt[ncz*CHUNKS_X+ncx])continue;buildChunk(ncx,ncz);}}}
if(typeof FLUID!=='undefined')FLUID.notifyBlockChanged(x,y,z);
if(typeof LIGHTING!=='undefined')LIGHTING.notifyBlockChanged(x,y,z);}
const highlightLines=(function(){const p=[[0,0,0],[1,0,0],[1,0,1],[0,0,1],[0,1,0],[1,1,0],[1,1,1],[0,1,1]];const e=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];const lines=e.map(([a,b])=>[new BABYLON.Vector3(p[a][0],p[a][1],p[a][2]).scaleInPlace(1.002),new BABYLON.Vector3(p[b][0],p[b][1],p[b][2]).scaleInPlace(1.002),]);const mesh=BABYLON.MeshBuilder.CreateLineSystem('highlight',{lines},scene);mesh.color=new BABYLON.Color3(0.05,0.05,0.05);mesh.isPickable=false;mesh.setEnabled(false);return mesh;})();function raycastVoxel(origin,dir,maxDist){let x=Math.floor(origin.x),y=Math.floor(origin.y),z=Math.floor(origin.z);const stepX=dir.x>0?1:-1,stepY=dir.y>0?1:-1,stepZ=dir.z>0?1:-1;const tDX=dir.x!==0?Math.abs(1/dir.x):Infinity;const tDY=dir.y!==0?Math.abs(1/dir.y):Infinity;const tDZ=dir.z!==0?Math.abs(1/dir.z):Infinity;let tMaxX=dir.x!==0?((dir.x>0?x+1-origin.x:origin.x-x)*tDX):Infinity;let tMaxY=dir.y!==0?((dir.y>0?y+1-origin.y:origin.y-y)*tDY):Infinity;let tMaxZ=dir.z!==0?((dir.z>0?z+1-origin.z:origin.z-z)*tDZ):Infinity;let px=x,py=y,pz=z,t=0;for(let i=0;i<256;i++){const id=getBlock(x,y,z);if(isTargetable(id)&&!(i===0))return{x,y,z,px,py,pz,id};px=x;py=y;pz=z;if(tMaxX<tMaxY&&tMaxX<tMaxZ){t=tMaxX;tMaxX+=tDX;x+=stepX;}
else if(tMaxY<tMaxZ){t=tMaxY;tMaxY+=tDY;y+=stepY;}
else{t=tMaxZ;tMaxZ+=tDZ;z+=stepZ;}
if(t>maxDist)return null;const id2=getBlock(x,y,z);if(isTargetable(id2))return{x,y,z,px,py,pz,id:id2};}
return null;}
const POSE={STAND:0,CROUCH:1};
const POSES=[
  {height:1.8,eye:1.62,name:'Stand'},   
  {height:1.5,eye:1.32,name:'Crouch'}, 
];
const PLAYER={halfW:0.3,height:1.8,eye:1.62};
const player={pos:new BABYLON.Vector3(WORLD_W/2+0.5,40,WORLD_D/2+0.5),vel:new BABYLON.Vector3(0,0,0),yaw:Math.PI*0.25,pitch:0,onGround:false,flying:false,hp:20,hunger:20,fallStartY:null,dead:false,eatCooldown:0,regenTimer:0,starveTimer:0,hungerTimer:0,idleTimer:0,pose:POSE.STAND,wantCrouch:false,};
function poseFits(poseIndex){const h=POSES[poseIndex].height;const box={minX:player.pos.x-PLAYER.halfW,maxX:player.pos.x+PLAYER.halfW,minY:player.pos.y,maxY:player.pos.y+h,minZ:player.pos.z-PLAYER.halfW,maxZ:player.pos.z+PLAYER.halfW};let blocked=false;forEachOverlapBlock(box,()=>{blocked=true;return true;});return !blocked;}
function applyPose(){const p=POSES[player.pose];PLAYER.height=p.height;PLAYER.eye=p.eye;}let spawnPoint=null;function findSpawn(){const cx=Math.floor(WORLD_W/2),cz=Math.floor(WORLD_D/2);let best=null;for(let r=0;r<20&&!best;r++){for(let dx=-r;dx<=r&&!best;dx++){for(let dz=-r;dz<=r&&!best;dz++){const x=cx+dx,z=cz+dz;if(x<2||x>=WORLD_W-2||z<2||z>=WORLD_D-2)continue;for(let y=WORLD_H-2;y>0;y--){const id=getBlock(x,y,z);if(id===B.WATER)break;if(isSolid(id)){if(getBlock(x,y+1,z)===B.AIR&&getBlock(x,y+2,z)===B.AIR)
best=new BABYLON.Vector3(x+0.5,y+1.01,z+0.5);break;}}}}}
return best||new BABYLON.Vector3(cx+0.5,WORLD_H-5,cz+0.5);}
function playerAABB(pos){return{minX:pos.x-PLAYER.halfW,maxX:pos.x+PLAYER.halfW,minY:pos.y,maxY:pos.y+PLAYER.height,minZ:pos.z-PLAYER.halfW,maxZ:pos.z+PLAYER.halfW,};}
function footSupported(){const y=Math.floor(player.pos.y-0.05);const xs=[player.pos.x-PLAYER.halfW+0.02,player.pos.x+PLAYER.halfW-0.02];const zs=[player.pos.z-PLAYER.halfW+0.02,player.pos.z+PLAYER.halfW-0.02];for(const x of xs)for(const z of zs){if(isSolid(getBlock(Math.floor(x),y,Math.floor(z))))return true;}return false;}
function forEachOverlapBlock(box,cb){const x0=Math.floor(box.minX),x1=Math.floor(box.maxX);const y0=Math.floor(box.minY),y1=Math.floor(box.maxY);const z0=Math.floor(box.minZ),z1=Math.floor(box.maxZ);for(let x=x0;x<=x1;x++)
for(let y=y0;y<=y1;y++)
for(let z=z0;z<=z1;z++)
if(isSolid(getBlock(x,y,z))){if(cb(x,y,z))return;}}
