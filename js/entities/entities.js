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
  // Pig: classic Minecraft pink pig — wide body, big snout, round floppy ears.
  pig:   {name:'Pig',  emoji:'🐷', body:'#f0a8b0', leg:'#da8e9a', head:'#f0a8b0', snout:'#e07888', bodyH:0.68, legH:0.42, headSize:0.54, speed:1.4, hp:10, ears:'#e090a0', bodyWidthMul:1.08, drops:[{id:230,min:1,max:3}]},
  // Sheep: white body with visible dark legs below the wool coat.
  sheep: {name:'Sheep',emoji:'🐑', body:'#e8e4de', leg:'#4a3c30', head:'#d4cec6', snout:null,      bodyH:0.78, legH:0.52,  headSize:0.48,  speed:1.2, hp:8, fluffy:true, wool:'#f5f2ec', ears:'#c0b8ae', drops:[{id:233,min:1,max:2},{id:42,min:1,max:1}]},
  // Cow: dark brown with large white patches (Holstein), horns, udder.
  cow:   {name:'Cow',  emoji:'🐮', body:'#2e261e', leg:'#241e18', head:'#2e261e', snout:'#c8b89a', bodyH:0.88,legH:0.54, headSize:0.56, speed:1.1, hp:12, patch:'#f0ece2', horns:'#e8e2d0', ears:'#241e18', udder:'#e8a8b0', bodyWidthMul:1.06, drops:[{id:231,min:1,max:3},{id:234,min:0,max:2}]},
  // Chicken: white with red comb/wattle, orange beak and legs.
  chicken:{name:'Chicken',emoji:'🐔',body:'#f5f5f5', leg:'#e8a030', head:'#f5f5f5', snout:null,bodyH:0.52,legH:0.24, headSize:0.30, speed:1.6, hp:4, small:true, beak:'#e8a030', wattle:'#cc2a2a', wing:'#e8e8e8', bodyWidthMul:0.98, bodyDepthMul:0.60, drops:[{id:232,min:1,max:1},{id:235,min:0,max:2}]},
  // Wolf: Minecraft-accurate gray with dark back stripe, pale snout/belly.
  wolf:  {name:'Wolf', emoji:'🐺', body:'#8c8c8c', leg:'#7a7a7a', head:'#999999', snout:'#d0ccc8', bodyH:0.52, legH:0.44, headSize:0.48, speed:2.2, hp:16, ears:'#5e5e5e', tail:'#8c8c8c', backStripe:'#5a5a5a', wolf:true, neutral:true, attackDamage:3, attackRange:1.5, attackCooldown:0.9, sightRange:20, drops:[]},
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
  // --- Iron Golem – village protector NPC ------------------------------------
  // Spawns automatically when a village comes under threat (3+ panicking
  // villagers). Wanders near its home village and attacks any hostile mob
  // within sight. Does not attack the player unless provoked.
  iron_golem:{name:'Iron Golem', emoji:'🤖', humanoid:true, hostile:false, golem:true,
           skin:'#c8c8c8',       // iron body
           shirt:'#a8a8a8',     // iron torso
           pants:'#888888',     // iron legs
           speed:1.0, hp:100, sightRange:18, drops:[{id:14,min:3,max:5}],
           attackDamage:8, attackRange:2.2, attackCooldown:1.2, wanderRadius:20},
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
    // Profession-specific hat is attached lazily in spawnMob() (we know the
    // profession there but not here); a head "hatNode" is exposed so the
    // profession hat can be parented later without rebuilding the mesh.
    headGroup._villagerHead=true;
    return {root,legs,head:headGroup,bodyH:legH,parts,wings:[],arms:[armL,armR],humanoid:true};
  }

  // Iron Golem: tall iron-body humanoid with broad shoulders, stubby legs and
  // long arms. Visually distinct from villagers (no robe, no nose) so players
  // instantly recognise the village defender.
  if(type==='iron_golem'){
    const golemLegH=0.9,golemTorsoH=1.0,golemTorsoW=0.6,golemTorsoD=0.4,ghs=0.5;
    const gTorso=makePart(root,'gtorso',[golemTorsoW,golemTorsoH,golemTorsoD],[0,golemLegH+golemTorsoH/2,0],'#a8a8a8',parts);
    // Iron head — slightly bigger, with two dark eye slits and a "nose" bolt.
    const gHead=new BABYLON.TransformNode('ghead',scene);gHead.parent=root;
    gHead.position.set(0,golemLegH+golemTorsoH+ghs/2-0.02,0);
    makePart(gHead,'gheadbox',[ghs,ghs,ghs],[0,0,0],'#c8c8c8',parts);
    makePart(gHead,'geyeL',[ghs*0.2,ghs*0.16,0.04],[-ghs*0.22,ghs*0.08,ghs*0.5],'#1a1a1a',parts);
    makePart(gHead,'geyeR',[ghs*0.2,ghs*0.16,0.04],[ ghs*0.22,ghs*0.08,ghs*0.5],'#1a1a1a',parts);
    makePart(gHead,'gnose',[ghs*0.16,ghs*0.3,ghs*0.2],[0,-ghs*0.05,ghs*0.55],'#888888',parts);
    // Crack lines on torso (weathered iron look)
    makePart(root,'gcrack',[golemTorsoW*0.5,0.04,0.04],[-golemTorsoW*0.15,golemLegH+golemTorsoH*0.45,golemTorsoD*0.5],'#5a5a5a',parts);
    // Broad iron shoulders
    makePart(root,'gshoulder',[golemTorsoW+0.18,0.16,golemTorsoD+0.08],[0,golemLegH+golemTorsoH-0.06,0],'#909090',parts);
    // Long arms hanging down
    const gArmW=0.2,gArmH=0.85,gArmD=0.22;const gShoulderY=golemLegH+golemTorsoH-0.1;
    const gArmL=new BABYLON.TransformNode('gArmLp',scene);gArmL.parent=root;gArmL.position.set(-(golemTorsoW/2+gArmW/2),gShoulderY,0);
    makePart(gArmL,'garmL',[gArmW,gArmH,gArmD],[0,-gArmH/2,0],'#b0b0b0',parts);
    const gArmR=new BABYLON.TransformNode('gArmRp',scene);gArmR.parent=root;gArmR.position.set((golemTorsoW/2+gArmW/2),gShoulderY,0);
    makePart(gArmR,'garmR',[gArmW,gArmH,gArmD],[0,-gArmH/2,0],'#b0b0b0',parts);
    // Stubby legs
    const gLegW=0.26,gLegD=0.28;const gLegs=[];
    const gLegL=new BABYLON.TransformNode('gLegPivotL',scene);gLegL.parent=root;gLegL.position.set(-gLegW/2-0.02,golemLegH,0);
    makePart(gLegL,'glegL',[gLegW,golemLegH,gLegD],[0,-golemLegH/2,0],'#888888',parts);gLegs.push(gLegL);
    const gLegR=new BABYLON.TransformNode('gLegPivotR',scene);gLegR.parent=root;gLegR.position.set(gLegW/2+0.02,golemLegH,0);
    makePart(gLegR,'glegR',[gLegW,golemLegH,gLegD],[0,-golemLegH/2,0],'#888888',parts);gLegs.push(gLegR);
    return {root,legs:gLegs,head:gHead,bodyH:golemLegH,parts,wings:[],arms:[gArmL,gArmR],humanoid:true};
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

// Build mob mesh hierarchy — Minecraft-accurate animal shapes & colours
function buildMobMesh(type){
  const t=MOB_TYPES[type];
  if(t.humanoid)return buildHumanoidMesh(type);
  const root=new BABYLON.TransformNode('mob_'+type,scene);
  const s=t.small?0.8:1;
  // Per-species body proportions.
  const bodyW=0.6*s*(t.bodyWidthMul||1),bodyD=1.0*s*(t.bodyDepthMul||1),bodyH=t.bodyH*s;
  const legY=t.legH*s;
  // Every box mesh that makes up this mob, so we can flash them red on hurt.
  const parts=[];
  const wings=[];
  // --- Body --------------------------------------------------------------
  makePart(root,'body',[bodyW,bodyH,bodyD],[0,legY+bodyH/2,0],t.body,parts);

  // Cow: large irregular Holstein-style white patch on flank & face.
  if(type==='cow'&&t.patch){
    makePart(root,'patch1',[bodyW*0.7,bodyH*0.6,bodyD*0.5],[0,legY+bodyH*0.6,bodyD*0.16],t.patch,parts);
    makePart(root,'patch2',[bodyW*0.5,bodyH*0.4,bodyD*0.3],[bodyW*0.06,legY+bodyH*0.25,-bodyD*0.22],t.patch,parts);
  }else if(t.patch){
    makePart(root,'patch',[bodyW+0.02,bodyH*0.5,bodyD*0.45],[0,legY+bodyH*0.55,0.05],t.patch,parts);
  }

  // Wolf: darker back stripe for the Minecraft "saddle" look.
  if(type==='wolf'&&t.backStripe){
    makePart(root,'backStripe',[bodyW*0.5,bodyH*0.22,bodyD*0.92],[0,legY+bodyH*0.88,0],t.backStripe,parts);
  }

  // Sheep: oversized blocky wool coat — iconic Minecraft fluffy look.
  if(t.fluffy&&t.wool){
    makePart(root,'wool',[bodyW+0.20,bodyH+0.16,bodyD+0.12],[0,legY+bodyH/2+0.04,-0.02],t.wool,parts);
  }
  // Cow udder underneath the belly.
  if(t.udder){makePart(root,'udder',[bodyW*0.5,0.12*s,0.22*s],[0,legY+0.02,-bodyD*0.16],t.udder,parts);}

  // --- Head --------------------------------------------------------------
  const hs=t.headSize*s;
  const headGroup=new BABYLON.TransformNode('headGroup',scene);headGroup.parent=root;
  headGroup.position.set(0,legY+bodyH*0.78,bodyD/2+hs*0.38);
  makePart(headGroup,'head',[hs,hs,hs],[0,0,0],t.head,parts);

  // Cow: white muzzle patch on front of head.
  if(type==='cow'&&t.patch){
    makePart(headGroup,'muzzlePatch',[hs*0.62,hs*0.5,0.04],[0,-hs*0.18,hs*0.5],t.patch,parts);
  }

  // Snout: pig gets a big forward-facing disc snout; cow/wolf get a muzzle box.
  if(t.snout){
    if(type==='pig'){
      // Pig: large round disc snout — defining Minecraft pig feature.
      makePart(headGroup,'snout',[hs*0.62,hs*0.50,hs*0.28],[0,-hs*0.10,hs*0.54],t.snout,parts);
      makePart(headGroup,'nostrilL',[hs*0.12,hs*0.14,0.03],[-hs*0.14,-hs*0.10,hs*0.70],'#c0607a',parts);
      makePart(headGroup,'nostrilR',[hs*0.12,hs*0.14,0.03],[ hs*0.14,-hs*0.10,hs*0.70],'#c0607a',parts);
    }else{
      makePart(headGroup,'snout',[hs*0.55,hs*0.45,hs*0.32],[0,-hs*0.12,hs*0.55],t.snout,parts);
    }
  }

  // Ears — Minecraft style varies by animal:
  // Pig: small floppy ears on the sides, angled outward.
  // Cow: flat ears that stick out to the sides.
  // Sheep: small upright ear nubs.
  // Wolf: tall triangular ears pointing up.
  if(t.ears){
    if(type==='pig'){
      // Pig: wide floppy ears slightly angled forward/down.
      makePart(headGroup,'earL',[hs*0.26,hs*0.20,hs*0.12],[-hs*0.48,hs*0.38,-hs*0.04],t.ears,parts);
      makePart(headGroup,'earR',[hs*0.26,hs*0.20,hs*0.12],[ hs*0.48,hs*0.38,-hs*0.04],t.ears,parts);
    }else if(type==='cow'){
      // Cow: flat horizontal ears sticking out wide.
      makePart(headGroup,'earL',[hs*0.28,hs*0.14,hs*0.14],[-hs*0.56,hs*0.12,0],t.ears,parts);
      makePart(headGroup,'earR',[hs*0.28,hs*0.14,hs*0.14],[ hs*0.56,hs*0.12,0],t.ears,parts);
    }else if(type==='wolf'){
      // Wolf: tall pointed ears on top.
      makePart(headGroup,'earL',[hs*0.20,hs*0.30,hs*0.10],[-hs*0.32,hs*0.55,0],t.ears,parts);
      makePart(headGroup,'earR',[hs*0.20,hs*0.30,hs*0.10],[ hs*0.32,hs*0.55,0],t.ears,parts);
    }else{
      // Sheep and others: small nubs.
      makePart(headGroup,'earL',[hs*0.22,hs*0.18,hs*0.10],[-hs*0.44,hs*0.38,0],t.ears,parts);
      makePart(headGroup,'earR',[hs*0.22,hs*0.18,hs*0.10],[ hs*0.44,hs*0.38,0],t.ears,parts);
    }
  }
  // Cow horns — short stubby ones protruding from the top sides.
  if(t.horns){
    makePart(headGroup,'hornL',[hs*0.14,hs*0.26,hs*0.14],[-hs*0.34,hs*0.52,0],t.horns,parts);
    makePart(headGroup,'hornR',[hs*0.14,hs*0.26,hs*0.14],[ hs*0.34,hs*0.52,0],t.horns,parts);
  }
  // Eyes — wolf gets white sclera visible around the pupil for expressiveness.
  if(type==='wolf'){
    makePart(headGroup,'eyeWhiteL',[hs*0.22,hs*0.22,0.03],[-hs*0.30,hs*0.15,hs*0.50],'#e8e8e0',parts);
    makePart(headGroup,'eyeWhiteR',[hs*0.22,hs*0.22,0.03],[ hs*0.30,hs*0.15,hs*0.50],'#e8e8e0',parts);
    makePart(headGroup,'eyeL',[hs*0.13,hs*0.16,0.04],[-hs*0.30,hs*0.15,hs*0.52],'#1a1a1a',parts);
    makePart(headGroup,'eyeR',[hs*0.13,hs*0.16,0.04],[ hs*0.30,hs*0.15,hs*0.52],'#1a1a1a',parts);
  }else{
    makePart(headGroup,'eyeL',[hs*0.16,hs*0.16,0.02],[-hs*0.25,hs*0.15,hs*0.5],'#1a1a1a',parts);
    makePart(headGroup,'eyeR',[hs*0.16,hs*0.16,0.02],[ hs*0.25,hs*0.15,hs*0.5],'#1a1a1a',parts);
  }
  // Chicken beak + wattle + red comb on top.
  if(type==='chicken'){
    if(t.beak)makePart(headGroup,'beak',[hs*0.38,hs*0.22,hs*0.30],[0,-hs*0.06,hs*0.60],t.beak,parts);
    if(t.wattle)makePart(headGroup,'wattle',[hs*0.16,hs*0.24,hs*0.12],[0,-hs*0.34,hs*0.50],t.wattle,parts);
    // Red comb: three small bumps on top of the head.
    makePart(headGroup,'comb1',[hs*0.14,hs*0.26,hs*0.14],[ 0,    hs*0.60, hs*0.04],'#cc2a2a',parts);
    makePart(headGroup,'comb2',[hs*0.11,hs*0.20,hs*0.12],[-hs*0.12,hs*0.54,-hs*0.06],'#cc2a2a',parts);
    makePart(headGroup,'comb3',[hs*0.11,hs*0.20,hs*0.12],[ hs*0.12,hs*0.54,-hs*0.06],'#cc2a2a',parts);
  }
  // --- Wings (chicken): thin side flaps that flutter while moving. --------
  if(type==='chicken'&&t.wing){
    const wy=legY+bodyH*0.52;const wd=bodyD*0.68;
    const wL=new BABYLON.TransformNode('wingLp',scene);wL.parent=root;wL.position.set(-bodyW/2,wy,0);
    makePart(wL,'wingL',[0.07,bodyH*0.72,wd],[-0.02,0,0],t.wing,parts);wings.push(wL);
    const wR=new BABYLON.TransformNode('wingRp',scene);wR.parent=root;wR.position.set(bodyW/2,wy,0);
    makePart(wR,'wingR',[0.07,bodyH*0.72,wd],[0.02,0,0],t.wing,parts);wings.push(wR);
    // Tail feathers: small triangular puff at the back.
    makePart(root,'tailFeathers',[bodyW*0.6,bodyH*0.72,0.12],[0,legY+bodyH*0.72,-bodyD/2-0.05],t.wing,parts);
  }
  // --- Tail (wolf): bushy tail with white tip. ---------------------------
  let tailPivot=null;
  if(t.tail){
    tailPivot=new BABYLON.TransformNode('tailp',scene);tailPivot.parent=root;
    tailPivot.position.set(0,legY+bodyH*0.72,-bodyD/2);
    makePart(tailPivot,'tail',[0.18*s,0.44*s,0.18*s],[0,0.14*s,-0.04],t.tail,parts);
    // White tail tip.
    makePart(tailPivot,'tailTip',[0.14*s,0.18*s,0.14*s],[0,0.36*s,-0.06],'#e8e4de',parts);
    tailPivot.rotation.x=-0.5;
  }
  // --- Legs --------------------------------------------------------------
  // Leg width/depth slightly thicker for beef-cattle look on cow.
  const lw=(type==='cow')?0.22*s:0.18*s;
  const ld=(type==='cow')?0.22*s:0.18*s;
  const lx=bodyW/2-lw/2,lz=bodyD/2-ld*1.1;
  const legPos=[[-lx,lz],[lx,lz],[-lx,-lz],[lx,-lz]];
  const legs=[];
  for(let i=0;i<4;i++){
    const pivot=new BABYLON.TransformNode('legPivot'+i,scene);pivot.parent=root;
    pivot.position.set(legPos[i][0],legY,legPos[i][1]);
    makePart(pivot,'leg'+i,[lw,legY,ld],[0,-legY/2,0],t.leg,parts);
    legs.push(pivot);
  }
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
      mob.tradeLevel=1;
      mob.tradeCount=0;
      mob.loveTimer=0;
      if(typeof applyVillagerProfessionHat==='function')applyVillagerProfessionHat(mob,prof);
      villagers.push(mob);
    }
  }
}

