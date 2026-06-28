// Flight is now toggled from the (password-protected) Settings panel rather
// than the F key. setFlyingEnabled() is the single entry point both the
// settings UI and any restore-on-load logic call so player state stays in sync.
function setFlyingEnabled(on){
  on=!!on;
  if(typeof player==='undefined'||!player)return;
  player.flying=on;
  player.vel.y=0;
  if(on){
    // Standing pose only while flying (mirrors the old toggle behaviour).
    player.wantCrouch=false;
    if(typeof POSE!=='undefined'){player.pose=POSE.STAND;if(typeof applyPose==='function')applyPose();if(typeof updatePoseUI==='function')updatePoseUI();}
    if(typeof ACH!=='undefined')ACH.flag('fly');
  }
}
const EPS=0.001;function moveAxis(axis,delta){if(delta===0)return false;player.pos[axis]+=delta;let hit=false;const box=playerAABB(player.pos);forEachOverlapBlock(box,(bx,by,bz)=>{hit=true;if(axis==='x')player.pos.x=delta>0?bx-PLAYER.halfW-EPS:bx+1+PLAYER.halfW+EPS;if(axis==='z')player.pos.z=delta>0?bz-PLAYER.halfW-EPS:bz+1+PLAYER.halfW+EPS;if(axis==='y')player.pos.y=delta>0?by-PLAYER.height-EPS:by+1+EPS;const nb=playerAABB(player.pos);box.minX=nb.minX;box.maxX=nb.maxX;box.minY=nb.minY;box.maxY=nb.maxY;box.minZ=nb.minZ;box.maxZ=nb.maxZ;return false;});return hit;}
function isInWater(offsetY){return getBlock(Math.floor(player.pos.x),Math.floor(player.pos.y+offsetY),Math.floor(player.pos.z))===B.WATER;}
function isInLava(offsetY){return getBlock(Math.floor(player.pos.x),Math.floor(player.pos.y+offsetY),Math.floor(player.pos.z))===B.LAVA;}
const keys={};let started=false,paused=true;let selectedSlot=0;const joy={active:false,x:0,y:0};document.addEventListener('keydown',(e)=>{if(e.code==='Space')e.preventDefault();keys[e.code]=true;
// O: open/close the settings menu (works even while paused or in inventory).
if(e.code==='KeyO'&&typeof toggleSettings==='function'){toggleSettings();return;}
// Close sign editor with Escape
const _seo=document.getElementById('sign-editor-overlay');if(_seo&&_seo.style.display!=='none'&&e.code==='Escape'){if(typeof closeSignEditor==='function')closeSignEditor(false);return;}
if(_seo&&_seo.style.display!=='none'){e.stopPropagation();return;} // block gameplay keys when sign editor open
if(typeof settingsOpen!=='undefined'&&settingsOpen){if(e.code==='Escape')toggleSettings(false);return;}
if(!started||paused)return;if(e.code==='KeyE'){toggleInventory();return;}
if(inventoryOpen){if(e.code==='Escape')toggleInventory(false);return;}
if(e.code>='Digit1'&&e.code<='Digit9')selectSlot(parseInt(e.code.slice(5),10)-1);// F key: only used to exit a boat / minecart or reel in a fishing line.
// The old "F = toggle flight" behaviour has been removed — flight is now
// controlled exclusively from the password-protected Settings panel
// (see settings.js -> SETTINGS.flying / setFlyingEnabled).
if(e.code==='KeyF'){if(typeof ridingBoat!=='undefined'&&ridingBoat){exitBoat();return;}if(typeof ridingCart!=='undefined'&&ridingCart){exitMinecart();return;}if(typeof FISHING!=='undefined'&&FISHING.active){reelIn();return;}}
if(e.code==='KeyR')respawn();
// V: cycle camera views (PC)
if(e.code==='KeyV')cycleCameraView();
// Ctrl: crouch (hold to crouch, release to stand up)
if(e.code==='ControlLeft'||e.code==='ControlRight')setCrouch(true);
});document.addEventListener('keyup',(e)=>{keys[e.code]=false;if((e.code==='ControlLeft'||e.code==='ControlRight')&&started&&!paused)setCrouch(false);});document.addEventListener('mousemove',(e)=>{if(document.pointerLockElement!==canvas)return;player.yaw+=e.movementX*0.0023;player.pitch+=e.movementY*0.0023;player.pitch=Math.max(-1.55,Math.min(1.55,player.pitch));});document.addEventListener('pointerlockchange',()=>{if(isMobile)return;if(document.pointerLockElement===canvas){paused=false;document.getElementById('start-overlay').style.display='none';}else if(typeof SCREENSHOT!=='undefined'&&SCREENSHOT.isActive()){SCREENSHOT.exit();}else if(started&&!inventoryOpen&&!(typeof settingsOpen!=='undefined'&&settingsOpen)){paused=true;const ov=document.getElementById('start-overlay');ov.style.display='flex';ov.querySelector('h1').textContent=(typeof t==='function'?t('paused'):'Paused');document.getElementById('btn-start').textContent='▶ '+(typeof t==='function'?t('resume'):'Resume');}});let actionInterval=null;canvas.addEventListener('mousedown',(e)=>{if(isMobile||!started||paused)return;if(document.pointerLockElement!==canvas)return;if(e.button===0){if(typeof tryRecoverNearbyBoat==='function'&&tryRecoverNearbyBoat())return;if(typeof tryPlayerAttack==='function'&&tryPlayerAttack())return;mining.active=true;}else if(e.button===2){placeOrEat();clearInterval(actionInterval);actionInterval=setInterval(placeOrEat,240);}});document.addEventListener('mouseup',(e)=>{clearInterval(actionInterval);if(e.button===0){mining.active=false;resetMining();}});document.addEventListener('contextmenu',(e)=>e.preventDefault());canvas.addEventListener('wheel',(e)=>{if(!started||paused||inventoryOpen)return;selectSlot((selectedSlot+(e.deltaY>0?1:-1)+9)%9);},{passive:true});(function setupJoystick(){const zone=document.getElementById('joystick-zone');const base=document.getElementById('joystick-base');const knob=document.getElementById('joystick-knob');let touchId=null;function center(){const r=base.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,rad:r.width/2};}
function update(t){const c=center();let dx=t.clientX-c.x,dy=t.clientY-c.y;const len=Math.hypot(dx,dy),max=c.rad;if(len>max){dx=dx/len*max;dy=dy/len*max;}
knob.style.transform=`translate(${dx}px,${dy}px)`;joy.x=dx/max;joy.y=dy/max;joy.active=true;}
zone.addEventListener('touchstart',(e)=>{if(touchId!==null)return;const t=e.changedTouches[0];touchId=t.identifier;update(t);e.preventDefault();},{passive:false});zone.addEventListener('touchmove',(e)=>{for(const t of e.changedTouches)if(t.identifier===touchId){update(t);e.preventDefault();}},{passive:false});function end(e){for(const t of e.changedTouches)if(t.identifier===touchId){touchId=null;joy.active=false;joy.x=joy.y=0;knob.style.transform='translate(0,0)';}}
zone.addEventListener('touchend',end);zone.addEventListener('touchcancel',end);})();(function setupTouchLook(){let lookId=null,lastX=0,lastY=0;canvas.addEventListener('touchstart',(e)=>{if(lookId!==null)return;const t=e.changedTouches[0];lookId=t.identifier;lastX=t.clientX;lastY=t.clientY;},{passive:true});canvas.addEventListener('touchmove',(e)=>{for(const t of e.changedTouches){if(t.identifier!==lookId)continue;player.yaw+=(t.clientX-lastX)*0.006;player.pitch+=(t.clientY-lastY)*0.006;player.pitch=Math.max(-1.55,Math.min(1.55,player.pitch));lastX=t.clientX;lastY=t.clientY;e.preventDefault();}},{passive:false});function end(e){for(const t of e.changedTouches)if(t.identifier===lookId)lookId=null;}
canvas.addEventListener('touchend',end);canvas.addEventListener('touchcancel',end);})();function bindHold(id,fn,repeat){const el=document.getElementById(id);let iv=null;el.addEventListener('touchstart',(e)=>{e.preventDefault();fn();if(repeat){clearInterval(iv);iv=setInterval(fn,260);}},{passive:false});const stop=()=>clearInterval(iv);el.addEventListener('touchend',stop);el.addEventListener('touchcancel',stop);}
{const breakBtn=document.getElementById('btn-break');breakBtn.addEventListener('touchstart',(e)=>{e.preventDefault();if(typeof tryRecoverNearbyBoat==='function'&&tryRecoverNearbyBoat())return;if(typeof tryPlayerAttack==='function'&&tryPlayerAttack())return;mining.active=true;},{passive:false});const stopMine=()=>{mining.active=false;resetMining();};breakBtn.addEventListener('touchend',stopMine);breakBtn.addEventListener('touchcancel',stopMine);}
bindHold('btn-place',()=>placeOrEat(),true);{const jumpBtn=document.getElementById('btn-jump');jumpBtn.addEventListener('touchstart',(e)=>{e.preventDefault();keys['Space']=true;},{passive:false});const off=()=>{keys['Space']=false;};jumpBtn.addEventListener('touchend',off);jumpBtn.addEventListener('touchcancel',off);}
let currentTarget=null;function updateTarget(){const dir=camera.getDirection(BABYLON.Vector3.Forward());currentTarget=raycastVoxel(camera.position,dir,6);if(currentTarget){highlightLines.position.set(currentTarget.x-0.001,currentTarget.y-0.001,currentTarget.z-0.001);highlightLines.setEnabled(true);}else{highlightLines.setEnabled(false);}}
const mining={active:false,progress:0,key:null,stage:-1};const CRACK_STAGES=10;
// Enhanced crack texture: larger canvas, richer Minecraft-style fracture pattern
const crackTexture=new BABYLON.DynamicTexture('crackTex',{width:128,height:128},scene,false,BABYLON.Texture.NEAREST_SAMPLINGMODE);
crackTexture.hasAlpha=true;
const crackMat=new BABYLON.StandardMaterial('crackMat',scene);
crackMat.emissiveTexture=crackTexture;
crackMat.opacityTexture=crackTexture;
crackMat.diffuseTexture=crackTexture;
crackMat.disableLighting=true;
crackMat.backFaceCulling=true; // FIX: only show outer faces to prevent wall transparency
crackMat.zOffset=-1; // FIX: smaller z-offset to avoid bleeding through adjacent faces
crackMat.alphaMode=BABYLON.Engine.ALPHA_COMBINE;
// FIX: Use MATERIAL_ALPHABLEND (not alphatest) but with depth write enabled
// so adjacent chunk faces are not affected by crack transparency.
crackMat.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
crackMat.needDepthPrePass=true;
const crackBox=BABYLON.MeshBuilder.CreateBox('crackBox',{size:1.004},scene);
crackBox.material=crackMat;
crackBox.isPickable=false;
crackBox.setEnabled(false);
crackBox.renderingGroupId=1; // always render on top

