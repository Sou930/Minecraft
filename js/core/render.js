const canvas=document.getElementById('game-canvas');const engine=new BABYLON.Engine(canvas,true,{stencil:false,preserveDrawingBuffer:false,antialias:false,powerPreference:'high-performance',doNotHandleContextLost:true});
// Cap the device-pixel ratio: on hi-DPI / mobile screens the default ratio can
// push the back-buffer to 2–3× the pixels, which is the single biggest FPS
// drain. Rendering at ~1× DPR and letting the browser upscale is far cheaper
// and barely noticeable on a blocky voxel art style. (Adaptive renderer below
// nudges this further when the frame budget is missed.)
// Mobile (iPad 7 = A10, 264 ppi): force 1× DPR so we target 30 FPS at safe GPU load.
{const _isMob=(typeof isMobile!=='undefined')?isMobile:(('ontouchstart'in window)&&/Mobi|Android|iPhone|iPad|Tablet/i.test(navigator.userAgent));const dpr=window.devicePixelRatio||1;engine.setHardwareScalingLevel(_isMob?Math.max(1,dpr):Math.max(1,Math.min(2,dpr)));}
const scene=new BABYLON.Scene(engine);scene.clearColor=new BABYLON.Color4(0.53,0.81,0.92,1);scene.ambientColor=new BABYLON.Color3(0,0,0);
// Performance: voxel chunks are non-pickable static meshes, so skip the
// per-frame pointer-move picking and collision passes Babylon runs by default.
scene.skipPointerMovePicking=true;scene.constantlyUpdateMeshUnderPointer=false;scene.autoClearDepthAndStencil=true;scene.blockMaterialDirtyMechanism=true;
// Disable engine subsystems this voxel game never uses so Babylon skips their
// per-frame evaluation passes. (SFX uses its own Web Audio graph, so Babylon's
// audio engine is safe to switch off here.)
scene.collisionsEnabled=false;scene.spritesEnabled=false;scene.lensFlaresEnabled=false;scene.probesEnabled=false;scene.proceduralTexturesEnabled=false;scene.audioEnabled=false;scene.fogMode=BABYLON.Scene.FOGMODE_LINEAR;scene.fogStart=140;scene.fogEnd=260;scene.fogColor=new BABYLON.Color3(0.53,0.81,0.92);const camera=new BABYLON.FreeCamera('cam',new BABYLON.Vector3(0,30,0),scene);camera.minZ=0.1;camera.maxZ=520;camera.fov=1.1;camera.inputs.clear();const hemiLight=new BABYLON.HemisphericLight('hemi',new BABYLON.Vector3(0,1,0),scene);hemiLight.intensity=0.8;hemiLight.specular=new BABYLON.Color3(0,0,0);hemiLight.groundColor=new BABYLON.Color3(0.35,0.32,0.3);const sunLight=new BABYLON.DirectionalLight('sun',new BABYLON.Vector3(-0.4,-1,-0.3),scene);sunLight.intensity=0.7;sunLight.specular=new BABYLON.Color3(0,0,0);function makeSkyBillboard(name,size,draw){const tex=new BABYLON.DynamicTexture(name+'Tex',{width:64,height:64},scene,false);tex.hasAlpha=true;const c=tex.getContext();c.clearRect(0,0,64,64);draw(c);tex.update();const mat=new BABYLON.StandardMaterial(name+'Mat',scene);mat.emissiveTexture=tex;mat.opacityTexture=tex;mat.diffuseColor=new BABYLON.Color3(0,0,0);mat.specularColor=new BABYLON.Color3(0,0,0);mat.disableLighting=true;mat.fogEnabled=false;mat.backFaceCulling=false;const mesh=BABYLON.MeshBuilder.CreatePlane(name,{size},scene);mesh.material=mat;mesh.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;mesh.isPickable=false;mesh.applyFog=false;mesh.renderingGroupId=0;return mesh;}
const sunMesh=makeSkyBillboard('sunMesh',34,(c)=>{const g=c.createRadialGradient(32,32,10,32,32,32);g.addColorStop(0,'rgba(255,244,180,0.95)');g.addColorStop(0.55,'rgba(255,220,90,0.55)');g.addColorStop(1,'rgba(255,200,40,0)');c.fillStyle=g;c.fillRect(0,0,64,64);c.fillStyle='#ffe24a';c.fillRect(17,17,30,30);c.fillStyle='#fff6b0';c.fillRect(21,21,22,22);});const moonMesh=makeSkyBillboard('moonMesh',22,(c)=>{c.fillStyle='#e8ecf2';c.fillRect(16,16,32,32);c.fillStyle='#c4ccda';c.fillRect(22,22,8,8);c.fillRect(36,30,6,6);c.fillRect(26,38,6,4);c.fillStyle='#f6f8fc';c.fillRect(34,20,8,6);});
// --- Starfield -------------------------------------------------------------
// A dome of small star quads merged into a single mesh that sits far away on
// the sky sphere and follows the camera. It's drawn behind the world (depth
// write off, no fog/lighting) and its visibility / opacity is driven by the
// day-night cycle (see updateStars) so stars fade in at dusk and out at dawn.
const starField=(function(){
  // Tiny round star sprite shared by every quad.
  const tex=new BABYLON.DynamicTexture('starTex',{width:32,height:32},scene,false);tex.hasAlpha=true;
  {const c=tex.getContext();c.clearRect(0,0,32,32);const g=c.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.4,'rgba(255,255,255,0.85)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.beginPath();c.arc(16,16,16,0,Math.PI*2);c.fill();tex.update();}
  const mat=new BABYLON.StandardMaterial('starMat',scene);
  mat.emissiveTexture=tex;mat.opacityTexture=tex;mat.diffuseColor=new BABYLON.Color3(0,0,0);mat.specularColor=new BABYLON.Color3(0,0,0);
  mat.emissiveColor=new BABYLON.Color3(1,1,1);mat.disableLighting=true;mat.fogEnabled=false;mat.backFaceCulling=false;mat.alpha=0;
  // Build star quads on the upper hemisphere of a big sphere.
  const R=300,N=520;const merge=[];
  let seed=1337;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  for(let i=0;i<N;i++){
    // Bias toward the upper hemisphere so most stars are overhead.
    const u=rnd(),v=rnd()*0.92+0.04;
    const theta=u*Math.PI*2;const phi=Math.acos(1-v); // 0=up
    const dx=Math.sin(phi)*Math.cos(theta),dy=Math.cos(phi),dz=Math.sin(phi)*Math.sin(theta);
    const sz=1.1+rnd()*2.6;
    const p=BABYLON.MeshBuilder.CreatePlane('star'+i,{size:sz},scene);
    p.position.set(dx*R,dy*R,dz*R);
    // Orient each quad to face the dome centre (the camera) so after merging
    // (which bakes the transform) every star presents its front face inward.
    p.lookAt(BABYLON.Vector3.Zero());
    merge.push(p);
  }
  const mesh=BABYLON.Mesh.MergeMeshes(merge,true,true,undefined,false,false)||merge[0];
  // MergeMeshes drops billboard mode; instead we keep the dome static relative
  // to the camera by repositioning it each frame (see updateStars).
  mesh.material=mat;mesh.isPickable=false;mesh.applyFog=false;
  mesh.renderingGroupId=0;mesh.alwaysSelectAsActiveMesh=true;
  mesh.setEnabled(false);
  return {mesh,mat};
})();
// Fade the stars with the night factor (1=day → 0 alpha, deep night → ~0.9).
function updateStars(dayF){
  if(!starField||!starField.mesh)return;
  // Stars only visible when it's getting dark.
  const a=Math.max(0,Math.min(1,(0.45-dayF)/0.45));
  if(a<=0.01){if(starField.mesh.isEnabled())starField.mesh.setEnabled(false);return;}
  if(!starField.mesh.isEnabled())starField.mesh.setEnabled(true);
  starField.mat.alpha=a*0.9;
  // Keep the dome centred on the camera and slowly rotate it for a subtle
  // sky-spin so the night sky feels alive.
  starField.mesh.position.copyFrom(camera.position);
  starField.mesh.rotation.y+=0.0; // (dome stays fixed; centred on camera)
}
const atlasTex=new BABYLON.DynamicTexture('atlas',{width:ATLAS_W,height:ATLAS_H},scene,false,BABYLON.Texture.NEAREST_SAMPLINGMODE);atlasTex.getContext().drawImage(atlasCanvas,0,0);atlasTex.update(true);
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
}atlasTex.hasAlpha=true;atlasTex.wrapU=BABYLON.Texture.CLAMP_ADDRESSMODE;atlasTex.wrapV=BABYLON.Texture.CLAMP_ADDRESSMODE;const solidMat=new BABYLON.StandardMaterial('solidMat',scene);solidMat.diffuseTexture=atlasTex;solidMat.specularColor=new BABYLON.Color3(0,0,0);solidMat.emissiveColor=new BABYLON.Color3(0.03,0.03,0.03);solidMat.useAlphaFromDiffuseTexture=true;solidMat.transparencyMode=BABYLON.Material.MATERIAL_ALPHATEST;solidMat.alphaCutOff=0.4;solidMat.backFaceCulling=false;solidMat.maxSimultaneousLights=2;const waterMat=new BABYLON.StandardMaterial('waterMat',scene);waterMat.diffuseTexture=atlasTex;waterMat.specularColor=new BABYLON.Color3(0,0,0);waterMat.emissiveColor=new BABYLON.Color3(0.1,0.15,0.3);waterMat.alpha=0.74;waterMat.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;waterMat.backFaceCulling=false;waterMat.maxSimultaneousLights=2;const lavaMat=new BABYLON.StandardMaterial('lavaMat',scene);lavaMat.diffuseTexture=atlasTex;lavaMat.specularColor=new BABYLON.Color3(0,0,0);lavaMat.emissiveColor=new BABYLON.Color3(0.95,0.45,0.12);lavaMat.disableLighting=true;lavaMat.backFaceCulling=false;
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
// Wooden Stairs: built from two stacked axis-aligned boxes — a full half-height
// bottom slab (y 0→0.5) plus a half-depth upper step (y 0.5→1) tucked against the
// "high" side. `facing` (0=N/z-,1=E/x+,2=S/z+,3=W/x-) points toward the LOW (open)
// side you step up from, so the tall step sits on the opposite edge. Each box is
// emitted as 6 quads; UVs map the tile across each face so the oak grain reads.
function pushBox(b,x,y,z,x0,y0,z0,x1,y1,z1,tile,shade){const{u1,u2,v1,v2}=tileUV(tile);
  const uvs=[[u1,v1],[u2,v1],[u2,v2],[u1,v2]];
  const faces=[
    {n:[0,0,1], q:[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]]},
    {n:[0,0,-1],q:[[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]]},
    {n:[1,0,0], q:[[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]]},
    {n:[-1,0,0],q:[[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]]},
    {n:[0,1,0], q:[[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]]},
    {n:[0,-1,0],q:[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]]},
  ];
  for(const f of faces){const base=b.pos.length/3;for(let i=0;i<4;i++){b.pos.push(x+f.q[i][0],y+f.q[i][1],z+f.q[i][2]);b.nrm.push(f.n[0],f.n[1],f.n[2]);b.uv.push(uvs[i][0],uvs[i][1]);b.col.push(shade,shade,shade,1);}b.idx.push(base,base+1,base+2,base,base+2,base+3);}}