// ---- Villager Breeding ----------------------------------------------------
// When fed (right-clicked with bread), a villager enters "love mode" for 20s.
// Two nearby loving villagers spawn a baby villager (Minecraft-style). This
// lets the player grow a village's population beyond the initial spawn.
function tryFeedVillager(mob,foodId){
  if(!mob||mob.dead||!mob.t||!mob.t.villager)return false;
  // Only bread (and apples) trigger love mode, matching Minecraft's breeding
  // food for villagers.
  const isLoveFood=(foodId===ITEM_BREAD)||(typeof ITEM_APPLE!=='undefined'&&foodId===ITEM_APPLE);
  if(!isLoveFood)return false;
  mob.loveTimer=20.0;
  if(typeof showFloatingText==='function')showFloatingText(mob.pos.x,mob.pos.y+2.2,mob.pos.z,'❤');
  // Check for another loving villager nearby to produce a baby.
  _tryVillagerBreed(mob);
  return true;
}
function _tryVillagerBreed(mob){
  if(!mob||mob.loveTimer<=0)return;
  for(const other of villagers){
    if(other===mob||other.dead||!other.loveTimer||other.loveTimer<=0)continue;
    const dx=other.pos.x-mob.pos.x,dz=other.pos.z-mob.pos.z;
    if(dx*dx+dz*dz>5*5)continue;
    // Cap total villagers so breeding can't explode the entity count.
    if(villagers.length>=40)break;
    // Spawn a baby villager between the two parents.
    const bx=Math.floor((mob.pos.x+other.pos.x)/2);
    const bz=Math.floor((mob.pos.z+other.pos.z)/2);
    const by=spawnHeightAt(bx,bz);
    if(by===null)break;
    const profs=MOB_TYPES.villager.professions;
    const prof=profs[Math.floor(Math.random()*profs.length)];
    const baby=spawnMob('villager',bx,by,bz);
    baby.villagerProfession=prof;
    baby.homeX=mob.homeX;baby.homeZ=mob.homeZ;
    baby.neverDespawn=true;
    baby.greetCooldown=0;
    baby.tradeLevel=1;baby.tradeCount=0;baby.loveTimer=0;
    baby.babyTimer=120;  // 2 minutes to grow up
    if(typeof applyVillagerProfessionHat==='function')applyVillagerProfessionHat(baby,prof);
    villagers.push(baby);
    // Consume love mode on both parents.
    mob.loveTimer=0;other.loveTimer=0;
    if(typeof showFloatingText==='function')showFloatingText(bx,by+2.2,bz,'👶');
    break;
  }
}

