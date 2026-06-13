"use strict";
// ===== entities.js =====
// 動物モブ + 3人称用プレイヤーモデル。
// Babylon のボックスを組み合わせた "Minecraft 風" の単色キャラクターを作る。

// 単色マテリアルのキャッシュ（色ごとに1つ）
const _mobMats={};
function mobMat(hex){if(_mobMats[hex])return _mobMats[hex];const m=new BABYLON.StandardMaterial('mobMat_'+hex,scene);const c=BABYLON.Color3.FromHexString(hex);m.diffuseColor=c;m.emissiveColor=c.scale(0.35);m.specularColor=new BABYLON.Color3(0,0,0);_mobMats[hex]=m;return m;}

// 直方体パーツを作る。size は [w,h,d]（ワールド単位）、pos はルートからの相対位置(中心)。
function makePart(parent,name,size,pos,hex){const box=BABYLON.MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene);box.material=mobMat(hex);box.isPickable=false;box.parent=parent;box.position.set(pos[0],pos[1],pos[2]);return box;}

// ===== 動物モブ定義 =====
// scale: 全体の大きさ。color: 体色。各動物に脚4本＋頭＋胴。
const MOB_TYPES={
  pig:   {name:'ブタ',  emoji:'🐷', body:'#e89bb0', leg:'#d98aa0', head:'#e89bb0', snout:'#d97a92', bodyH:0.7, legH:0.45, headSize:0.55, speed:1.4, hp:10},
  sheep: {name:'ヒツジ',emoji:'🐑', body:'#eef0ee', leg:'#6b6f72', head:'#e6e2da', snout:null,      bodyH:0.8, legH:0.5,  headSize:0.5,  speed:1.2, hp:8, fluffy:true},
  cow:   {name:'ウシ',  emoji:'🐮', body:'#5a4636', leg:'#3f3228', head:'#5a4636', snout:'#d7c5b0', bodyH:0.85,legH:0.55, headSize:0.55, speed:1.1, hp:12, patch:'#efeae2'},
  chicken:{name:'ニワトリ',emoji:'🐔',body:'#f2f2f2', leg:'#e0a23a', head:'#f2f2f2', snout:'#e0a23a',bodyH:0.45,legH:0.25, headSize:0.32, speed:1.6, hp:4, small:true},
};

// モブのメッシュ階層を作る（ルート=TransformNode）。
function buildMobMesh(type){
  const t=MOB_TYPES[type];const root=new BABYLON.TransformNode('mob_'+type,scene);
  const s=t.small?0.8:1;
  const bodyW=0.6*s,bodyD=1.0*s,bodyH=t.bodyH*s;
  const legY=t.legH*s;
  // 胴体
  const body=makePart(root,'body',[bodyW,bodyH,bodyD],[0,legY+bodyH/2,0],t.body);
  if(t.patch){const p=makePart(root,'patch',[bodyW+0.02,bodyH*0.5,bodyD*0.45],[0,legY+bodyH*0.55,0.05],t.patch);}
  if(t.fluffy){body.scaling.x=1.25;body.scaling.y=1.15;}
  // 頭（前方 +Z 側）
  const hs=t.headSize*s;
  const headGroup=new BABYLON.TransformNode('headGroup',scene);headGroup.parent=root;headGroup.position.set(0,legY+bodyH*0.75,bodyD/2+hs*0.35);
  const head=makePart(headGroup,'head',[hs,hs,hs],[0,0,0],t.head);
  if(t.snout)makePart(headGroup,'snout',[hs*0.5,hs*0.45,hs*0.4],[0,-hs*0.1,hs*0.55],t.snout);
  // 目
  makePart(headGroup,'eyeL',[hs*0.16,hs*0.16,0.02],[-hs*0.25,hs*0.15,hs*0.5],'#1a1a1a');
  makePart(headGroup,'eyeR',[hs*0.16,hs*0.16,0.02],[ hs*0.25,hs*0.15,hs*0.5],'#1a1a1a');
  if(type==='chicken'){makePart(headGroup,'comb',[hs*0.3,hs*0.25,hs*0.5],[0,hs*0.6,0],'#d23b3b');}
  // 脚 4本（アニメーション用に個別ノード）
  const legs=[];const lw=0.18*s,ld=0.18*s;const lx=bodyW/2-lw/2,lz=bodyD/2-ld*1.1;
  const legPos=[[-lx,lz],[lx,lz],[-lx,-lz],[lx,-lz]];
  for(let i=0;i<4;i++){const pivot=new BABYLON.TransformNode('legPivot'+i,scene);pivot.parent=root;pivot.position.set(legPos[i][0],legY,legPos[i][1]);const leg=makePart(pivot,'leg'+i,[lw,legY,ld],[0,-legY/2,0],t.leg);legs.push(pivot);}
  return {root,legs,head:headGroup,bodyH:legY};
}

