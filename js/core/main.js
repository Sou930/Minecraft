const DAY_LENGTH=720;let dayTime=DAY_LENGTH*0.25;const skyDay=new BABYLON.Color3(0.53,0.81,0.92);const skyNight=new BABYLON.Color3(0.03,0.05,0.13);
// FIX: Reuse a single Vector3 for sun direction to avoid per-frame GC pressure.
const _sunDirVec=new BABYLON.Vector3(0,0,0);
function updateDayNight(dt){dayTime=(dayTime+dt)%DAY_LENGTH;const angle=(dayTime/DAY_LENGTH)*Math.PI*2;const sunUp=Math.sin(angle);const dayF=Math.max(0,Math.min(1,sunUp*2+0.2));_sunDirVec.set(-Math.cos(angle)*0.6,-Math.max(0.15,sunUp),-0.35);BABYLON.Vector3.NormalizeToRef(_sunDirVec,sunLight.direction);sunLight.intensity=0.55*Math.max(0,sunUp);
// Day/night brightness is now baked into chunk vertex colours (sky light scales
// with the day factor) so the ambient hemi light stays nearly constant — this
// avoids double-dimming and lets torches (block light, unaffected by day) read
// brightly against the dark night terrain.
hemiLight.intensity=0.92;const sky=BABYLON.Color3.Lerp(skyNight,skyDay,dayF);scene.clearColor=new BABYLON.Color4(sky.r,sky.g,sky.b,1);scene.fogColor=sky;const SKY_DIST=230;const sx=Math.cos(angle)*0.6,sy=sunUp,sz=0.35;const sl=Math.hypot(sx,sy,sz);sunMesh.position.set(camera.position.x+(sx/sl)*SKY_DIST,camera.position.y+(sy/sl)*SKY_DIST,camera.position.z+(sz/sl)*SKY_DIST);sunMesh.setEnabled(sunUp>-0.12);moonMesh.position.set(camera.position.x-(sx/sl)*SKY_DIST,camera.position.y-(sy/sl)*SKY_DIST,camera.position.z-(sz/sl)*SKY_DIST);moonMesh.setEnabled(sunUp<0.12);if(typeof updateStars==='function')updateStars(dayF);if(typeof LIGHTING!=='undefined')LIGHTING.setNightFactor(dayF);
// Re-bake sky lighting into chunks when the day brightness changes a step, so
// the world visibly darkens at night and torches stand out (block light is
// unaffected by the day factor).
if(typeof maybeScheduleRelight!=='undefined'&&worldReady)maybeScheduleRelight(dayF);
const td=document.getElementById('time-display');td.textContent=sunUp>0.15?'☀ Day':(sunUp<-0.15?'🌙 Night':(Math.cos(angle)>0?'🌅 Dawn':'🌇 Dusk'));if(sunUp<-0.15&&started&&worldReady&&typeof ACH!=='undefined')ACH.flag('night');}
// True while it is night (sun well below the horizon) — used to gate sleeping.
function isNightTime(){const angle=(dayTime/DAY_LENGTH)*Math.PI*2;return Math.sin(angle)<-0.12;}
// Bed sleep: fast-forward `dayTime` to dawn (the start of the day cycle) when
// the player uses a bed at night. Mirrors Minecraft's "sleep through the night".
function tryUseBed(){
  if(typeof player!=='undefined'&&player&&player.dead)return;
  if(!isNightTime()){
    showBedMessage(typeof t==='function'?t('bedDayOnly'):'🛏 You can only sleep at night');
    return;
  }
  // Advance time to the next morning (just after sunrise) and skip the rest of
  // the night. dayTime wraps within [0,DAY_LENGTH); dawn is at dayTime≈0.
  dayTime=DAY_LENGTH*0.02;
  if(typeof SFX!=='undefined'&&SFX.resume)SFX.resume();
  showBedMessage(typeof t==='function'?t('bedSlept'):'🛏 Good morning! You slept through the night.');
}
function showBedMessage(msg){const el=document.getElementById('tool-break-msg');if(!el)return;el.textContent=msg;el.style.opacity='1';clearTimeout(el._t);el._t=setTimeout(()=>{el.style.opacity='0';},1600);}
// Floating text helper (used by redstone system for feedback)
function showFloatingText(wx,wy,wz,msg){const el=document.getElementById('tool-break-msg');if(!el)return;el.textContent=msg;el.style.opacity='1';clearTimeout(el._t);el._t=setTimeout(()=>{el.style.opacity='0';},1200);}
const GRAVITY=-24;function update(dt){if(!worldReady||!started||player.dead)return;if(paused&&!isMobile)return;if(inventoryOpen){if(mining.active||mining.progress>0){mining.active=false;resetMining();}
return;}
// While riding a boat, boat physics drives the player position; skip the
// normal on-foot movement/gravity but keep camera, mobs, boats updated.
if(typeof ridingBoat!=='undefined'&&ridingBoat){
  if(mining.active||mining.progress>0){mining.active=false;resetMining();}
  updateCamera();updatePlayerModel(dt);updateMobs(dt);if(typeof updateAttackCooldown==='function')updateAttackCooldown(dt);updateBoats(dt);updateTarget();
  const inHead=isInWater(PLAYER.eye-0.1);document.getElementById('water-tint').style.opacity=inHead?'1':'0';
  return;
}
// While riding a minecart, cart physics drives the player position along the rails.
if(typeof ridingCart!=='undefined'&&ridingCart){
  if(mining.active||mining.progress>0){mining.active=false;resetMining();}
  updateCamera();updatePlayerModel(dt);updateMobs(dt);if(typeof updateAttackCooldown==='function')updateAttackCooldown(dt);if(typeof updateMinecarts==='function')updateMinecarts(dt);updateTarget();
  const inHead=isInWater(PLAYER.eye-0.1);document.getElementById('water-tint').style.opacity=inHead?'1':'0';
  return;
}
let mx=0,mz=0;if(keys['KeyW'])mz+=1;if(keys['KeyS'])mz-=1;if(keys['KeyA'])mx-=1;if(keys['KeyD'])mx+=1;if(joy.active){mx+=joy.x;mz+=-joy.y;}
const mlen=Math.hypot(mx,mz);if(mlen>1){mx/=mlen;mz/=mlen;}
const sin=Math.sin(player.yaw),cos=Math.cos(player.yaw);const dirX=mx*cos+mz*sin,dirZ=-mx*sin+mz*cos;const inWaterBody=isInWater(0.5);const inWaterHead=isInWater(PLAYER.eye-0.1);if(inWaterHead&&typeof ACH!=='undefined')ACH.flag('swim');const sprint=(!!keys['ShiftLeft']||!!keys['ShiftRight'])&&player.pose===POSE.STAND;let speed=player.flying?10:(sprint?6.6:4.3);
// Combat: apply status effect speed modifier
if(typeof getCombatSpeedMod==='function') speed*=getCombatSpeedMod();
// Crouch slows movement (sneak speed)
if(!player.flying&&player.pose===POSE.CROUCH)speed*=0.5;
// Heavy ground (lead ore): standing on a heavy block magnifies gravity & weakens jumps.
const _hgX=Math.floor(player.pos.x),_hgZ=Math.floor(player.pos.z),_hgY=Math.floor(player.pos.y-0.2);
const _hgBlk=(typeof getBlock==='function')?getBlock(_hgX,_hgY,_hgZ):0;
const heavyGround=!!(BLOCKS[_hgBlk]&&BLOCKS[_hgBlk].heavy);
if(inWaterBody&&!player.flying)speed*=0.55;const accel=Math.min(1,dt*12);player.vel.x+=(dirX*speed-player.vel.x)*accel;player.vel.z+=(dirZ*speed-player.vel.z)*accel;if(player.flying){let vy=0;if(keys['Space'])vy+=8;if(keys['KeyC'])vy-=8;player.vel.y+=(vy-player.vel.y)*Math.min(1,dt*10);player.fallStartY=null;}else if(inWaterBody){player.vel.y+=GRAVITY*0.25*dt;if(player.vel.y<-2.5)player.vel.y=-2.5;if(keys['Space']){if(!isInWater(1.0)){player.vel.y=Math.max(player.vel.y,7.6);}else{player.vel.y=Math.min(player.vel.y+30*dt,4);}}
player.fallStartY=null;}else if(isInLava(0.5)){player.vel.y+=GRAVITY*0.18*dt;if(player.vel.y<-1.6)player.vel.y=-1.6;if(keys['Space'])player.vel.y=Math.min(player.vel.y+24*dt,3);player.fallStartY=null;}else{const gMult=heavyGround?1.7:1;player.vel.y+=GRAVITY*gMult*dt;if(player.vel.y<(heavyGround?-65:-50))player.vel.y=heavyGround?-65:-50;if(keys['Space']&&player.onGround){player.vel.y=heavyGround?5.4:8.2;player.onGround=false;}
if(player.vel.y<-0.1&&player.fallStartY===null)player.fallStartY=player.pos.y;}
const prevVy=player.vel.y;
// Sneak prevents falling off edges
const sneaking=player.pose!==POSE.STAND&&player.onGround&&!player.flying;
let sx0=player.pos.x,sz0=player.pos.z;
const hitX=moveAxis('x',player.vel.x*dt);if(sneaking&&!footSupported()){player.pos.x=sx0;player.vel.x=0;}
const hitZ=moveAxis('z',player.vel.z*dt);if(sneaking&&!footSupported()){player.pos.z=sz0;player.vel.z=0;}
if(hitX)player.vel.x=0;if(hitZ)player.vel.z=0;if(!player.flying&&inWaterBody&&(hitX||hitZ)&&mlen>0.05){player.vel.y=Math.max(player.vel.y,isInWater(1.0)?3.0:7.6);}
const hitY=moveAxis('y',player.vel.y*dt);player.onGround=false;if(hitY){if(prevVy<0){player.onGround=true;if(player.fallStartY!==null&&!inWaterBody&&!player.flying){const dist=player.fallStartY-player.pos.y;const dmg=Math.floor(dist-3.2);if(dmg>0)damage(dmg);}
player.fallStartY=null;}
player.vel.y=0;}
player.pos.x=Math.max(0.31,Math.min(WORLD_W-0.31,player.pos.x));player.pos.z=Math.max(0.31,Math.min(WORLD_D-0.31,player.pos.z));if(player.pos.y<-12){damage(100);player.pos.y=5;}
player.eatCooldown=Math.max(0,player.eatCooldown-dt);
// Re-evaluate crouch each frame: stand back up automatically once headroom clears.
if(typeof updateCrouchPose==='function')updateCrouchPose();
const moving=mlen>0.05;
if(typeof SFX!=='undefined'){if(moving&&player.onGround&&!player.flying&&!inWaterBody){player.stepTimer=(player.stepTimer||0)-dt;const interval=sprint?0.28:(player.pose===POSE.STAND?0.42:0.6);if(player.stepTimer<=0){player.stepTimer=interval;const gx=Math.floor(player.pos.x),gz=Math.floor(player.pos.z),gy=Math.floor(player.pos.y-0.2);let ground=getBlock(gx,gy,gz);if(!isSolid(ground))ground=getBlock(gx,gy-1,gz);SFX.footstep(ground);}}else if(player.flying||!player.onGround){player.stepTimer=0;}}
player.hungerTimer+=dt*(moving?(sprint?3.2:1.4):0.4);if(player.hungerTimer>22){player.hungerTimer=0;if(player.hunger>0){player.hunger--;updateVitalsUI();}}
if(player.hunger>=14&&player.hp<20){player.regenTimer+=dt;if(player.regenTimer>3.5){player.regenTimer=0;player.hp=Math.min(20,player.hp+1);updateVitalsUI();}}else player.regenTimer=0;if(player.hunger<=0){player.starveTimer+=dt;if(player.starveTimer>4){player.starveTimer=0;if(player.hp>1)damage(1);}}else player.starveTimer=0;if(inWaterHead){player.idleTimer+=dt;if(player.idleTimer>8){player.idleTimer=6.5;damage(1);}}else player.idleTimer=0;
// Lava burns: standing in / touching lava deals rapid damage.
if(!player.flying&&(isInLava(0.2)||isInLava(0.9))){player.lavaTimer=(player.lavaTimer||0)+dt;if(player.lavaTimer>0.5){player.lavaTimer=0;if(typeof STATUS_EFFECTS==='undefined'||!STATUS_EFFECTS.isFireResistant())damage(3,'fire');}}else player.lavaTimer=0;
if(typeof SFX!=='undefined'){if(inWaterBody&&!player._wasInWater)SFX.splash();player._wasInWater=inWaterBody;}
updateCamera();updatePlayerModel(dt);updateMobs(dt);if(typeof updateAttackCooldown==='function')updateAttackCooldown(dt);if(typeof updateBoats==='function')updateBoats(dt);if(typeof updateMinecarts==='function')updateMinecarts(dt);if(typeof updateFishing==='function')updateFishing(dt);if(typeof updateCombatSystems==='function')updateCombatSystems(dt);updateTarget();updateMining(dt);document.getElementById('water-tint').style.opacity=inWaterHead?'1':'0';}
// Update camera position based on view mode
function updateCamera(){const eyeX=player.pos.x,eyeY=player.pos.y+PLAYER.eye,eyeZ=player.pos.z;const view=(typeof cameraView!=='undefined')?cameraView:0;if(view===0){camera.position.set(eyeX,eyeY,eyeZ);camera.rotation.set(player.pitch,player.yaw,0);return;}
const cp=Math.cos(player.pitch),sp=Math.sin(player.pitch),sy=Math.sin(player.yaw),cy=Math.cos(player.yaw);
const fwd={x:cp*sy,y:-sp,z:cp*cy};const sign=(view===1)?-1:1;let dist=4.2;
for(let d=0.3;d<=dist;d+=0.2){const tx=eyeX+fwd.x*sign*d,ty=eyeY+fwd.y*sign*d,tz=eyeZ+fwd.z*sign*d;if(isSolid(getBlock(Math.floor(tx),Math.floor(ty),Math.floor(tz)))){dist=Math.max(0.6,d-0.3);break;}}
camera.position.set(eyeX+fwd.x*sign*dist,eyeY+fwd.y*sign*dist,eyeZ+fwd.z*sign*dist);
if(view===1)camera.rotation.set(player.pitch,player.yaw,0);
else camera.rotation.set(-player.pitch,player.yaw+Math.PI,0);}
// Chunk streaming is driven from the render loop (below) — not from updateHUD.
// updateHUD only updates on-screen text every 250 ms.
let hudTimer=0;function updateHUD(dt){if(!worldReady)return;hudTimer+=dt;if(hudTimer<0.25)return;hudTimer=0;{const fps=engine.getFps();let txt=`FPS: ${fps.toFixed(0)}`;if(typeof PERF!=='undefined'&&PERF.isEnabled()){const s=PERF.stats();txt+=` · D${s.dist}`;}document.getElementById('fps-display').textContent=txt;}document.getElementById('pos-display').textContent=`X: ${player.pos.x.toFixed(0)} Y: ${player.pos.y.toFixed(0)} Z: ${player.pos.z.toFixed(0)}`;const bx=Math.floor(player.pos.x),bz=Math.floor(player.pos.z);const bio=(bx>=0&&bx<WORLD_W&&bz>=0&&bz<WORLD_D)?biomeMap[colIndex(bx,bz)]:biomeAt(bx,bz);document.getElementById('biome-display').textContent=BIOME_NAME[bio];
// Flag the current biome as visited for exploration achievements.
if(started&&worldReady&&typeof ACH!=='undefined'&&typeof BIOME!=='undefined'){
  const BIOME_ACH=['biome_plains','biome_forest','biome_desert','biome_snowy','biome_mountains','biome_ocean','biome_jungle','biome_swamp','biome_mesa','biome_volcano',
    null,null,null,null,null,null,null,null,null,null,
    'biome_crystal','biome_withered','biome_coral','biome_floating'];
  if(BIOME_ACH[bio])ACH.flag(BIOME_ACH[bio]);
}
// FIX: Moved chunk streaming out of updateHUD. It was called every 250ms here
// AND driven by the render loop, causing double-work and FPS spikes.
}
// Render loop is started immediately, but gameplay (update) is gated by the
// `started` flag and `worldReady`, so the loop just paints the loading sky
// until generation finishes. This avoids blocking the main thread.
let worldReady=false;
function setLoadProgress(frac,label){const fill=document.getElementById('loading-bar-fill');const pct=document.getElementById('loading-percent');const st=document.getElementById('loading-status');if(fill)fill.style.width=(frac*100).toFixed(0)+'%';if(pct)pct.textContent=(frac*100).toFixed(0)+'%';if(st&&label)st.textContent=label;}
async function bootstrap(){
  if(typeof applyLanguageToUI==='function')applyLanguageToUI();
  // Resolve the active world's seed / schema before generating terrain.
  if(typeof loadActiveWorld==='function')loadActiveWorld();
  if(typeof ACH!=='undefined'&&typeof ACH.load==='function')ACH.load();
  if(typeof XP!=='undefined'&&typeof XP.load==='function')XP.load();
  await generateWorldAsync(setLoadProgress);
  loadEdits();
  // spawnPoint is the "fresh start" / respawn location (always ground level).
  spawnPoint=findSpawn();
  // If this world has a saved player position, resume exactly there; otherwise
  // start at the computed spawn point.
  if(!(typeof loadPlayerState==='function'&&loadPlayerState())){
    player.pos.copyFrom(spawnPoint);
  }
  // Bake the correct day brightness into chunks BEFORE the initial meshing so
  // the terrain loads at the right light level (instead of a daytime default).
  {const angle=(dayTime/DAY_LENGTH)*Math.PI*2;const sunUp=Math.sin(angle);const dayF=Math.max(0,Math.min(1,sunUp*2+0.2));if(typeof setDayLight!=='undefined')setDayLight(dayF);}
  // Stream nearby chunks in batches across frames so meshing never freezes.
  setLoadProgress(1.0,'Rendering terrain...');
  await new Promise(r=>requestAnimationFrame(()=>r()));
  // Mesh only the chunks the player can immediately see (the full view box is
  // (2*VIEW_DIST+1)^2 chunks). Build several per frame so the loading screen
  // stays smooth; remaining far chunks stream in lazily during play. The budget
  // is larger here than during play because the loading overlay is shown and a
  // hidden scene can absorb more meshing work without dropping visible frames.
    const need=(INITIAL_LOAD_CHUNKS*2+1)*(INITIAL_LOAD_CHUNKS*2+1);
  let metaBuilt=0,guard=0;
  while(guard++<600){
    const n=updateChunkStreaming(8,INITIAL_LOAD_CHUNKS);
    metaBuilt+=n;
    setLoadProgress(Math.min(1,metaBuilt/need),'Rendering terrain...');
    await new Promise(r=>requestAnimationFrame(()=>r()));
    if(n===0)break; // all initial chunks meshed
  }
  loadInventory();createInventoryUI();renderHotbar();updateVitalsUI();if(typeof initAchievementsUI==='function')initAchievementsUI();
  if(typeof loadChestData==='function')loadChestData();
  if(typeof loadFurnaceData==='function')loadFurnaceData();
  // Combat systems: armor, shield, bow, status effects, potions
  if(typeof initCombatUI==='function'){loadArmorFromSave();initCombatUI();}
  applyPose();if(typeof buildPlayerModel==='function')buildPlayerModel();if(typeof trySpawnMobs==='function'){trySpawnMobs();trySpawnMobs();}
  if(typeof LIGHTING!=='undefined')LIGHTING.init();
  // Settings: bind UI + apply persisted language / render distance / quality.
  if(typeof initSettingsUI==='function')initSettingsUI();
  if(typeof applyRenderDistance==='function')applyRenderDistance();
  if(typeof applyLowQuality==='function')applyLowQuality();
  // PBR (HD textures + AO enhancement) — init after atlas is fully drawn.
  if(typeof PBR!=='undefined'&&PBR.init)PBR.init();
  if(typeof applyPBR==='function')applyPBR();
  // Built-in shadow-mod shader stack + god rays + restore any saved flight state.
  if(typeof SHADERFX!=='undefined'&&SHADERFX.init)SHADERFX.init();
  if(typeof applyShaders==='function')applyShaders();
  if(typeof applyGodRays==='function')applyGodRays();
  if(typeof applyFlying==='function')applyFlying();
  // HD Shader Mode: if saved ON, apply it now (forces quality + disables PERF)
  if(typeof applyHDShaderMode==='function'&&typeof SETTINGS!=='undefined'&&SETTINGS.hdShaderMode)applyHDShaderMode();
  worldReady=true;
  const lo=document.getElementById('loading-overlay');if(lo){lo.classList.add('hidden');setTimeout(()=>lo.remove(),450);}
}
if(isMobile){document.getElementById('start-help-pc').style.display='none';document.getElementById('start-help-mobile').style.display='block';}
// Boot flow: if a world is already active (e.g. user reloaded mid-game), jump
// straight into it; otherwise show the home / world-select screen. The home
// screen calls bootstrapWorld() once the user picks or creates a world.
let booted=false;
function bootstrapWorld(){if(booted)return;booted=true;document.body.classList.add('playing');const lo=document.getElementById('loading-overlay');if(lo){lo.classList.remove('hidden');lo.style.display='';}bootstrap();}
// Always start on the Home / world-select screen. Even if a world was left
// active from a previous session, we clear it so the player must explicitly
// pick (or create) a world from Home before entering the game.
if(typeof WORLDS!=='undefined'&&typeof WORLDS.clearActive==='function')WORLDS.clearActive();
if(typeof showHome==='function')showHome();
function startGame(){started=true;if(typeof SFX!=='undefined'){SFX.resume();SFX.startAmbient();}if(isMobile){paused=false;document.getElementById('start-overlay').style.display='none';}else{canvas.requestPointerLock();setTimeout(()=>{if(document.pointerLockElement!==canvas){paused=false;document.getElementById('start-overlay').style.display='none';}},300);}}
{const sb=document.getElementById('btn-sound');if(sb){const sync=()=>{const m=typeof SFX!=='undefined'&&SFX.isMuted();sb.textContent=m?'🔇':'🔊';sb.classList.toggle('muted',m);};sb.addEventListener('click',(e)=>{e.stopPropagation();if(typeof SFX!=='undefined'){SFX.resume();SFX.setMuted(!SFX.isMuted());if(!SFX.isMuted())SFX.startAmbient();sync();}});sb.addEventListener('touchstart',(e)=>e.stopPropagation(),{passive:true});sync();}}
// Sign editor buttons
{const seOk=document.getElementById('sign-editor-ok');const seCancel=document.getElementById('sign-editor-cancel');const seInput=document.getElementById('sign-editor-input');const sePreview=document.getElementById('sign-preview');if(seInput&&sePreview){seInput.addEventListener('input',()=>{sePreview.textContent=seInput.value;});}if(seOk)seOk.addEventListener('click',()=>{if(typeof closeSignEditor==='function')closeSignEditor(true);});if(seCancel)seCancel.addEventListener('click',()=>{if(typeof closeSignEditor==='function')closeSignEditor(false);});}
document.getElementById('btn-start').addEventListener('click',(e)=>{e.stopPropagation();startGame();});document.getElementById('start-overlay').addEventListener('click',startGame);{const hb=document.getElementById('btn-home');if(hb)hb.addEventListener('click',(e)=>{e.stopPropagation();if(typeof savePlayerState==='function')savePlayerState();if(typeof WORLDS!=='undefined')WORLDS.clearActive();location.reload();});}
// Persist the player's position when leaving the page (reload / tab close) so a
// world always resumes where it was left off.
window.addEventListener('beforeunload',()=>{if(typeof savePlayerState==='function')savePlayerState();if(typeof XP!=='undefined'&&typeof XP.save==='function')XP.save();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){if(typeof savePlayerState==='function')savePlayerState();if(typeof XP!=='undefined'&&typeof XP.save==='function')XP.save();}});
document.getElementById('btn-reset-world').addEventListener('click',(e)=>{e.stopPropagation();if(confirm(typeof t==='function'?t('resetConfirm'):'Reset the world? All builds will be lost.')){if(typeof WORLDS!=='undefined'){WORLDS.removeItem('edits');WORLDS.removeItem('inventory');WORLDS.removeItem('crops');WORLDS.removeItem('ach_stats');WORLDS.removeItem('ach_done');WORLDS.removeItem('player');}if(typeof ACH!=='undefined')ACH.reset();location.reload();}});let _posSaveAcc=0;engine.runRenderLoop(()=>{const dt=Math.min(0.05,engine.getDeltaTime()/1000);update(dt);if(typeof FLUID!=='undefined')FLUID.update(dt);if(typeof FARM!=='undefined'&&worldReady&&started){FARM.update(dt);FARM.updateFarmlandWetness(dt);}if(worldReady&&started&&typeof updateCopperOxidation!=='undefined')updateCopperOxidation(dt);
if(worldReady&&started&&typeof REDSTONE!=='undefined'){REDSTONE.update(dt);REDSTONE.updateHoppers(dt);}
if(worldReady&&started&&typeof DECORATIONS!=='undefined')DECORATIONS.update(dt);
updateDayNight(dt);if(worldReady){
// FIX: Chunk streaming moved here from updateHUD so it runs once per render loop.
// Budget of 2 per frame keeps frame time predictable; new chunks appear smoothly.
if(typeof updateChunkStreaming==='function')updateChunkStreaming(2);
if(typeof processRelightQueue!=='undefined')processRelightQueue(2);
if(typeof LIGHTING!=='undefined')LIGHTING.update(dt);if(typeof SHADERFX!=='undefined'){const dayF=(typeof LIGHTING!=='undefined')?LIGHTING.getNightFactor():1;SHADERFX.update(dt,dayF);}updateAudioEnvironment(dt);if(typeof updatePetals==='function')updatePetals(dt);if(typeof updateWindmills==='function')updateWindmills(dt);if(typeof PERF!=='undefined')PERF.update(dt);}
// Periodically persist player position (every ~5s of play) so an unexpected
// crash / close still resumes near where the player was.
if(worldReady&&started&&!paused){_posSaveAcc+=dt;if(_posSaveAcc>=5){_posSaveAcc=0;if(typeof savePlayerState==='function')savePlayerState();if(typeof XP!=='undefined'&&typeof XP.save==='function')XP.save();}}
updateHUD(dt);
if(typeof EXPLORATION!=='undefined'&&worldReady&&started)EXPLORATION.update();
scene.render();});
// Cherry-blossom petals & falling leaves now live in js/effects/particles.js
// Update ambient audio state
// FIX: Cache underground check — skyExposed scans the full column every call.
// Re-evaluate only every ~0.5s or when the player moves vertically.
let _audioEnvTimer=0;let _cachedUnderground=false;let _lastAudioY=-999;
function updateAudioEnvironment(dt){if(typeof SFX==='undefined')return;
_audioEnvTimer-=dt;
const py=Math.floor(player.pos.y+1);
if(_audioEnvTimer<=0||Math.abs(py-_lastAudioY)>2){
  _audioEnvTimer=0.5;_lastAudioY=py;
  const px=Math.floor(player.pos.x),pz=Math.floor(player.pos.z);
  _cachedUnderground=!(typeof skyExposed==='function'&&skyExposed(px,py,pz));
}
const nearWater=false;
const dayF=(typeof LIGHTING!=='undefined')?LIGHTING.getNightFactor():1;SFX.updateAmbient(dt,{underground:_cachedUnderground,nearWater,daylight:dayF});}function setAppHeight(){const vv=window.visualViewport,h=vv?vv.height:window.innerHeight,top=vv?vv.offsetTop:0;const bottom=Math.max(0,window.innerHeight-h-top);const root=document.documentElement.style;root.setProperty('--app-height',h+'px');root.setProperty('--vv-top',top+'px');root.setProperty('--vv-bottom',bottom+'px');engine.resize();}
window.addEventListener('resize',setAppHeight);window.addEventListener('orientationchange',()=>setTimeout(setAppHeight,100));if(window.visualViewport){window.visualViewport.addEventListener('resize',setAppHeight);window.visualViewport.addEventListener('scroll',()=>window.scrollTo(0,0));}
setAppHeight();window.addEventListener('scroll',()=>window.scrollTo(0,0),{passive:true});document.addEventListener('touchmove',(e)=>{if(e.touches.length>1){e.preventDefault();return;}
if(e.target.closest&&e.target.closest('#inventory-panel,#recipe-panel'))return;e.preventDefault();},{passive:false});let lastTouchEnd=0;document.addEventListener('touchend',(e)=>{const now=Date.now();if(now-lastTouchEnd<350&&!e.target.closest('#inventory-overlay'))e.preventDefault();lastTouchEnd=now;},{passive:false});document.addEventListener('gesturestart',(e)=>e.preventDefault());document.addEventListener('gesturechange',(e)=>e.preventDefault());
