"use strict";
// Boats: a rideable vehicle that floats on water / lakes / oceans.
// A boat is a lightweight entity (mesh + simple physics) that the player can
// board to glide across water much faster than swimming, and steer with the
// usual movement keys / joystick.

const boats=[];
let ridingBoat=null;            // the boat the player is currently in (or null)

// --- Boat mesh -------------------------------------------------------------
const _boatMatCache={};
function _boatMat(hex){if(_boatMatCache[hex])return _boatMatCache[hex];const m=new BABYLON.StandardMaterial('boatMat_'+hex,scene);const c=BABYLON.Color3.FromHexString(hex);m.diffuseColor=c;m.emissiveColor=c.scale(0.25);m.specularColor=new BABYLON.Color3(0.05,0.05,0.05);_boatMatCache[hex]=m;return m;}

function _boatPart(parent,name,size,pos,hex,rot){const b=BABYLON.MeshBuilder.CreateBox('boat_'+name,{width:size[0],height:size[1],depth:size[2]},scene);b.material=_boatMat(hex);b.isPickable=false;b.parent=parent;b.position.set(pos[0],pos[1],pos[2]);if(rot)b.rotation.set(rot[0]||0,rot[1]||0,rot[2]||0);return b;}

function buildBoatMesh(){
  const root=new BABYLON.TransformNode('boat',scene);
  const wood='#9c6b3c',dark='#7a5230';
  // Hull floor
  _boatPart(root,'floor',[1.5,0.18,2.6],[0,0.1,0],dark);
  // Side walls
  _boatPart(root,'sideL',[0.16,0.36,2.6],[-0.72,0.3,0],wood);
  _boatPart(root,'sideR',[0.16,0.36,2.6],[ 0.72,0.3,0],wood);
  // Front / back caps (slightly raised, tapered look)
  _boatPart(root,'capF',[1.5,0.4,0.18],[0,0.32,1.3],wood);
  _boatPart(root,'capB',[1.5,0.4,0.18],[0,0.32,-1.3],wood);
  // Two seats / cross-braces
  _boatPart(root,'seat1',[1.4,0.1,0.22],[0,0.34,0.5],dark);
  _boatPart(root,'seat2',[1.4,0.1,0.22],[0,0.34,-0.5],dark);
  return root;
}

// --- Boat lifecycle --------------------------------------------------------
function spawnBoat(x,y,z,yaw){
  const root=buildBoatMesh();
  const boat={root,pos:new BABYLON.Vector3(x,y,z),vel:new BABYLON.Vector3(0,0,0),yaw:yaw||0,bob:Math.random()*Math.PI*2};
  root.position.copyFrom(boat.pos);root.rotation.y=boat.yaw;
  boats.push(boat);
  return boat;
}

function removeBoat(boat){const i=boats.indexOf(boat);if(i>=0)boats.splice(i,1);boat.root.dispose();}

function isWaterAt(x,y,z){return getBlock(Math.floor(x),Math.floor(y),Math.floor(z))===B.WATER;}

// Height (in world Y) the boat root should float at so the hull rides ON TOP
// of the water rather than being submerged in it. A water block at integer Y
// fills the cube from Y to Y+1, so the real water surface is at Y+1. We seat
// the boat root just above that line; the hull floor (local y≈0.1) then floats
// neatly at the waterline.
const BOAT_FLOAT_OFFSET=0.9;
// Find the water surface float-height at (x,z), or null if there is no water.
function waterSurfaceY(x,z){
  const bx=Math.floor(x),bz=Math.floor(z);
  for(let y=Math.min(WORLD_H-1,SEA_LEVEL+6);y>1;y--){
    if(getBlock(bx,y,bz)===B.WATER&&getBlock(bx,y+1,bz)!==B.WATER)return y+BOAT_FLOAT_OFFSET;
  }
  return null;
}

// --- Placing a boat from the held item ------------------------------------
// Called from placeOrEat() when the held item is a boat. Returns true if the
// boat was placed (so the caller consumes the item & stops).
function tryPlaceBoat(){
  if(typeof currentTarget==='undefined'||!currentTarget)return false;
  // Aim at a water block (or the air just above one).
  let bx,by,bz;
  if(currentTarget.id===B.WATER){bx=currentTarget.x;by=currentTarget.y;bz=currentTarget.z;}
  else{bx=currentTarget.px;by=currentTarget.py;bz=currentTarget.pz;}
  if(bx===undefined)return false;
  // Walk down to the water surface from the targeted column.
  let surfY=waterSurfaceY(bx+0.5,bz+0.5);
  if(surfY===null){
    // Allow placing on the targeted water block directly.
    if(getBlock(bx,by,bz)===B.WATER)surfY=by+BOAT_FLOAT_OFFSET;else return false;
  }
  const boat=spawnBoat(bx+0.5,surfY,bz+0.5,player.yaw);
  enterBoat(boat);
  return true;
}