// ===== モブ個体管理 =====
const mobs=[];
const MAX_MOBS=18;
const MOB_TICK={spawnTimer:0};

function spawnHeightAt(x,z){for(let y=WORLD_H-2;y>1;y--){const id=getBlock(x,y,z);if(id===B.WATER||id===B.LAVA)return null;if(isSolid(id)){if(getBlock(x,y+1,z)===B.AIR&&getBlock(x,y+2,z)===B.AIR)return y+1;return null;}}return null;}

function pickAnimalType(){const r=Math.random();if(r<0.3)return 'pig';if(r<0.6)return 'sheep';if(r<0.82)return 'cow';return 'chicken';}

function spawnMob(type,x,y,z){const meshes=buildMobMesh(type);const t=MOB_TYPES[type];const mob={type,t,meshes,pos:new BABYLON.Vector3(x+0.5,y,z+0.5),vel:new BABYLON.Vector3(0,0,0),yaw:Math.random()*Math.PI*2,onGround:false,wanderTimer:0,targetYaw:Math.random()*Math.PI*2,moving:false,walkPhase:0,hp:t.hp,halfW:0.32,height:Math.max(0.5,t.bodyH+t.legH)};meshes.root.position.copyFrom(mob.pos);mobs.push(mob);return mob;}

// プレイヤー周囲に動物を湧かせる（地表のみ・最大数まで）。
function trySpawnMobs(){if(mobs.length>=MAX_MOBS)return;if(typeof player==='undefined')return;for(let attempt=0;attempt<6&&mobs.length<MAX_MOBS;attempt++){const ang=Math.random()*Math.PI*2;const r=14+Math.random()*16;const x=Math.floor(player.pos.x+Math.cos(ang)*r);const z=Math.floor(player.pos.z+Math.sin(ang)*r);if(x<2||x>=WORLD_W-2||z<2||z>=WORLD_D-2)continue;const y=spawnHeightAt(x,z);if(y===null)continue;spawnMob(pickAnimalType(),x,y,z);}}

// モブ用の簡易当たり判定（軸ごとに移動して衝突補正）。
function mobMoveAxis(mob,axis,delta){if(delta===0)return false;mob.pos[axis]+=delta;const hw=mob.halfW,h=mob.height;const box={minX:mob.pos.x-hw,maxX:mob.pos.x+hw,minY:mob.pos.y,maxY:mob.pos.y+h,minZ:mob.pos.z-hw,maxZ:mob.pos.z+hw};let hit=false;const x0=Math.floor(box.minX),x1=Math.floor(box.maxX),y0=Math.floor(box.minY),y1=Math.floor(box.maxY),z0=Math.floor(box.minZ),z1=Math.floor(box.maxZ);for(let bx=x0;bx<=x1;bx++)for(let by=y0;by<=y1;by++)for(let bz=z0;bz<=z1;bz++){if(!isSolid(getBlock(bx,by,bz)))continue;hit=true;if(axis==='x')mob.pos.x=delta>0?bx-hw-0.001:bx+1+hw+0.001;if(axis==='z')mob.pos.z=delta>0?bz-hw-0.001:bz+1+hw+0.001;if(axis==='y')mob.pos.y=delta>0?by-h-0.001:by+1+0.001;return false;}return hit;}

