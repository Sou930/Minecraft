const DAY_LENGTH=240;let dayTime=DAY_LENGTH*0.25;const skyDay=new BABYLON.Color3(0.53,0.81,0.92);const skyNight=new BABYLON.Color3(0.03,0.05,0.13);function updateDayNight(dt){dayTime=(dayTime+dt)%DAY_LENGTH;const angle=(dayTime/DAY_LENGTH)*Math.PI*2;const sunUp=Math.sin(angle);const dayF=Math.max(0,Math.min(1,sunUp*2+0.2));sunLight.direction=new BABYLON.Vector3(-Math.cos(angle)*0.6,-Math.max(0.15,sunUp),-0.35).normalize();sunLight.intensity=0.75*Math.max(0,sunUp);hemiLight.intensity=0.25+0.6*dayF;const sky=BABYLON.Color3.Lerp(skyNight,skyDay,dayF);scene.clearColor=new BABYLON.Color4(sky.r,sky.g,sky.b,1);scene.fogColor=sky;const SKY_DIST=230;const sx=Math.cos(angle)*0.6,sy=sunUp,sz=0.35;const sl=Math.hypot(sx,sy,sz);sunMesh.position.set(camera.position.x+(sx/sl)*SKY_DIST,camera.position.y+(sy/sl)*SKY_DIST,camera.position.z+(sz/sl)*SKY_DIST);sunMesh.setEnabled(sunUp>-0.12);moonMesh.position.set(camera.position.x-(sx/sl)*SKY_DIST,camera.position.y-(sy/sl)*SKY_DIST,camera.position.z-(sz/sl)*SKY_DIST);moonMesh.setEnabled(sunUp<0.12);const td=document.getElementById('time-display');td.textContent=sunUp>0.15?'☀ 昼':(sunUp<-0.15?'🌙 夜':(Math.cos(angle)>0?'🌅 朝':'🌇 夕方'));}
const GRAVITY=-24;function update(dt){if(!worldReady||!started||player.dead)return;if(paused&&!isMobile)return;if(inventoryOpen){if(mining.active||mining.progress>0){mining.active=false;resetMining();}
return;}
let mx=0,mz=0;if(keys['KeyW'])mz+=1;if(keys['KeyS'])mz-=1;if(keys['KeyA'])mx-=1;if(keys['KeyD'])mx+=1;if(joy.active){mx+=joy.x;mz+=-joy.y;}
const mlen=Math.hypot(mx,mz);if(mlen>1){mx/=mlen;mz/=mlen;}
const sin=Math.sin(player.yaw),cos=Math.cos(player.yaw);const dirX=mx*cos+mz*sin,dirZ=-mx*sin+mz*cos;const inWaterBody=isInWater(0.5);const inWaterHead=isInWater(PLAYER.eye-0.1);const sprint=!!keys['ShiftLeft']||!!keys['ShiftRight'];let speed=player.flying?10:(sprint?6.6:4.3);if(inWaterBody&&!player.flying)speed*=0.55;const accel=Math.min(1,dt*12);player.vel.x+=(dirX*speed-player.vel.x)*accel;player.vel.z+=(dirZ*speed-player.vel.z)*accel;if(player.flying){let vy=0;if(keys['Space'])vy+=8;if(keys['KeyC'])vy-=8;player.vel.y+=(vy-player.vel.y)*Math.min(1,dt*10);player.fallStartY=null;}else if(inWaterBody){player.vel.y+=GRAVITY*0.25*dt;if(player.vel.y<-2.5)player.vel.y=-2.5;if(keys['Space']){if(!isInWater(1.0)){player.vel.y=Math.max(player.vel.y,7.6);}else{player.vel.y=Math.min(player.vel.y+30*dt,4);}}
player.fallStartY=null;}else if(isInLava(0.5)){player.vel.y+=GRAVITY*0.18*dt;if(player.vel.y<-1.6)player.vel.y=-1.6;if(keys['Space'])player.vel.y=Math.min(player.vel.y+24*dt,3);player.fallStartY=null;}else{player.vel.y+=GRAVITY*dt;if(player.vel.y<-50)player.vel.y=-50;if(keys['Space']&&player.onGround){player.vel.y=8.2;player.onGround=false;}
if(player.vel.y<-0.1&&player.fallStartY===null)player.fallStartY=player.pos.y;}
const prevVy=player.vel.y;const hitX=moveAxis('x',player.vel.x*dt);const hitZ=moveAxis('z',player.vel.z*dt);if(hitX)player.vel.x=0;if(hitZ)player.vel.z=0;if(!player.flying&&inWaterBody&&(hitX||hitZ)&&mlen>0.05){player.vel.y=Math.max(player.vel.y,isInWater(1.0)?3.0:7.6);}
const hitY=moveAxis('y',player.vel.y*dt);player.onGround=false;if(hitY){if(prevVy<0){player.onGround=true;if(player.fallStartY!==null&&!inWaterBody&&!player.flying){const dist=player.fallStartY-player.pos.y;const dmg=Math.floor(dist-3.2);if(dmg>0)damage(dmg);}
player.fallStartY=null;}
player.vel.y=0;}
player.pos.x=Math.max(0.31,Math.min(WORLD_W-0.31,player.pos.x));player.pos.z=Math.max(0.31,Math.min(WORLD_D-0.31,player.pos.z));if(player.pos.y<-12){damage(100);player.pos.y=5;}
player.eatCooldown=Math.max(0,player.eatCooldown-dt);const moving=mlen>0.05;player.hungerTimer+=dt*(moving?(sprint?3.2:1.4):0.4);if(player.hungerTimer>22){player.hungerTimer=0;if(player.hunger>0){player.hunger--;updateVitalsUI();}}
if(player.hunger>=14&&player.hp<20){player.regenTimer+=dt;if(player.regenTimer>3.5){player.regenTimer=0;player.hp=Math.min(20,player.hp+1);updateVitalsUI();}}else player.regenTimer=0;if(player.hunger<=0){player.starveTimer+=dt;if(player.starveTimer>4){player.starveTimer=0;if(player.hp>1)damage(1);}}else player.starveTimer=0;if(inWaterHead){player.idleTimer+=dt;if(player.idleTimer>8){player.idleTimer=6.5;damage(1);}}else player.idleTimer=0;
// Lava burns: standing in / touching lava deals rapid damage.
if(!player.flying&&(isInLava(0.2)||isInLava(0.9))){player.lavaTimer=(player.lavaTimer||0)+dt;if(player.lavaTimer>0.5){player.lavaTimer=0;damage(3);}}else player.lavaTimer=0;camera.position.set(player.pos.x,player.pos.y+PLAYER.eye,player.pos.z);camera.rotation.set(player.pitch,player.yaw,0);updateTarget();updateMining(dt);document.getElementById('water-tint').style.opacity=inWaterHead?'1':'0';}
let hudTimer=0;function updateHUD(dt){if(!worldReady)return;hudTimer+=dt;if(hudTimer<0.25)return;hudTimer=0;document.getElementById('fps-display').textContent=`FPS: ${engine.getFps().toFixed(0)}`;document.getElementById('pos-display').textContent=`X: ${player.pos.x.toFixed(0)} Y: ${player.pos.y.toFixed(0)} Z: ${player.pos.z.toFixed(0)}`;const bx=Math.floor(player.pos.x),bz=Math.floor(player.pos.z);const bio=(bx>=0&&bx<WORLD_W&&bz>=0&&bz<WORLD_D)?biomeMap[colIndex(bx,bz)]:biomeAt(bx,bz);document.getElementById('biome-display').textContent=BIOME_NAME[bio];updateChunkStreaming(4);}
// Render loop is started immediately, but gameplay (update) is gated by the
// `started` flag and `worldReady`, so the loop just paints the loading sky
// until generation finishes. This avoids blocking the main thread.
let worldReady=false;
function setLoadProgress(frac,label){const fill=document.getElementById('loading-bar-fill');const pct=document.getElementById('loading-percent');const st=document.getElementById('loading-status');if(fill)fill.style.width=(frac*100).toFixed(0)+'%';if(pct)pct.textContent=(frac*100).toFixed(0)+'%';if(st&&label)st.textContent=label;}
async function bootstrap(){
  await generateWorldAsync(setLoadProgress);
  loadEdits();
  spawnPoint=findSpawn();player.pos.copyFrom(spawnPoint);
  // Stream nearby chunks in batches across frames so meshing never freezes.
  setLoadProgress(1.0,'地形を描画中...');
  await new Promise(r=>requestAnimationFrame(()=>r()));
  // Mesh only the chunks the player can immediately see (the full view box is
  // (2*VIEW_DIST+1)^2 chunks). Build a few per frame so the loading screen
  // stays smooth; remaining far chunks stream in lazily during play.
  const need=(VIEW_DIST_CHUNKS*2+1)*(VIEW_DIST_CHUNKS*2+1);
  let metaBuilt=0,guard=0;
  while(guard++<600){
    const n=updateChunkStreaming(5);
    metaBuilt+=n;
    setLoadProgress(Math.min(1,metaBuilt/need),'地形を描画中...');
    await new Promise(r=>requestAnimationFrame(()=>r()));
    if(n===0)break; // all in-view chunks meshed
  }
  loadInventory();createInventoryUI();renderHotbar();updateVitalsUI();
  worldReady=true;
  const lo=document.getElementById('loading-overlay');if(lo){lo.classList.add('hidden');setTimeout(()=>lo.remove(),450);}
}
if(isMobile){document.getElementById('start-help-pc').style.display='none';document.getElementById('start-help-mobile').style.display='block';}
bootstrap();
function startGame(){started=true;if(isMobile){paused=false;document.getElementById('start-overlay').style.display='none';}else{canvas.requestPointerLock();setTimeout(()=>{if(document.pointerLockElement!==canvas){paused=false;document.getElementById('start-overlay').style.display='none';}},300);}}
document.getElementById('btn-start').addEventListener('click',(e)=>{e.stopPropagation();startGame();});document.getElementById('start-overlay').addEventListener('click',startGame);document.getElementById('btn-reset-world').addEventListener('click',(e)=>{e.stopPropagation();if(confirm('ワールドを初期化しますか？建築した内容はすべて消えます。')){localStorage.removeItem('bw_edits');localStorage.removeItem('bw_seed');localStorage.removeItem('bw_inventory');localStorage.removeItem('bw_crops');location.reload();}});engine.runRenderLoop(()=>{const dt=Math.min(0.05,engine.getDeltaTime()/1000);update(dt);if(typeof FLUID!=='undefined')FLUID.update(dt);if(typeof FARM!=='undefined'&&worldReady&&started){FARM.update(dt);FARM.updateFarmlandWetness(dt);}updateDayNight(dt);updateHUD(dt);scene.render();});function setAppHeight(){const vv=window.visualViewport,h=vv?vv.height:window.innerHeight,top=vv?vv.offsetTop:0;const bottom=Math.max(0,window.innerHeight-h-top);const root=document.documentElement.style;root.setProperty('--app-height',h+'px');root.setProperty('--vv-top',top+'px');root.setProperty('--vv-bottom',bottom+'px');engine.resize();}
window.addEventListener('resize',setAppHeight);window.addEventListener('orientationchange',()=>setTimeout(setAppHeight,100));if(window.visualViewport){window.visualViewport.addEventListener('resize',setAppHeight);window.visualViewport.addEventListener('scroll',()=>window.scrollTo(0,0));}
setAppHeight();window.addEventListener('scroll',()=>window.scrollTo(0,0),{passive:true});document.addEventListener('touchmove',(e)=>{if(e.touches.length>1){e.preventDefault();return;}
if(e.target.closest&&e.target.closest('#inventory-panel,#recipe-panel'))return;e.preventDefault();},{passive:false});let lastTouchEnd=0;document.addEventListener('touchend',(e)=>{const now=Date.now();if(now-lastTouchEnd<350&&!e.target.closest('#inventory-overlay'))e.preventDefault();lastTouchEnd=now;},{passive:false});document.addEventListener('gesturestart',(e)=>e.preventDefault());document.addEventListener('gesturechange',(e)=>e.preventDefault());
