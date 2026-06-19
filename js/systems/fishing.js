"use strict";
// Fishing system — works hand in hand with the 🎣 fishing-rod item and the
// water blocks already present in the world. Holding the rod and using the
// "place/eat" action (right-click / 🧱) casts a bobber onto a nearby water
// surface. After a short random wait a fish "bites" (the bobber dips + a sound
// plays); reeling in during the bite window lands a catch, otherwise the line
// is simply pulled back empty.
//
// Design goals (kept consistent with the rest of the codebase):
//   * Self-contained: one global `FISHING` controller + a couple of helpers.
//   * No new globals leak into gameplay loops beyond updateFishing(dt).
//   * Reuses existing systems: inventory, SFX.splash, ACH stats, ITEMS.
//   * Degrades gracefully if optional systems are missing (typeof guards).

// Possible catches and their relative weights. Cooked/raw fish are the staple;
// pufferfish and the occasional "junk" (stick/leather) add variety.
const FISH_LOOT=[
  {id:typeof ITEM_FISH!=='undefined'?ITEM_FISH:242,        w:58},
  {id:typeof ITEM_PUFFERFISH!=='undefined'?ITEM_PUFFERFISH:244, w:14},
  {id:typeof ITEM_STICK!=='undefined'?ITEM_STICK:208,      w:10},   // snagged a twig
  {id:typeof ITEM_LEATHER!=='undefined'?ITEM_LEATHER:234,  w:6},    // old boot ~ leather
  {id:typeof ITEM_SEEDS!=='undefined'?ITEM_SEEDS:200,      w:12},   // floating seeds
];

function _pickFishLoot(){
  let total=0;for(const l of FISH_LOOT)total+=l.w;
  let r=Math.random()*total;
  for(const l of FISH_LOOT){r-=l.w;if(r<=0)return l.id;}
  return FISH_LOOT[0].id;
}

// --- Bobber mesh -----------------------------------------------------------
let _bobberMat=null,_lineMat=null;
function _ensureFishMats(){
  if(!_bobberMat){
    _bobberMat=new BABYLON.StandardMaterial('bobberMat',scene);
    _bobberMat.diffuseColor=BABYLON.Color3.FromHexString('#d23b3b');
    _bobberMat.emissiveColor=BABYLON.Color3.FromHexString('#d23b3b').scale(0.4);
    _bobberMat.specularColor=new BABYLON.Color3(0.1,0.1,0.1);
  }
  if(!_lineMat){
    _lineMat=new BABYLON.StandardMaterial('lineMat',scene);
    _lineMat.diffuseColor=new BABYLON.Color3(0.95,0.95,0.95);
    _lineMat.emissiveColor=new BABYLON.Color3(0.7,0.7,0.7);
    _lineMat.disableLighting=true;
  }
}

const FISHING={
  active:false,        // a bobber is currently cast
  bobber:null,         // the floating bobber mesh (white+red float)
  line:null,           // line mesh from rod tip to bobber
  state:'idle',        // 'idle' | 'waiting' | 'bite'
  timer:0,             // counts down to next state change
  biteWindow:0,        // remaining seconds the fish is hooked
  surfaceY:0,
  bx:0,bz:0,
  bobPhase:0,
};

// Find the water surface Y in a column (top water block + ~0.1). Returns null
// if there is no water there.
function _fishWaterSurfaceY(x,z){
  const bx=Math.floor(x),bz=Math.floor(z);
  const top=Math.min(WORLD_H-1,(typeof SEA_LEVEL!=='undefined'?SEA_LEVEL:40)+8);
  for(let y=top;y>1;y--){
    if(getBlock(bx,y,bz)===B.WATER&&getBlock(bx,y+1,bz)!==B.WATER)return y+0.55;
  }
  return null;
}

// Locate a water surface point roughly where the player is aiming, within
// `reach` blocks. Casts a short ray from the camera and probes a few columns
// around the aim point so casting "near" a pond still works.
function _findCastSpot(reach){
  if(typeof camera==='undefined')return null;
  const origin=camera.position;const dir=camera.getDirection(BABYLON.Vector3.Forward());
  // Step along the look ray; the first column that has water near the surface wins.
  for(let d=1.2;d<=reach;d+=0.4){
    const x=origin.x+dir.x*d, z=origin.z+dir.z*d;
    const surf=_fishWaterSurfaceY(x,z);
    if(surf!==null)return {x:Math.floor(x)+0.5,z:Math.floor(z)+0.5,y:surf};
  }
  // Fallback: scan a small ring in front of the player for any water.
  const fx=player.pos.x+dir.x*2.5, fz=player.pos.z+dir.z*2.5;
  for(let ox=-2;ox<=2;ox++)for(let oz=-2;oz<=2;oz++){
    const surf=_fishWaterSurfaceY(fx+ox,fz+oz);
    if(surf!==null)return {x:Math.floor(fx+ox)+0.5,z:Math.floor(fz+oz)+0.5,y:surf};
  }
  return null;
}

