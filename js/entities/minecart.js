"use strict";
// Minecart system — a rideable cart that runs along the existing RAIL blocks
// (B.RAIL). Mirrors the boat entity's structure: a lightweight mesh + simple
// physics + enter/exit handling, but instead of floating on water it snaps to
// and rolls along rail tracks.
//
// Behaviour:
//   * Place a 🛒 minecart item while aiming at a RAIL block to spawn a cart on it.
//   * Right-click / press F (or 🧱 on mobile) an existing cart to board it.
//   * While riding, WASD / joystick accelerate the cart along the track; the
//     cart automatically follows the rail network (straight + turns), choosing
//     the connected neighbour that best matches its travel direction.
//   * Going off the end of a track (no rail ahead) lets the cart coast onto the
//     ground and the rider auto-disembarks.

const minecarts=[];
let ridingCart=null;            // the cart the player is currently in (or null)

// --- Minecart mesh ---------------------------------------------------------
const _cartMatCache={};
function _cartMat(hex){if(_cartMatCache[hex])return _cartMatCache[hex];const m=new BABYLON.StandardMaterial('cartMat_'+hex,scene);const c=BABYLON.Color3.FromHexString(hex);m.diffuseColor=c;m.emissiveColor=c.scale(0.22);m.specularColor=new BABYLON.Color3(0.12,0.12,0.12);_cartMatCache[hex]=m;return m;}

function _cartPart(parent,name,size,pos,hex,rot){const b=BABYLON.MeshBuilder.CreateBox('cart_'+name,{width:size[0],height:size[1],depth:size[2]},scene);b.material=_cartMat(hex);b.isPickable=false;b.parent=parent;b.position.set(pos[0],pos[1],pos[2]);if(rot)b.rotation.set(rot[0]||0,rot[1]||0,rot[2]||0);return b;}

function buildMinecartMesh(){
  const root=new BABYLON.TransformNode('minecart',scene);
  const body='#8a8a8a',dark='#5a5a5a',wheel='#2a2a2a';
  // Open-top box: floor + four low walls.
  _cartPart(root,'floor',[0.9,0.16,0.9],[0,0.28,0],dark);
  _cartPart(root,'wallF',[0.9,0.42,0.12],[0,0.5,0.42],body);
  _cartPart(root,'wallB',[0.9,0.42,0.12],[0,0.5,-0.42],body);
  _cartPart(root,'wallL',[0.12,0.42,0.9],[-0.42,0.5,0],body);
  _cartPart(root,'wallR',[0.12,0.42,0.9],[0.42,0.5,0],body);
  // Wheels (decorative cubes near the base).
  _cartPart(root,'wheelFL',[0.16,0.16,0.16],[-0.34,0.14,0.3],wheel);
  _cartPart(root,'wheelFR',[0.16,0.16,0.16],[0.34,0.14,0.3],wheel);
  _cartPart(root,'wheelBL',[0.16,0.16,0.16],[-0.34,0.14,-0.3],wheel);
  _cartPart(root,'wheelBR',[0.16,0.16,0.16],[0.34,0.14,-0.3],wheel);
  return root;
}

// --- Rail helpers ----------------------------------------------------------
function isRailAt(x,y,z){return getBlock(Math.floor(x),Math.floor(y),Math.floor(z))===B.RAIL;}

// Find a rail at column (x,z) within a small vertical range of `y` (so the cart
// can follow rails that step up/down a block). Returns the rail's Y or null.
function railYNear(x,z,y){
  const bx=Math.floor(x),bz=Math.floor(z);
  const cy=Math.floor(y);
  for(const dy of [0,1,-1]){
    if(getBlock(bx,cy+dy,bz)===B.RAIL)return cy+dy;
  }
  return null;
}

// --- Minecart lifecycle ----------------------------------------------------
function spawnMinecart(x,railY,z,yaw){
  const root=buildMinecartMesh();
  // dir is the unit travel direction on the XZ plane.
  const cart={root,pos:new BABYLON.Vector3(x,railY+0.06,z),
    dirX:Math.sin(yaw||0),dirZ:Math.cos(yaw||0),speed:0,yaw:yaw||0,railY};
  root.position.copyFrom(cart.pos);root.rotation.y=cart.yaw;
  minecarts.push(cart);
  return cart;
}

function removeMinecart(cart){const i=minecarts.indexOf(cart);if(i>=0)minecarts.splice(i,1);cart.root.dispose();}