function drawCrack(stage){
  const W=128,H=128,cx=W/2,cy=H/2;
  const ctx=crackTexture.getContext();
  ctx.clearRect(0,0,W,H);
  const rnd=mulberry32(0xBEEF1234);

  // Dark vignette: block gets darker at high crack stages
  const vigAlpha=0.06+stage*0.025;
  ctx.fillStyle=`rgba(0,0,0,${vigAlpha.toFixed(3)})`;
  ctx.fillRect(0,0,W,H);

  // Spider-web style fractures radiating from impact point
  const impX=cx+(rnd()-0.5)*12, impY=cy+(rnd()-0.5)*12;
  const mainBranches=2+Math.floor(stage*0.8);
  const totalBranches=mainBranches+(stage>4?2:0);

  for(let i=0;i<totalBranches;i++){
    const baseAngle=(i/totalBranches)*Math.PI*2+(rnd()-0.5)*0.5;
    drawCrackBranch(ctx,rnd,impX,impY,baseAngle,stage,true);
  }

  // Fine hairline cracks at high stages
  if(stage>=6){
    const hairlines=Math.floor((stage-5)*1.5);
    for(let h=0;h<hairlines;h++){
      const hx=20+rnd()*88, hy=20+rnd()*88;
      const ha=rnd()*Math.PI*2;
      drawCrackBranch(ctx,rnd,hx,hy,ha,Math.floor(stage*0.6),false);
    }
  }

  // Central impact: darker circle at origin
  const impR=3+stage*0.7;
  const grd=ctx.createRadialGradient(impX,impY,0,impX,impY,impR);
  grd.addColorStop(0,`rgba(0,0,0,${(0.5+stage*0.04).toFixed(2)})`);
  grd.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=grd;
  ctx.beginPath();ctx.arc(impX,impY,impR,0,Math.PI*2);ctx.fill();

  crackTexture.update();
}