// Slab: a half-height full-footprint block (lower half of the cell).
function pushSlab(b,x,y,z,def,shade){
  // Use tileForFace to pick top/side/bottom from block def
  const topTile=def.top!==undefined?def.top:(def.all!==undefined?def.all:0);
  const sideTile=def.side!==undefined?def.side:(def.all!==undefined?def.all:0);
  const{u1,u2,v1,v2}=tileUV(sideTile);
  const{u1:tu1,u2:tu2,v1:tv1,v2:tv2}=tileUV(topTile);
  // Clamp UV vertically for side faces: only lower half (v1..mid)
  const vmid=(v1+v2)/2;
  const uvs=[[u1,vmid],[u2,vmid],[u2,v2],[u1,v2]];
  const topUVs=[[tu1,tv1],[tu2,tv1],[tu2,tv2],[tu1,tv2]];
  const faces=[
    {n:[0,0,1], q:[[0,0,1],[1,0,1],[1,0.5,1],[0,0.5,1]],uvs:uvs,shade:0.65},
    {n:[0,0,-1],q:[[1,0,0],[0,0,0],[0,0.5,0],[1,0.5,0]],uvs:uvs,shade:0.65},
    {n:[1,0,0], q:[[1,0,1],[1,0,0],[1,0.5,0],[1,0.5,1]],uvs:uvs,shade:0.80},
    {n:[-1,0,0],q:[[0,0,0],[0,0,1],[0,0.5,1],[0,0.5,0]],uvs:uvs,shade:0.80},
    {n:[0,1,0], q:[[0,0.5,1],[1,0.5,1],[1,0.5,0],[0,0.5,0]],uvs:topUVs,shade:1.0},
    {n:[0,-1,0],q:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],uvs:topUVs,shade:0.5},
  ];
  for(const f of faces){const base=b.pos.length/3;for(let i=0;i<4;i++){b.pos.push(x+f.q[i][0],y+f.q[i][1],z+f.q[i][2]);b.nrm.push(f.n[0],f.n[1],f.n[2]);b.uv.push(f.uvs[i][0],f.uvs[i][1]);b.col.push(shade*f.shade,shade*f.shade,shade*f.shade,1);}b.idx.push(base,base+1,base+2,base,base+2,base+3);}
}
// Fence: two horizontal rails at y=0.375 and y=0.75, plus a central post.
// Connects to adjacent fences/walls/solid blocks on N/S/E/W sides.
function pushFence(b,x,y,z,def,shade){
  const tile=def.all!==undefined?def.all:T.PLANKS;
  const POST_HW=0.08; // half-width of center post
  // Center post: full height
  pushBox(b,x,y,z,0.5-POST_HW,0,0.5-POST_HW,0.5+POST_HW,1,0.5+POST_HW,tile,shade*0.85);
  // Rails connecting to neighbours
  const N=getBlock(x,y,z-1),S=getBlock(x,y,z+1),E=getBlock(x+1,y,z),W=getBlock(x-1,y,z);
  function connects(id){if(id===B.AIR)return false;const d=BLOCKS[id];return d&&(d.fence||d.fenceGate||d.wall||(!d.transparent&&!d.crossPlant&&!d.cross&&!d.bamboo&&!d.torch&&!d.flat));}
  const RH=0.15; // rail half-height
  const RW=0.08; // rail half-width
  const RY1=0.375-RH, RY2=0.375+RH;
  const UY1=0.75-RH, UY2=0.75+RH;
  if(connects(N)){// north rail (toward z-)
    pushBox(b,x,y,z,0.5-RW,RY1,0,0.5+RW,RY2,0.5-POST_HW,tile,shade*0.80);
    pushBox(b,x,y,z,0.5-RW,UY1,0,0.5+RW,UY2,0.5-POST_HW,tile,shade*0.80);}
  if(connects(S)){// south rail (toward z+)
    pushBox(b,x,y,z,0.5-RW,RY1,0.5+POST_HW,0.5+RW,RY2,1,tile,shade*0.80);
    pushBox(b,x,y,z,0.5-RW,UY1,0.5+POST_HW,0.5+RW,UY2,1,tile,shade*0.80);}
  if(connects(E)){// east rail (toward x+)
    pushBox(b,x,y,z,0.5+POST_HW,RY1,0.5-RW,1,RY2,0.5+RW,tile,shade*0.65);
    pushBox(b,x,y,z,0.5+POST_HW,UY1,0.5-RW,1,UY2,0.5+RW,tile,shade*0.65);}
  if(connects(W)){// west rail (toward x-)
    pushBox(b,x,y,z,0,RY1,0.5-RW,0.5-POST_HW,RY2,0.5+RW,tile,shade*0.65);
    pushBox(b,x,y,z,0,UY1,0.5-RW,0.5-POST_HW,UY2,0.5+RW,tile,shade*0.65);}
}
// Fence gate: when open, a pair of panels swing 90° to the side.
function pushFenceGate(b,x,y,z,def,shade){
  const tile=def.all!==undefined?def.all:T.PLANKS;
  const open=def.fenceGateOpen||false;
  const RH=0.15,UH=0.15;
  const PH=0.08; // panel half-width
  if(!open){// closed: two horizontal bars spanning the full width
    pushBox(b,x,y,z,0,0.375-RH,0.5-PH,1,0.375+RH,0.5+PH,tile,shade*0.80);
    pushBox(b,x,y,z,0,0.75-UH, 0.5-PH,1,0.75+UH, 0.5+PH,tile,shade*0.80);
    // vertical frame pieces on each end
    pushBox(b,x,y,z,0,0.375-RH,0.5-PH,0.1,0.75+UH,0.5+PH,tile,shade*0.85);
    pushBox(b,x,y,z,0.9,0.375-RH,0.5-PH,1,0.75+UH,0.5+PH,tile,shade*0.85);
  }else{// open: panels fold to the sides (90° rotation)
    pushBox(b,x,y,z,0,0.375-RH,0,0.1,0.75+UH,0.5-PH+0.1,tile,shade*0.85);
    pushBox(b,x,y,z,0.9,0.375-RH,0,1,0.75+UH,0.5-PH+0.1,tile,shade*0.85);}
}
// Wall: a thick central column plus connecting arms toward adjacent walls/solid.
function pushWall(b,x,y,z,def,shade){
  const tile=def.all!==undefined?def.all:T.STONE_BRICK;
  const POST_HW=0.22; // half-width of center pillar (wider than fence)
  // Center pillar (slightly less than full height — classic MC wall look)
  pushBox(b,x,y,z,0.5-POST_HW,0,0.5-POST_HW,0.5+POST_HW,0.9,0.5+POST_HW,tile,shade*0.90);
  const N=getBlock(x,y,z-1),S=getBlock(x,y,z+1),E=getBlock(x+1,y,z),W=getBlock(x-1,y,z);
  function connects(id){if(id===B.AIR)return false;const d=BLOCKS[id];return d&&(d.wall||d.fence||(!d.transparent&&!d.crossPlant&&!d.cross&&!d.bamboo&&!d.torch&&!d.flat));}
  const ARM_W=0.28; // width of connecting arm
  if(connects(N))pushBox(b,x,y,z,0.5-ARM_W/2,0,0,0.5+ARM_W/2,0.875,0.5-POST_HW,tile,shade*0.75);
  if(connects(S))pushBox(b,x,y,z,0.5-ARM_W/2,0,0.5+POST_HW,0.5+ARM_W/2,0.875,1,tile,shade*0.75);
  if(connects(E))pushBox(b,x,y,z,0.5+POST_HW,0,0.5-ARM_W/2,1,0.875,0.5+ARM_W/2,tile,shade*0.65);
  if(connects(W))pushBox(b,x,y,z,0,0,0.5-ARM_W/2,0.5-POST_HW,0.875,0.5+ARM_W/2,tile,shade*0.65);
}
function pushStairs(b,x,y,z,tile,facing,shade){
  // Bottom slab: the full footprint, half height.
  pushBox(b,x,y,z,0,0,0,1,0.5,1,tile,shade);
  // Upper step: half the footprint at the high edge (opposite the facing/open side).
  let sx0=0,sz0=0,sx1=1,sz1=1;
  switch(facing){
    case 0: sz0=0.5; break;       // facing N (open to z-): high step on z+ side
    case 2: sz1=0.5; break;       // facing S (open to z+): high step on z- side
    case 1: sx0=0.5; break;       // facing E (open to x+): high step on x- side
    default:sx1=0.5; break;       // facing W (open to x-): high step on x+ side
  }
  pushBox(b,x,y,z,sx0,0.5,sz0,sx1,1,sz1,tile,shade*0.97);
}
// Sign (看板): thin flat board standing upright, facing based on signFacing (0=N,1=E,2=S,3=W)
function pushSign(b,x,y,z,def,shade){
  const tile=T.SIGN_BOARD;
  const TH=0.08; // board thickness
  const f=def.signFacing||0;
  // Board fills most of the cell width, centered at y=0.5..0.92
  let ax,az,bx,bz;
  switch(f){
    case 1: ax=1-TH;az=0.1;bx=1;bz=0.9; break; // east wall
    case 2: ax=0.1;az=1-TH;bx=0.9;bz=1; break; // south wall
    case 3: ax=0;az=0.1;bx=TH;bz=0.9; break;   // west wall
    default:ax=0.1;az=0;bx=0.9;bz=TH; break;   // north wall (0)
  }
  pushBox(b,x,y,z,ax,0.42,az,bx,0.92,bz,tile,shade);}