// --- Placing a minecart from the held item ---------------------------------
// Called from placeOrEat() when the held item is a minecart. Returns true if a
// cart was placed (so the caller consumes the item & stops).
function tryPlaceMinecart(){
  if(typeof currentTarget==='undefined'||!currentTarget)return false;
  // Must be aiming at a rail block (or the rail just below the aimed face).
  let bx,by,bz;
  if(currentTarget.id===B.RAIL){bx=currentTarget.x;by=currentTarget.y;bz=currentTarget.z;}
  else{
    // Allow aiming at the block under a rail / the air above a rail.
    bx=currentTarget.px;by=currentTarget.py;bz=currentTarget.pz;
    if(bx===undefined)return false;
    if(getBlock(bx,by,bz)!==B.RAIL){
      if(getBlock(bx,by-1,bz)===B.RAIL)by=by-1; else return false;
    }
  }
  if(getBlock(bx,by,bz)!==B.RAIL)return false;
  // Initial direction: face the rail along whichever axis has a neighbouring rail.
  let yaw=player.yaw;
  if(getBlock(bx+1,by,bz)===B.RAIL||getBlock(bx-1,by,bz)===B.RAIL)yaw=Math.PI/2; // east/west
  else if(getBlock(bx,by,bz+1)===B.RAIL||getBlock(bx,by,bz-1)===B.RAIL)yaw=0;     // north/south
  const cart=spawnMinecart(bx+0.5,by,bz+0.5,yaw);
  enterMinecart(cart);
  return true;
}

// --- Entering / exiting -----------------------------------------------------
function enterMinecart(cart){
  ridingCart=cart;
  cart.speed=0;
  player.flying=false;player.vel.set(0,0,0);
  player.pos.set(cart.pos.x,cart.pos.y+0.3,cart.pos.z);
  if(typeof ACH!=='undefined'&&ACH.track)ACH.track('minecart');
  _showCartHint(true);
}

function exitMinecart(){
  if(!ridingCart)return;
  const cart=ridingCart;ridingCart=null;
  // Hop the rider out to the side, onto solid ground if possible.
  const offsets=[[1.1,0],[-1.1,0],[0,1.1],[0,-1.1]];
  let placed=false;
  for(const[ox,oz]of offsets){
    const tx=cart.pos.x+ox,tz=cart.pos.z+oz;
    for(let dy=2;dy>=-2;dy--){const ty=Math.floor(cart.pos.y)+dy;
      if(isSolid(getBlock(Math.floor(tx),ty,Math.floor(tz)))&&!isSolid(getBlock(Math.floor(tx),ty+1,Math.floor(tz)))&&!isSolid(getBlock(Math.floor(tx),ty+2,Math.floor(tz)))){
        player.pos.set(tx,ty+1.02,tz);placed=true;break;}}
    if(placed)break;
  }
  if(!placed)player.pos.set(cart.pos.x,cart.pos.y+0.6,cart.pos.z);
  player.vel.set(0,0,0);
  _showCartHint(false);
}

// Click an existing minecart (within reach) to board it. Returns true if boarded.
function tryEnterNearbyMinecart(){
  if(ridingCart)return false;
  if(typeof camera==='undefined')return false;
  const origin=camera.position;const dir=camera.getDirection(BABYLON.Vector3.Forward());
  let best=null,bestT=4.5;
  for(const cart of minecarts){
    const minX=cart.pos.x-0.55,maxX=cart.pos.x+0.55,minY=cart.pos.y-0.1,maxY=cart.pos.y+0.8,minZ=cart.pos.z-0.55,maxZ=cart.pos.z+0.55;
    const t=(typeof rayBoxHit==='function')?rayBoxHit(origin,dir,minX,minY,minZ,maxX,maxY,maxZ):null;
    if(t!==null&&t<bestT){bestT=t;best=cart;}
  }
  if(best){enterMinecart(best);return true;}
  return false;
}

// --- Minecart physics / steering -------------------------------------------
// Candidate movement directions along the 4 cardinal axes. The cart follows
// rails by, each tick, considering the rail cell ahead and picking the
// connected neighbour whose direction best matches its current heading.
const _CART_DIRS=[[1,0],[-1,0],[0,1],[0,-1]];

