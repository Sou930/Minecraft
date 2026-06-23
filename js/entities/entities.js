"use strict";
// Entity meshes: mobs and 3rd-person player model

// Solid colour material cache
const _mobMats={};
function mobMat(hex){if(_mobMats[hex])return _mobMats[hex];const m=new BABYLON.StandardMaterial('mobMat_'+hex,scene);const c=BABYLON.Color3.FromHexString(hex);m.diffuseColor=c;
  // Use a small flat ambient-style emissive (NOT proportional to the colour) so
  // bright/white mobs (sheep, chicken, wool, skeletons) don't visibly self-glow.
  // A constant low grey lift keeps dark mobs readable without making pale mobs
  // look like light sources. The scene's lighting does the real shading.
  const lum=0.2126*c.r+0.7152*c.g+0.0722*c.b;
  const e=0.08*(1-lum*0.6); // darker mobs get a touch more lift, light mobs almost none
  m.emissiveColor=new BABYLON.Color3(e,e,e);
  m.specularColor=new BABYLON.Color3(0,0,0);_mobMats[hex]=m;return m;}

// Create a box part relative to a parent node.
// `partList` (optional) collects every created box so callers can later apply a
// per-mesh hurt overlay (Minecraft-style red flash) without touching the shared
// material cache.
function makePart(parent,name,size,pos,hex,partList){const box=BABYLON.MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene);box.material=mobMat(hex);box.isPickable=false;box.parent=parent;box.position.set(pos[0],pos[1],pos[2]);if(partList)partList.push(box);return box;}

// Mob type definitions. Colours/proportions are tuned to echo the classic
// Minecraft animal silhouettes: a chunky horizontal body box, a cube head set
// at the front, four stubby legs and per-species details (snout, ears, horns,
// beak, wattle, wings, tail, wool).
const MOB_TYPES={
  pig:   {name:'Pig',  emoji:'🐷', body:'#e89bb0', leg:'#d98aa0', head:'#e89bb0', snout:'#d97a92', bodyH:0.7, legH:0.45, headSize:0.55, speed:1.4, hp:10, ears:'#d98aa0', drops:[{id:230,min:1,max:3}]},
  sheep: {name:'Sheep',emoji:'🐑', body:'#eef0ee', leg:'#5a4a3c', head:'#d9cfc2', snout:null,      bodyH:0.8, legH:0.5,  headSize:0.5,  speed:1.2, hp:8, fluffy:true, wool:'#f3f1ec', ears:'#cabfae', drops:[{id:233,min:1,max:2},{id:42,min:1,max:1}]},
  cow:   {name:'Cow',  emoji:'🐮', body:'#4a3a2c', leg:'#3a2d22', head:'#4a3a2c', snout:'#c9b6a0', bodyH:0.85,legH:0.55, headSize:0.55, speed:1.1, hp:12, patch:'#efeae2', horns:'#e8e0cf', ears:'#3a2d22', udder:'#e7a6ad', drops:[{id:231,min:1,max:3},{id:234,min:0,max:2}]},
  chicken:{name:'Chicken',emoji:'🐔',body:'#f2f2f2', leg:'#e0a23a', head:'#f2f2f2', snout:null,bodyH:0.55,legH:0.25, headSize:0.32, speed:1.6, hp:4, small:true, beak:'#e0a23a', wattle:'#d23b3b', wing:'#e2e2e2', bodyWidthMul:1.05, bodyDepthMul:0.62, drops:[{id:232,min:1,max:1},{id:235,min:0,max:2}]},
  // Wolf: neutral animal. Won't attack unless provoked (or its pack is hit).
  wolf:  {name:'Wolf', emoji:'🐺', body:'#9a9a9a', leg:'#8a8a8a', head:'#a6a6a6', snout:'#5a5a5a', bodyH:0.5, legH:0.42, headSize:0.46, speed:2.2, hp:16, ears:'#6e6e6e', tail:'#8a8a8a', wolf:true, neutral:true, attackDamage:3, attackRange:1.5, attackCooldown:0.9, sightRange:20, drops:[]},
  // --- Hostile humanoid mobs (spawn at night, attack the player) ----------
  ghoul:  {name:'Ghoul',  emoji:'🧟', humanoid:true, hostile:true, melee:true,
           skin:'#5a8f5a', shirt:'#2f4a78', pants:'#3a2f4a',
           speed:2.0, hp:18, attackDamage:3, attackRange:1.6, attackCooldown:1.0,
           sightRange:24, drops:[{id:230,min:0,max:2}]},
  bonearcher:{name:'Bone Archer', emoji:'💀', humanoid:true, hostile:true, ranged:true,
           skin:'#e6e6dd', shirt:'#cfcfc4', pants:'#bcbcb2',
           speed:1.7, hp:14, attackDamage:2, sightRange:28,
           shootRange:18, shootCooldown:1.8, keepDist:8, arrowSpeed:22,
           drops:[]},
  // --- Villager (村人) – passive NPC that lives in villages -------------------
  // Minecraft-style villager: large nose, brown robe, white apron, wanders
  // within the village bounds and flees hostile mobs. Right-clicking triggers
  // a simple trade greeting popup.
  villager:{name:'Villager', emoji:'🧑‍🌾', humanoid:true, hostile:false, villager:true,
           skin:'#c8996e',       // tan/olive skin
           shirt:'#6b4c2a',     // brown robe
           pants:'#4a3520',     // dark robe bottom
           speed:1.2, hp:20, sightRange:12, drops:[], wanderRadius:14,
           professions:['Farmer','Librarian','Blacksmith','Butcher','Priest']},
};

// Build a bipedal humanoid mesh (zombie / skeleton / villager style)
function buildHumanoidMesh(type){
  const t=MOB_TYPES[type];const root=new BABYLON.TransformNode('mob_'+type,scene);
  const parts=[];
  const legH=0.78,torsoH=0.7,torsoW=0.42,torsoD=0.24,hs=0.46;
  const torso=makePart(root,'torso',[torsoW,torsoH,torsoD],[0,legH+torsoH/2,0],t.shirt,parts);
  const headGroup=new BABYLON.TransformNode('headGroup',scene);headGroup.parent=root;
  headGroup.position.set(0,legH+torsoH+hs/2-0.02,0);
  makePart(headGroup,'head',[hs,hs,hs],[0,0,0],t.skin,parts);

  if(type==='villager'){
    // === Minecraft Villager features ===
    // Big distinctive nose (the defining Minecraft villager feature!)
    makePart(headGroup,'nose',[hs*0.22,hs*0.45,hs*0.38],[0,-hs*0.08,hs*0.58],'#b07848',parts);
    // Dark eyes
    makePart(headGroup,'eyeL',[hs*0.15,hs*0.18,0.03],[-hs*0.28,hs*0.1,hs*0.5],'#1a1a1a',parts);
    makePart(headGroup,'eyeR',[hs*0.15,hs*0.18,0.03],[ hs*0.28,hs*0.1,hs*0.5],'#1a1a1a',parts);
    // White apron/bib on the front of the robe
    makePart(root,'apron',[torsoW*0.55,torsoH*0.65,0.02],[0,legH+torsoH*0.44,torsoD*0.52],'#e8e4d8',parts);
    // Hood/collar – small box sitting on shoulders
    makePart(root,'collar',[torsoW+0.08,0.14,torsoD+0.06],[0,legH+torsoH-0.02,0],'#5a3e24',parts);
    // Villager robe hangs over the legs (wider bottom)
    makePart(root,'robeL',[0.18,legH*0.9,torsoD*1.1],[-torsoW*0.28+0.02,legH*0.55,0],'#6b4c2a',parts);
    makePart(root,'robeR',[0.18,legH*0.9,torsoD*1.1],[ torsoW*0.28-0.02,legH*0.55,0],'#6b4c2a',parts);
    // Villager arms hang straight down (no reaching forward)
    const armW=0.15,armH=0.65,armD=0.16;const shoulderY=legH+torsoH-0.06;
    const armL=new BABYLON.TransformNode('armLp',scene);armL.parent=root;armL.position.set(-(torsoW/2+armW/2),shoulderY,0);
    makePart(armL,'armL',[armW,armH,armD],[0,-armH/2,0],t.skin,parts);
    const armR=new BABYLON.TransformNode('armRp',scene);armR.parent=root;armR.position.set((torsoW/2+armW/2),shoulderY,0);
    makePart(armR,'armR',[armW,armH,armD],[0,-armH/2,0],t.skin,parts);
    const legW=0.18,legD=0.2;
    const legs=[];
    const legL=new BABYLON.TransformNode('legPivotL',scene);legL.parent=root;legL.position.set(-legW/2-0.01,legH,0);
    makePart(legL,'legL',[legW,legH,legD],[0,-legH/2,0],t.pants,parts);legs.push(legL);
    const legR=new BABYLON.TransformNode('legPivotR',scene);legR.parent=root;legR.position.set(legW/2+0.01,legH,0);
    makePart(legR,'legR',[legW,legH,legD],[0,-legH/2,0],t.pants,parts);legs.push(legR);
    return {root,legs,head:headGroup,bodyH:legH,parts,wings:[],arms:[armL,armR],humanoid:true};
  }

  // Glowing eyes: red for the ghoul, dark sockets for the skeleton archer.
  const eyeCol=type==='ghoul'?'#ff3b30':'#1a1a1a';
  makePart(headGroup,'eyeL',[hs*0.18,hs*0.16,0.02],[-hs*0.22,hs*0.05,hs*0.5],eyeCol,parts);
  makePart(headGroup,'eyeR',[hs*0.18,hs*0.16,0.02],[ hs*0.22,hs*0.05,hs*0.5],eyeCol,parts);
  if(type==='bonearcher'){
    makePart(headGroup,'jaw',[hs*0.7,hs*0.18,hs*0.6],[0,-hs*0.42,0],'#d8d8cd',parts);
    makePart(root,'ribs',[torsoW*0.7,torsoH*0.55,torsoD*0.6],[0,legH+torsoH*0.5,torsoD*0.25],'#deded3',parts);
  }
  const armW=0.14,armH=0.68,armD=0.16;const shoulderY=legH+torsoH-0.04;
  const armL=new BABYLON.TransformNode('armLp',scene);armL.parent=root;armL.position.set(-(torsoW/2+armW/2),shoulderY,0);
  makePart(armL,'armL',[armW,armH,armD],[0,-armH/2,0],type==='bonearcher'?t.skin:t.skin,parts);
  const armR=new BABYLON.TransformNode('armRp',scene);armR.parent=root;armR.position.set((torsoW/2+armW/2),shoulderY,0);
  makePart(armR,'armR',[armW,armH,armD],[0,-armH/2,0],t.skin,parts);
  if(type==='ghoul'){armL.rotation.x=-Math.PI*0.5;armR.rotation.x=-Math.PI*0.5;}
  if(type==='bonearcher'){
    armL.rotation.x=-Math.PI*0.5;armR.rotation.x=-Math.PI*0.35;
    const bow=makePart(armL,'bow',[0.06,0.7,0.06],[0,-armH-0.05,0.18],'#6b4a2a',parts);
    bow.rotation.x=Math.PI*0.5;
  }
  const legW=0.18,legD=0.2;
  const legs=[];
  const legL=new BABYLON.TransformNode('legPivotL',scene);legL.parent=root;legL.position.set(-legW/2-0.01,legH,0);
  makePart(legL,'legL',[legW,legH,legD],[0,-legH/2,0],t.pants,parts);legs.push(legL);
  const legR=new BABYLON.TransformNode('legPivotR',scene);legR.parent=root;legR.position.set(legW/2+0.01,legH,0);
  makePart(legR,'legR',[legW,legH,legD],[0,-legH/2,0],t.pants,parts);legs.push(legR);
  return {root,legs,head:headGroup,bodyH:legH,parts,wings:[],arms:[armL,armR],humanoid:true};
}