// Villager AI: wanders near home, flees hostiles, greets player.
function updateVillager(mob,dt){
  if(mob.dead)return;
  mob.greetCooldown=Math.max(0,mob.greetCooldown-dt);

  // Love mode timer (breeding) and baby growth timer.
  if(mob.loveTimer>0){
    mob.loveTimer-=dt;
    if(mob.loveTimer<0)mob.loveTimer=0;
    // Heart particle every ~1s while in love mode.
    mob._lovePtcTimer=(mob._lovePtcTimer||0)+dt;
    if(mob._lovePtcTimer>=1.0){
      mob._lovePtcTimer=0;
      if(typeof spawnHeartParticles==='function')spawnHeartParticles(mob.pos);
    }
    // Try to breed whenever another loving villager is near.
    _tryVillagerBreed(mob);
  }
  // Baby villager: smaller scale, grows up after babyTimer reaches 0.
  if(mob.babyTimer>0){
    mob.babyTimer-=dt;
    if(mob.meshes&&mob.meshes.root){
      // Baby is ~60% size; grow toward full size as the timer runs out.
      const growF=Math.max(0,1-mob.babyTimer/120);
      const sc=0.6+0.4*growF;
      mob.meshes.root.scaling.set(sc,sc,sc);
    }
    if(mob.babyTimer<=0){
      mob.babyTimer=0;
      if(mob.meshes&&mob.meshes.root)mob.meshes.root.scaling.set(1,1,1);
    }
  }

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
  // Iron golems also count as a threat villagers flee from? No — golems
  // protect villagers, so villagers do NOT flee from them. Only hostiles.
  if(nearbyHostile){
    // Run away from the threat
    const fhx=mob.pos.x-nearbyHostile.pos.x,fhz=mob.pos.z-nearbyHostile.pos.z;
    mob.targetYaw=Math.atan2(fhx,fhz);
    mob.moving=true;mob.wanderTimer=1.0;
    // Panic flag lets the golem-spawn system count panicking villagers.
    mob.panicTimer=5.0;
  } else {
    mob.panicTimer=Math.max(0,(mob.panicTimer||0)-dt);
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

// ---- Villager Profession Hats ---------------------------------------------
// Each profession gets a distinctive hat so players can recognise a villager's
// trade table at a glance (Minecraft-style). Attached lazily to the head node
// after spawn so we don't need a separate mesh builder per profession.
const VILLAGER_PROFESSION_HATS={
  Farmer:    {type:'straw',  color:'#d8c060', emoji:'🌾'},  // wide straw hat
  Librarian: {type:'cap',    color:'#f0f0f0', emoji:'📚'},  // white scholar cap + book
  Blacksmith:{type:'apron',  color:'#3a3a3a', emoji:'⚒'},  // blacksmith apron/baldric
  Butcher:   {type:'cap',    color:'#c8c8c8', emoji:'🥩'},  // white butcher cap
  Priest:    {type:'hood',   color:'#e8e8e8', emoji:'⭐'},  // white priest hood
};
function applyVillagerProfessionHat(mob,profession){
  if(!mob||!mob.meshes||!mob.meshes.head)return;
  const hat=VILLAGER_PROFESSION_HATS[profession];
  if(!hat)return;
  const head=mob.meshes.head;const hs=0.46;const parts=mob.meshes.parts;
  // Remove any previous hat parts (re-applying a profession).
  if(mob._hatParts){for(const p of mob._hatParts){if(p.dispose)p.dispose();}mob._hatParts=[];}
  else mob._hatParts=[];
  const add=(name,size,pos,hex)=>{
    const p=makePart(head,name,size,pos,hex,mob._hatParts);if(parts)parts.push(p);return p;
  };
  if(hat.type==='straw'){
    // Wide flat straw hat brim + low dome.
    add('hatBrim',[hs*1.6,0.06,hs*1.6],[0,hs*0.45,0],hat.color);
    add('hatDome',[hs*0.7,hs*0.28,hs*0.7],[0,hs*0.55,0],hat.color);
  }else if(hat.type==='cap'){
    // Rounded cap sitting on top of the head.
    add('hatCap',[hs*0.95,hs*0.34,hs*0.95],[0,hs*0.5,0],hat.color);
    add('hatBand',[hs*1.0,0.06,hs*1.0],[0,hs*0.38,0],'#888888');
  }else if(hat.type==='apron'){
    // Blacksmith: leather baldric over shoulder + soot mark on apron.
    add('baldric',[hs*0.18,hs*0.9,0.05],[hs*0.5,hs*0.1,hs*0.5],hat.color);
    add('baldric2',[hs*0.18,hs*0.9,0.05],[-hs*0.5,hs*0.1,hs*0.5],hat.color);
    // soot smudge on the existing apron (a dark patch) — parented to head is
    // wrong, so we skip the soot here (it would float with the head). The
    // baldric already reads clearly as "blacksmith".
  }else if(hat.type==='hood'){
    // Priest: white hood draped over the head.
    add('hoodTop',[hs*1.08,hs*0.5,hs*1.08],[0,hs*0.18,0],hat.color);
    add('hoodBack',[hs*1.05,hs*0.7,0.1],[0,hs*0.0,-hs*0.55],hat.color);
  }
}

// ---- Villager Trade Tables ------------------------------------------------
const VILLAGER_TRADE_TABLES={
  Farmer:[
    {cost:{id:ITEM_WHEAT,count:20}, reward:{id:ITEM_BREAD,count:6},    label:'20 Wheat → 6 Bread'},
    {cost:{id:ITEM_CARROT,count:15},reward:{id:ITEM_BREAD,count:4},    label:'15 Carrots → 4 Bread'},
    {cost:{id:ITEM_POTATO,count:15},reward:{id:ITEM_BAKED_POTATO,count:6},label:'15 Potatoes → 6 Baked Potato'},
    {cost:{id:B.PUMPKIN,count:3},   reward:{id:ITEM_SEEDS,count:12},   label:'3 Pumpkins → 12 Seeds'},
  ],
  Librarian:[
    {cost:{id:B.PLANKS,count:24},   reward:{id:B.BOOKSHELF,count:1},   label:'24 Planks → Bookshelf'},
    {cost:{id:B.LOG,count:8},       reward:{id:B.BOOKSHELF,count:1},   label:'8 Logs → Bookshelf'},
    {cost:{id:B.BOOKSHELF,count:1}, reward:{id:ITEM_BREAD,count:3},    label:'Bookshelf → 3 Bread'},
    {cost:{id:B.PLANKS,count:6},    reward:{id:B.SIGN,count:3},        label:'6 Planks → 3 Signs'},
  ],
  Blacksmith:[
    {cost:{id:B.IRON_ORE,count:4},  reward:{id:ITEM_PICK_IRON,count:1},label:'4 Iron → Iron Pickaxe'},
    {cost:{id:B.IRON_ORE,count:3},  reward:{id:ITEM_AXE_IRON,count:1}, label:'3 Iron → Iron Axe'},
    {cost:{id:B.IRON_ORE,count:3},  reward:{id:ITEM_SHOVEL_IRON,count:1},label:'3 Iron → Iron Shovel'},
    {cost:{id:B.COBBLE,count:12},   reward:{id:B.FURNACE,count:1},     label:'12 Cobble → Furnace'},
  ],
  Butcher:[
    {cost:{id:ITEM_PORKCHOP,count:5},reward:{id:ITEM_BREAD,count:4},   label:'5 Porkchop → 4 Bread'},
    {cost:{id:ITEM_BEEF,count:5},    reward:{id:ITEM_BREAD,count:4},   label:'5 Beef → 4 Bread'},
    {cost:{id:ITEM_CHICKEN,count:6}, reward:{id:ITEM_BREAD,count:4},   label:'6 Chicken → 4 Bread'},
    {cost:{id:B.COAL_ORE,count:4},   reward:{id:ITEM_PORKCHOP,count:3},label:'4 Coal → 3 Porkchop'},
  ],
  Priest:[
    {cost:{id:B.AMETHYST_CLUSTER,count:2},reward:{id:B.LANTERN,count:1},label:'2 Amethyst → Lantern'},
    {cost:{id:B.GOLD_ORE,count:2},  reward:{id:B.GLOW_LICHEN,count:4}, label:'2 Gold → 4 Glow Lichen'},
    {cost:{id:B.DIAMOND_ORE,count:1},reward:{id:ITEM_APPLE,count:8},   label:'1 Diamond → 8 Apples'},
    {cost:{id:ITEM_APPLE,count:5},   reward:{id:B.GOLD_ORE,count:1},   label:'5 Apples → 1 Gold Ore'},
  ],
};

// ---- Villager Trade Level System ------------------------------------------
// Each villager has a trade level (1-3). Higher levels unlock better trades.
// A villager levels up after completing enough trades (tracked per-villager).
// Level 2 unlocks at 4 trades, level 3 at 10 trades.
const VILLAGER_LEVEL_THRESHOLDS=[0,4,10];
const VILLAGER_MAX_LEVEL=3;
// Extra trades unlocked at higher levels. Appended to the base table when the
// villager's level allows it.
const VILLAGER_BONUS_TRADES={
  Farmer:[
    // Level 2+
    {cost:{id:ITEM_WHEAT,count:30},  reward:{id:B.HAY,count:2},       label:'30 Wheat → 2 Hay Bale', minLevel:2},
    {cost:{id:B.MELON,count:4},      reward:{id:ITEM_SEEDS,count:16}, label:'4 Melons → 16 Seeds', minLevel:2},
    // Level 3+
    {cost:{id:B.GOLD_ORE,count:2},   reward:{id:B.PUMPKIN,count:6},   label:'2 Gold → 6 Pumpkins', minLevel:3},
    {cost:{id:B.DIAMOND_ORE,count:1},reward:{id:B.CAKE?B.CAKE:B.HAY,count:1},label:'1 Diamond → Cake', minLevel:3},
  ],
  Librarian:[
    {cost:{id:B.BOOKSHELF,count:2},  reward:{id:B.LANTERN,count:2},    label:'2 Bookshelves → 2 Lanterns', minLevel:2},
    {cost:{id:B.LOG,count:16},       reward:{id:B.LANTERN,count:1},    label:'16 Logs → Lantern', minLevel:2},
    {cost:{id:B.DIAMOND_ORE,count:1},reward:{id:B.BOOKSHELF,count:4}, label:'1 Diamond → 4 Bookshelves', minLevel:3},
    {cost:{id:B.GOLD_ORE,count:3},   reward:{id:B.SIGN,count:12},     label:'3 Gold → 12 Signs', minLevel:3},
  ],
  Blacksmith:[
    {cost:{id:B.IRON_ORE,count:8},   reward:{id:ITEM_SWORD_IRON,count:1},label:'8 Iron → Iron Sword', minLevel:2},
    {cost:{id:B.IRON_ORE,count:6},   reward:{id:ITEM_PICK_IRON,count:2}, label:'6 Iron → 2 Iron Pickaxes', minLevel:2},
    {cost:{id:B.DIAMOND_ORE,count:2},reward:{id:ITEM_PICK_DIAMOND,count:1},label:'2 Diamond → Diamond Pickaxe', minLevel:3},
    {cost:{id:B.GOLD_ORE,count:4},   reward:{id:ITEM_SWORD_IRON,count:2}, label:'4 Gold → 2 Iron Swords', minLevel:3},
  ],
  Butcher:[
    {cost:{id:ITEM_PORKCHOP,count:10},reward:{id:B.FURNACE,count:1},  label:'10 Porkchop → Furnace', minLevel:2},
    {cost:{id:ITEM_BEEF,count:10},    reward:{id:B.LANTERN,count:2},  label:'10 Beef → 2 Lanterns', minLevel:2},
    {cost:{id:B.DIAMOND_ORE,count:1}, reward:{id:ITEM_BEEF,count:16}, label:'1 Diamond → 16 Beef', minLevel:3},
    {cost:{id:B.GOLD_ORE,count:3},    reward:{id:ITEM_PORKCHOP,count:12},label:'3 Gold → 12 Porkchop', minLevel:3},
  ],
  Priest:[
    {cost:{id:B.GOLD_ORE,count:4},   reward:{id:B.AMETHYST_CLUSTER,count:3},label:'4 Gold → 3 Amethyst', minLevel:2},
    {cost:{id:B.LANTERN,count:3},    reward:{id:B.GLOW_LICHEN,count:8},label:'3 Lanterns → 8 Glow Lichen', minLevel:2},
    {cost:{id:B.DIAMOND_ORE,count:2},reward:{id:B.AMETHYST_BLOCK,count:2},label:'2 Diamond → 2 Amethyst Blocks', minLevel:3},
    {cost:{id:B.GOLD_ORE,count:6},   reward:{id:B.DIAMOND_ORE,count:1},label:'6 Gold → 1 Diamond', minLevel:3},
  ],
};
// Return this villager's effective trade list (base + unlocked bonus trades).
function villagerTradesFor(profession,mob){
  const base=VILLAGER_TRADE_TABLES[profession]||VILLAGER_TRADE_TABLES.Farmer;
  const level=(mob&&mob.tradeLevel)||1;
  const bonus=VILLAGER_BONUS_TRADES[profession]||[];
  const unlocked=bonus.filter(t=>level>=t.minLevel);
  return base.concat(unlocked);
}
// Record a completed trade and level up the villager if threshold reached.
function villagerRecordTrade(mob){
  if(!mob||mob.dead||!mob.t||!mob.t.villager)return;
  mob.tradeCount=(mob.tradeCount||0)+1;
  const cur=mob.tradeLevel||1;
  if(cur<VILLAGER_MAX_LEVEL&&mob.tradeCount>=VILLAGER_LEVEL_THRESHOLDS[cur]){
    mob.tradeLevel=cur+1;
    if(typeof showFloatingText==='function'){
      showFloatingText(mob.pos.x,mob.pos.y+2.2,mob.pos.z,'⭐ Trade Level '+mob.tradeLevel+'!');
    }
    // A fresh hat colour/badge could be applied here; for now a green sparkle
    // tint is implied by the level shown in the trade UI.
  }
}

// Show a Minecraft-style villager greeting / trade hint above the villager.
let _villagerMsgTimeout=null;
let _villagerTradeOverlay=null;
function showVillagerGreeting(profession,mob){
  openVillagerTradeUI(profession,mob);
}

function openVillagerTradeUI(profession,mob){
  if(_villagerTradeOverlay){_villagerTradeOverlay.remove();_villagerTradeOverlay=null;}
  const trades=villagerTradesFor(profession,mob);
  const level=(mob&&mob.tradeLevel)||1;
  const tradeCount=(mob&&mob.tradeCount)||0;
  const ov=document.createElement('div');
  ov.id='villager-trade-overlay';
  ov.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:2000;display:flex;align-items:center;justify-content:center;';
  const panel=document.createElement('div');
  panel.style.cssText='background:#3a2a1a;border:3px solid #8b7040;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px;min-width:340px;max-height:80vh;overflow-y:auto;font-family:monospace;';

  // Header
  const PROF_EMOJI={Farmer:'🌾',Librarian:'📚',Blacksmith:'⚒',Butcher:'🥩',Priest:'⭐'};
  const hdr=document.createElement('div');
  hdr.style.cssText='display:flex;justify-content:space-between;align-items:center;color:#f5dfa0;font-size:16px;font-weight:bold;';
  // Trade level badge (stars)
  const stars='⭐'.repeat(level);
  hdr.innerHTML=`<span>${PROF_EMOJI[profession]||'👋'} ${profession} ${stars}</span>`;
  const cbtn=document.createElement('button');
  cbtn.textContent='✕';cbtn.style.cssText='background:#5a3a1a;color:#fff;border:none;border-radius:4px;cursor:pointer;padding:2px 8px;font-size:14px;';
  cbtn.onclick=()=>{ov.remove();_villagerTradeOverlay=null;if(!isMobile)try{document.getElementById('game-canvas').requestPointerLock();}catch(e){}};
  hdr.appendChild(cbtn);panel.appendChild(hdr);

  // Subtitle: trade level + progress to next level
  const sub=document.createElement('div');
  sub.style.cssText='color:#a09060;font-size:11px;text-align:center;';
  if(level<VILLAGER_MAX_LEVEL){
    const next=VILLAGER_LEVEL_THRESHOLDS[level];
    sub.innerHTML=`Trade Level <strong style="color:#f5c060">${level}</strong> · ${tradeCount}/${next} trades to next level`;
  }else{
    sub.innerHTML=`Trade Level <strong style="color:#f5c060">MAX (${level})</strong> · ${tradeCount} trades completed`;
  }
  panel.appendChild(sub);

  // Trade list
  const tradeList=document.createElement('div');
  tradeList.style.cssText='display:flex;flex-direction:column;gap:7px;';

  function getItemName(id){
    if(ITEMS[id])return ITEMS[id].name||ITEMS[id].emoji||'?';
    if(BLOCKS[id])return BLOCKS[id].name||'?';
    return '?';
  }
  function getItemEmoji(id){
    if(ITEMS[id])return ITEMS[id].emoji||'📦';
    if(BLOCKS[id])return '🧱';
    return '📦';
  }
  function countInInventory(id){
    let total=0;
    for(const s of inventory){if(s&&s.id===id)total+=s.count;}
    for(let i=0;i<9;i++){const s=inventory[i];if(s&&s.id===id)total+=0;} // hotbar included
    return total;
  }
  function consumeFromInventory(id,count){
    let remaining=count;
    for(let i=0;i<inventory.length&&remaining>0;i++){
      const s=inventory[i];if(!s||s.id!==id)continue;
      const take=Math.min(s.count,remaining);s.count-=take;remaining-=take;
      if(s.count<=0)inventory[i]=null;
    }
  }

  for(const trade of trades){
    const isBonus=!!trade.minLevel;
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;background:#2a1a0a;border:2px solid '+(isBonus?'#8a6a30':'#6a4a20')+';border-radius:6px;padding:8px;';
    // Cost
    const costDiv=document.createElement('div');
    costDiv.style.cssText='display:flex;align-items:center;gap:4px;min-width:110px;color:#e0c890;font-size:13px;';
    const costHave=countInInventory(trade.cost.id);
    const hasEnough=costHave>=trade.cost.count;
    costDiv.innerHTML=`<span style="font-size:18px">${getItemEmoji(trade.cost.id)}</span><span style="color:${hasEnough?'#90e060':'#e06060'}">${trade.cost.count}x ${getItemName(trade.cost.id)}</span>`;
    row.appendChild(costDiv);
    // Arrow
    const arr=document.createElement('div');arr.textContent='➜';arr.style.cssText='color:#f5a030;font-size:16px;';
    row.appendChild(arr);
    // Reward
    const rwdDiv=document.createElement('div');
    rwdDiv.style.cssText='flex:1;display:flex;align-items:center;gap:4px;color:#e0c890;font-size:13px;';
    rwdDiv.innerHTML=`<span style="font-size:18px">${getItemEmoji(trade.reward.id)}</span><span>${trade.reward.count}x ${getItemName(trade.reward.id)}</span>${isBonus?' <span style="color:#f5c060;font-size:10px">[Lv'+trade.minLevel+']</span>':''}`;
    row.appendChild(rwdDiv);
    // Trade button
    const btn=document.createElement('button');
    btn.textContent='Trade';
    btn.style.cssText=`padding:5px 10px;background:${hasEnough?'#2a6a2a':'#4a3a2a'};color:#fff;border:none;border-radius:4px;cursor:${hasEnough?'pointer':'not-allowed'};font-family:monospace;font-size:12px;`;
    btn.disabled=!hasEnough;
    btn.onclick=()=>{
      const have=countInInventory(trade.cost.id);
      if(have<trade.cost.count){btn.textContent='Not enough!';setTimeout(()=>btn.textContent='Trade',1200);return;}
      consumeFromInventory(trade.cost.id,trade.cost.count);
      if(typeof addToInventory==='function')addToInventory(trade.reward.id,trade.reward.count);
      if(typeof renderHotbar==='function')renderHotbar();
      // Record the trade and maybe level up the villager.
      const beforeLevel=(mob&&mob.tradeLevel)||1;
      if(typeof villagerRecordTrade==='function')villagerRecordTrade(mob);
      const afterLevel=(mob&&mob.tradeLevel)||1;
      btn.style.background='#1a5a1a';btn.textContent='✓ Done!';
      // If the villager levelled up, refresh the whole panel so new trades show.
      if(afterLevel>beforeLevel){
        setTimeout(()=>{ov.remove();_villagerTradeOverlay=null;openVillagerTradeUI(profession,mob);},700);
        return;
      }
      setTimeout(()=>{btn.style.background='#2a6a2a';btn.textContent='Trade';
        // Refresh cost color
        const newHave=countInInventory(trade.cost.id);
        const still=newHave>=trade.cost.count;
        btn.disabled=!still;btn.style.background=still?'#2a6a2a':'#4a3a2a';btn.style.cursor=still?'pointer':'not-allowed';
        costDiv.querySelector('span:last-child').style.color=still?'#90e060':'#e06060';
      },900);
    };
    row.appendChild(btn);
    tradeList.appendChild(row);
  }
  panel.appendChild(tradeList);
  ov.appendChild(panel);
  ov.addEventListener('click',(e)=>{if(e.target===ov){ov.remove();_villagerTradeOverlay=null;}});
  document.body.appendChild(ov);
  _villagerTradeOverlay=ov;
  if(!isMobile&&document.pointerLockElement)document.exitPointerLock();
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
  };
  // Slime: adjust halfW to match actual size so collision fits the cube.
  if(t&&t.slime){
    const sizes={slime_big:0.9,slime_medium:0.55,slime_small:0.32};
    mob.halfW=(sizes[type]||0.45)*0.9;
    mob.height=(sizes[type]||0.45)*2.05;
  }
  meshes.root.position.copyFrom(mob.pos);mobs.push(mob);return mob;}

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
  // Update iron golems (kept in their own list, like villagers, so they are
  // never auto-despawned). Each golem defends its home village from hostiles.
  _updateIronGolems(dt);
  // Maybe spawn an iron golem when a village is under threat (3+ panicking
  // villagers). Checked on the same cadence as mob spawning.
  _maybeSpawnDefenderGolem();
  updateArrows(dt);
}