function drawCrackBranch(ctx,rnd,startX,startY,angle,stage,doSubBranches){
  const maxLen=22+stage*4.5;
  const segments=4+Math.floor(rnd()*4)+Math.floor(stage*0.4);
  const lineW=1.2+stage*0.18;

  ctx.strokeStyle=`rgba(8,5,3,${(0.75+stage*0.025).toFixed(2)})`;
  ctx.lineWidth=lineW;
  ctx.lineCap='round';
  ctx.lineJoin='round';

  let x=startX,y=startY,a=angle;
  const pts=[[x,y]];
  const segLen=maxLen/segments;

  ctx.beginPath();ctx.moveTo(x,y);
  for(let s=0;s<segments;s++){
    a+=(rnd()-0.5)*0.9;
    x+=Math.cos(a)*segLen*(0.8+rnd()*0.4);
    y+=Math.sin(a)*segLen*(0.8+rnd()*0.4);
    ctx.lineTo(x,y);
    pts.push([x,y]);
  }
  ctx.stroke();

  // White highlight alongside the crack (depth illusion)
  ctx.strokeStyle=`rgba(255,255,255,${(0.12+stage*0.01).toFixed(2)})`;
  ctx.lineWidth=lineW*0.45;
  ctx.beginPath();
  for(let s=0;s<pts.length;s++){if(s===0)ctx.moveTo(pts[s][0]+0.8,pts[s][1]-0.8);else ctx.lineTo(pts[s][0]+0.8,pts[s][1]-0.8);}
  ctx.stroke();

  // Sub-branches at stage >= 3
  if(doSubBranches&&stage>=3&&pts.length>2){
    const numSub=1+Math.floor((stage-2)*0.5);
    for(let sb=0;sb<numSub;sb++){
      const pIdx=1+Math.floor(rnd()*(pts.length-1));
      const [bx,by]=pts[pIdx];
      const ba=a+(rnd()<0.5?1:-1)*(0.4+rnd()*0.6);
      drawCrackBranch(ctx,rnd,bx,by,ba,Math.floor(stage*0.55),false);
    }
  }
}
function getBreakTime(id){const def=BLOCKS[id];if(!def||def.unbreakable)return Infinity;return def.breakTime!==undefined?def.breakTime:0.75;}
// Get held tool definition
function heldToolDef(){const slot=inventory[selectedSlot];return slot&&isTool(slot.id)?toolDef(slot.id):null;}
// Effective break time considering held tool
function effectiveBreakTime(id){const base=getBreakTime(id);if(!isFinite(base))return base;const def=BLOCKS[id];const tool=heldToolDef();
if(tool&&def&&def.toolClass&&def.toolClass===tool.toolClass){const mat=TOOL_MATERIALS[tool.material];const mul=mat?mat.speed:1;return base/mul;}
return base;}
// Check if held tool can harvest this block
function canHarvest(id){const def=BLOCKS[id];if(!def||!def.minTier)return true;const tool=heldToolDef();if(!tool)return false;
if(def.toolClass&&tool.toolClass!==def.toolClass)return false;const mat=TOOL_MATERIALS[tool.material];return mat&&mat.tier>=def.minTier;}
function resetMining(){mining.progress=0;mining.key=null;mining.stage=-1;crackBox.setEnabled(false);updateMiningUI(0);}
function updateMiningUI(ratio){const bar=document.getElementById('mine-progress');bar.style.opacity=ratio>0?'1':'0';document.getElementById('mine-progress-fill').style.width=(ratio*100).toFixed(1)+'%';}
function updateMining(dt){if(!mining.active||!currentTarget||player.dead){if(mining.progress>0||mining.stage>=0)resetMining();return;}
const key=currentTarget.x+','+currentTarget.y+','+currentTarget.z;if(key!==mining.key){mining.key=key;mining.progress=0;mining.stage=-1;}
const need=effectiveBreakTime(currentTarget.id);if(!isFinite(need)){resetMining();return;}
mining.progress+=dt;const ratio=Math.min(1,mining.progress/need);crackBox.position.set(currentTarget.x+0.5,currentTarget.y+0.5,currentTarget.z+0.5);crackBox.setEnabled(true);const stage=Math.min(CRACK_STAGES-1,Math.floor(ratio*CRACK_STAGES));if(stage!==mining.stage){mining.stage=stage;drawCrack(stage);if(typeof SFX!=='undefined')SFX.digHit(currentTarget.id);}
updateMiningUI(ratio);if(mining.progress>=need){const minedId=currentTarget.id;const mx=currentTarget.x,my=currentTarget.y,mz=currentTarget.z;const minedDef=BLOCKS[minedId];if(typeof SFX!=='undefined')SFX.dig(minedId);
window._lastMinedId=minedId;if(typeof XP!=='undefined')XP.mineXP(minedId);if(typeof ACH!=='undefined'){ACH.track('mined');if(minedId===B.DIAMOND_ORE)ACH.flag('diamond');if(minedId===B.LOG||minedId===B.BIRCH_LOG)ACH.track('wood');if(minedId===B.OBSIDIAN)ACH.flag('obsidian');}
if(minedDef&&minedDef.crop&&typeof FARM!=='undefined'){FARM.harvest(mx,my,mz,minedId);setBlock(mx,my,mz,B.AIR);if(typeof ACH!=='undefined')ACH.track('harvest');}
// Door: break both halves (top+bottom) and drop a single Wooden Door item.
else if(minedDef&&minedDef.door){const oy=minedDef.doorHalf==='top'?my-1:my;setBlock(mx,oy,mz,B.AIR);setBlock(mx,oy+1,mz,B.AIR);addToInventory(ITEM_DOOR,1);}
else{if(typeof FARM!=='undefined')FARM.onBlockChanged(mx,my,mz,B.AIR);
// Remove decoration mesh if sign/item-frame
if(minedDef&&(minedDef.sign||minedDef.itemFrame)&&typeof DECORATIONS!=='undefined')DECORATIONS.removeAt(mx,my,mz);
setBlock(mx,my,mz,B.AIR);
const harvestOK=canHarvest(minedId);
if(harvestOK){const drop=dropFor(minedId);if(drop!==null&&drop!==undefined)addToInventory(drop,1);
if(minedDef&&minedDef.harvestItem){const hi=minedDef.harvestItem;const n=hi.min+Math.floor(Math.random()*(hi.max-hi.min+1));for(let i=0;i<n;i++)addToInventory(hi.id,1);} } }
consumeToolDurability(minedId);
mining.progress=0;mining.key=null;mining.stage=-1;crackBox.setEnabled(false);updateMiningUI(0);updateTarget();}}
// Consume 1 tool durability on successful mine
function consumeToolDurability(minedId){const slot=inventory[selectedSlot];if(!slot||!isTool(slot.id))return;
const def=BLOCKS[minedId];
if(def&&def.breakTime!==undefined&&def.breakTime<=0.2)return;
slot.dur=(slot.dur||0)-1;if(slot.dur<=0){
  inventory[selectedSlot]=null;if(typeof SFX!=='undefined'&&SFX.toolBreak)SFX.toolBreak();else if(typeof SFX!=='undefined'&&SFX.dig)SFX.dig(B.PLANKS);
  const el=document.getElementById('tool-break-msg');if(el){el.textContent='🔧 Tool broke!';el.style.opacity='1';clearTimeout(el._t);el._t=setTimeout(()=>{el.style.opacity='0';},1400);}
}
if(typeof refreshToolUI==='function')refreshToolUI();}
function placeOrEat(){if(player.dead||inventoryOpen)return;
// While riding a boat, a right-click disembarks instead of placing/eating.
if(typeof ridingBoat!=='undefined'&&ridingBoat){clearInterval(actionInterval);exitBoat();return;}
// While riding a minecart, a right-click disembarks.
if(typeof ridingCart!=='undefined'&&ridingCart){clearInterval(actionInterval);exitMinecart();return;}
// Right-click an existing boat in the world to board it.
if(typeof tryEnterNearbyBoat==='function'&&tryEnterNearbyBoat()){clearInterval(actionInterval);return;}
// Right-click an existing minecart on a rail to board it.
if(typeof tryEnterNearbyMinecart==='function'&&tryEnterNearbyMinecart()){clearInterval(actionInterval);return;}
if(currentTarget&&currentTarget.id===B.CRAFTING){clearInterval(actionInterval);toggleInventory(true,3);return;}
// Furnace interaction: right-click to open smelting UI
if(currentTarget&&currentTarget.id===B.FURNACE){clearInterval(actionInterval);if(typeof openFurnaceUI==='function')openFurnaceUI(currentTarget.x,currentTarget.y,currentTarget.z);return;}
// Chest interaction: right-click to open chest inventory
if(currentTarget){const _cd=BLOCKS[currentTarget.id];if(_cd&&_cd.chest){clearInterval(actionInterval);openChestUI(currentTarget.x,currentTarget.y,currentTarget.z);return;}}
// Sign interaction: right-click to edit text
if(currentTarget){const _sd=BLOCKS[currentTarget.id];if(_sd&&_sd.sign){clearInterval(actionInterval);openSignEditor(currentTarget.x,currentTarget.y,currentTarget.z);return;}}
// Item frame interaction: right-click to place/remove held item
if(currentTarget){const _fd=BLOCKS[currentTarget.id];if(_fd&&_fd.itemFrame){clearInterval(actionInterval);interactItemFrame(currentTarget.x,currentTarget.y,currentTarget.z);return;}}
// Flower pot interaction: right-click to plant/remove flower
if(currentTarget){const _pd=BLOCKS[currentTarget.id];if(_pd&&_pd.flowerPot){clearInterval(actionInterval);interactFlowerPot(currentTarget.x,currentTarget.y,currentTarget.z);return;}}
// Redstone interactions: lever toggle, repeater delay cycle
if(currentTarget&&typeof REDSTONE!=='undefined'){if(REDSTONE.onInteract(currentTarget.x,currentTarget.y,currentTarget.z)){clearInterval(actionInterval);return;}}
// Right-click a fence gate to toggle it open/closed
if(currentTarget){const fgDef=BLOCKS[currentTarget.id];if(fgDef&&fgDef.fenceGate){clearInterval(actionInterval);const d=BLOCKS[currentTarget.id];const newOpen=!d.fenceGateOpen;// Create a modified version of the block with toggled open state
const newDef=Object.assign({},d,{fenceGateOpen:newOpen});BLOCKS[currentTarget.id]=newDef;const cx2=Math.floor(currentTarget.x/CHUNK),cz2=Math.floor(currentTarget.z/CHUNK);buildChunk(cx2,cz2);return;}}
// Dimension interactions: Sculk Shrieker alert
if(currentTarget&&typeof onBlockInteractDimension==='function'){if(onBlockInteractDimension(currentTarget.x,currentTarget.y,currentTarget.z,currentTarget.id)){clearInterval(actionInterval);return;}}
// Nether portal ignition: right-click on obsidian with a torch or empty hand near obsidian frame
if(currentTarget&&currentTarget.id===B.OBSIDIAN&&typeof tryIgnitePortal==='function'){
  const slot0=inventory[selectedSlot];
  const isTorch=slot0&&slot0.id===B.TORCH;
  if(isTorch||!slot0){
    if(tryIgnitePortal(currentTarget.x,currentTarget.y,currentTarget.z)){clearInterval(actionInterval);return;}
  }
}
// Deep Dark entry via sculk activation
if(currentTarget&&(currentTarget.id===B.SCULK||currentTarget.id===B.SCULK_CATALYST)&&typeof tryEnterDeepDark==='function'){
  if(tryEnterDeepDark(currentTarget.x,currentTarget.y,currentTarget.z)){clearInterval(actionInterval);return;}
}
// Right-click a copper block with an axe: polish (reduce oxidation by 1 stage)
if(currentTarget){const copperDef=BLOCKS[currentTarget.id];if(copperDef&&copperDef.copper&&copperDef.oxidation>0){const slot2=inventory[selectedSlot];const tool2=slot2?toolDef(slot2.id):null;if(tool2&&tool2.toolClass==='axe'){clearInterval(actionInterval);const COPPER_STAGES=[B.COPPER,B.COPPER_EXPOSED,B.COPPER_WEATHERED,B.COPPER_OXIDIZED];const prevId=COPPER_STAGES[copperDef.oxidation-1];setBlock(currentTarget.x,currentTarget.y,currentTarget.z,prevId);if(typeof SFX!=='undefined')SFX.place(prevId);consumeToolDurability(currentTarget.id);return;}}}
// Right-click a door (either half) to toggle open/closed. Both halves are
// rewritten together so they always share the same facing + open state.
if(currentTarget&&typeof isDoor==='function'&&isDoor(currentTarget.id)){clearInterval(actionInterval);toggleDoor(currentTarget.x,currentTarget.y,currentTarget.z);return;}
// Right-click a Bed to sleep: fast-forward to the next morning at night.
// (tryUseBed shows a hint during the day rather than skipping time.) Also set
// the player's spawn point to the bed, Minecraft-style.
if(currentTarget&&currentTarget.id===B.BED){clearInterval(actionInterval);if(typeof setBedSpawn==='function')setBedSpawn(currentTarget.x,currentTarget.y,currentTarget.z);if(typeof tryUseBed==='function')tryUseBed();return;}
// Right-click a bed (red wool) at night to sleep through it, fast-forwarding
// to the next morning. During the day, fall through so red wool can still be
// stacked/built with normally. Holding nothing in hand also lets you sleep.
if(currentTarget&&currentTarget.id===B.WOOL_RED&&typeof isNightTime==='function'&&isNightTime()){clearInterval(actionInterval);if(typeof tryUseBed==='function')tryUseBed();return;}
const slot=inventory[selectedSlot];if(!slot)return;const itemDef=ITEMS[slot.id];
// Boat item: place a boat on the targeted water.
if(itemDef&&itemDef.boat){clearInterval(actionInterval);if(typeof tryPlaceBoat==='function'&&tryPlaceBoat())consumeFromSlot(selectedSlot,1);return;}
// Minecart item: place a minecart on the targeted rail.
if(itemDef&&itemDef.minecart){clearInterval(actionInterval);if(typeof tryPlaceMinecart==='function'&&tryPlaceMinecart())consumeFromSlot(selectedSlot,1);return;}
// Wooden Door item: place a 2-tall door (bottom + top) facing the player.
if(itemDef&&itemDef.door){clearInterval(actionInterval);if(tryPlaceDoor())consumeFromSlot(selectedSlot,1);return;}
// Fishing rod: cast / reel in on water.
if(itemDef&&itemDef.fishingRod){clearInterval(actionInterval);if(typeof useFishingRod==='function')useFishingRod();return;}
// Items that place a specific block (e.g. Redstone Dust from redstone item)
if(itemDef&&itemDef.placesBlock!==undefined){if(currentTarget){const{px,py,pz}=currentTarget;if(px>=0&&px<WORLD_W&&py>=0&&py<WORLD_H&&pz>=0&&pz<WORLD_D){const cur=getBlock(px,py,pz);if(!isSolid(cur)){setBlock(px,py,pz,itemDef.placesBlock);if(typeof SFX!=='undefined')SFX.place(itemDef.placesBlock);consumeFromSlot(selectedSlot,1);if(typeof ACH!=='undefined'){ACH.track('placed');ACH.track('redstone_placed');}return;}}}return;}
if(itemDef&&itemDef.tool==='hoe'){tillSoil();return;}
if(itemDef&&itemDef.plant!==undefined){if(plantSeed(slot.id,itemDef.plant))return;}
// Right-click near a villager to open trade UI
if(typeof mobs!=='undefined'&&typeof openVillagerTradeUI==='function'){
  const reach=isMobile?3.0:3.5;
  for(const mob of (typeof villagers!=='undefined'?[...villagers,...mobs]:mobs)){
    if(!mob||mob.dead||!mob.t||!mob.t.villager)continue;
    const dx=mob.pos.x-player.pos.x,dy=mob.pos.y-player.pos.y,dz=mob.pos.z-player.pos.z;
    if(dx*dx+dy*dy+dz*dz<reach*reach){
      // Feeding bread/apple to a villager triggers love mode (breeding) instead
      // of opening the trade UI, Minecraft-style. Empty hand → trade UI.
      if(slot&&typeof tryFeedVillager==='function'&&tryFeedVillager(mob,slot.id)){
        clearInterval(actionInterval);consumeFromSlot(selectedSlot,1);return;
      }
      clearInterval(actionInterval);openVillagerTradeUI(mob.villagerProfession||'Farmer',mob);return;
    }
  }
}
// Feeding raw meat to a wolf you're aiming at tames / heals it instead of
// being eaten. Only consumes meat when a wolf actually accepts it.
if(itemDef&&itemDef.food&&typeof tryFeedWolf==='function'&&tryFeedWolf(slot.id)){consumeFromSlot(selectedSlot,1);return;}
if(itemDef){if(itemDef.food)eatFood(selectedSlot);return;}
if(!currentTarget)return;const{px,py,pz}=currentTarget;if(px<0||px>=WORLD_W||py<0||py>=WORLD_H||pz<0||pz>=WORLD_D)return;const cur=getBlock(px,py,pz);if(isSolid(cur))return;const box=playerAABB(player.pos);if(px+1>box.minX&&px<box.maxX&&py+1>box.minY&&py<box.maxY&&pz+1>box.minZ&&pz<box.maxZ)return;
// Stairs orient themselves: the low/open side faces the player so you climb away.
let placeId=slot.id;if(BLOCKS[placeId]&&BLOCKS[placeId].stairs)placeId=stairBlockId(playerFacingDir());
// Sign: orient face toward the player when placed
if(BLOCKS[placeId]&&BLOCKS[placeId].sign){
  const signFace=playerFacingDir();// place facing player direction
  BLOCKS[B.SIGN]=Object.assign({},BLOCKS[B.SIGN],{signFacing:signFace,signText:''});
}
// Torch: place on wall if the target block is a solid wall; else place upright
if(placeId===B.TORCH){
  const tx=currentTarget.x,ty=currentTarget.y,tz=currentTarget.z;
  // Determine which face was hit: compare placed position to targeted block
  const dx=px-tx,dy=py-ty,dz=pz-tz;
  if(dy===1){placeId=B.TORCH;} // place on top surface → upright
  else if(dy===-1){placeId=B.TORCH_CEILING;} // place on underside → ceiling
  else if(dz===-1){// south face of target → torch on south wall of placed cell
    placeId=B.TORCH_WALL_S;BLOCKS[B.TORCH_WALL_S]=Object.assign({},BLOCKS[B.TORCH_WALL_S],{torchFacing:'S'});
  }else if(dz===1){placeId=B.TORCH_WALL_N;BLOCKS[B.TORCH_WALL_N]=Object.assign({},BLOCKS[B.TORCH_WALL_N],{torchFacing:'N'});}
  else if(dx===-1){placeId=B.TORCH_WALL_E;BLOCKS[B.TORCH_WALL_E]=Object.assign({},BLOCKS[B.TORCH_WALL_E],{torchFacing:'E'});}
  else if(dx===1){placeId=B.TORCH_WALL_W;BLOCKS[B.TORCH_WALL_W]=Object.assign({},BLOCKS[B.TORCH_WALL_W],{torchFacing:'W'});}
}
// Item frame: orient to face the player
if(BLOCKS[placeId]&&BLOCKS[placeId].itemFrame){
  const ff=playerFacingDir();
  BLOCKS[B.ITEM_FRAME]=Object.assign({},BLOCKS[B.ITEM_FRAME],{frameFacing:ff,frameItem:null});
}
setBlock(px,py,pz,placeId);if(typeof SFX!=='undefined')SFX.place(placeId);consumeFromSlot(selectedSlot,1);if(typeof ACH!=='undefined'){ACH.track('placed');if(typeof isRedstoneBlock==='function'&&isRedstoneBlock(placeId))ACH.track('redstone_placed');}
// Auto-open sign editor when placing a sign
if(BLOCKS[placeId]&&BLOCKS[placeId].sign){openSignEditor(px,py,pz);}}
// Stair facing constants matching stairFacing in config (N=0,E=1,S=2,W=3).
const STAIR_FACING_IDS=[B.STAIRS_N,B.STAIRS_E,B.STAIRS_S,B.STAIRS_W];
function stairBlockId(facing){return STAIR_FACING_IDS[facing]||B.STAIRS_N;}
// Door facing constants matching doorFacing in config (N=0,E=1,S=2,W=3).
// Forward vector is (sin(yaw),cos(yaw)) in (x,z): +Z=South, +X=East.
const DOOR_FACING_IDS=[
  [B.DOOR_BOTTOM_N_CLOSED,B.DOOR_BOTTOM_N_OPEN,B.DOOR_TOP_N_CLOSED,B.DOOR_TOP_N_OPEN],
  [B.DOOR_BOTTOM_E_CLOSED,B.DOOR_BOTTOM_E_OPEN,B.DOOR_TOP_E_CLOSED,B.DOOR_TOP_E_OPEN],
  [B.DOOR_BOTTOM_S_CLOSED,B.DOOR_BOTTOM_S_OPEN,B.DOOR_TOP_S_CLOSED,B.DOOR_TOP_S_OPEN],
  [B.DOOR_BOTTOM_W_CLOSED,B.DOOR_BOTTOM_W_OPEN,B.DOOR_TOP_W_CLOSED,B.DOOR_TOP_W_OPEN]];