// Build mob mesh hierarchy
function buildMobMesh(type){
  const t=MOB_TYPES[type];
  if(t.humanoid)return buildHumanoidMesh(type);
  const root=new BABYLON.TransformNode('mob_'+type,scene);
  const s=t.small?0.8:1;
  // Per-species body proportions. The chicken in particular needs a more
  // compact, upright body (shorter front-to-back) so it doesn't read as an
  // unnaturally long Z-axis box.
  const bodyW=0.6*s*(t.bodyWidthMul||1),bodyD=1.0*s*(t.bodyDepthMul||1),bodyH=t.bodyH*s;
  const legY=t.legH*s;
  // Every box mesh that makes up this mob, so we can flash them red on hurt.
  const parts=[];
  const wings=[];
  // --- Body --------------------------------------------------------------
  const body=makePart(root,'body',[bodyW,bodyH,bodyD],[0,legY+bodyH/2,0],t.body,parts);
  if(t.patch){makePart(root,'patch',[bodyW+0.02,bodyH*0.5,bodyD*0.45],[0,legY+bodyH*0.55,0.05],t.patch,parts);}
  // Sheep wear an oversized blocky wool coat (separate slightly larger box) so
  // the body reads as the iconic fluffy Minecraft sheep instead of a smooth one.
  if(t.fluffy&&t.wool){
    const wool=makePart(root,'wool',[bodyW+0.18,bodyH+0.14,bodyD+0.1],[0,legY+bodyH/2+0.02,-0.04],t.wool,parts);
    wool.material&&(wool.material=wool.material);
  }
  // Cow udder underneath the belly.
  if(t.udder){makePart(root,'udder',[bodyW*0.5,0.12*s,0.2*s],[0,legY+0.02,-bodyD*0.18],t.udder,parts);}
  // --- Head --------------------------------------------------------------
  const hs=t.headSize*s;
  const headGroup=new BABYLON.TransformNode('headGroup',scene);headGroup.parent=root;headGroup.position.set(0,legY+bodyH*0.75,bodyD/2+hs*0.35);
  makePart(headGroup,'head',[hs,hs,hs],[0,0,0],t.head,parts);
  // Snout: pig gets a flat forward-facing snout block with two nostrils,
  // cow/others a muzzle box.
  if(t.snout){
    const snout=makePart(headGroup,'snout',[hs*0.55,hs*0.45,hs*0.32],[0,-hs*0.12,hs*0.55],t.snout,parts);
    if(type==='pig'){
      makePart(headGroup,'nostrilL',[hs*0.1,hs*0.12,0.02],[-hs*0.12,-hs*0.12,hs*0.72],'#a85f73',parts);
      makePart(headGroup,'nostrilR',[hs*0.1,hs*0.12,0.02],[ hs*0.12,-hs*0.12,hs*0.72],'#a85f73',parts);
    }
  }
  // Ears (pig/cow/sheep): small boxes on top sides of the head.
  if(t.ears){
    makePart(headGroup,'earL',[hs*0.22,hs*0.18,hs*0.1],[-hs*0.42,hs*0.42,0],t.ears,parts);
    makePart(headGroup,'earR',[hs*0.22,hs*0.18,hs*0.1],[ hs*0.42,hs*0.42,0],t.ears,parts);
  }
  // Cow horns.
  if(t.horns){
    makePart(headGroup,'hornL',[hs*0.16,hs*0.28,hs*0.16],[-hs*0.3,hs*0.5,0],t.horns,parts);
    makePart(headGroup,'hornR',[hs*0.16,hs*0.28,hs*0.16],[ hs*0.3,hs*0.5,0],t.horns,parts);
  }
  // Eyes.
  makePart(headGroup,'eyeL',[hs*0.16,hs*0.16,0.02],[-hs*0.25,hs*0.15,hs*0.5],'#1a1a1a',parts);
  makePart(headGroup,'eyeR',[hs*0.16,hs*0.16,0.02],[ hs*0.25,hs*0.15,hs*0.5],'#1a1a1a',parts);
  // Chicken beak + wattle + comb.
  if(type==='chicken'){
    if(t.beak)makePart(headGroup,'beak',[hs*0.4,hs*0.22,hs*0.3],[0,-hs*0.05,hs*0.6],t.beak,parts);
    if(t.wattle)makePart(headGroup,'wattle',[hs*0.18,hs*0.22,hs*0.12],[0,-hs*0.32,hs*0.5],t.wattle,parts);
    makePart(headGroup,'comb',[hs*0.18,hs*0.28,hs*0.5],[0,hs*0.6,0],'#d23b3b',parts);
  }
  // --- Wings (chicken): thin side flaps that flutter while moving. --------
  if(type==='chicken'&&t.wing){
    const wy=legY+bodyH*0.55;const wd=bodyD*0.7;
    const wL=new BABYLON.TransformNode('wingLp',scene);wL.parent=root;wL.position.set(-bodyW/2,wy,0);
    makePart(wL,'wingL',[0.06,bodyH*0.7,wd],[-0.02,0,0],t.wing,parts);wings.push(wL);
    const wR=new BABYLON.TransformNode('wingRp',scene);wR.parent=root;wR.position.set(bodyW/2,wy,0);
    makePart(wR,'wingR',[0.06,bodyH*0.7,wd],[0.02,0,0],t.wing,parts);wings.push(wR);
    // little tail feathers
    makePart(root,'tail',[bodyW*0.7,bodyH*0.7,0.1],[0,legY+bodyH*0.7,-bodyD/2-0.04],t.wing,parts);
  }
  // --- Tail (wolf): an upright bushy box at the back that wags. ----------
  let tailPivot=null;
  if(t.tail){
    tailPivot=new BABYLON.TransformNode('tailp',scene);tailPivot.parent=root;
    tailPivot.position.set(0,legY+bodyH*0.7,-bodyD/2);
    makePart(tailPivot,'tail',[0.16*s,0.42*s,0.16*s],[0,0.12*s,-0.04],t.tail,parts);
    tailPivot.rotation.x=-0.5;
  }
  // --- Legs --------------------------------------------------------------
  const legs=[];const lw=0.18*s,ld=0.18*s;const lx=bodyW/2-lw/2,lz=bodyD/2-ld*1.1;
  const legPos=[[-lx,lz],[lx,lz],[-lx,-lz],[lx,-lz]];
  for(let i=0;i<4;i++){const pivot=new BABYLON.TransformNode('legPivot'+i,scene);pivot.parent=root;pivot.position.set(legPos[i][0],legY,legPos[i][1]);makePart(pivot,'leg'+i,[lw,legY,ld],[0,-legY/2,0],t.leg,parts);legs.push(pivot);}
  return {root,legs,head:headGroup,bodyH:legY,parts,wings,tail:tailPivot};
}