function updateMinecarts(dt){
  if(!worldReady||!started)return;
  if(!ridingCart)return;
  const cart=ridingCart;

  // --- Input → acceleration along the current heading. -----------------------
  let mx=0,mz=0;
  if(keys['KeyW'])mz+=1;if(keys['KeyS'])mz-=1;if(keys['KeyA'])mx-=1;if(keys['KeyD'])mx+=1;
  if(typeof joy!=='undefined'&&joy.active){mx+=joy.x;mz+=-joy.y;}
  const mlen=Math.hypot(mx,mz);if(mlen>1){mx/=mlen;mz/=mlen;}
  // Project the camera-relative input onto the cart's travel axis: pushing
  // "forward" relative to the look direction speeds up, "back" slows/reverses.
  const sin=Math.sin(player.yaw),cos=Math.cos(player.yaw);
  const inX=mx*cos+mz*sin,inZ=-mx*sin+mz*cos;
  const along=inX*cart.dirX+inZ*cart.dirZ;   // -1..1 thrust along heading
  const MAX_SPEED=7.5;
  cart.speed+=along*14*dt;
  // Rolling resistance + clamp.
  cart.speed*=0.992;
  if(cart.speed>MAX_SPEED)cart.speed=MAX_SPEED;
  if(cart.speed<-MAX_SPEED)cart.speed=-MAX_SPEED;
  if(Math.abs(cart.speed)<0.02)cart.speed=0;

  // --- Follow the rail network. ----------------------------------------------
  // Move toward the centre of the current cell, then when crossing into a new
  // cell pick the best-matching connected rail to continue along.
  const step=cart.speed*dt;
  if(step!==0){
    _advanceCartAlongRails(cart,step);
  }

  // Settle onto the rail height.
  const ry=railYNear(cart.pos.x,cart.pos.z,cart.pos.y);
  if(ry!==null){cart.railY=ry;cart.pos.y+=((ry+0.06)-cart.pos.y)*Math.min(1,dt*10);}

  cart.yaw=Math.atan2(cart.dirX,cart.dirZ);
  cart.root.position.copyFrom(cart.pos);
  cart.root.rotation.y=cart.yaw;
  // Keep the rider glued to the cart.
  player.pos.set(cart.pos.x,cart.pos.y+0.3,cart.pos.z);
  player.vel.set(0,0,0);

  // Occasional clack sound while rolling.
  if(typeof SFX!=='undefined'&&Math.abs(cart.speed)>0.6){
    cart._clackT=(cart._clackT||0)-dt;
    if(cart._clackT<=0){cart._clackT=0.4;if(SFX.footstep)SFX.footstep(B.RAIL);}
  }
}

// Move the cart `dist` (signed) along its heading, snapping to rails and
// turning to follow the track when it reaches a cell boundary. If the track
// ends, the cart coasts off and the rider auto-disembarks.
function _advanceCartAlongRails(cart,dist){
  let remaining=dist;
  let guard=0;
  const sgn=Math.sign(dist);
  while(Math.abs(remaining)>1e-4&&guard++<8){
    // Current cell centre.
    const cx=Math.floor(cart.pos.x)+0.5, cz=Math.floor(cart.pos.z)+0.5;
    // Distance to the cell boundary in the travel direction.
    const moveX=cart.dirX*remaining, moveZ=cart.dirZ*remaining;
    const nextX=cart.pos.x+moveX, nextZ=cart.pos.z+moveZ;
    const crossed=Math.floor(nextX)!==Math.floor(cart.pos.x)||Math.floor(nextZ)!==Math.floor(cart.pos.z);
    if(!crossed){cart.pos.x=nextX;cart.pos.z=nextZ;remaining=0;break;}

    // Snap to the centre of the current cell, then choose the next rail.
    cart.pos.x=cx;cart.pos.z=cz;
    const moved=Math.hypot(cx-(nextX-moveX),cz-(nextZ-moveZ));
    remaining-=sgn*moved;

    const next=_chooseNextRail(cart);
    if(!next){
      // Track ends — coast off and eject the rider.
      cart.pos.x+=cart.dirX*0.4;cart.pos.z+=cart.dirZ*0.4;
      cart.speed=0;
      _showCartHint(false);
      // Defer the exit so we don't mutate ridingCart mid-physics.
      setTimeout(()=>{if(ridingCart===cart)exitMinecart();},0);
      break;
    }
    cart.dirX=next[0];cart.dirZ=next[1];
  }
}

// Pick the connected rail direction to continue along. Prefers continuing
// straight; otherwise takes the available turn. Never reverses unless that's
// the only option.
function _chooseNextRail(cart){
  const bx=Math.floor(cart.pos.x),bz=Math.floor(cart.pos.z),by=Math.floor(cart.pos.y);
  const cur=[cart.dirX,cart.dirZ];
  const back=[-cart.dirX,-cart.dirZ];
  const options=[];
  for(const [dx,dz] of _CART_DIRS){
    // Rail in this neighbour cell (allow ±1 in Y for slopes).
    const ry=railYNear(bx+dx+0.5,bz+dz+0.5,by);
    if(ry===null)continue;
    options.push([dx,dz]);
  }
  if(options.length===0)return null;
  // Prefer straight ahead.
  for(const o of options)if(o[0]===cur[0]&&o[1]===cur[1])return o;
  // Then any turn that isn't a reverse.
  for(const o of options)if(!(o[0]===back[0]&&o[1]===back[1]))return o;
  // Dead end: reverse.
  return options[0];
}

function _showCartHint(on){
  let el=document.getElementById('cart-hint');
  if(!el){el=document.createElement('div');el.id='cart-hint';el.style.cssText='position:fixed;left:50%;bottom:120px;transform:translateX(-50%);background:rgba(0,0,0,.55);color:#fff;padding:6px 14px;border-radius:8px;font:13px sans-serif;pointer-events:none;z-index:50;transition:opacity .3s';document.body.appendChild(el);}
  el.textContent=isMobile?'🛒 In minecart — W/S to roll · 🧱 to get off':'🛒 In minecart — W/S to roll along the rails · Right-click / F to get off';
  el.style.opacity=on?'1':'0';
}