// --- Entering / exiting -----------------------------------------------------
function enterBoat(boat){
  ridingBoat=boat;
  boat.vel.set(0,0,0);
  player.flying=false;player.vel.set(0,0,0);
  // Snap player onto the boat.
  player.pos.set(boat.pos.x,boat.pos.y+0.3,boat.pos.z);
  _showBoatHint(true);
}

function exitBoat(){
  if(!ridingBoat)return;
  const boat=ridingBoat;ridingBoat=null;
  // Hop the player out to the side, onto something solid if possible.
  const offsets=[[1.2,0],[-1.2,0],[0,1.2],[0,-1.2]];
  let placed=false;
  for(const[ox,oz]of offsets){
    const tx=boat.pos.x+ox,tz=boat.pos.z+oz;
    for(let dy=2;dy>=-2;dy--){const ty=Math.floor(boat.pos.y)+dy;
      if(isSolid(getBlock(Math.floor(tx),ty,Math.floor(tz)))&&!isSolid(getBlock(Math.floor(tx),ty+1,Math.floor(tz)))&&!isSolid(getBlock(Math.floor(tx),ty+2,Math.floor(tz)))){
        player.pos.set(tx,ty+1.02,tz);placed=true;break;}}
    if(placed)break;
  }
  if(!placed)player.pos.set(boat.pos.x,boat.pos.y+0.4,boat.pos.z);
  player.vel.set(0,0,0);
  _showBoatHint(false);
}

// Click an existing boat (within reach) to board it. Returns true if boarded.
function tryEnterNearbyBoat(){
  if(ridingBoat)return false;
  if(typeof camera==='undefined')return false;
  const origin=camera.position;const dir=camera.getDirection(BABYLON.Vector3.Forward());
  let best=null,bestT=4.5;
  for(const boat of boats){
    const minX=boat.pos.x-0.85,maxX=boat.pos.x+0.85,minY=boat.pos.y-0.2,maxY=boat.pos.y+0.7,minZ=boat.pos.z-1.4,maxZ=boat.pos.z+1.4;
    const t=(typeof rayBoxHit==='function')?rayBoxHit(origin,dir,minX,minY,minZ,maxX,maxY,maxZ):null;
    if(t!==null&&t<bestT){bestT=t;best=boat;}
  }
  if(best){enterBoat(best);return true;}
  return false;
}

// Left-click (attack) an existing boat within reach to pick it back up. The
// boat is removed from the world and a Boat item is returned to the inventory
// so the player can re-place it elsewhere. Returns true if a boat was
// recovered (so the caller skips the normal attack / mining action).
function tryRecoverNearbyBoat(){
  if(ridingBoat)return false;            // can't pick up the boat you're sitting in
  if(typeof camera==='undefined')return false;
  const origin=camera.position;const dir=camera.getDirection(BABYLON.Vector3.Forward());
  let best=null,bestT=4.5;
  for(const boat of boats){
    const minX=boat.pos.x-0.85,maxX=boat.pos.x+0.85,minY=boat.pos.y-0.2,maxY=boat.pos.y+0.7,minZ=boat.pos.z-1.4,maxZ=boat.pos.z+1.4;
    const t=(typeof rayBoxHit==='function')?rayBoxHit(origin,dir,minX,minY,minZ,maxX,maxY,maxZ):null;
    if(t!==null&&t<bestT){bestT=t;best=boat;}
  }
  if(!best)return false;
  removeBoat(best);
  if(typeof addToInventory==='function'&&typeof ITEM_BOAT!=='undefined')addToInventory(ITEM_BOAT,1);
  if(typeof SFX!=='undefined'&&SFX.dig)SFX.dig(B.PLANKS);
  return true;
}