const mobs=[];
const MAX_MOBS=18;
const MOB_TICK={spawnTimer:0};

// ===========================================================================
//  VILLAGER MANAGEMENT
//  Villagers are spawned once during world generation (near village centres)
//  and never despawn. They wander within a small radius of their home,
//  flee from hostile mobs, and greet the player when approached.
// ===========================================================================
const villagers=[];      // separate list so they are never despawned
const MAX_VILLAGERS_PER_VILLAGE=5;
const VILLAGER_TRADES_POPUP_DIST=3.0;

// Spawn villagers at all placed village centres.
function spawnVillagersAtVillages(placedVillages){
  if(!placedVillages||!placedVillages.length)return;
  for(const v of placedVillages){
    const count=2+Math.floor(Math.random()*(MAX_VILLAGERS_PER_VILLAGE-1));
    const profs=MOB_TYPES.villager.professions;
    for(let i=0;i<count;i++){
      // Scatter villagers around the village centre
      const ang=Math.random()*Math.PI*2;
      const r=3+Math.random()*8;
      const vx=Math.floor(v.x+Math.cos(ang)*r);
      const vz=Math.floor(v.z+Math.sin(ang)*r);
      if(vx<2||vx>=WORLD_W-2||vz<2||vz>=WORLD_D-2)continue;
      const vy=spawnHeightAt(vx,vz);
      if(vy===null)continue;
      const prof=profs[Math.floor(Math.random()*profs.length)];
      const mob=spawnMob('villager',vx,vy,vz);
      mob.villagerProfession=prof;
      mob.homeX=v.x; mob.homeZ=v.z;   // village centre as home
      mob.neverDespawn=true;
      mob.greetCooldown=0;
      villagers.push(mob);
    }
  }
}

// Villager AI: wanders near home, flees hostiles, greets player.
function updateVillager(mob,dt){
  if(mob.dead)return;
  mob.greetCooldown=Math.max(0,mob.greetCooldown-dt);

  const dx=mob.pos.x-player.pos.x,dz=mob.pos.z-player.pos.z;
  const distSq=dx*dx+dz*dz;

  // Flee from nearby hostile mobs
  let nearbyHostile=null,nearestHostileSq=Infinity;
  for(const m of mobs){
    if(m.dead||!m.hostile)continue;
    const hx=m.pos.x-mob.pos.x,hz=m.pos.z-mob.pos.z;
    const hsq=hx*hx+hz*hz;
    if(hsq<6*6&&hsq<nearestHostileSq){nearestHostileSq=hsq;nearbyHostile=m;}
  }
  if(nearbyHostile){
    // Run away from the threat
    const fhx=mob.pos.x-nearbyHostile.pos.x,fhz=mob.pos.z-nearbyHostile.pos.z;
    mob.targetYaw=Math.atan2(fhx,fhz);
    mob.moving=true;mob.wanderTimer=1.0;
  } else {
    // Normal wandering within home radius
    const hdx=mob.pos.x-(mob.homeX||mob.pos.x),hdz=mob.pos.z-(mob.homeZ||mob.pos.z);
    const homeDist=Math.hypot(hdx,hdz);
    if(homeDist>MOB_TYPES.villager.wanderRadius){
      // Stray too far – walk back home
      mob.targetYaw=Math.atan2(-hdx,-hdz);mob.moving=true;mob.wanderTimer=1.0;
    }
  }

  // Greet the player when close (and not fleeing)
  if(!nearbyHostile&&distSq<VILLAGER_TRADES_POPUP_DIST*VILLAGER_TRADES_POPUP_DIST&&mob.greetCooldown<=0){
    mob.greetCooldown=8.0;
    // Face the player
    mob.targetYaw=Math.atan2(-dx,-dz);
    mob.moving=false;
    // Show greeting popup
    const prof=mob.villagerProfession||'Villager';
    if(typeof showVillagerGreeting==='function')showVillagerGreeting(prof,mob);
  }
}

// Show a Minecraft-style villager greeting / trade hint above the villager.
// Uses the same bed-message channel for simplicity.
let _villagerMsgTimeout=null;
function showVillagerGreeting(profession,mob){
  const greetings={
    Farmer:    '🌾 Farmer: I have crops for trade!',
    Librarian: '📚 Librarian: Looking for enchanted books?',
    Blacksmith:'⚒ Blacksmith: Fine tools and armour!',
    Butcher:   '🥩 Butcher: Fresh meat, best prices!',
    Priest:    '⭐ Priest: Blessings and potions!',
  };
  const msg=greetings[profession]||'👋 Villager: Hmm!';
  if(typeof showBedMessage==='function')showBedMessage(msg);
}

function spawnHeightAt(x,z){for(let y=WORLD_H-2;y>1;y--){const id=getBlock(x,y,z);if(id===B.WATER||id===B.LAVA)return null;if(isSolid(id)){if(getBlock(x,y+1,z)===B.AIR&&getBlock(x,y+2,z)===B.AIR)return y+1;return null;}}return null;}

function pickAnimalType(){const r=Math.random();if(r<0.26)return 'pig';if(r<0.5)return 'sheep';if(r<0.7)return 'cow';if(r<0.86)return 'chicken';return 'wolf';}
// Pick a hostile mob type: roughly 60% melee ghoul, 40% ranged bone archer.
function pickHostileType(){return Math.random()<0.6?'ghoul':'bonearcher';}
// Count how many currently-alive mobs are hostile (used to cap night spawns).
function countHostile(){let n=0;for(const m of mobs)if(m.hostile)n++;return n;}

function spawnMob(type,x,y,z){const meshes=buildMobMesh(type);const t=MOB_TYPES[type];
  // Collision height. Humanoid mobs (ghoul / bone archer) don't define bodyH/legH
  // on their type, so fall back to the mesh's reported height (legs+torso+head).
  // Previously this produced NaN for humanoids, which broke their vertical
  // collision and let them sink into / fall through the ground.
  let collH;
  if(t.humanoid){collH=1.9;}
  else if(Number.isFinite(t.bodyH)&&Number.isFinite(t.legH)){collH=Math.max(0.5,t.bodyH+t.legH);}
  else{collH=Math.max(0.5,(meshes&&Number.isFinite(meshes.bodyH))?meshes.bodyH+0.6:1.0);}
  const mob={type,t,meshes,pos:new BABYLON.Vector3(x+0.5,y,z+0.5),vel:new BABYLON.Vector3(0,0,0),yaw:Math.random()*Math.PI*2,onGround:false,wanderTimer:0,targetYaw:Math.random()*Math.PI*2,moving:false,walkPhase:0,hp:t.hp,halfW:0.32,height:collH,
  speedMul:0,
  headYaw:0,headPitch:0,
  lookTimer:0,
  jumpCooldown:0,
  stuckTimer:0,prevX:x+0.5,prevZ:z+0.5,
  hurtFlash:0,dead:false,invuln:0,
  hostile:!!t.hostile,
  neutral:!!t.neutral,  // wolf: passive until provoked
  tamed:false,         // wolf: tamed via feeding meat
  provoked:false,      // wolf: turned aggressive after being hit
  begTimer:0,          // wolf: head-tilt "begging" timer when held meat is near
  attackTimer:0,        // melee swing / shoot cooldown
  burnTimer:0,          // daylight burn accumulator (undead burn in sun)
  };meshes.root.position.copyFrom(mob.pos);mobs.push(mob);return mob;}

const MAX_HOSTILE=8;
function trySpawnMobs(){
  if(typeof player==='undefined')return;
  const night=(typeof isNightTime==='function')&&isNightTime();
  for(let attempt=0;attempt<6&&mobs.length<MAX_MOBS;attempt++){
    const ang=Math.random()*Math.PI*2;
    // Hostile mobs spawn a little farther out so they don't pop in right on top
    // of the player.
    const r=(night?18:14)+Math.random()*16;
    const x=Math.floor(player.pos.x+Math.cos(ang)*r);const z=Math.floor(player.pos.z+Math.sin(ang)*r);
    if(x<2||x>=WORLD_W-2||z<2||z>=WORLD_D-2)continue;
    const y=spawnHeightAt(x,z);if(y===null)continue;
    // At night, prefer spawning hostiles (until the hostile cap is reached);
    // by day only passive animals appear.
    if(night&&countHostile()<MAX_HOSTILE&&Math.random()<0.7){spawnMob(pickHostileType(),x,y,z);}
    else{spawnMob(pickAnimalType(),x,y,z);}
  }
}