const MOB_GRAVITY=-22;
function updateMobs(dt){if(!worldReady||!started)return;
  // 一定時間ごとに湧き＆遠すぎる個体を間引く
  MOB_TICK.spawnTimer+=dt;if(MOB_TICK.spawnTimer>3){MOB_TICK.spawnTimer=0;trySpawnMobs();despawnFarMobs();}
  for(const mob of mobs){updateOneMob(mob,dt);}
}

function despawnFarMobs(){for(let i=mobs.length-1;i>=0;i--){const m=mobs[i];const dx=m.pos.x-player.pos.x,dz=m.pos.z-player.pos.z;if(dx*dx+dz*dz>70*70){m.meshes.root.dispose();m.meshes.legs.forEach(l=>l.dispose&&l.dispose());mobs.splice(i,1);}}}

function updateOneMob(mob,dt){
  // ふらふら歩く: 一定時間で目標方向と「歩く/止まる」を切り替える
  mob.wanderTimer-=dt;if(mob.wanderTimer<=0){mob.wanderTimer=1.5+Math.random()*3;mob.moving=Math.random()<0.65;mob.targetYaw=Math.random()*Math.PI*2;}
  // プレイヤーが近すぎると軽く逃げる
  const dx=mob.pos.x-player.pos.x,dz=mob.pos.z-player.pos.z;const distSq=dx*dx+dz*dz;if(distSq<9){mob.targetYaw=Math.atan2(dx,dz);mob.moving=true;}
  // 向きを目標へ滑らかに回転
  let dy=mob.targetYaw-mob.yaw;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;mob.yaw+=dy*Math.min(1,dt*4);
  // 移動速度
  const sp=mob.moving?mob.t.speed:0;const wishX=Math.sin(mob.yaw)*sp,wishZ=Math.cos(mob.yaw)*sp;const accel=Math.min(1,dt*8);mob.vel.x+=(wishX-mob.vel.x)*accel;mob.vel.z+=(wishZ-mob.vel.z)*accel;
  // 重力
  mob.vel.y+=MOB_GRAVITY*dt;if(mob.vel.y<-40)mob.vel.y=-40;
  // 水中は浮く
  const inWater=getBlock(Math.floor(mob.pos.x),Math.floor(mob.pos.y+0.3),Math.floor(mob.pos.z))===B.WATER;if(inWater){mob.vel.y=Math.max(mob.vel.y,1.8);}
  // 前方が壁・崖ならジャンプ/方向転換
  const hitX=mobMoveAxis(mob,'x',mob.vel.x*dt);const hitZ=mobMoveAxis(mob,'z',mob.vel.z*dt);
  if((hitX||hitZ)&&mob.onGround){
    // 1ブロックの段差なら飛び越える、そうでなければ方向転換
    const fx=Math.floor(mob.pos.x+Math.sin(mob.yaw)*0.6),fz=Math.floor(mob.pos.z+Math.cos(mob.yaw)*0.6);const fy=Math.floor(mob.pos.y);
    if(isSolid(getBlock(fx,fy,fz))&&!isSolid(getBlock(fx,fy+1,fz))&&!isSolid(getBlock(fx,fy+2,fz))){mob.vel.y=7.0;}
    else{mob.targetYaw=mob.yaw+Math.PI*(0.5+Math.random());}
    if(hitX)mob.vel.x=0;if(hitZ)mob.vel.z=0;
  }
  const prevVy=mob.vel.y;const hitY=mobMoveAxis(mob,'y',mob.vel.y*dt);mob.onGround=false;if(hitY){if(prevVy<0)mob.onGround=true;mob.vel.y=0;}
  // 落下死防止: 奈落に落ちたら消す
  if(mob.pos.y<-5){mob.meshes.root.dispose();const i=mobs.indexOf(mob);if(i>=0)mobs.splice(i,1);return;}
  // メッシュへ反映
  mob.meshes.root.position.copyFrom(mob.pos);mob.meshes.root.rotation.y=mob.yaw;
  // 脚アニメーション
  const moving=Math.hypot(mob.vel.x,mob.vel.z)>0.3;if(moving){mob.walkPhase+=dt*8;}else{mob.walkPhase*=0.85;}
  const swing=Math.sin(mob.walkPhase)*0.5;mob.meshes.legs.forEach((leg,i)=>{const s=(i===0||i===3)?swing:-swing;leg.rotation.x=s;});
}