// --- Boat physics / steering -----------------------------------------------
const BOAT_GRAVITY=-18;
function updateBoats(dt){
  if(!worldReady||!started)return;
  // Idle bob for un-ridden boats.
  for(const boat of boats){
    if(boat===ridingBoat)continue;
    boat.bob+=dt*1.5;
    const surf=waterSurfaceY(boat.pos.x,boat.pos.z);
    if(surf!==null)boat.pos.y+=((surf+Math.sin(boat.bob)*0.04)-boat.pos.y)*Math.min(1,dt*4);
    else boat.pos.y+=BOAT_GRAVITY*dt*0.02;
    boat.root.position.copyFrom(boat.pos);
    boat.root.rotation.y=boat.yaw;
  }
  if(!ridingBoat)return;
  const boat=ridingBoat;

  // Steering input (shared with normal movement keys + joystick).
  let mx=0,mz=0;
  if(keys['KeyW'])mz+=1;if(keys['KeyS'])mz-=1;if(keys['KeyA'])mx-=1;if(keys['KeyD'])mx+=1;
  if(typeof joy!=='undefined'&&joy.active){mx+=joy.x;mz+=-joy.y;}
  const mlen=Math.hypot(mx,mz);if(mlen>1){mx/=mlen;mz/=mlen;}

  // Forward is the camera's yaw; thrust along it.
  const sin=Math.sin(player.yaw),cos=Math.cos(player.yaw);
  const dirX=mx*cos+mz*sin,dirZ=-mx*sin+mz*cos;
  const speed=6.2;const accel=Math.min(1,dt*3.0);
  boat.vel.x+=(dirX*speed-boat.vel.x)*accel;
  boat.vel.z+=(dirZ*speed-boat.vel.z)*accel;
  // Water drag.
  boat.vel.x*=0.985;boat.vel.z*=0.985;

  // Point the boat toward its travel direction.
  const moving=Math.hypot(boat.vel.x,boat.vel.z)>0.4;
  if(moving){const targetYaw=Math.atan2(boat.vel.x,boat.vel.z);let dy=targetYaw-boat.yaw;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;boat.yaw+=dy*Math.min(1,dt*5);}

  // Collision with solid blocks (axis-separated, simple).
  const nx=boat.pos.x+boat.vel.x*dt;
  if(!_boatBlocked(nx,boat.pos.y,boat.pos.z))boat.pos.x=nx;else boat.vel.x=0;
  const nz=boat.pos.z+boat.vel.z*dt;
  if(!_boatBlocked(boat.pos.x,boat.pos.y,nz))boat.pos.z=nz;else boat.vel.z=0;

  // Stay on the water surface; if not over water, drift / sink slowly.
  const surf=waterSurfaceY(boat.pos.x,boat.pos.z);
  boat.bob+=dt*4*(0.4+Math.min(1,Math.hypot(boat.vel.x,boat.vel.z)));
  if(surf!==null){boat.pos.y+=((surf+Math.sin(boat.bob)*0.05)-boat.pos.y)*Math.min(1,dt*6);}
  else{
    // No water beneath — boat ran aground. Settle onto ground & auto-eject.
    boat.pos.y+=BOAT_GRAVITY*dt*0.05;
    boat.vel.x*=0.7;boat.vel.z*=0.7;
  }

  boat.root.position.copyFrom(boat.pos);
  boat.root.rotation.y=boat.yaw;

  // Keep the player glued to the boat.
  player.pos.set(boat.pos.x,boat.pos.y+0.3,boat.pos.z);
  player.vel.set(0,0,0);

  if(typeof SFX!=='undefined'&&moving&&SFX.footstep){boat._splashT=(boat._splashT||0)-dt;if(boat._splashT<=0){boat._splashT=0.55;if(SFX.splash)SFX.splash();}}
}

// A boat is blocked if a solid block sits at its hull level at (x,z).
function _boatBlocked(x,y,z){
  const cy=Math.floor(y+0.25);
  return isSolid(getBlock(Math.floor(x),cy,Math.floor(z)));
}

function _showBoatHint(on){
  let el=document.getElementById('boat-hint');
  if(!el){el=document.createElement('div');el.id='boat-hint';el.style.cssText='position:fixed;left:50%;bottom:120px;transform:translateX(-50%);background:rgba(0,0,0,.55);color:#fff;padding:6px 14px;border-radius:8px;font:13px sans-serif;pointer-events:none;z-index:50;transition:opacity .3s';document.body.appendChild(el);}
  el.textContent=isMobile?'🛶 In boat — 🧱 button to disembark':'🛶 In boat — Right-click / press F to disembark';
  el.style.opacity=on?'1':'0';
}