// Swept axis-aligned collision for a mob. Mirrors the player's moveAxis():
// after resolving against the first overlapping block we recompute the AABB
// and keep scanning, so a mob spanning several blocks is fully pushed out
// instead of being left half-buried (which previously made animals sink into
// the ground or get squeezed out at high speed = "flying away").
function mobMoveAxis(mob,axis,delta){
  if(delta===0)return false;
  const hw=mob.halfW;
  // Defensive: never let a non-finite height collapse the collision AABB (which
  // would make a mob ignore the ground and sink through it).
  let h=mob.height;if(!Number.isFinite(h)||h<=0){h=mob.height=mob.t&&mob.t.humanoid?1.9:1.0;}
  mob.pos[axis]+=delta;
  let hit=false;
  // Iterate a few times so multi-block overlaps are all resolved.
  for(let pass=0;pass<4;pass++){
    const box={minX:mob.pos.x-hw,maxX:mob.pos.x+hw,minY:mob.pos.y,maxY:mob.pos.y+h,minZ:mob.pos.z-hw,maxZ:mob.pos.z+hw};
    const x0=Math.floor(box.minX),x1=Math.floor(box.maxX),y0=Math.floor(box.minY),y1=Math.floor(box.maxY),z0=Math.floor(box.minZ),z1=Math.floor(box.maxZ);
    let resolved=false;
    for(let bx=x0;bx<=x1&&!resolved;bx++)
      for(let by=y0;by<=y1&&!resolved;by++)
        for(let bz=z0;bz<=z1&&!resolved;bz++){
          if(!isSolid(getBlock(bx,by,bz)))continue;
          hit=true;resolved=true;
          if(axis==='x')mob.pos.x=delta>0?bx-hw-0.001:bx+1+hw+0.001;
          else if(axis==='z')mob.pos.z=delta>0?bz-hw-0.001:bz+1+hw+0.001;
          else if(axis==='y')mob.pos.y=delta>0?by-h-0.001:by+1+0.001;
        }
    if(!resolved)break;
  }
  return hit;}

const MOB_GRAVITY=-22;
function updateMobs(dt){if(!worldReady||!started)return;
  MOB_TICK.spawnTimer+=dt;if(MOB_TICK.spawnTimer>3){MOB_TICK.spawnTimer=0;trySpawnMobs();despawnFarMobs();}
  for(const mob of mobs){updateOneMob(mob,dt);}
  // Update villagers (separate from regular mobs so they are never despawned)
  for(const mob of villagers){
    if(!mob.dead){updateVillager(mob,dt);updateOneMob(mob,dt);}
  }
  updateArrows(dt);
}

function despawnFarMobs(){for(let i=mobs.length-1;i>=0;i--){const m=mobs[i];if(m.wolf&&m.tamed)continue;/* pets never despawn */if(m.neverDespawn)continue;/* villagers never despawn */const dx=m.pos.x-player.pos.x,dz=m.pos.z-player.pos.z;if(dx*dx+dz*dz>70*70){m.meshes.root.dispose();m.meshes.legs.forEach(l=>l.dispose&&l.dispose());mobs.splice(i,1);}}}

function approachAngle(cur,target,maxStep){let dy=target-cur;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;if(Math.abs(dy)<=maxStep)return target;return cur+Math.sign(dy)*maxStep;}