function playerFacingDir(){const sy=Math.sin(player.yaw),cy=Math.cos(player.yaw);if(Math.abs(sy)>Math.abs(cy))return sy>0?1:3;return cy>0?2:0;}
function doorBlockId(facing,half,open){return DOOR_FACING_IDS[facing][(half==='top'?2:0)+(open?1:0)];}
// Place a 2-tall door at the targeted cell, oriented to the player's facing.
function tryPlaceDoor(){if(!currentTarget)return false;const{px,py,pz}=currentTarget;if(px<0||px>=WORLD_W||py<0||py>=WORLD_H-1||pz<0||pz>=WORLD_D)return false;
const lower=getBlock(px,py,pz),upper=getBlock(px,py+1,pz);if(isSolid(lower)||isSolid(upper))return false;
const box=playerAABB(player.pos);if(px+1>box.minX&&px<box.maxX&&py+2>box.minY&&py<box.maxY&&pz+1>box.minZ&&pz<box.maxZ)return false;
const facing=playerFacingDir();setBlock(px,py,pz,doorBlockId(facing,'bottom',false));setBlock(px,py+1,pz,doorBlockId(facing,'top',false));
if(typeof SFX!=='undefined')SFX.place(B.DOOR_BOTTOM_N_CLOSED);if(typeof ACH!=='undefined')ACH.track('placed');return true;}
// Toggle a door (clicked half) open<->closed; rewrites both halves identically.
function toggleDoor(x,y,z){const id=getBlock(x,y,z);const def=BLOCKS[id];if(!def||!def.door)return;
const by=def.doorHalf==='top'?y-1:y;const ty=by+1;const facing=def.doorFacing;const open=!def.doorOpen;
setBlock(x,by,z,doorBlockId(facing,'bottom',open));setBlock(x,ty,z,doorBlockId(facing,'top',open));
if(typeof SFX!=='undefined')SFX.place(id);}
// Sign editor: show UI to type text on a sign
let _signEditorTarget=null;
function openSignEditor(x,y,z){
  _signEditorTarget={x,y,z};
  const overlay=document.getElementById('sign-editor-overlay');
  const input=document.getElementById('sign-editor-input');
  if(!overlay||!input)return;
  const def=BLOCKS[getBlock(x,y,z)];
  input.value=(def&&def.signText)||'';
  overlay.style.display='flex';overlay.style.alignItems='center';overlay.style.justifyContent='center';
  setTimeout(()=>input.focus(),80);
}
function closeSignEditor(save){
  const overlay=document.getElementById('sign-editor-overlay');
  if(!overlay)return;
  overlay.style.display='none';
  if(save&&_signEditorTarget){
    const{x,y,z}=_signEditorTarget;
    const id=getBlock(x,y,z);
    const def=BLOCKS[id];
    if(def&&def.sign){
      // Store text in a per-position map
      if(!window._signTexts)window._signTexts={};
      const input=document.getElementById('sign-editor-input');
      const text=(input&&input.value)||'';
      window._signTexts[x+','+y+','+z]=text;
      // Update def so the renderer can read it via BLOCKS lookup (shared ref)
      BLOCKS[id]=Object.assign({},def,{signText:text});
      // Update decoration mesh
      if(typeof DECORATIONS!=='undefined')DECORATIONS.updateSign(x,y,z);
      // Rebuild affected chunk
      const cx2=Math.floor(x/CHUNK),cz2=Math.floor(z/CHUNK);
      if(typeof buildChunk==='function')buildChunk(cx2,cz2);
    }
  }
  _signEditorTarget=null;
}
// Item frame: place held item into frame, or remove existing item
function interactItemFrame(x,y,z){
  const id=getBlock(x,y,z);
  const def=BLOCKS[id];
  if(!def||!def.itemFrame)return;
  if(def.frameItem!==null&&def.frameItem!==undefined){
    // Remove: give item back
    addToInventory(def.frameItem,1);
    BLOCKS[id]=Object.assign({},def,{frameItem:null});
  }else{
    // Place: take item from hand
    const slot=inventory[selectedSlot];
    if(!slot)return;
    BLOCKS[id]=Object.assign({},def,{frameItem:slot.id});
    consumeFromSlot(selectedSlot,1);
  }
  const cx2=Math.floor(x/CHUNK),cz2=Math.floor(z/CHUNK);
  if(typeof buildChunk==='function')buildChunk(cx2,cz2);
  if(typeof SFX!=='undefined')SFX.place(id);
}
// Flower pot: plant/remove a flower
const _PLANTABLE_IN_POT=new Set([B.FLOWER_DANDELION,B.FLOWER_POPPY,B.FLOWER_CORNFLOWER,B.FLOWER_ALLIUM,B.FLOWER_TULIP,B.FLOWER_OXEYE,B.DEAD_BUSH,B.TALL_GRASS,B.CACTUS,B.BAMBOO]);
function interactFlowerPot(x,y,z){
  const id=getBlock(x,y,z);
  const def=BLOCKS[id];
  if(!def||!def.flowerPot)return;
  if(def.potPlant&&def.potPlant!==0){
    // Remove plant: give it back (use flower tile to map back to block)
    addToInventory(def.potPlant,1);
    BLOCKS[id]=Object.assign({},def,{potPlant:0});
  }else{
    // Plant: use held item if it's a plantable plant
    const slot=inventory[selectedSlot];
    if(!slot)return;
    const blockId=slot.id;
    if(BLOCKS[blockId]&&(BLOCKS[blockId].crossPlant||BLOCKS[blockId].bamboo||_PLANTABLE_IN_POT.has(blockId))){
      const plantTile=BLOCKS[blockId]?BLOCKS[blockId].all:T.FLOWER_DANDELION;
      BLOCKS[id]=Object.assign({},def,{potPlant:blockId,_potPlantTile:plantTile});
      consumeFromSlot(selectedSlot,1);
    }
  }
  const cx2=Math.floor(x/CHUNK),cz2=Math.floor(z/CHUNK);
  if(typeof buildChunk==='function')buildChunk(cx2,cz2);
  if(typeof SFX!=='undefined')SFX.place(id);
}
// Till soil with hoe
function tillSoil(){if(!currentTarget)return;const{x,y,z}=currentTarget;const id=getBlock(x,y,z);if(id!==B.GRASS&&id!==B.DIRT&&id!==B.PATH)return;if(getBlock(x,y+1,z)!==B.AIR)return;setBlock(x,y,z,B.FARMLAND);}
// Plant seed on farmland
function plantSeed(itemId,blockId){if(!currentTarget)return false;const{px,py,pz}=currentTarget;if(typeof FARM==='undefined')return false;if(FARM.plant(px,py,pz,blockId)){consumeFromSlot(selectedSlot,1);return true;}return false;}
function eatFood(slotIndex){const slot=inventory[slotIndex];if(!slot||!ITEMS[slot.id])return;if(player.eatCooldown>0||player.hunger>=20)return;player.hunger=Math.min(20,player.hunger+ITEMS[slot.id].food);player.eatCooldown=1.5;consumeFromSlot(slotIndex,1);updateVitalsUI();if(typeof ACH!=='undefined')ACH.track('eaten');}
function damage(amount){if(player.dead||amount<=0)return;player.hp=Math.max(0,player.hp-amount);if(typeof SFX!=='undefined')SFX.hurt();const flash=document.getElementById('damage-flash');flash.style.transition='none';flash.style.opacity='1';requestAnimationFrame(()=>{flash.style.transition='opacity .45s';flash.style.opacity='0';});updateVitalsUI();if(player.hp<=0)die();}
function die(){player.dead=true;document.getElementById('death-overlay').style.display='flex';setTimeout(()=>{respawn();document.getElementById('death-overlay').style.display='none';},1600);}
// Set the respawn point to a placed bed (Minecraft-style). Spawns the player on
// top of the bed block on death/respawn instead of the original world spawn.
// The new spawn point is persisted immediately so it survives a reload.
function setBedSpawn(x,y,z){
  if(typeof spawnPoint==='undefined'||!spawnPoint)return;
  spawnPoint.set(x+0.5,y+1,z+0.5);
  // Persist right away so the bed spawn survives reloads/crashes.
  if(typeof savePlayerState==='function')savePlayerState();
  // Minecraft-style "Respawn point set" feedback.
  if(typeof showBedMessage==='function'){
    showBedMessage(typeof t==='function'?t('bedSpawnSet'):'🛏 Respawn point set');
  }else{
    const el=document.getElementById('tool-break-msg');
    if(el){el.textContent='🛏 Respawn point set';el.style.opacity='1';clearTimeout(el._t);el._t=setTimeout(()=>{el.style.opacity='0';},1800);}
  }
}
function respawn(){if(typeof ridingBoat!=='undefined'&&ridingBoat){ridingBoat=null;if(typeof _showBoatHint==='function')_showBoatHint(false);}if(typeof ridingCart!=='undefined'&&ridingCart){ridingCart=null;if(typeof _showCartHint==='function')_showCartHint(false);}if(typeof cancelFishing==='function')cancelFishing();player.pos.copyFrom(spawnPoint);player.vel.set(0,0,0);player.hp=20;player.hunger=20;player.dead=false;player.fallStartY=null;player.pose=POSE.STAND;player.wantCrouch=false;applyPose();mining.active=false;resetMining();updateVitalsUI();updatePoseUI();}
// Hold-to-crouch. wantCrouch tracks the player's intent; the actual pose
// only returns to STAND when there is enough headroom to stand up.
function setCrouch(on){if(player.flying){player.wantCrouch=false;return;}player.wantCrouch=!!on;updateCrouchPose();}
function updateCrouchPose(){if(player.flying){if(player.pose!==POSE.STAND){player.pose=POSE.STAND;applyPose();updatePoseUI();}return;}
  const target=player.wantCrouch?POSE.CROUCH:POSE.STAND;
  if(target===player.pose)return;
  // Standing up requires headroom; if blocked, stay crouched until it clears.
  if(target===POSE.STAND&&!poseFits(POSE.STAND))return;
  player.pose=target;applyPose();updatePoseUI();}
function updatePoseUI(){const el=document.getElementById('pose-display');if(!el)return;el.textContent=player.pose===POSE.CROUCH?'🦵 Crouch':'';el.style.display=player.pose===POSE.CROUCH?'block':'none';}
const VIEW={FIRST:0,THIRD_BACK:1,THIRD_FRONT:2};
let cameraView=VIEW.FIRST;
const VIEW_NAMES=['1st Person','3rd Person (Back)','3rd Person (Front)'];
function cycleCameraView(){cameraView=(cameraView+1)%3;const el=document.getElementById('view-display');if(el){el.textContent='👁 '+VIEW_NAMES[cameraView];el.style.opacity='1';clearTimeout(el._t);el._t=setTimeout(()=>{el.style.opacity='0';},1600);}
if(typeof setPlayerModelVisible==='function')setPlayerModelVisible(cameraView!==VIEW.FIRST);}