// Item Frame (額縁): flat thin frame on a wall
function pushItemFrame(b,x,y,z,def,shade){
  const tile=T.ITEM_FRAME;
  const TH=0.06;
  const f=def.frameFacing||0;
  let ax,az,bx,bz;
  switch(f){
    case 1: ax=1-TH;az=0.1;bx=1;bz=0.9; break;
    case 2: ax=0.1;az=1-TH;bx=0.9;bz=1; break;
    case 3: ax=0;az=0.1;bx=TH;bz=0.9; break;
    default:ax=0.1;az=0;bx=0.9;bz=TH; break;
  }
  pushBox(b,x,y,z,ax,0.15,az,bx,0.85,bz,tile,shade);}
// Flower Pot (花瓶・植木鉢): small terracotta pot in the center of the cell
function pushFlowerPot(b,x,y,z,def,shade){
  const tile=T.FLOWER_POT;
  // Pot body: 0.375..0.625 wide, 0..0.375 tall, centered
  pushBox(b,x,y,z,0.3125,0,0.3125,0.6875,0.375,0.6875,tile,shade);
  // Rim slightly wider at top
  pushBox(b,x,y,z,0.25,0.3125,0.25,0.75,0.4375,0.75,tile,shade*0.95);
  // Plant inside if present
  if(def.potPlant&&def.potPlant!==0){
    const plantDef=BLOCKS[def.potPlant];
    const plantTile=(def._potPlantTile!==undefined?def._potPlantTile:(plantDef?plantDef.all:T.FLOWER_DANDELION));
    pushCross(b,x,y,z,plantTile,shade*0.98,0.2,0.85);}}