function updateOneMob(mob,dt){
  mob.wanderTimer-=dt;
  if(mob.wanderTimer<=0){
    if(mob.moving){mob.moving=false;mob.wanderTimer=1.2+Math.random()*2.6;}
    else{
      mob.moving=Math.random()<0.7;
      mob.wanderTimer=mob.moving?(2.0+Math.random()*3.5):(1.0+Math.random()*2.0);
      if(mob.moving){const turn=(Math.random()-0.5)*Math.PI*1.2;mob.targetYaw=mob.yaw+turn;}
    }
  }

  const dx=mob.pos.x-player.pos.x,dz=mob.pos.z-player.pos.z;const distSq=dx*dx+dz*dz;
  let fleeing=false;
  let chasing=false;
  if(mob.attackTimer>0)mob.attackTimer-=dt;

  if(mob.wolf){
    updateWolf(mob,dt,dx,dz,distSq);
    chasing=mob._chasing;fleeing=mob._fleeing;
  }else if(mob.t&&mob.t.villager){
    // Villager AI is handled in updateVillager(); updateOneMob just does physics.
    // Only flee from the player if a hostile is chasing the villager
    // (the actual flee direction is set by updateVillager before this runs).
    fleeing=mob._fleeing||false;
  }else if(mob.hostile&&!player.dead){
    updateHostileMob(mob,dt,dx,dz,distSq);
    chasing=mob._chasing;
  }else if(distSq<16){
    // Passive animals flee when the player gets close.
    fleeing=true;mob.moving=true;mob.targetYaw=Math.atan2(dx,dz);mob.wanderTimer=Math.max(mob.wanderTimer,0.5);
  }

  const turnRate=(fleeing||chasing)?6.0:2.6;
  mob.yaw=approachAngle(mob.yaw,mob.targetYaw,turnRate*dt);

  const targetSpeedMul=mob.moving?(fleeing?1.35:(chasing?1.25:1.0)):0;
  mob.speedMul+=(targetSpeedMul-mob.speedMul)*Math.min(1,dt*3.5);
  if(mob.speedMul<0.02)mob.speedMul=0;
  const sp=mob.t.speed*mob.speedMul;
  const wishX=Math.sin(mob.yaw)*sp,wishZ=Math.cos(mob.yaw)*sp;
  const accel=Math.min(1,dt*6);mob.vel.x+=(wishX-mob.vel.x)*accel;mob.vel.z+=(wishZ-mob.vel.z)*accel;
  // Clamp horizontal speed so a knockback that gets trapped against a wall can
  // never accumulate into a teleport ("animal flying away") next frame.
  const MAX_HVEL=10;const hv=Math.hypot(mob.vel.x,mob.vel.z);if(hv>MAX_HVEL){const k=MAX_HVEL/hv;mob.vel.x*=k;mob.vel.z*=k;}

  mob.vel.y+=MOB_GRAVITY*dt;if(mob.vel.y<-40)mob.vel.y=-40;
  // Float up only while the mob is actually submerged, and cap the rise so it
  // doesn't get flung above the water surface.
  const inWater=getBlock(Math.floor(mob.pos.x),Math.floor(mob.pos.y+0.3),Math.floor(mob.pos.z))===B.WATER;if(inWater){mob.vel.y=Math.min(Math.max(mob.vel.y,1.4),2.2);}

  if(mob.jumpCooldown>0)mob.jumpCooldown-=dt;

  const hitX=mobMoveAxis(mob,'x',mob.vel.x*dt);const hitZ=mobMoveAxis(mob,'z',mob.vel.z*dt);
  if((hitX||hitZ)&&mob.onGround){
    const fx=Math.floor(mob.pos.x+Math.sin(mob.yaw)*0.6),fz=Math.floor(mob.pos.z+Math.cos(mob.yaw)*0.6);const fy=Math.floor(mob.pos.y);
    if(mob.jumpCooldown<=0&&isSolid(getBlock(fx,fy,fz))&&!isSolid(getBlock(fx,fy+1,fz))&&!isSolid(getBlock(fx,fy+2,fz))){mob.vel.y=6.6;mob.jumpCooldown=0.6;}
    else{mob.targetYaw=mob.yaw+(Math.random()<0.5?1:-1)*Math.PI*(0.35+Math.random()*0.4);mob.wanderTimer=Math.max(mob.wanderTimer,0.6);}
    if(hitX)mob.vel.x=0;if(hitZ)mob.vel.z=0;
  }

  if(mob.onGround&&mob.speedMul>0.3&&mob.jumpCooldown<=0){
    const ahead=0.7;const ax=mob.pos.x+Math.sin(mob.yaw)*ahead,az=mob.pos.z+Math.cos(mob.yaw)*ahead;
    const groundBelow=getBlock(Math.floor(ax),Math.floor(mob.pos.y-1),Math.floor(az));
    const ground2=getBlock(Math.floor(ax),Math.floor(mob.pos.y-2),Math.floor(az));
    if(!isSolid(groundBelow)&&!isSolid(ground2)&&getBlock(Math.floor(ax),Math.floor(mob.pos.y-2),Math.floor(az))!==B.WATER){
      mob.targetYaw=mob.yaw+Math.PI*(0.5+Math.random()*0.5);mob.wanderTimer=Math.max(mob.wanderTimer,0.4);
    }
  }

  const prevVy=mob.vel.y;const hitY=mobMoveAxis(mob,'y',mob.vel.y*dt);mob.onGround=false;if(hitY){if(prevVy<0)mob.onGround=true;mob.vel.y=0;}

  mob.stuckTimer+=dt;
  if(mob.stuckTimer>0.5){const moved=Math.hypot(mob.pos.x-mob.prevX,mob.pos.z-mob.prevZ);if(mob.speedMul>0.3&&moved<0.05){mob.targetYaw=mob.yaw+Math.PI*(0.5+Math.random());}mob.prevX=mob.pos.x;mob.prevZ=mob.pos.z;mob.stuckTimer=0;}

  // Safety net: if a mob somehow falls through the world, try to rescue it back
  // onto solid ground near its horizontal position before giving up. Only
  // despawn if there is genuinely nowhere to stand (e.g. over a deep void).
  if(mob.pos.y<2){
    const gx=Math.floor(mob.pos.x),gz=Math.floor(mob.pos.z);
    const sy=spawnHeightAt(gx,gz);
    if(sy!==null){mob.pos.y=sy;mob.vel.set(0,0,0);mob.onGround=true;}
    else if(mob.pos.y<-5){mob.meshes.root.dispose();mob.meshes.legs.forEach(l=>l.dispose&&l.dispose());const i=mobs.indexOf(mob);if(i>=0)mobs.splice(i,1);return;}
  }

  mob.meshes.root.position.copyFrom(mob.pos);mob.meshes.root.rotation.y=mob.yaw;

  mob.lookTimer-=dt;
  if(mob.lookTimer<=0){mob.lookTimer=1.0+Math.random()*2.5;
    if(mob.speedMul<0.2){mob.headYaw=(Math.random()-0.5)*0.9;mob.headPitch=(Math.random()-0.4)*0.5;}
    else{mob.headYaw=0;mob.headPitch=0;}
  }
  if(mob.meshes.head){mob.meshes.head.rotation.y=approachAngle(mob.meshes.head.rotation.y,mob.headYaw,dt*3);mob.meshes.head.rotation.x=mob.meshes.head.rotation.x+(mob.headPitch-mob.meshes.head.rotation.x)*Math.min(1,dt*3);}

  const groundSpeed=Math.hypot(mob.vel.x,mob.vel.z);const moving=groundSpeed>0.25;
  if(moving){mob.walkPhase+=dt*(5+groundSpeed*3.2);}else{mob.walkPhase*=0.82;}
  const amp=Math.min(0.6,0.25+groundSpeed*0.22);const swing=Math.sin(mob.walkPhase)*amp;
  mob.meshes.legs.forEach((leg,i)=>{const s=(i===0||i===3)?swing:-swing;leg.rotation.x=s;});
  // Humanoid arm easing: after an attack lunge the arms ease back to their
  // species rest pose (ghoul reaching forward, archer in a draw stance).
  if(mob.meshes.humanoid&&mob.meshes.arms&&mob.meshes.arms.length){
    let restL,restR;
    if(mob.type==='ghoul'){restL=-Math.PI*0.5;restR=-Math.PI*0.5;}
    else{restL=-Math.PI*0.5;restR=-Math.PI*0.35;}
    const a=mob.meshes.arms;const k=Math.min(1,dt*6);
    a[0].rotation.x+=(restL-a[0].rotation.x)*k;
    a[1].rotation.x+=(restR-a[1].rotation.x)*k;
  }
  // Wolf tail wag: tamed/happy wolves wag faster; angle eases with motion.
  if(mob.meshes.tail){
    const happy=mob.tamed||mob.begTimer>0;
    const wagSpeed=happy?14:(moving?9:4);
    const wagAmp=happy?0.7:(moving?0.5:0.25);
    mob._tailPhase=(mob._tailPhase||0)+dt*wagSpeed;
    mob.meshes.tail.rotation.y=Math.sin(mob._tailPhase)*wagAmp;
    // Tail lifts when tamed (confident), droops slightly otherwise.
    mob.meshes.tail.rotation.x=happy?-0.7:-0.4;
  }
  // Chicken wings flutter up/down: fast when moving (or airborne), gentle idle.
  if(mob.meshes.wings&&mob.meshes.wings.length){
    const airborne=!mob.onGround;
    const flap=airborne?Math.sin(mob.walkPhase*4)*0.9+0.5:(moving?Math.abs(Math.sin(mob.walkPhase*2))*0.5:0.05+Math.sin(mob.walkPhase*1.5)*0.05);
    mob.meshes.wings[0].rotation.z=flap;   // left wing swings out (+z)
    mob.meshes.wings[1].rotation.z=-flap;  // right wing mirrored
  }

  // Undead burn in daylight: when an exposed hostile mob is caught in the sun
  // it slowly takes damage (classic Minecraft zombie/skeleton behaviour).
  if(mob.hostile&&typeof isNightTime==='function'&&!isNightTime()){
    // Only burn when there is open sky above (no solid block overhead).
    let sheltered=false;
    const hx=Math.floor(mob.pos.x),hz=Math.floor(mob.pos.z);
    for(let yy=Math.floor(mob.pos.y+mob.height)+1;yy<WORLD_H;yy++){if(isSolid(getBlock(hx,yy,hz))){sheltered=true;break;}}
    if(!sheltered){
      mob.burnTimer+=dt;
      if(mob.burnTimer>=1){mob.burnTimer=0;mob.hp-=1;mob.hurtFlash=0.25;
        if(typeof spawnHurtParticles==='function')spawnHurtParticles(mob.pos);
        if(mob.hp<=0){killMob(mob);return;}
      }
    }else mob.burnTimer=0;
  }

  // Hit reaction: a brief squash + lift plus a Minecraft-style red flash when
  // recently damaged (per-mob, so it never affects other mobs). The red tint is
  // applied through each mesh's `renderOverlay`/`overlayColor`, which is a
  // per-mesh property and therefore does NOT leak through the shared materials.
  if(mob.invuln>0)mob.invuln-=dt;
  if(mob.hurtFlash>0){mob.hurtFlash-=dt;const f=Math.max(0,mob.hurtFlash/0.3);
    mob.meshes.root.scaling.set(1+f*0.22,1-f*0.18,1+f*0.22);
    setMobHurtOverlay(mob,true,f);
    mob._overlayOn=true;
  }else{
    if(mob.meshes.root.scaling.y!==1)mob.meshes.root.scaling.set(1,1,1);
    if(mob._overlayOn){setMobHurtOverlay(mob,false,0);mob._overlayOn=false;}
  }
}

// Toggle the red hurt overlay on every part of a mob. `f` (0..1) fades the
// overlay alpha so the flash eases out alongside the squash animation.
const _HURT_COLOR=new BABYLON.Color3(1,0.18,0.18);
function setMobHurtOverlay(mob,on,f){
  const parts=mob.meshes.parts;if(!parts)return;
  for(const p of parts){
    p.renderOverlay=on;
    if(on){p.overlayColor=_HURT_COLOR;p.overlayAlpha=0.55*Math.max(0.35,f);}
  }
}

// --- Wolf AI ----------------------------------------------------------------
// Find the nearest hostile (or provoked) mob within `range` of a point. Used by
// tamed wolves to pick a combat target so they can defend the player.
function nearestEnemyOf(wolf,cx,cz,range){
  let best=null,bestSq=range*range;
  for(const m of mobs){
    if(m===wolf||m.dead)continue;
    // A valid enemy: a hostile mob, or a wolf that has turned on the player.
    if(!(m.hostile||(m.wolf&&m.provoked&&!m.tamed)))continue;
    const dx=m.pos.x-cx,dz=m.pos.z-cz;const sq=dx*dx+dz*dz;
    if(sq<bestSq){bestSq=sq;best=m;}
  }
  return best;
}