function _buildBobber(){
  _ensureFishMats();
  const root=new BABYLON.TransformNode('fishBobberRoot',scene);
  const top=BABYLON.MeshBuilder.CreateBox('bobberTop',{width:0.18,height:0.16,depth:0.18},scene);
  top.material=_bobberMat;top.isPickable=false;top.parent=root;top.position.y=0.08;
  const bot=BABYLON.MeshBuilder.CreateBox('bobberBot',{width:0.16,height:0.14,depth:0.16},scene);
  const wm=new BABYLON.StandardMaterial('bobberWhite',scene);wm.diffuseColor=new BABYLON.Color3(0.95,0.95,0.95);wm.emissiveColor=new BABYLON.Color3(0.45,0.45,0.45);
  bot.material=wm;bot.isPickable=false;bot.parent=root;bot.position.y=-0.06;
  return root;
}

// Thin line stretched between the rod tip (near the camera) and the bobber.
function _buildLine(){
  _ensureFishMats();
  const line=BABYLON.MeshBuilder.CreateCylinder('fishLine',{height:1,diameter:0.02,tessellation:4},scene);
  line.material=_lineMat;line.isPickable=false;
  return line;
}

function _updateLine(){
  if(!FISHING.line||!FISHING.bobber)return;
  // Rod tip: a little below + in front of the camera.
  const cam=camera.position;const dir=camera.getDirection(BABYLON.Vector3.Forward());
  const right=camera.getDirection(BABYLON.Vector3.Right());
  const tip=new BABYLON.Vector3(
    cam.x+dir.x*0.5+right.x*0.3,
    cam.y-0.35+dir.y*0.5,
    cam.z+dir.z*0.5+right.z*0.3);
  const b=FISHING.bobber.position;
  const mid=BABYLON.Vector3.Center(tip,b);
  const len=BABYLON.Vector3.Distance(tip,b)||0.001;
  FISHING.line.position.copyFrom(mid);
  FISHING.line.scaling.y=len;
  // Orient cylinder (default +Y) along tip→bobber.
  const v=b.subtract(tip).normalize();
  const up=BABYLON.Vector3.Up();
  const axis=BABYLON.Vector3.Cross(up,v);
  const dot=BABYLON.Vector3.Dot(up,v);
  if(axis.lengthSquared()<1e-6){FISHING.line.rotationQuaternion=BABYLON.Quaternion.Identity();}
  else{const ang=Math.acos(Math.max(-1,Math.min(1,dot)));FISHING.line.rotationQuaternion=BABYLON.Quaternion.RotationAxis(axis.normalize(),ang);}
}

// Public: cast or reel-in with the fishing rod. Called from placeOrEat() when
// the held item is a fishing rod. Returns true (always handled).
function useFishingRod(){
  if(FISHING.active){reelIn();return true;}
  const reach=isMobile?5.5:6.5;
  const spot=_findCastSpot(reach);
  if(!spot){_fishHint('🎣 Aim at water to cast');return true;}
  // Cast!
  FISHING.bobber=_buildBobber();
  FISHING.line=_buildLine();
  FISHING.bx=spot.x;FISHING.bz=spot.z;FISHING.surfaceY=spot.y;
  FISHING.bobber.position.set(spot.x,spot.y,spot.z);
  FISHING.active=true;FISHING.state='waiting';
  FISHING.timer=2.5+Math.random()*5.5;   // seconds until a bite
  FISHING.biteWindow=0;FISHING.bobPhase=Math.random()*Math.PI*2;
  if(typeof SFX!=='undefined'&&SFX.splash)SFX.splash();
  _fishHint(isMobile?'🎣 Cast! Tap 🧱 again to reel in':'🎣 Cast! Right-click / F to reel in');
  return true;
}

function _disposeBobber(){
  if(FISHING.bobber){FISHING.bobber.dispose();FISHING.bobber=null;}
  if(FISHING.line){FISHING.line.dispose();FISHING.line=null;}
}