// Iron Bars / Glass Pane: thin vertical slabs connecting to adjacent same-type blocks
function pushThinPanel(b,x,y,z,def,shade){
  const tile=def.all;
  const TH=0.1; // panel half-thickness
  const isGlass=def.glassPane;
  // Check neighbors for connections
  const N=getBlock(x,y,z-1),S=getBlock(x,y,z+1),E=getBlock(x+1,y,z),W=getBlock(x-1,y,z);
  function panelConnects(id){if(id===B.AIR)return false;const d=BLOCKS[id];if(!d)return false;return d.ironBars||d.glassPane||(!d.transparent&&!d.crossPlant&&!d.cross&&!d.bamboo&&!d.flat&&!d.torch&&!d.torchWall&&!d.sign&&!d.itemFrame&&!d.flowerPot);}
  const cn=panelConnects(N),cs=panelConnects(S),ce=panelConnects(E),cw=panelConnects(W);
  const hasAny=cn||cs||ce||cw;
  // Center post always present
  pushBox(b,x,y,z,0.5-TH,0,0.5-TH,0.5+TH,1,0.5+TH,tile,shade);
  if(cn||(!hasAny)) pushBox(b,x,y,z,0.5-TH,0,0,0.5+TH,1,0.5-TH,tile,shade*0.85);
  if(cs||(!hasAny)) pushBox(b,x,y,z,0.5-TH,0,0.5+TH,0.5+TH,1,1,tile,shade*0.85);
  if(ce||(!hasAny)) pushBox(b,x,y,z,0.5+TH,0,0.5-TH,1,1,0.5+TH,tile,shade*0.75);
  if(cw||(!hasAny)) pushBox(b,x,y,z,0,0,0.5-TH,0.5-TH,1,0.5+TH,tile,shade*0.75);}