// Drives a wolf each frame. Three modes:
//  • Tamed   → follow the player; break off to attack nearby hostiles (combat
//              support). Teleports back if it falls too far behind.
//  • Provoked→ aggressive melee pursuit of the player (got hit while wild).
//  • Wild    → neutral: wanders freely, only mildly wary of the player.
function updateWolf(mob,dt,dx,dz,distSq){
  const t=mob.t;mob._chasing=false;mob._fleeing=false;
  mob.begTimer=Math.max(0,mob.begTimer-dt);
  const dist=Math.sqrt(distSq);
  const range=t.attackRange||1.5;

  // Resolve / refresh a combat target (tamed wolf defends; provoked wolf may
  // also lash out at whatever provoked it — handled via player targeting).
  if(mob.combatTarget&&(mob.combatTarget.dead||mobs.indexOf(mob.combatTarget)<0))mob.combatTarget=null;

  if(mob.tamed){
    // Look for an enemy near the player (or near the wolf) to defend against.
    if(!mob.combatTarget){mob.combatTarget=nearestEnemyOf(mob,player.pos.x,player.pos.z,14)||nearestEnemyOf(mob,mob.pos.x,mob.pos.z,12);}
    if(mob.combatTarget){
      const e=mob.combatTarget;const edx=e.pos.x-mob.pos.x,edz=e.pos.z-mob.pos.z;const ed=Math.hypot(edx,edz)||1;
      // Drop the target if it (or the player) wandered too far away.
      if(ed>22||Math.hypot(e.pos.x-player.pos.x,e.pos.z-player.pos.z)>26){mob.combatTarget=null;}
      else{
        mob._chasing=true;mob.moving=true;mob.targetYaw=Math.atan2(edx,edz);mob.wanderTimer=Math.max(mob.wanderTimer,0.4);
        if(ed<=range&&mob.attackTimer<=0){
          mob.attackTimer=t.attackCooldown||0.9;
          attackMob(e,t.attackDamage||3,mob); // wolf bites the enemy
        }
        return;
      }
    }
    // No enemy: heel to the player. Stay close but not on top of them.
    if(dist>16){
      // Too far behind — teleport to the player's side (vanilla-style follow).
      const sy=spawnHeightAt(Math.floor(player.pos.x+1),Math.floor(player.pos.z));
      if(sy!==null){mob.pos.set(player.pos.x+1.0,sy,player.pos.z);mob.vel.set(0,0,0);}
    }
    if(dist>2.6){mob._chasing=true;mob.moving=true;mob.targetYaw=Math.atan2(dx*-1,dz*-1);mob.wanderTimer=Math.max(mob.wanderTimer,0.4);}
    else if(dist<1.4){mob.moving=false;} // close enough: idle next to player
    return;
  }

  if(mob.provoked){
    // Wild wolf that was attacked: hunt the player down (pack-style melee).
    if(dist>(t.sightRange||20)*1.6){mob.provoked=false;return;}
    mob._chasing=true;mob.moving=true;mob.targetYaw=Math.atan2(-dx,-dz);mob.wanderTimer=Math.max(mob.wanderTimer,0.4);
    if(dist<=range&&mob.attackTimer<=0){
      mob.attackTimer=t.attackCooldown||0.9;
      if(typeof damage==='function')damage(t.attackDamage||3);
    }
    return;
  }

  // Wild & neutral: mostly independent. Only mildly shy — keep a little distance
  // if the player crowds it, but it won't run in terror like prey animals.
  if(distSq<6){mob._fleeing=true;mob.moving=true;mob.targetYaw=Math.atan2(dx,dz);mob.wanderTimer=Math.max(mob.wanderTimer,0.4);}
}

// --- Hostile AI -------------------------------------------------------------
// Drives a hostile mob each frame: acquire / pursue the player, keep distance
// (archer), and trigger melee swings or arrow shots. Sets `mob._chasing` for
// the caller's animation/turn-rate handling.
function updateHostileMob(mob,dt,dx,dz,distSq){
  const t=mob.t;mob._chasing=false;
  const dist=Math.sqrt(distSq);
  const sight=t.sightRange||22;
  // Lose interest if the player is far away (then fall back to wandering).
  if(dist>sight*1.4){return;}
  // Angle pointing FROM the mob TOWARD the player (note: yaw uses sin/cos of
  // the facing direction, and the mob's forward is +Z when yaw=0).
  const toPlayerYaw=Math.atan2(-dx,-dz);

  if(t.ranged){
    // Bone archer: maintain a comfortable shooting distance, then fire arrows
    // while keeping line-of-sight to the player.
    const keep=t.keepDist||8;const shootRange=t.shootRange||18;
    mob._chasing=true;
    if(dist>shootRange){
      // Too far: close in.
      mob.moving=true;mob.targetYaw=toPlayerYaw;
    }else if(dist<keep){
      // Too close: back away (face the player but walk backwards a bit).
      mob.moving=true;mob.targetYaw=toPlayerYaw+Math.PI;
    }else{
      // In the sweet spot: hold position and face the player.
      mob.moving=false;mob.targetYaw=toPlayerYaw;
    }
    mob.yaw=approachAngle(mob.yaw,toPlayerYaw,8*dt); // aim toward player
    if(dist<=shootRange&&mob.attackTimer<=0&&hasLineOfSight(mob)){
      mob.attackTimer=t.shootCooldown||1.8;
      fireArrow(mob);
      // Brief "draw" recoil on the arm.
      if(mob.meshes.arms&&mob.meshes.arms[1])mob.meshes.arms[1].rotation.x=-Math.PI*0.55;
    }
    mob.wanderTimer=Math.max(mob.wanderTimer,0.4);
  }else{
    // Ghoul: relentless melee pursuit.
    mob._chasing=true;mob.moving=true;mob.targetYaw=toPlayerYaw;
    mob.wanderTimer=Math.max(mob.wanderTimer,0.4);
    const range=t.attackRange||1.6;
    if(dist<=range&&mob.attackTimer<=0){
      mob.attackTimer=t.attackCooldown||1.0;
      if(typeof damage==='function')damage(t.attackDamage||3);
      // Lunge animation: swing arms.
      if(mob.meshes.arms){mob.meshes.arms[0].rotation.x=-Math.PI*0.8;mob.meshes.arms[1].rotation.x=-Math.PI*0.8;}
    }
  }
}

// Crude line-of-sight check between a mob's "eyes" and the player's head:
// step along the ray and fail if it passes through a solid block.
function hasLineOfSight(mob){
  const ox=mob.pos.x,oy=mob.pos.y+mob.height*0.85,oz=mob.pos.z;
  const px=player.pos.x,py=player.pos.y+PLAYER.eye*0.8,pz=player.pos.z;
  const dx=px-ox,dy=py-oy,dz=pz-oz;const dist=Math.hypot(dx,dy,dz)||1;
  const steps=Math.min(40,Math.ceil(dist*2));
  for(let i=1;i<steps;i++){const f=i/steps;const bx=Math.floor(ox+dx*f),by=Math.floor(oy+dy*f),bz=Math.floor(oz+dz*f);if(isSolid(getBlock(bx,by,bz)))return false;}
  return true;
}

// --- Arrow projectiles (bone archer) ---------------------------------------
const arrows=[];
const _arrowMat=null;
function getArrowMat(){if(getArrowMat._m)return getArrowMat._m;const m=new BABYLON.StandardMaterial('arrowMat',scene);m.diffuseColor=new BABYLON.Color3(0.32,0.22,0.12);m.emissiveColor=new BABYLON.Color3(0.18,0.13,0.07);m.specularColor=new BABYLON.Color3(0,0,0);getArrowMat._m=m;return m;}

function fireArrow(mob){
  if(typeof BABYLON==='undefined')return;
  const t=mob.t;
  const ox=mob.pos.x,oy=mob.pos.y+mob.height*0.8,oz=mob.pos.z;
  // Aim at the player's torso with a little upward lead so gravity carries it.
  const tx=player.pos.x,ty=player.pos.y+PLAYER.eye*0.6,tz=player.pos.z;
  let dx=tx-ox,dy=ty-oy,dz=tz-oz;const d=Math.hypot(dx,dy,dz)||1;
  const speed=t.arrowSpeed||22;
  // Simple ballistic lead: raise the aim a touch based on distance.
  dy+=d*0.06;
  const inv=1/Math.hypot(dx,dy,dz);
  const mesh=BABYLON.MeshBuilder.CreateBox('arrow',{width:0.06,height:0.06,depth:0.5},scene);
  mesh.material=getArrowMat();mesh.isPickable=false;mesh.position.set(ox,oy,oz);
  const arrow={mesh,pos:new BABYLON.Vector3(ox,oy,oz),
    vel:new BABYLON.Vector3(dx*inv*speed,dy*inv*speed,dz*inv*speed),
    life:5,damage:t.attackDamage||2};
  arrows.push(arrow);
  if(typeof SFX!=='undefined'&&SFX.shoot)SFX.shoot();
}

const ARROW_GRAVITY=-9;
function updateArrows(dt){
  if(typeof player==='undefined')return;
  for(let i=arrows.length-1;i>=0;i--){
    const a=arrows[i];a.life-=dt;
    a.vel.y+=ARROW_GRAVITY*dt;
    const nx=a.pos.x+a.vel.x*dt,ny=a.pos.y+a.vel.y*dt,nz=a.pos.z+a.vel.z*dt;
    let dead=a.life<=0;
    // Hit a solid block?
    if(!dead&&isSolid(getBlock(Math.floor(nx),Math.floor(ny),Math.floor(nz))))dead=true;
    // Hit the player? (AABB around the player capsule.)
    if(!dead&&!player.dead){
      const hw=PLAYER.halfW+0.15,h=PLAYER.height;
      if(nx>player.pos.x-hw&&nx<player.pos.x+hw&&nz>player.pos.z-hw&&nz<player.pos.z+hw&&ny>player.pos.y&&ny<player.pos.y+h){
        if(typeof damage==='function')damage(a.damage);
        dead=true;
      }
    }
    a.pos.set(nx,ny,nz);a.mesh.position.copyFrom(a.pos);
    // Orient the arrow along its velocity.
    const vlen=Math.hypot(a.vel.x,a.vel.z);
    a.mesh.rotation.y=Math.atan2(a.vel.x,a.vel.z);
    a.mesh.rotation.x=-Math.atan2(a.vel.y,vlen);
    if(dead){a.mesh.dispose();arrows.splice(i,1);}
  }
}