// Reel in the line. If a fish is currently biting, land a catch; otherwise the
// line comes back empty.
function reelIn(){
  if(!FISHING.active)return;
  const biting=FISHING.state==='bite';
  _disposeBobber();
  FISHING.active=false;FISHING.state='idle';
  if(typeof SFX!=='undefined'&&SFX.splash)SFX.splash();
  if(biting){
    const id=_pickFishLoot();
    if(typeof addToInventory==='function')addToInventory(id,1);
    const nm=(typeof ITEMS!=='undefined'&&ITEMS[id])?ITEMS[id].name:'something';
    const em=(typeof ITEMS!=='undefined'&&ITEMS[id])?ITEMS[id].emoji:'🐟';
    _fishHint(em+' Caught '+nm+'!');
    if(typeof ACH!=='undefined'&&ACH.track)ACH.track('fish');
  }else{
    _fishHint('🎣 Reeled in — nothing this time');
  }
  // Consume a little rod durability (rod is treated like a normal item but we
  // gate breakage softly so it lasts a long while).
  _wearRod();
}

// Cancel any active cast without a catch (used on death / unequip).
function cancelFishing(){if(!FISHING.active)return;_disposeBobber();FISHING.active=false;FISHING.state='idle';_fishHint(false);}

// Fishing rods don't have a durability bar (they're not "tools"); we instead
// give them a soft chance to break after many uses so they aren't infinite.
function _wearRod(){
  const slot=(typeof inventory!=='undefined')?inventory[selectedSlot]:null;
  if(!slot||!(typeof ITEMS!=='undefined'&&ITEMS[slot.id]&&ITEMS[slot.id].fishingRod))return;
  slot._rodUses=(slot._rodUses||0)+1;
  // ~1.5% chance per use to snap, but never before 15 uses.
  if(slot._rodUses>15&&Math.random()<0.015){
    if(typeof consumeFromSlot==='function')consumeFromSlot(selectedSlot,1);
    const el=document.getElementById('tool-break-msg');
    if(el){el.textContent='🎣 Your fishing rod snapped!';el.style.opacity='1';clearTimeout(el._t);el._t=setTimeout(()=>{el.style.opacity='0';},1500);}
  }
}

// --- Per-frame update ------------------------------------------------------
function updateFishing(dt){
  if(!FISHING.active)return;
  // If the player dies, swaps off the rod, or opens UI mid-cast, cancel.
  if((typeof player!=='undefined'&&player.dead)||(typeof inventoryOpen!=='undefined'&&inventoryOpen)){cancelFishing();return;}
  const slot=(typeof inventory!=='undefined')?inventory[selectedSlot]:null;
  const holdingRod=slot&&typeof ITEMS!=='undefined'&&ITEMS[slot.id]&&ITEMS[slot.id].fishingRod;
  if(!holdingRod){cancelFishing();return;}

  // Make sure there is still water under the bobber (block could be mined away).
  const surf=_fishWaterSurfaceY(FISHING.bx,FISHING.bz);
  if(surf===null){cancelFishing();return;}
  FISHING.surfaceY=surf;

  FISHING.bobPhase+=dt*(FISHING.state==='bite'?9:2.2);
  FISHING.timer-=dt;

  if(FISHING.state==='waiting'){
    if(FISHING.timer<=0){
      // A fish bites! Open a short reaction window.
      FISHING.state='bite';FISHING.biteWindow=1.6+Math.random()*0.8;
      if(typeof SFX!=='undefined'&&SFX.splash)SFX.splash();
      _fishHint('❗ A fish bites — reel in NOW!');
    }
  }else if(FISHING.state==='bite'){
    FISHING.biteWindow-=dt;
    if(FISHING.biteWindow<=0){
      // Missed the window: fish gets away, go back to waiting.
      FISHING.state='waiting';FISHING.timer=2.5+Math.random()*5.5;
      _fishHint('🎣 The fish got away… waiting again');
    }
  }

  // Animate the bobber: gentle bob while waiting, a sharp dip on bite.
  if(FISHING.bobber){
    let y=FISHING.surfaceY;
    if(FISHING.state==='bite'){y-=0.22+0.1*Math.abs(Math.sin(FISHING.bobPhase));}
    else{y+=Math.sin(FISHING.bobPhase)*0.05;}
    FISHING.bobber.position.set(FISHING.bx,y,FISHING.bz);
    FISHING.bobber.rotation.y=FISHING.bobPhase*0.3;
  }
  _updateLine();
}

// Lightweight on-screen hint that reuses the boat-hint styling pattern.
function _fishHint(textOrFalse){
  let el=document.getElementById('fish-hint');
  if(!el){el=document.createElement('div');el.id='fish-hint';el.style.cssText='position:fixed;left:50%;bottom:150px;transform:translateX(-50%);background:rgba(0,0,0,.55);color:#fff;padding:6px 14px;border-radius:8px;font:13px sans-serif;pointer-events:none;z-index:50;transition:opacity .3s;text-align:center';document.body.appendChild(el);}
  if(textOrFalse===false){el.style.opacity='0';return;}
  el.textContent=textOrFalse;el.style.opacity='1';
  clearTimeout(el._t);el._t=setTimeout(()=>{el.style.opacity='0';},2200);
}