// Wall torch: tilted torch on a wall (facing stored in torchFacing: N/S/E/W)
function pushWallTorch(b,x,y,z,def,shade){
  const tile=T.TORCH;
  const f=def.torchFacing||'N';
  const hw=0.08,top=0.65;
  // Offset the torch from the wall it's on, tilting it slightly
  let ox2=0.5,oz2=0.5;
  const tilt=0.18;
  switch(f){
    case 'N': oz2=0.5-tilt; break; // torch on north wall, stick out toward south a bit
    case 'S': oz2=0.5+tilt; break;
    case 'E': ox2=0.5+tilt; break;
    case 'W': ox2=0.5-tilt; break;
  }
  // Base of torch lower on wall side
  const yBase=0.22;
  const {u1,u2,v1,v2}=tileUV(tile);
  const t2=top;
  // Emit a small column from (ox2-hw, yBase, oz2-hw) to (ox2+hw, yBase+t2, oz2+hw)
  const faces=[
    {n:[0,0,1], q:[[ox2-hw,yBase,oz2+hw],[ox2+hw,yBase,oz2+hw],[ox2+hw,yBase+t2,oz2+hw],[ox2-hw,yBase+t2,oz2+hw]]},
    {n:[0,0,-1],q:[[ox2+hw,yBase,oz2-hw],[ox2-hw,yBase,oz2-hw],[ox2-hw,yBase+t2,oz2-hw],[ox2+hw,yBase+t2,oz2-hw]]},
    {n:[1,0,0], q:[[ox2+hw,yBase,oz2+hw],[ox2+hw,yBase,oz2-hw],[ox2+hw,yBase+t2,oz2-hw],[ox2+hw,yBase+t2,oz2+hw]]},
    {n:[-1,0,0],q:[[ox2-hw,yBase,oz2-hw],[ox2-hw,yBase,oz2+hw],[ox2-hw,yBase+t2,oz2+hw],[ox2-hw,yBase+t2,oz2-hw]]},
    {n:[0,1,0], q:[[ox2-hw,yBase+t2,oz2+hw],[ox2+hw,yBase+t2,oz2+hw],[ox2+hw,yBase+t2,oz2-hw],[ox2-hw,yBase+t2,oz2-hw]]},
  ];
  const uvs=[[u1,v1],[u2,v1],[u2,v2],[u1,v2]];
  for(const fc of faces){const base=b.pos.length/3;for(let i=0;i<4;i++){b.pos.push(x+fc.q[i][0],y+fc.q[i][1],z+fc.q[i][2]);b.nrm.push(fc.n[0],fc.n[1],fc.n[2]);b.uv.push(uvs[i][0],uvs[i][1]);b.col.push(shade,shade,shade,1);}b.idx.push(base,base+1,base+2,base,base+2,base+3);}}