// --- Combat: damaging / killing mobs ---------------------------------------
// Find the mob the camera is currently aiming at within `maxDist`.
function pickAttackMob(maxDist,includeTamed){
  if(typeof camera==='undefined')return null;
  const origin=camera.position;const dir=camera.getDirection(BABYLON.Vector3.Forward());
  let best=null,bestT=maxDist;
  for(const mob of mobs){if(mob.dead)continue;
    // Don't let the player accidentally melee their own tamed wolf (but feeding
    // still needs to target it, so callers can opt in with includeTamed).
    if(mob.wolf&&mob.tamed&&!includeTamed)continue;
    const hw=mob.halfW+0.15,h=mob.height+0.1;
    const minX=mob.pos.x-hw,maxX=mob.pos.x+hw,minY=mob.pos.y-0.05,maxY=mob.pos.y+h,minZ=mob.pos.z-hw,maxZ=mob.pos.z+hw;
    const t=rayBoxHit(origin,dir,minX,minY,minZ,maxX,maxY,maxZ);
    if(t!==null&&t<bestT){bestT=t;best=mob;}
  }
  return best;
}
// Slab-method ray vs AABB; returns entry distance or null.
function rayBoxHit(o,d,minX,minY,minZ,maxX,maxY,maxZ){
  let tmin=0,tmax=Infinity;
  const axes=[['x',minX,maxX],['y',minY,maxY],['z',minZ,maxZ]];
  for(const[a,mn,mx]of axes){const od=d[a];const oo=o[a];
    if(Math.abs(od)<1e-8){if(oo<mn||oo>mx)return null;}
    else{let t1=(mn-oo)/od,t2=(mx-oo)/od;if(t1>t2){const tmp=t1;t1=t2;t2=tmp;}
      tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)return null;}}
  return tmin;
}

// Damage a mob; applies knockback, flash, flee and handles death + drops.
// `attacker` is the source mob when one mob hits another (e.g. a tamed wolf
// biting a ghoul). When omitted the player is assumed to be the attacker, which
// triggers player-relative knockback and (for wild wolves) pack provocation.
function attackMob(mob,dmg,attacker){
  if(!mob||mob.dead||mob.invuln>0)return false;
  mob.hp-=dmg;mob.invuln=0.35;mob.hurtFlash=0.3;
  if(typeof SFX!=='undefined'&&SFX.hurt)SFX.hurt();
  // Knockback away from the attacker + a little hop.
  const ax=attacker?attacker.pos.x:player.pos.x,az=attacker?attacker.pos.z:player.pos.z;
  const dx=mob.pos.x-ax,dz=mob.pos.z-az;const len=Math.hypot(dx,dz)||1;
  mob.vel.x+=(dx/len)*5.5;mob.vel.z+=(dz/len)*5.5;if(mob.onGround)mob.vel.y=4.2;
  if(attacker){
    // Mob-vs-mob: the victim turns to fight back rather than flee the player.
    if(mob.wolf&&!mob.tamed)mob.provoked=true;
    mob.combatTarget=attacker;mob.moving=true;mob.targetYaw=Math.atan2(-dx,-dz);mob.wanderTimer=Math.max(mob.wanderTimer,1.0);
  }else{
    // Player hit a wild wolf → it (and nearby pack-mates) turn hostile.
    if(mob.wolf&&!mob.tamed){
      mob.provoked=true;provokeWolfPack(mob);
    }
    // Panic: run away from the player (non-aggressive victims).
    mob.moving=true;mob.targetYaw=Math.atan2(dx,dz);mob.wanderTimer=Math.max(mob.wanderTimer,2.5);
  }
  if(mob.hp<=0){killMob(mob);return true;}
  return true;
}

// When a wild wolf is struck, nearby untamed wolves join the fight (pack AI).
function provokeWolfPack(src){
  for(const m of mobs){
    if(m===src||m.dead||!m.wolf||m.tamed)continue;
    const dx=m.pos.x-src.pos.x,dz=m.pos.z-src.pos.z;
    if(dx*dx+dz*dz<=16*16)m.provoked=true;
  }
}

function killMob(mob){
  if(mob.dead)return;mob.dead=true;
  // Drop loot.
  const drops=mob.t.drops||[];
  if(typeof addToInventory==='function'){
    for(const d of drops){const n=d.min+Math.floor(Math.random()*(d.max-d.min+1));for(let i=0;i<n;i++)addToInventory(d.id,1);}
  }
  if(typeof ACH!=='undefined'){
    if(ACH.track)ACH.track('hunt');
    // Per-species kill flag (kill_pig / kill_sheep / kill_cow / kill_chicken).
    if(ACH.flag&&mob.type)ACH.flag('kill_'+mob.type);
  }
  // Despawn.
  const idx=mobs.indexOf(mob);if(idx>=0)mobs.splice(idx,1);
  mob.meshes.root.dispose();mob.meshes.legs.forEach(l=>l.dispose&&l.dispose());
}

// --- Wolf taming ------------------------------------------------------------
// Raw meat the player can use to tame a wolf (the four raw mob meats).
const WOLF_TAME_FOODS=(typeof ITEM_PORKCHOP!=='undefined')
  ? [ITEM_PORKCHOP,ITEM_BEEF,ITEM_CHICKEN,ITEM_MUTTON]
  : [230,231,232,233];
const WOLF_TAME_CHANCE=0.34; // per feed; multiple feeds usually needed

// Attempt to feed the wolf the player is currently aiming at. Returns true if a
// piece of meat was consumed (so the caller can decrement the held stack).
// Tamed wolves instead heal when fed. Drives the begging head-tilt feedback.
function tryFeedWolf(foodId){
  if(WOLF_TAME_FOODS.indexOf(foodId)<0)return false;
  const reach=isMobile?3.6:4.2;
  const mob=pickAttackMob(reach,true);
  if(!mob||!mob.wolf||mob.dead)return false;
  mob.begTimer=1.2;
  if(typeof spawnHeartParticles==='function')spawnHeartParticles(mob.pos);
  if(mob.tamed){
    // Already a pet: feeding heals it back up.
    if(mob.hp<mob.t.hp){mob.hp=Math.min(mob.t.hp,mob.hp+(ITEMS[foodId]?ITEMS[foodId].food||4:4));return true;}
    return false; // full health — don't waste the meat
  }
  // Wild wolf: each feed has a chance to win it over.
  mob.provoked=false; // accepting food calms an annoyed wolf
  if(Math.random()<WOLF_TAME_CHANCE){tameWolf(mob);}
  return true;
}

// Convert a wild wolf into a loyal, tamed companion.
function tameWolf(mob){
  mob.tamed=true;mob.provoked=false;mob.combatTarget=null;mob.hp=mob.t.hp;
  // Add a red collar around the neck so tamed wolves read as "yours".
  if(mob.meshes&&mob.meshes.root&&!mob._collar){
    const t=mob.t;const s=t.small?0.8:1;const bodyD=1.0*s*(t.bodyDepthMul||1),bodyH=t.bodyH*s,bodyW=0.6*s*(t.bodyWidthMul||1);const legY=t.legH*s;
    const collar=makePart(mob.meshes.root,'collar',[bodyW+0.06,0.1,0.16],[0,legY+bodyH*0.78,bodyD*0.42],'#c0392b',mob.meshes.parts);
    mob._collar=collar;
  }
  if(typeof spawnHeartParticles==='function')spawnHeartParticles(mob.pos);
  if(typeof SFX!=='undefined'&&SFX.collect)SFX.collect();
  if(typeof ACH!=='undefined'){if(ACH.track)ACH.track('tame');if(ACH.flag)ACH.flag('tame_wolf');}
  if(typeof showBedMessage==='function')showBedMessage('🐺 Wolf tamed!');
}

// Player attack: called on left-click. Returns true if a mob was hit
// (so the caller can skip block-mining for that click).
let _attackCooldown=0;
function tryPlayerAttack(){
  if(_attackCooldown>0)return false;
  const reach=isMobile?3.6:4.0;
  const mob=pickAttackMob(reach);
  if(!mob)return false;
  // Base damage 2; +damage when holding a tool (axe/pickaxe = weapon-ish).
  let dmg=2;const slot=(typeof inventory!=='undefined')?inventory[selectedSlot]:null;
  if(slot&&typeof isTool==='function'&&isTool(slot.id)){const td=toolDef(slot.id);const mat=(typeof TOOL_MATERIALS!=='undefined')?TOOL_MATERIALS[td.material]:null;dmg=2+(mat?mat.tier:1)*1.5;}
  attackMob(mob,dmg);
  _attackCooldown=0.45;
  return true;
}
function updateAttackCooldown(dt){if(_attackCooldown>0)_attackCooldown-=dt;}