// ===== 3人称用プレイヤーモデル =====
let playerModel=null;
function buildPlayerModel(){const root=new BABYLON.TransformNode('playerModel',scene);
  // Steve 風: 頭/胴/腕2/脚2
  const skin='#c98e63',shirt='#3aa0c0',pants='#384a8c',hair='#3a2a18';
  const torso=makePart(root,'pm_torso',[0.5,0.75,0.28],[0,1.05,0],shirt);
  const headG=new BABYLON.TransformNode('pm_headG',scene);headG.parent=root;headG.position.set(0,1.62,0);
  makePart(headG,'pm_head',[0.5,0.5,0.5],[0,0,0],skin);
  makePart(headG,'pm_hair',[0.54,0.18,0.54],[0,0.2,0],hair);
  makePart(headG,'pm_eyeL',[0.08,0.08,0.02],[-0.12,0,0.26],'#1a1a1a');
  makePart(headG,'pm_eyeR',[0.08,0.08,0.02],[ 0.12,0,0.26],'#1a1a1a');
  // 腕（肩ピボット）
  const armL=new BABYLON.TransformNode('pm_armLp',scene);armL.parent=root;armL.position.set(-0.34,1.4,0);makePart(armL,'pm_armL',[0.18,0.7,0.22],[0,-0.35,0],shirt);
  const armR=new BABYLON.TransformNode('pm_armRp',scene);armR.parent=root;armR.position.set(0.34,1.4,0);makePart(armR,'pm_armR',[0.18,0.7,0.22],[0,-0.35,0],shirt);
  // 脚（股ピボット）
  const legL=new BABYLON.TransformNode('pm_legLp',scene);legL.parent=root;legL.position.set(-0.13,0.7,0);makePart(legL,'pm_legL',[0.2,0.7,0.24],[0,-0.35,0],pants);
  const legR=new BABYLON.TransformNode('pm_legRp',scene);legR.parent=root;legR.position.set(0.13,0.7,0);makePart(legR,'pm_legR',[0.2,0.7,0.24],[0,-0.35,0],pants);
  root.setEnabled(false);
  playerModel={root,torso,headG,armL,armR,legL,legR,walkPhase:0};
  return playerModel;
}
function setPlayerModelVisible(v){if(!playerModel)buildPlayerModel();playerModel.root.setEnabled(!!v);}
function updatePlayerModel(dt){if(!playerModel)buildPlayerModel();const view=(typeof cameraView!=='undefined')?cameraView:0;if(view===0){playerModel.root.setEnabled(false);return;}
  playerModel.root.setEnabled(true);
  // 姿勢に応じてモデルを縮める/傾ける
  const pose=player.pose;let scaleY=1,tilt=0,yOff=0;
  if(pose===POSE.CROUCH){scaleY=0.72;}
  else if(pose===POSE.PRONE){tilt=Math.PI*0.5*0.85;yOff=0;}
  playerModel.root.position.set(player.pos.x,player.pos.y,player.pos.z);
  playerModel.root.rotation.y=player.yaw;
  playerModel.root.rotation.x=tilt;
  playerModel.root.scaling.y=scaleY;
  // 頭を上下に向ける
  playerModel.headG.rotation.x=Math.max(-0.8,Math.min(0.8,player.pitch));
  // 歩行アニメ
  const moving=Math.hypot(player.vel.x,player.vel.z)>0.6;if(moving)playerModel.walkPhase+=dt*9;else playerModel.walkPhase*=0.8;
  const swing=Math.sin(playerModel.walkPhase)*0.6;
  playerModel.legL.rotation.x=swing;playerModel.legR.rotation.x=-swing;
  playerModel.armL.rotation.x=-swing;playerModel.armR.rotation.x=swing;
}
