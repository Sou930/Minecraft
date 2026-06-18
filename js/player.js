const EPS=0.001;function moveAxis(axis,delta){if(delta===0)return false;player.pos[axis]+=delta;let hit=false;const box=playerAABB(player.pos);forEachOverlapBlock(box,(bx,by,bz)=>{hit=true;if(axis==='x')player.pos.x=delta>0?bx-PLAYER.halfW-EPS:bx+1+PLAYER.halfW+EPS;if(axis==='z')player.pos.z=delta>0?bz-PLAYER.halfW-EPS:bz+1+PLAYER.halfW+EPS;if(axis==='y')player.pos.y=delta>0?by-PLAYER.height-EPS:by+1+EPS;const nb=playerAABB(player.pos);box.minX=nb.minX;box.maxX=nb.maxX;box.minY=nb.minY;box.maxY=nb.maxY;box.minZ=nb.minZ;box.maxZ=nb.maxZ;return false;});return hit;}
function isInWater(offsetY){return getBlock(Math.floor(player.pos.x),Math.floor(player.pos.y+offsetY),Math.floor(player.pos.z))===B.WATER;}
function isInLava(offsetY){return getBlock(Math.floor(player.pos.x),Math.floor(player.pos.y+offsetY),Math.floor(player.pos.z))===B.LAVA;}
const keys={};let started=false,paused=true;let selectedSlot=0;const joy={active:false,x:0,y:0};document.addEventListener('keydown',(e)=>{if(e.code==='Space')e.preventDefault();keys[e.code]=true;
// O: open/close the settings menu (works even while paused or in inventory).
if(e.code==='KeyO'&&typeof toggleSettings==='function'){toggleSettings();return;}
if(typeof settingsOpen!=='undefined'&&settingsOpen){if(e.code==='Escape')toggleSettings(false);return;}
if(!started||paused)return;if(e.code==='KeyE'){toggleInventory();return;}
if(inventoryOpen){if(e.code==='Escape')toggleInventory(false);return;}
if(e.code>='Digit1'&&e.code<='Digit9')selectSlot(parseInt(e.code.slice(5),10)-1);if(e.code==='KeyF'){player.flying=!player.flying;player.vel.y=0;if(player.flying&&typeof ACH!=='undefined')ACH.flag('fly');}
if(e.code==='KeyR')respawn();
// V: cycle camera views
if(e.code==='KeyV')cycleCameraView();
// Ctrl: crouch (hold to crouch, release to stand up)
if(e.code==='ControlLeft'||e.code==='ControlRight')setCrouch(true);
});document.addEventListener('keyup',(e)=>{keys[e.code]=false;if((e.code==='ControlLeft'||e.code==='ControlRight')&&started&&!paused)setCrouch(false);});document.addEventListener('mousemove',(e)=>{if(document.pointerLockElement!==canvas)return;player.yaw+=e.movementX*0.0023;player.pitch+=e.movementY*0.0023;player.pitch=Math.max(-1.55,Math.min(1.55,player.pitch));});document.addEventListener('pointerlockchange',()=>{if(isMobile)return;if(document.pointerLockElement===canvas){paused=false;document.getElementById('start-overlay').style.display='none';}else if(started&&!inventoryOpen){paused=true;const ov=document.getElementById('start-overlay');ov.style.display='flex';ov.querySelector('h1').textContent=(typeof t==='function'?t('paused'):'Paused');document.getElementById('btn-start').textContent='▶ '+(typeof t==='function'?t('resume'):'Resume');}});let actionInterval=null;canvas.addEventListener('mousedown',(e)=>{if(isMobile||!started||paused)return;if(document.pointerLockElement!==canvas)return;if(e.button===0){mining.active=true;}else if(e.button===2){placeOrEat();clearInterval(actionInterval);actionInterval=setInterval(placeOrEat,240);}});document.addEventListener('mouseup',(e)=>{clearInterval(actionInterval);if(e.button===0){mining.active=false;resetMining();}});document.addEventListener('contextmenu',(e)=>e.preventDefault());canvas.addEventListener('wheel',(e)=>{if(!started||paused||inventoryOpen)return;selectSlot((selectedSlot+(e.deltaY>0?1:-1)+9)%9);},{passive:true});(function setupJoystick(){const zone=document.getElementById('joystick-zone');const base=document.getElementById('joystick-base');const knob=document.getElementById('joystick-knob');let touchId=null;function center(){const r=base.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,rad:r.width/2};}
function update(t){const c=center();let dx=t.clientX-c.x,dy=t.clientY-c.y;const len=Math.hypot(dx,dy),max=c.rad;if(len>max){dx=dx/len*max;dy=dy/len*max;}
knob.style.transform=`translate(${dx}px,${dy}px)`;joy.x=dx/max;joy.y=dy/max;joy.active=true;}
zone.addEventListener('touchstart',(e)=>{if(touchId!==null)return;const t=e.changedTouches[0];touchId=t.identifier;update(t);e.preventDefault();},{passive:false});zone.addEventListener('touchmove',(e)=>{for(const t of e.changedTouches)if(t.identifier===touchId){update(t);e.preventDefault();}},{passive:false});function end(e){for(const t of e.changedTouches)if(t.identifier===touchId){touchId=null;joy.active=false;joy.x=joy.y=0;knob.style.transform='translate(0,0)';}}
zone.addEventListener('touchend',end);zone.addEventListener('touchcancel',end);})();(function setupTouchLook(){let lookId=null,lastX=0,lastY=0;canvas.addEventListener('touchstart',(e)=>{if(lookId!==null)return;const t=e.changedTouches[0];lookId=t.identifier;lastX=t.clientX;lastY=t.clientY;},{passive:true});canvas.addEventListener('touchmove',(e)=>{for(const t of e.changedTouches){if(t.identifier!==lookId)continue;player.yaw+=(t.clientX-lastX)*0.006;player.pitch+=(t.clientY-lastY)*0.006;player.pitch=Math.max(-1.55,Math.min(1.55,player.pitch));lastX=t.clientX;lastY=t.clientY;e.preventDefault();}},{passive:false});function end(e){for(const t of e.changedTouches)if(t.identifier===lookId)lookId=null;}
canvas.addEventListener('touchend',end);canvas.addEventListener('touchcancel',end);})();function bindHold(id,fn,repeat){const el=document.getElementById(id);let iv=null;el.addEventListener('touchstart',(e)=>{e.preventDefault();fn();if(repeat){clearInterval(iv);iv=setInterval(fn,260);}},{passive:false});const stop=()=>clearInterval(iv);el.addEventListener('touchend',stop);el.addEventListener('touchcancel',stop);}
{const breakBtn=document.getElementById('btn-break');breakBtn.addEventListener('touchstart',(e)=>{e.preventDefault();mining.active=true;},{passive:false});const stopMine=()=>{mining.active=false;resetMining();};breakBtn.addEventListener('touchend',stopMine);breakBtn.addEventListener('touchcancel',stopMine);}
bindHold('btn-place',()=>placeOrEat(),true);{const jumpBtn=document.getElementById('btn-jump');jumpBtn.addEventListener('touchstart',(e)=>{e.preventDefault();keys['Space']=true;},{passive:false});const off=()=>{keys['Space']=false;};jumpBtn.addEventListener('touchend',off);jumpBtn.addEventListener('touchcancel',off);}
let currentTarget=null;function updateTarget(){const dir=camera.getDirection(BABYLON.Vector3.Forward());currentTarget=raycastVoxel(camera.position,dir,6);if(currentTarget){highlightLines.position.set(currentTarget.x-0.001,currentTarget.y-0.001,currentTarget.z-0.001);highlightLines.setEnabled(true);}else{highlightLines.setEnabled(false);}}
const mining={active:false,progress:0,key:null,stage:-1};const CRACK_STAGES=10;const crackTexture=new BABYLON.DynamicTexture('crackTex',{width:64,height:64},scene,false,BABYLON.Texture.NEAREST_SAMPLINGMODE);crackTexture.hasAlpha=true;const crackMat=new BABYLON.StandardMaterial('crackMat',scene);crackMat.emissiveTexture=crackTexture;crackMat.opacityTexture=crackTexture;crackMat.disableLighting=true;crackMat.backFaceCulling=true;const crackBox=BABYLON.MeshBuilder.CreateBox('crackBox',{size:1.004},scene);crackBox.material=crackMat;crackBox.isPickable=false;crackBox.setEnabled(false);function drawCrack(stage){const ctx=crackTexture.getContext();ctx.clearRect(0,0,64,64);const rnd=mulberry32(424242);ctx.strokeStyle='rgba(15,15,15,0.92)';ctx.lineWidth=2.4;ctx.lineCap='round';const branches=3+stage*2;for(let i=0;i<branches;i++){let x=32+(rnd()-0.5)*10,y=32+(rnd()-0.5)*10;let a=rnd()*Math.PI*2;const len=10+stage*2.6+rnd()*8;const segs=3+Math.floor(rnd()*3);ctx.beginPath();ctx.moveTo(x,y);for(let s=0;s<segs;s++){a+=(rnd()-0.5)*1.3;x+=Math.cos(a)*(len/segs);y+=Math.sin(a)*(len/segs);ctx.lineTo(x,y);}
ctx.stroke();}
crackTexture.update();}
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
if(typeof ACH!=='undefined'){ACH.track('mined');if(minedId===B.DIAMOND_ORE)ACH.flag('diamond');if(minedId===B.LOG||minedId===B.BIRCH_LOG)ACH.track('wood');if(minedId===B.OBSIDIAN)ACH.flag('obsidian');}
if(minedDef&&minedDef.crop&&typeof FARM!=='undefined'){FARM.harvest(mx,my,mz,minedId);setBlock(mx,my,mz,B.AIR);if(typeof ACH!=='undefined')ACH.track('harvest');}
else{if(typeof FARM!=='undefined')FARM.onBlockChanged(mx,my,mz,B.AIR);setBlock(mx,my,mz,B.AIR);
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
function placeOrEat(){if(player.dead||inventoryOpen)return;if(currentTarget&&currentTarget.id===B.CRAFTING){clearInterval(actionInterval);toggleInventory(true,3);return;}
const slot=inventory[selectedSlot];if(!slot)return;const itemDef=ITEMS[slot.id];
if(itemDef&&itemDef.tool==='hoe'){tillSoil();return;}
if(itemDef&&itemDef.plant!==undefined){if(plantSeed(slot.id,itemDef.plant))return;}
if(itemDef){if(itemDef.food)eatFood(selectedSlot);return;}
if(!currentTarget)return;const{px,py,pz}=currentTarget;if(px<0||px>=WORLD_W||py<0||py>=WORLD_H||pz<0||pz>=WORLD_D)return;const cur=getBlock(px,py,pz);if(isSolid(cur))return;const box=playerAABB(player.pos);if(px+1>box.minX&&px<box.maxX&&py+1>box.minY&&py<box.maxY&&pz+1>box.minZ&&pz<box.maxZ)return;setBlock(px,py,pz,slot.id);if(typeof SFX!=='undefined')SFX.place(slot.id);consumeFromSlot(selectedSlot,1);if(typeof ACH!=='undefined')ACH.track('placed');}
// Till soil with hoe
function tillSoil(){if(!currentTarget)return;const{x,y,z}=currentTarget;const id=getBlock(x,y,z);if(id!==B.GRASS&&id!==B.DIRT&&id!==B.PATH)return;if(getBlock(x,y+1,z)!==B.AIR)return;setBlock(x,y,z,B.FARMLAND);}
// Plant seed on farmland
function plantSeed(itemId,blockId){if(!currentTarget)return false;const{px,py,pz}=currentTarget;if(typeof FARM==='undefined')return false;if(FARM.plant(px,py,pz,blockId)){consumeFromSlot(selectedSlot,1);return true;}return false;}
function eatFood(slotIndex){const slot=inventory[slotIndex];if(!slot||!ITEMS[slot.id])return;if(player.eatCooldown>0||player.hunger>=20)return;player.hunger=Math.min(20,player.hunger+ITEMS[slot.id].food);player.eatCooldown=1.5;consumeFromSlot(slotIndex,1);updateVitalsUI();if(typeof ACH!=='undefined')ACH.track('eaten');}
function damage(amount){if(player.dead||amount<=0)return;player.hp=Math.max(0,player.hp-amount);if(typeof SFX!=='undefined')SFX.hurt();const flash=document.getElementById('damage-flash');flash.style.transition='none';flash.style.opacity='1';requestAnimationFrame(()=>{flash.style.transition='opacity .45s';flash.style.opacity='0';});updateVitalsUI();if(player.hp<=0)die();}
function die(){player.dead=true;document.getElementById('death-overlay').style.display='flex';setTimeout(()=>{respawn();document.getElementById('death-overlay').style.display='none';},1600);}
function respawn(){player.pos.copyFrom(spawnPoint);player.vel.set(0,0,0);player.hp=20;player.hunger=20;player.dead=false;player.fallStartY=null;player.pose=POSE.STAND;player.wantCrouch=false;applyPose();mining.active=false;resetMining();updateVitalsUI();updatePoseUI();}
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