// Ceiling torch: upside-down torch hanging from above
function pushCeilingTorch(b,x,y,z,shade){
  const tile=T.TORCH;
  // Hang from y=1 downward, flame at the bottom
  pushColumn(b,x,y,z,tile,shade,0.08,0.65);}

// Cave darkness: min brightness for underground areas
// Slightly raised from 0.10 → 0.18 so caves feel navigable without torches
// while still remaining noticeably darker than the surface.
const CAVE_MIN=0.18;
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
// Wall torch (6-direction)
if(def&&def.torchWall){pushWallTorch(buf,x,y,z,def,1.0);continue;}
if(def&&def.torchCeiling){pushCeilingTorch(buf,x,y,z,1.0);continue;}
// Sign (看板)
if(def&&def.sign){pushSign(buf,x,y,z,def,0.90*cellMul);continue;}
// Item Frame (額縁)
if(def&&def.itemFrame){pushItemFrame(buf,x,y,z,def,0.90*cellMul);continue;}
// Flower Pot (花瓶・植木鉢)
if(def&&def.flowerPot){pushFlowerPot(buf,x,y,z,def,0.92*cellMul);continue;}
// Iron Bars / Glass Pane (thin panel)
if(def&&(def.ironBars||def.glassPane)){pushThinPanel(buf,x,y,z,def,0.90*cellMul);continue;}
if(def&&def.cross){const sh=(def.emissive?1:0.94*cellMul);pushCross(buf,x,y,z,def.all,sh,0.04,1);continue;}
// Wooden door: thin slab using the top/bottom texture chosen by doorHalf,
// placed/rotated per doorFacing & doorOpen (geometry handled by pushDoor).
if(def&&def.door){const tile=(def.doorHalf==='top')?T.DOOR_TOP:T.DOOR_BOTTOM;pushDoor(buf,x,y,z,tile,def.doorFacing,def.doorOpen,0.9*cellMul);continue;}
// Wooden stairs: two-box stepped shape oriented by stairFacing.
if(def&&def.stairs){pushStairs(buf,x,y,z,def.all,def.stairFacing,0.95*cellMul);continue;}
if(def&&def.flat){
// Redstone-aware flat rendering: choose tile based on powered state
let flatTile=def.all;
if(def.redstoneDust&&typeof REDSTONE!=='undefined')flatTile=REDSTONE.dustTile(x,y,z);
else if(def.lever&&typeof REDSTONE!=='undefined')flatTile=REDSTONE.leverTile(x,y,z);
else if(def.repeater&&typeof REDSTONE!=='undefined')flatTile=REDSTONE.repeaterTile(x,y,z);
pushFlat(buf,x,y,z,flatTile,0.95*cellMul);continue;}
// Redstone torch: thin column (emissive when on)
if(def&&def.redstoneTorch){const sh=(def.powered?1:0.85*cellMul);pushColumn(buf,x,y,z,def.all,sh,0.12,0.62);continue;}
// Piston head: thin column extension
if(def&&def.pistonHead){pushColumn(buf,x,y,z,def.all,0.95*cellMul,0.35,0.25);continue;}
// Slab: lower half-height block
if(def&&def.slab){pushSlab(buf,x,y,z,def,0.95*cellMul);continue;}
// Fence: post + connecting rails
if(def&&def.fence){pushFence(buf,x,y,z,def,0.95*cellMul);continue;}
// Fence gate
if(def&&def.fenceGate){pushFenceGate(buf,x,y,z,def,0.95*cellMul);continue;}
// Wall: thick pillar with connecting arms
if(def&&def.wall){pushWall(buf,x,y,z,def,0.95*cellMul);continue;}
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
// View distance in chunks. On mobile (iPad/phone) we start at a lower default
// so the frame budget is preserved for 30 FPS from the first frame.
// The PERF governor and Settings panel can adjust this at runtime.
const _mobileDefault=(typeof isMobile!=='undefined'&&isMobile);
let VIEW_DIST_CHUNKS=_mobileDefault?7:14;
const INITIAL_LOAD_CHUNKS=_mobileDefault?5:7;
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
if(typeof LIGHTING!=='undefined')LIGHTING.notifyBlockChanged(x,y,z);
if(typeof REDSTONE!=='undefined')REDSTONE.onBlockChanged(x,y,z,id);}
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
function applyPose(){const p=POSES[player.pose];PLAYER.height=p.height;PLAYER.eye=p.eye;}let spawnPoint=null;
// Find a safe ground-level spawn near the world centre.
// The heightMap stores the true terrain surface (NOT trees / structures), so we
// use it directly to avoid the old bug where the player would spawn high in the
// air on top of a tree's leaf canopy. We search outward for a dry land column
// (above sea level, not water/lava on top) and place the player just above the
// real ground; if a tree trunk or building happens to occupy that exact column
// we step up to the first open 2-block gap so the player never spawns inside a
// solid block.
function findSpawn(){
  const cx=Math.floor(WORLD_W/2),cz=Math.floor(WORLD_D/2);
  for(let r=0;r<48;r++){
    for(let dx=-r;dx<=r;dx++){
      for(let dz=-r;dz<=r;dz++){
        // only scan the ring at radius r (cheap perimeter walk)
        if(r>0&&Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;
        const x=cx+dx,z=cz+dz;
        if(x<2||x>=WORLD_W-2||z<2||z>=WORLD_D-2)continue;
        const gy=heightMap[colIndex(x,z)];
        if(gy<=SEA_LEVEL)continue;                 // skip ocean / coastline
        const ground=getBlock(x,gy,z);
        if(ground===B.WATER||ground===B.LAVA)continue;
        if(!isSolid(ground))continue;              // must stand on real ground
        // Find the first open 2-tall gap at or above the ground surface, so a
        // tree trunk / house wall in this column doesn't trap the spawn.
        for(let y=gy+1;y<gy+12&&y<WORLD_H-2;y++){
          if(!isSolid(getBlock(x,y,z))&&!isSolid(getBlock(x,y+1,z))&&isSolid(getBlock(x,y-1,z))){
            return new BABYLON.Vector3(x+0.5,y+0.01,z+0.5);
          }
        }
      }
    }
  }
  // Fallback: drop onto the centre column's surface height.
  const gy=heightMap[colIndex(cx,cz)];
  return new BABYLON.Vector3(cx+0.5,Math.max(SEA_LEVEL+1,gy)+1.01,cz+0.5);
}
// ---------------------------------------------------------------------------
//  Persistent player position / orientation (per-world).
//  Saved alongside terrain edits so reloading a world drops the player exactly
//  where they left off instead of teleporting back to the village spawn.
// ---------------------------------------------------------------------------
function savePlayerState(){
  if(typeof WORLDS==='undefined'||!WORLDS.hasActive()||typeof player==='undefined'||!player)return;
  // Don't persist a dead/invalid state; respawn() restores a sane pose first.
  if(player.dead)return;
  try{
    WORLDS.setItem('player',JSON.stringify({
      x:player.pos.x, y:player.pos.y, z:player.pos.z,
      yaw:player.yaw, pitch:player.pitch,
      hp:player.hp, hunger:player.hunger,
    }));
  }catch(e){}
}
// Restore the saved position. Returns true if a valid saved state was applied,
// false if there was none (caller should then fall back to findSpawn()).
function loadPlayerState(){
  if(typeof WORLDS==='undefined'||!WORLDS.hasActive())return false;
  let d=null;
  try{ d=JSON.parse(WORLDS.getItem('player')||'null'); }catch(e){ d=null; }
  if(!d||typeof d.x!=='number'||typeof d.y!=='number'||typeof d.z!=='number')return false;
  // Clamp into the world bounds in case dimensions changed.
  if(d.x<1||d.x>=WORLD_W-1||d.z<1||d.z>=WORLD_D-1||d.y<-4||d.y>=WORLD_H)return false;
  player.pos.set(d.x,d.y,d.z);
  if(typeof d.yaw==='number')player.yaw=d.yaw;
  if(typeof d.pitch==='number')player.pitch=Math.max(-1.55,Math.min(1.55,d.pitch));
  if(typeof d.hp==='number')player.hp=Math.max(1,Math.min(20,d.hp));
  if(typeof d.hunger==='number')player.hunger=Math.max(0,Math.min(20,d.hunger));
  return true;
}
function playerAABB(pos){return{minX:pos.x-PLAYER.halfW,maxX:pos.x+PLAYER.halfW,minY:pos.y,maxY:pos.y+PLAYER.height,minZ:pos.z-PLAYER.halfW,maxZ:pos.z+PLAYER.halfW,};}
function footSupported(){const y=Math.floor(player.pos.y-0.05);const xs=[player.pos.x-PLAYER.halfW+0.02,player.pos.x+PLAYER.halfW-0.02];const zs=[player.pos.z-PLAYER.halfW+0.02,player.pos.z+PLAYER.halfW-0.02];for(const x of xs)for(const z of zs){if(isSolid(getBlock(Math.floor(x),y,Math.floor(z))))return true;}return false;}
function forEachOverlapBlock(box,cb){const x0=Math.floor(box.minX),x1=Math.floor(box.maxX);const y0=Math.floor(box.minY),y1=Math.floor(box.maxY);const z0=Math.floor(box.minZ),z1=Math.floor(box.maxZ);for(let x=x0;x<=x1;x++)
for(let y=y0;y<=y1;y++)
for(let z=z0;z<=z1;z++)
if(isSolid(getBlock(x,y,z))){if(cb(x,y,z))return;}}