// ===========================================================================
//  WINDMILL SAILS  (回転羽根)
// ===========================================================================
// Each village windmill (recorded in `villageWindmills` by the structure
// builder) gets a set of four big rotating sails bolted to its tower. The block
// world can't animate, so the spinning blades are lightweight Babylon meshes:
//   • a central hub box (the axle cap),
//   • four arms radiating out at 90° on a single pivot node,
//   • a fabric "sail" panel on each arm.
// A pivot TransformNode is rotated every frame so the whole cross turns slowly,
// just like a real mill catching the wind. Sails are spawned lazily when the
// player is near (and disposed when far) so distant villages cost nothing.
const windmillBlades=[];          // active blade rigs: {pivot,group,axis,phase,wm}
const WINDMILL_SPAWN_DIST=120;    // spawn sails within this many blocks
const WINDMILL_DESPAWN_DIST=160;  // dispose once well beyond view
const WINDMILL_SPIN_SPEED=0.6;    // radians / second (a gentle, scenic turn)

// Build one blade rig (hub + 4 arms + sails) centred on a windmill's hub point.
function buildWindmillBladeRig(wm){
  if(typeof BABYLON==='undefined'||typeof scene==='undefined')return null;
  const group=new BABYLON.TransformNode('windmill_'+(wm.hub.x|0)+'_'+(wm.hub.z|0),scene);
  group.position.set(wm.hub.x,wm.hub.y,wm.hub.z);
  // Orient the whole rig so the blade plane faces along the mounting wall normal.
  // axis 'x' → sails mounted on an X-facing wall, so they spin in the Y/Z plane;
  // we yaw the group 90° so the pivot's local Z spin sweeps across that wall.
  if(wm.axis==='x')group.rotation.y=Math.PI/2;
  // Pivot that actually rotates. Children hang off it so the cross turns as one.
  const pivot=new BABYLON.TransformNode('windmillPivot',scene);
  pivot.parent=group;pivot.position.set(0,0,0);
  // Central hub cap (slightly proud of the wall).
  const hub=BABYLON.MeshBuilder.CreateBox('windmillHub',{width:0.5,height:0.5,depth:0.5},scene);
  hub.material=mobMat('#5a3a1e');hub.isPickable=false;hub.parent=pivot;hub.position.set(0,0,0.35);
  // Four arms + sail panels at 0/90/180/270°.
  const armLen=3.4, armW=0.18;
  const woodMat=mobMat('#6b4a2a'), sailMat=mobMat('#efe7d2');
  for(let i=0;i<4;i++){
    const ang=i*Math.PI/2;
    const arm=new BABYLON.TransformNode('arm'+i,scene);arm.parent=pivot;arm.position.set(0,0,0.35);arm.rotation.z=ang;
    // The wooden spar.
    const spar=BABYLON.MeshBuilder.CreateBox('spar'+i,{width:armW,height:armLen,depth:armW},scene);
    spar.material=woodMat;spar.isPickable=false;spar.parent=arm;spar.position.set(0,armLen/2,0);
    // The cloth/lattice sail offset to one side of the spar (gives the classic
    // four-sail "X with fabric" silhouette).
    const sail=BABYLON.MeshBuilder.CreateBox('sail'+i,{width:1.0,height:armLen*0.78,depth:0.06},scene);
    sail.material=sailMat;sail.isPickable=false;sail.parent=arm;sail.position.set(0.62,armLen*0.52,0.02);
  }
  const rig={pivot,group,axis:wm.axis,phase:Math.random()*Math.PI*2,wm};
  pivot.rotation.z=rig.phase;
  return rig;
}

// Remove every active blade rig (used on world regen / reset).
function clearWindmillBlades(){
  for(const r of windmillBlades){if(r.group&&r.group.dispose)r.group.dispose(true,true);}
  windmillBlades.length=0;
}

// Spawn / despawn rigs based on distance to the player, then spin the live ones.
function updateWindmills(dt){
  if(typeof villageWindmills==='undefined'||typeof player==='undefined')return;
  if(!worldReady||!started)return;
  // Lazy spawn for nearby windmills.
  for(const wm of villageWindmills){
    const dx=wm.hub.x-player.pos.x, dz=wm.hub.z-player.pos.z;
    const distSq=dx*dx+dz*dz;
    if(!wm.spawned&&distSq<WINDMILL_SPAWN_DIST*WINDMILL_SPAWN_DIST){
      const rig=buildWindmillBladeRig(wm);
      if(rig){windmillBlades.push(rig);wm.spawned=true;wm._rig=rig;}
    }
  }
  // Despawn far rigs + spin the rest.
  for(let i=windmillBlades.length-1;i>=0;i--){
    const r=windmillBlades[i];
    const dx=r.group.position.x-player.pos.x, dz=r.group.position.z-player.pos.z;
    if(dx*dx+dz*dz>WINDMILL_DESPAWN_DIST*WINDMILL_DESPAWN_DIST){
      r.group.dispose(true,true);
      if(r.wm){r.wm.spawned=false;r.wm._rig=null;}
      windmillBlades.splice(i,1);
      continue;
    }
    r.phase+=WINDMILL_SPIN_SPEED*dt;
    r.pivot.rotation.z=r.phase;
  }
}

let playerModel=null;
function buildPlayerModel(){const root=new BABYLON.TransformNode('playerModel',scene);
  const skin='#c98e63',shirt='#3aa0c0',pants='#384a8c',hair='#3a2a18';
  const torso=makePart(root,'pm_torso',[0.5,0.75,0.28],[0,1.05,0],shirt);
  const headG=new BABYLON.TransformNode('pm_headG',scene);headG.parent=root;headG.position.set(0,1.62,0);
  makePart(headG,'pm_head',[0.5,0.5,0.5],[0,0,0],skin);
  makePart(headG,'pm_hair',[0.54,0.18,0.54],[0,0.2,0],hair);
  makePart(headG,'pm_eyeL',[0.08,0.08,0.02],[-0.12,0,0.26],'#1a1a1a');
  makePart(headG,'pm_eyeR',[0.08,0.08,0.02],[ 0.12,0,0.26],'#1a1a1a');
  const armL=new BABYLON.TransformNode('pm_armLp',scene);armL.parent=root;armL.position.set(-0.34,1.4,0);makePart(armL,'pm_armL',[0.18,0.7,0.22],[0,-0.35,0],shirt);
  const armR=new BABYLON.TransformNode('pm_armRp',scene);armR.parent=root;armR.position.set(0.34,1.4,0);makePart(armR,'pm_armR',[0.18,0.7,0.22],[0,-0.35,0],shirt);
  const legL=new BABYLON.TransformNode('pm_legLp',scene);legL.parent=root;legL.position.set(-0.13,0.7,0);makePart(legL,'pm_legL',[0.2,0.7,0.24],[0,-0.35,0],pants);
  const legR=new BABYLON.TransformNode('pm_legRp',scene);legR.parent=root;legR.position.set(0.13,0.7,0);makePart(legR,'pm_legR',[0.2,0.7,0.24],[0,-0.35,0],pants);
  root.setEnabled(false);
  playerModel={root,torso,headG,armL,armR,legL,legR,walkPhase:0};
  return playerModel;
}
function setPlayerModelVisible(v){if(!playerModel)buildPlayerModel();playerModel.root.setEnabled(!!v);}
function updatePlayerModel(dt){if(!playerModel)buildPlayerModel();const view=(typeof cameraView!=='undefined')?cameraView:0;if(view===0){playerModel.root.setEnabled(false);return;}
  playerModel.root.setEnabled(true);
  const pose=player.pose;let scaleY=1,tilt=0;
  if(pose===POSE.CROUCH){scaleY=0.84;}
  playerModel.root.position.set(player.pos.x,player.pos.y,player.pos.z);
  playerModel.root.rotation.y=player.yaw;
  playerModel.root.rotation.x=tilt;
  playerModel.root.scaling.y=scaleY;
  playerModel.headG.rotation.x=Math.max(-0.8,Math.min(0.8,player.pitch));
  const moving=Math.hypot(player.vel.x,player.vel.z)>0.6;if(moving)playerModel.walkPhase+=dt*9;else playerModel.walkPhase*=0.8;
  const swing=Math.sin(playerModel.walkPhase)*0.6;
  playerModel.legL.rotation.x=swing;playerModel.legR.rotation.x=-swing;
  playerModel.armL.rotation.x=-swing;playerModel.armR.rotation.x=swing;
}