// ---- Iron Golem Management ------------------------------------------------
const ironGolems=[];   // separate list (never despawned automatically)
const MAX_GOLEMS_PER_VILLAGE=2;
// Tally how many villagers are currently panicking near each village centre.
function _villageThreatCount(){
  // Group panicking villagers by their home village (rounded home coords).
  const buckets={};
  for(const v of villagers){
    if(v.dead||!(v.panicTimer>0))continue;
    const key=(v.homeX|0)+','+(v.homeZ|0);
    buckets[key]=(buckets[key]||0)+1;
  }
  return buckets;
}
function _golemCountForVillage(homeX,homeZ){
  const key=(homeX|0)+','+(homeZ|0);let n=0;
  for(const g of ironGolems){if(!g.dead&&((g.homeX|0)+','+(g.homeZ|0))===key)n++;}
  return n;
}
function _maybeSpawnDefenderGolem(){
  if(ironGolems.length>=12)return;  // global cap
  const threats=_villageThreatCount();
  for(const key in threats){
    if(threats[key]<3)continue;  // need 3+ panicking villagers
    const[hx,hz]=key.split(',').map(Number);
    if(_golemCountForVillage(hx,hz)>=MAX_GOLEMS_PER_VILLAGE)continue;
    // Find a safe spot near the village centre to spawn the golem.
    const ang=Math.random()*Math.PI*2;
    const gx=Math.floor(hx+Math.cos(ang)*4);
    const gz=Math.floor(hz+Math.sin(ang)*4);
    if(gx<2||gx>=WORLD_W-2||gz<2||gz>=WORLD_D-2)continue;
    const gy=spawnHeightAt(gx,gz);
    if(gy===null)continue;
    const golem=spawnMob('iron_golem',gx,gy,gz);
    golem.homeX=hx;golem.homeZ=hz;
    golem.neverDespawn=true;
    golem.combatTarget=null;
    ironGolems.push(golem);
    if(typeof showFloatingText==='function')showFloatingText(gx,gy+2.5,gz,'🤖 Iron Golem appears!');
  }
}
// Drive each golem: defend villagers by attacking nearby hostiles, otherwise
// wander near its home village. Does not attack the player unless provoked.
function _updateIronGolems(dt){
  for(const g of ironGolems){
    if(g.dead)continue;
    _updateIronGolem(g,dt);
    updateOneMob(g,dt);
  }
  // Remove dead/disposed golems from the list.
  for(let i=ironGolems.length-1;i>=0;i--){
    const g=ironGolems[i];
    if(g.dead||!g.meshes||!g.meshes.root){
      if(g.meshes&&g.meshes.root&&g.meshes.root.dispose)g.meshes.root.dispose();
      ironGolems.splice(i,1);
    }
  }
}
function _updateIronGolem(golem,dt){
  const t=golem.t;
  if(golem.attackTimer>0)golem.attackTimer-=dt;
  // Pick/refresh a combat target: nearest hostile within sight that is close
  // to the golem OR to any villager (defending the village).
  if(golem.combatTarget&&(golem.combatTarget.dead||mobs.indexOf(golem.combatTarget)<0)){
    golem.combatTarget=null;
  }
  if(!golem.combatTarget){
    let best=null,bestSq=(t.sightRange*t.sightRange);
    // Consider hostiles near the golem.
    for(const m of mobs){
      if(m.dead||!m.hostile)continue;
      const dx=m.pos.x-golem.pos.x,dz=m.pos.z-golem.pos.z;const sq=dx*dx+dz*dz;
      if(sq<bestSq){bestSq=sq;best=m;}
    }
    // Also consider hostiles threatening any villager sharing this village.
    if(!best){
      const key=(golem.homeX|0)+','+(golem.homeZ|0);
      for(const v of villagers){
        if(v.dead||((v.homeX|0)+','+(v.homeZ|0))!==key)continue;
        for(const m of mobs){
          if(m.dead||!m.hostile)continue;
          const dx=m.pos.x-v.pos.x,dz=m.pos.z-v.pos.z;
          if(dx*dx+dz*dz<10*10){best=m;break;}
        }
        if(best)break;
      }
    }
    golem.combatTarget=best;
  }
  golem._chasing=false;
  if(golem.combatTarget){
    const tgt=golem.combatTarget;
    const dx=tgt.pos.x-golem.pos.x,dz=tgt.pos.z-golem.pos.z;
    const distSq=dx*dx+dz*dz;
    const range=t.attackRange||2.2;
    golem.targetYaw=Math.atan2(dx,dz);
    golem._chasing=true;
    if(distSq<=range*range){
      golem.moving=false;
      // Attack swing.
      if(golem.attackTimer<=0){
        golem.attackTimer=t.attackCooldown||1.2;
        if(typeof attackMob==='function'){
          attackMob(tgt,t.attackDamage||8,golem);
        }else{
          // Fallback: directly hurt the target.
          tgt.hp-=t.attackDamage||8;tgt.hurtFlash=0.3;tgt.invuln=0.35;
          if(tgt.hp<=0&&typeof killMob==='function')killMob(tgt);
        }
        // Launch the target back a bit (golem knockback).
        const kb=4;
        const len=Math.hypot(dx,dz)||1;
        tgt.vel.x+=(dx/len)*kb;tgt.vel.z+=(dz/len)*kb;tgt.vel.y=4;
      }
    }else{
      golem.moving=true;
    }
  }else{
    // No target: wander near home village.
    const hdx=golem.pos.x-(golem.homeX||golem.pos.x),hdz=golem.pos.z-(golem.homeZ||golem.pos.z);
    const homeDist=Math.hypot(hdx,hdz);
    if(homeDist>t.wanderRadius){
      golem.targetYaw=Math.atan2(-hdx,-hdz);golem.moving=true;golem.wanderTimer=1.0;
    }
  }
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

  if(mob.t&&mob.t.slime){
    if(typeof updateSlime==='function')updateSlime(mob,dt);
    chasing=mob._chasing||false;fleeing=false;
  }else if(mob.wolf){
    updateWolf(mob,dt,dx,dz,distSq);
    chasing=mob._chasing;fleeing=mob._fleeing;
  }else if(mob.t&&mob.t.villager){
    // Villager AI is handled in updateVillager(); updateOneMob just does physics.
    // Only flee from the player if a hostile is chasing the villager
    // (the actual flee direction is set by updateVillager before this runs).
    fleeing=mob._fleeing||false;
  }else if(mob.t&&mob.t.golem){
    // Iron golem AI is handled in _updateIronGolem(); updateOneMob just does
    // physics + animation. The chasing flag is set by the golem driver.
    chasing=mob._chasing||false;
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

  // Position: X/Z from physics, Y managed by IK body-bob below
  mob.meshes.root.position.x=mob.pos.x;
  mob.meshes.root.position.z=mob.pos.z;
  if(!mob.t||!mob._bodyBobY){mob.meshes.root.position.y=mob.pos.y;}
  mob.meshes.root.rotation.y=mob.yaw;

  mob.lookTimer-=dt;
  if(mob.lookTimer<=0){mob.lookTimer=1.0+Math.random()*2.5;
    if(mob.speedMul<0.2){mob.headYaw=(Math.random()-0.5)*0.9;mob.headPitch=(Math.random()-0.4)*0.5;}
    else{mob.headYaw=0;mob.headPitch=0;}
  }
  if(mob.meshes.head){mob.meshes.head.rotation.y=approachAngle(mob.meshes.head.rotation.y,mob.headYaw,dt*3);mob.meshes.head.rotation.x=mob.meshes.head.rotation.x+(mob.headPitch-mob.meshes.head.rotation.x)*Math.min(1,dt*3);}

  const groundSpeed=Math.hypot(mob.vel.x,mob.vel.z);const moving=groundSpeed>0.25;
  // ── Smooth walk cycle: phase advances with actual ground speed ──────────────
  const walkFreq=4.5+groundSpeed*2.8;
  if(moving){mob.walkPhase+=dt*walkFreq;}else{mob.walkPhase+=(0-mob.walkPhase)*Math.min(1,dt*4);}
  const amp=Math.min(0.72,0.18+groundSpeed*0.24);
  // ── Terrain IK: adjust body height to match ground slope ─────────────────
  // Sample ground height under front, rear, left, right of the mob for full IK.
  if(mob.onGround&&mob.meshes.root){
    const sin=Math.sin(mob.yaw),cos=Math.cos(mob.yaw);
    const probeOff=0.38*(mob.t.bodyDepthMul||1)*(mob.t.small?0.7:1);
    const latOff=0.28*(mob.t.bodyWidthMul||1)*(mob.t.small?0.7:1);
    const fgx=Math.floor(mob.pos.x+sin*probeOff),fgz=Math.floor(mob.pos.z+cos*probeOff);
    const bgx=Math.floor(mob.pos.x-sin*probeOff),bgz=Math.floor(mob.pos.z-cos*probeOff);
    const lgx=Math.floor(mob.pos.x+cos*latOff),lgz=Math.floor(mob.pos.z-sin*latOff);
    const rgx=Math.floor(mob.pos.x-cos*latOff),rgz=Math.floor(mob.pos.z+sin*latOff);
    // Ground Y under each probe (scan ±2 blocks)
    function probeGY(px,pz){
      const baseY=Math.floor(mob.pos.y);
      for(let dy=2;dy>=-3;dy--){
        if(typeof isSolid==='function'&&typeof getBlock==='function'&&isSolid(getBlock(px,baseY+dy,pz)))return baseY+dy+1;
      }
      return mob.pos.y;
    }
    const fgy=probeGY(fgx,fgz),bgy=probeGY(bgx,bgz);
    const lgy=probeGY(lgx,lgz),rgy=probeGY(rgx,rgz);
    // Pitch (front-back slope)
    const slopePitch=Math.atan2(fgy-bgy,probeOff*2);
    mob._ikPitch=(mob._ikPitch||0)+(slopePitch-mob._ikPitch)*Math.min(1,dt*6);
    mob.meshes.root.rotation.x=mob._ikPitch;
    // Roll (left-right slope) blended with velocity banking
    const slopeRoll=Math.atan2(rgy-lgy,latOff*2);
    const lateralVel=mob.vel.x*Math.cos(mob.yaw)-mob.vel.z*Math.sin(mob.yaw);
    const targetRoll=slopeRoll*0.5-lateralVel*0.035;
    mob._ikRoll=(mob._ikRoll||0)+(targetRoll-mob._ikRoll)*Math.min(1,dt*5);
    mob.meshes.root.rotation.z=mob._ikRoll;
    // Per-leg foot planting: raise/lower each leg pivot to track ground height
    if(mob.meshes.legs.length>=4){
      const legPositions=[[sin*probeOff+cos*latOff,cos*probeOff-sin*latOff],
                          [sin*probeOff-cos*latOff,cos*probeOff+sin*latOff],
                          [-sin*probeOff+cos*latOff,-cos*probeOff-sin*latOff],
                          [-sin*probeOff-cos*latOff,-cos*probeOff+sin*latOff]];
      const legGrounds=[fgy,fgy,bgy,bgy]; // front pair / rear pair
      const legH=mob.t?(mob.t.legH||0.45):0.45;
      for(let li=0;li<4&&li<mob.meshes.legs.length;li++){
        const leg=mob.meshes.legs[li];
        const groundDiff=legGrounds[li]-mob.pos.y;
        const targetExtraY=Math.max(-0.15,Math.min(0.25,groundDiff*0.5));
        if(!leg._ikGroundY)leg._ikGroundY=0;
        leg._ikGroundY+=(targetExtraY-leg._ikGroundY)*Math.min(1,dt*10);
        leg.position.y=legH+leg._ikGroundY;
      }
    }
  } else {
    if(mob.meshes.root){
      mob._ikPitch=(mob._ikPitch||0)*Math.max(0,1-dt*6);
      mob._ikRoll=(mob._ikRoll||0)*Math.max(0,1-dt*6);
      mob.meshes.root.rotation.x=mob._ikPitch;
      mob.meshes.root.rotation.z=mob._ikRoll;
    }
    // Ease legs back to rest position
    for(const leg of mob.meshes.legs){
      if(leg._ikGroundY){leg._ikGroundY*=Math.max(0,1-dt*8);}
    }
  }
  // ── Body bob: gentle vertical bob while walking ───────────────────────────
  if(mob.meshes.root&&!mob.t.humanoid&&mob.onGround){
    const bobAmp=Math.min(0.08,groundSpeed*0.016);
    mob._bodyBobY=(mob._bodyBobY||0);
    const targetBob=moving?Math.abs(Math.sin(mob.walkPhase))*bobAmp:0;
    mob._bodyBobY+=(targetBob-mob._bodyBobY)*Math.min(1,dt*10);
    mob.meshes.root.position.y=mob.pos.y+mob._bodyBobY;
  } else if(mob.meshes.root&&mob._bodyBobY){
    mob._bodyBobY*=Math.max(0,1-dt*8);
    mob.meshes.root.position.y=mob.pos.y+mob._bodyBobY;
  }
  // ── Per-leg swing with diagonal gait (FL+RR vs FR+RL) ────────────────────
  mob.meshes.legs.forEach((leg,i)=>{
    // Diagonal pairs: 0(FL)&3(RR) move together; 1(FR)&2(RL) opposite
    const phase=mob.walkPhase+((i===1||i===2)?Math.PI:0);
    const targetAngle=Math.sin(phase)*amp;
    // Ease leg rotation for smoothness (IIR low-pass)
    leg.rotation.x=leg.rotation.x+(targetAngle-leg.rotation.x)*Math.min(1,dt*16);
    // Slight lateral splay on weight-bearing leg
    const splay=Math.cos(phase)*0.04;
    leg.rotation.z=(leg.rotation.z||0)+(splay-leg.rotation.z)*Math.min(1,dt*10);
  });
  // ── Humanoid arm easing: after an attack lunge the arms ease back to their
  // species rest pose (ghoul reaching forward, archer in a draw stance). ─────
  if(mob.meshes.humanoid&&mob.meshes.arms&&mob.meshes.arms.length){
    let restL,restR;
    if(mob.type==='ghoul'){restL=-Math.PI*0.5;restR=-Math.PI*0.5;}
    else{restL=-Math.PI*0.5;restR=-Math.PI*0.35;}
    const a=mob.meshes.arms;const k=Math.min(1,dt*6);
    // Humanoid arm swing while walking
    const armSwing=Math.sin(mob.walkPhase)*Math.min(0.45,groundSpeed*0.18);
    a[0].rotation.x+=(restL+armSwing-a[0].rotation.x)*k;
    a[1].rotation.x+=(restR-armSwing-a[1].rotation.x)*k;
  }
  // ── Wolf tail wag: tamed/happy wolves wag faster; angle eases with motion ─
  if(mob.meshes.tail){
    const happy=mob.tamed||mob.begTimer>0;
    const wagSpeed=happy?14:(moving?9:4);
    const wagAmp=happy?0.7:(moving?0.5:0.25);
    mob._tailPhase=(mob._tailPhase||0)+dt*wagSpeed;
    mob.meshes.tail.rotation.y=Math.sin(mob._tailPhase)*wagAmp;
    // Tail lifts when tamed (confident), droops slightly otherwise.
    mob.meshes.tail.rotation.x=happy?-0.7:-0.4;
  }
  // ── Chicken wings flutter up/down: fast when moving (or airborne) ─────────
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
  // Grant XP for the kill.
  if(typeof XP!=='undefined')XP.killXP(mob.type);
  // Slime splits into smaller slimes instead of regular despawn.
  if(mob.t&&mob.t.slime){
    if(typeof killSlime==='function'){killSlime(mob);return;}
  }
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
  // Remove from the correct tracking list (mobs / villagers / ironGolems).
  const idx=mobs.indexOf(mob);if(idx>=0)mobs.splice(idx,1);
  const vidx=villagers.indexOf(mob);if(vidx>=0)villagers.splice(vidx,1);
  const gidx=ironGolems.indexOf(mob);if(gidx>=0)ironGolems.splice(gidx,1);
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
  // Base damage 2; +damage when holding a tool (axe/pickaxe = weapon-ish).
  let dmg=2;const slot=(typeof inventory!=='undefined')?inventory[selectedSlot]:null;
  if(slot&&typeof isTool==='function'&&isTool(slot.id)){const td=toolDef(slot.id);const mat=(typeof TOOL_MATERIALS!=='undefined')?TOOL_MATERIALS[td.material]:null;dmg=2+(mat?mat.tier:1)*1.5;}
  // Try to hit dimension bosses (Warden / Ender Dragon) first
  if(typeof tryHitDimensionBoss==='function'&&typeof camera!=='undefined'){
    const dir=camera.getDirection(BABYLON.Vector3.Forward());
    const tx=camera.position.x+dir.x*reach;
    const ty=camera.position.y+dir.y*reach;
    const tz=camera.position.z+dir.z*reach;
    if(tryHitDimensionBoss(tx,ty,tz,dmg)){_attackCooldown=0.45;return true;}
  }
  const mob=pickAttackMob(reach);
  if(!mob)return false;
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
