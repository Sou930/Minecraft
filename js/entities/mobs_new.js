"use strict";
// =============================================================================
// NEW MOBS: Slime (splits on death) + diverse fauna
//   Panda, Turtle, Gecko, Axolotl, Camel, Armadillo
// Depends on entities.js (makePart, mobMat, mobs, spawnMob, killMob, etc.)
// =============================================================================

// ─── Slime ────────────────────────────────────────────────────────────────────
// Three sizes: big (radius ~0.9), medium (~0.55), small (~0.3).
// On death: big → 2-4 mediums; medium → 2-3 smalls; smalls just die.
// Night-only spawn in swamp biome; also rarely underground.

function _slimeMat(hex,alpha){
  const k='slime_'+hex+alpha;
  if(_slimeMat._c&&_slimeMat._c[k]) return _slimeMat._c[k];
  if(!_slimeMat._c) _slimeMat._c={};
  const m=new BABYLON.StandardMaterial('slimeMat_'+k,scene);
  m.diffuseColor=BABYLON.Color3.FromHexString(hex);
  m.alpha=alpha;
  m.emissiveColor=new BABYLON.Color3(0.05,0.12,0.05);
  m.specularColor=new BABYLON.Color3(0.4,0.8,0.4);
  m.specularPower=16;
  _slimeMat._c[k]=m;
  return m;
}

// Build a slime mesh: outer cube (translucent green) + inner core (solid darker).
function buildSlimeMesh(sizeKey){
  const sizes={slime_big:0.9,slime_medium:0.55,slime_small:0.32};
  const s=sizes[sizeKey]||0.55;
  const root=new BABYLON.TransformNode('slime_root_'+sizeKey,scene);

  // Outer body: slightly larger, translucent
  const outer=BABYLON.MeshBuilder.CreateBox('slime_outer',{size:s*2},scene);
  outer.material=_slimeMat('#5ecf5e',0.68);
  outer.isPickable=false;
  outer.parent=root;
  outer.position.y=s;

  // Inner core: smaller, opaque
  const inner=BABYLON.MeshBuilder.CreateBox('slime_inner',{size:s*1.3},scene);
  inner.material=_slimeMat('#2a9e2a',1.0);
  inner.isPickable=false;
  inner.parent=root;
  inner.position.y=s;

  // Eyes
  const eyeSize=s*0.22;
  const eyeY=s*1.28;
  const eyeMat=mobMat('#1a1a1a');
  const eyeL=BABYLON.MeshBuilder.CreateBox('slime_eyeL',{width:eyeSize,height:eyeSize,depth:0.04},scene);
  eyeL.material=eyeMat;eyeL.isPickable=false;eyeL.parent=root;
  eyeL.position.set(-s*0.4,eyeY,s+0.02);
  const eyeR=BABYLON.MeshBuilder.CreateBox('slime_eyeR',{width:eyeSize,height:eyeSize,depth:0.04},scene);
  eyeR.material=eyeMat;eyeR.isPickable=false;eyeR.parent=root;
  eyeR.position.set(s*0.4,eyeY,s+0.02);

  const legStubs=[];
  // four tiny nubs underneath
  const hw=s*0.9;
  const legPos=[[-hw,0,-hw],[ hw,0,-hw],[-hw,0,hw],[hw,0,hw]];
  for(const[lx,ly,lz]of legPos){
    const leg=BABYLON.MeshBuilder.CreateBox('slime_leg',{width:s*0.28,height:s*0.22,depth:s*0.28},scene);
    leg.material=_slimeMat('#3db83d',1.0);leg.isPickable=false;leg.parent=root;
    leg.position.set(lx,s*0.12,lz);
    legStubs.push(leg);
  }

  return {root,legs:[],head:null,parts:[outer,inner,eyeL,eyeR,...legStubs],wings:[],
    _outer:outer,_legStubs:legStubs,_s:s};
}

// Register slime types in the global MOB_TYPES (called after entities.js loads).
function registerSlimeTypes(){
  if(typeof MOB_TYPES==='undefined') return;
  MOB_TYPES['slime_big']   ={name:'Slime',    emoji:'🟩',slime:true,slimeSize:'big',
    body:'#5ecf5e',leg:'#3db83d',head:null,snout:null,
    bodyH:0.9,legH:0,headSize:0,
    speed:1.4,hp:16,attackDamage:3,attackRange:1.2,attackCooldown:1.2,sightRange:18,
    hostile:true,drops:[]};
  MOB_TYPES['slime_medium']={name:'Slime',    emoji:'🟩',slime:true,slimeSize:'medium',
    body:'#5ecf5e',leg:'#3db83d',head:null,snout:null,
    bodyH:0.55,legH:0,headSize:0,
    speed:1.8,hp:8,attackDamage:2,attackRange:0.85,attackCooldown:1.0,sightRange:15,
    hostile:true,drops:[]};
  MOB_TYPES['slime_small'] ={name:'Slime',    emoji:'🟩',slime:true,slimeSize:'small',
    body:'#5ecf5e',leg:'#3db83d',head:null,snout:null,
    bodyH:0.32,legH:0,headSize:0,
    speed:2.2,hp:4,attackDamage:1,attackRange:0.6,attackCooldown:0.8,sightRange:12,
    hostile:true,drops:[]};
}

// buildMobMesh is patched below (after diverse fauna mesh builders are defined).

// Kill a slime: splits before despawning (called instead of killMob for slimes).
function killSlime(mob){
  if(mob.dead) return;
  mob.dead=true;

  // XP
  if(typeof XP!=='undefined') XP.killXP(mob.type);

  // Splits
  const childType={slime_big:'slime_medium',slime_medium:'slime_small',slime_small:null};
  const next=childType[mob.type];
  if(next){
    const count=(mob.type==='slime_big')?2+Math.floor(Math.random()*3):2+Math.floor(Math.random()*2);
    for(let i=0;i<count;i++){
      const ang=Math.random()*Math.PI*2;
      const r=0.5+Math.random()*0.5;
      const cx=mob.pos.x+Math.cos(ang)*r;
      const cz=mob.pos.z+Math.sin(ang)*r;
      const child=spawnMob(next,Math.floor(cx),Math.floor(mob.pos.y),Math.floor(cz));
      // inherit a bit of outward velocity
      child.vel.x=Math.cos(ang)*2.5;
      child.vel.z=Math.sin(ang)*2.5;
      child.vel.y=4.0;
    }
    // Achievements
    if(typeof ACH!=='undefined'){ACH.flag('kill_slime');ACH.flag('slime_split');}
    // Show split message
    if(typeof showBedMessage==='function'&&mob.type==='slime_big')
      showBedMessage('🟩 Slime split!');
  }else{
    // Small slime just dies; still flag kill_slime
    if(typeof ACH!=='undefined') ACH.flag('kill_slime');
  }

  // Despawn mesh
  const idx=mobs.indexOf(mob);if(idx>=0)mobs.splice(idx,1);
  if(mob.meshes&&mob.meshes.root) mob.meshes.root.dispose();
}

// Slime AI: hop toward the player at night; wander by day.
function updateSlime(mob,dt){
  mob._hopTimer=(mob._hopTimer||0)-dt;
  const dx=mob.pos.x-player.pos.x,dz=mob.pos.z-player.pos.z;
  const distSq=dx*dx+dz*dz;
  const night=(typeof isNightTime==='function')&&isNightTime();
  const sight=mob.t.sightRange||18;

  if(night&&distSq<sight*sight){
    // Chase player when in range at night
    mob.targetYaw=Math.atan2(-dx,-dz);
    mob.moving=true;
    mob._chasing=true;
    // Attack
    if(mob.attackTimer<=0&&distSq<(mob.t.attackRange||1.2)*(mob.t.attackRange||1.2)){
      mob.attackTimer=mob.t.attackCooldown||1.2;
      if(typeof damage==='function') damage(mob.t.attackDamage||3);
    }
  }else{
    mob._chasing=false;
    // Slow wander
    if(mob._hopTimer<=0){
      mob._hopTimer=1.5+Math.random()*2.5;
      mob.moving=Math.random()<0.55;
      if(mob.moving){const turn=(Math.random()-0.5)*Math.PI*1.4;mob.targetYaw=mob.yaw+turn;}
    }
  }

  // Slimes hop: trigger a hop from the ground.
  if(mob.onGround&&mob._chasing&&mob._hopTimer<=0){
    mob.vel.y=6.5;mob._hopTimer=0.7+Math.random()*0.4;
  }else if(mob.onGround&&mob.moving&&mob._hopTimer<=0){
    mob.vel.y=5.2;mob._hopTimer=1.0+Math.random()*0.8;
  }

  // Squash & stretch animation
  if(mob.meshes._outer){
    const s=mob.meshes._s||0.55;
    if(!mob.onGround){
      // Stretch while airborne
      mob.meshes.root.scaling.set(0.85,1.18,0.85);
    }else{
      // Squash on landing (brief)
      mob._squash=(mob._squash||0);
      if(mob._prevAirborne){mob._squash=0.28;}
      mob._squash=Math.max(0,mob._squash-dt*3.5);
      const sq=mob._squash;
      mob.meshes.root.scaling.set(1+sq*0.4,1-sq*0.6,1+sq*0.4);
    }
    mob._prevAirborne=!mob.onGround;
  }
}

// ─── Diverse Fauna: Panda, Turtle, Gecko, Axolotl, Camel, Armadillo ──────────
function registerDiverseFauna(){
  if(typeof MOB_TYPES==='undefined') return;

  // ── Panda ──────────────────────────────────────────────────────────────────
  // Black-and-white, chunky. Found in jungle. Passive. Rare.
  MOB_TYPES['panda']={name:'Panda',emoji:'🐼',
    body:'#f0f0f0',leg:'#1a1a1a',head:'#f0f0f0',snout:'#e0e0e0',
    bodyH:0.85,legH:0.55,headSize:0.62,
    speed:1.0,hp:20,
    ears:'#1a1a1a',patch:'#1a1a1a',
    bodyWidthMul:1.15,bodyDepthMul:1.08,
    drops:[{id:201,min:0,max:2}]}; // wheat drop (bamboo proxy)

  // ── Turtle ─────────────────────────────────────────────────────────────────
  // Slow, flat, loves beaches. Green shell.
  MOB_TYPES['turtle']={name:'Turtle',emoji:'🐢',
    body:'#2e7d32',leg:'#1b5e20',head:'#4caf50',snout:'#388e3c',
    bodyH:0.32,legH:0.22,headSize:0.28,
    speed:0.6,hp:30,
    small:true,
    drops:[]};

  // ── Gecko ──────────────────────────────────────────────────────────────────
  // Tiny, fast, bright colours. Found in deserts/savanna.
  MOB_TYPES['gecko']={name:'Gecko',emoji:'🦎',
    body:'#8bc34a',leg:'#558b2f',head:'#9ccc65',snout:'#7cb342',
    bodyH:0.22,legH:0.14,headSize:0.22,
    speed:3.2,hp:4,
    small:true,bodyWidthMul:0.6,bodyDepthMul:1.5,
    drops:[]};

  // ── Axolotl ────────────────────────────────────────────────────────────────
  // Pink salamander. Lives near water. Cute feathery gills.
  MOB_TYPES['axolotl']={name:'Axolotl',emoji:'🦎',
    body:'#f48fb1',leg:'#f06292',head:'#f8bbd0',snout:'#ec407a',
    bodyH:0.26,legH:0.18,headSize:0.26,
    speed:1.2,hp:14,
    small:true,bodyWidthMul:0.7,bodyDepthMul:1.3,
    drops:[]};

  // ── Camel ──────────────────────────────────────────────────────────────────
  // Tall, sandy, two humps. Found in desert/savanna.
  MOB_TYPES['camel']={name:'Camel',emoji:'🐪',
    body:'#d4a843',leg:'#b8902a',head:'#e6c068',snout:'#c9962e',
    bodyH:1.2,legH:0.95,headSize:0.52,
    speed:1.6,hp:26,
    ears:'#c9962e',humps:true,
    drops:[]};

  // ── Armadillo ──────────────────────────────────────────────────────────────
  // Armored, curls into a ball when scared. Savanna/desert.
  MOB_TYPES['armadillo']={name:'Armadillo',emoji:'🐾',
    body:'#795548',leg:'#4e342e',head:'#8d6e63',snout:'#5d4037',
    bodyH:0.55,legH:0.3,headSize:0.36,
    speed:1.3,hp:12,
    small:true,armored:true,
    drops:[]};
}

// ─── Patch buildMobMesh to handle all new types ──────────────────────────────
(function patchBuildMobMesh(){
  const prev=(typeof buildMobMesh!=='undefined')?buildMobMesh:null;
  window.buildMobMesh=function(type){
    // Slimes
    if(type==='slime_big'||type==='slime_medium'||type==='slime_small') return buildSlimeMesh(type);
    // Diverse fauna
    if(type==='panda')     return buildPandaMesh();
    if(type==='camel')     return buildCamelMesh();
    if(type==='turtle')    return buildTurtleMesh();
    if(type==='gecko'||type==='axolotl') return buildLizardMesh(type);
    if(type==='armadillo') return buildArmadilloMesh();
    // Fallback to original
    return prev?prev(type):null;
  };
})();

// Panda: standard quad body but with black ear+eye-patch markings.
function buildPandaMesh(){
  const type='panda';
  const t=MOB_TYPES[type];
  const root=new BABYLON.TransformNode('mob_panda',scene);
  const parts=[];
  const wings=[];
  const s=1;
  const bodyW=0.6*s*(t.bodyWidthMul||1),bodyD=1.0*s*(t.bodyDepthMul||1),bodyH=t.bodyH*s;
  const legY=t.legH*s;
  // Body
  makePart(root,'body',[bodyW,bodyH,bodyD],[0,legY+bodyH/2,0],t.body,parts);
  // Black belly patch
  makePart(root,'patch',[bodyW*0.6,bodyH*0.55,bodyD*0.3],[0,legY+bodyH*0.35,bodyD*0.37],'#1a1a1a',parts);
  // Head
  const hs=t.headSize*s;
  const headGroup=new BABYLON.TransformNode('headGroup',scene);headGroup.parent=root;
  headGroup.position.set(0,legY+bodyH*0.75,bodyD/2+hs*0.35);
  makePart(headGroup,'head',[hs,hs,hs],[0,0,0],t.head,parts);
  // Black eye patches
  makePart(headGroup,'eyePatchL',[hs*0.32,hs*0.32,0.04],[-hs*0.28,hs*0.05,hs*0.49],'#1a1a1a',parts);
  makePart(headGroup,'eyePatchR',[hs*0.32,hs*0.32,0.04],[ hs*0.28,hs*0.05,hs*0.49],'#1a1a1a',parts);
  // Eyes (white sclera + black pupil)
  makePart(headGroup,'eyeL',[hs*0.14,hs*0.14,0.03],[-hs*0.28,hs*0.05,hs*0.52],'#f0f0f0',parts);
  makePart(headGroup,'eyeR',[hs*0.14,hs*0.14,0.03],[ hs*0.28,hs*0.05,hs*0.52],'#f0f0f0',parts);
  // Snout
  makePart(headGroup,'snout',[hs*0.5,hs*0.4,hs*0.3],[0,-hs*0.12,hs*0.55],'#e0e0e0',parts);
  // Black ears
  makePart(headGroup,'earL',[hs*0.28,hs*0.24,hs*0.1],[-hs*0.4,hs*0.48,0],'#1a1a1a',parts);
  makePart(headGroup,'earR',[hs*0.28,hs*0.24,hs*0.1],[ hs*0.4,hs*0.48,0],'#1a1a1a',parts);
  // Legs
  const legs=[];const lw=0.22*s,ld=0.22*s;const lx=bodyW/2-lw/2,lz=bodyD/2-ld;
  const legPos=[[-lx,lz],[lx,lz],[-lx,-lz],[lx,-lz]];
  for(let i=0;i<4;i++){const pivot=new BABYLON.TransformNode('legPivot'+i,scene);pivot.parent=root;pivot.position.set(legPos[i][0],legY,legPos[i][1]);makePart(pivot,'leg'+i,[lw,legY,ld],[0,-legY/2,0],'#1a1a1a',parts);legs.push(pivot);}
  return {root,legs,head:headGroup,bodyH:legY,parts,wings};
}

// Camel: tall body with humps.
function buildCamelMesh(){
  const t=MOB_TYPES['camel'];
  const root=new BABYLON.TransformNode('mob_camel',scene);
  const parts=[];
  const s=1;
  const bodyW=0.6*s,bodyD=1.0*s,bodyH=t.bodyH*s,legY=t.legH*s;
  // Neck (elongated column)
  makePart(root,'neck',[0.28,0.9,0.28],[0,legY+bodyH+0.2,bodyD*0.2],'#d4a843',parts);
  // Body
  makePart(root,'body',[bodyW,bodyH,bodyD],[0,legY+bodyH/2,0],t.body,parts);
  // Two humps
  makePart(root,'hump1',[bodyW*0.55,0.38,bodyD*0.32],[0,legY+bodyH+0.12,bodyD*0.18],'#c9962e',parts);
  makePart(root,'hump2',[bodyW*0.48,0.28,bodyD*0.28],[0,legY+bodyH+0.06,bodyD*(-0.18)],'#c9962e',parts);
  // Head
  const hs=t.headSize*s;
  const headGroup=new BABYLON.TransformNode('headGroup',scene);headGroup.parent=root;
  headGroup.position.set(0,legY+bodyH+0.9,bodyD/2+hs*0.3);
  makePart(headGroup,'head',[hs,hs*0.8,hs*1.3],[0,0,0],t.head,parts);
  // snout elongated
  makePart(headGroup,'snout',[hs*0.5,hs*0.38,hs*0.4],[0,-hs*0.18,hs*0.72],'#c9962e',parts);
  makePart(headGroup,'eyeL',[hs*0.16,hs*0.16,0.02],[-hs*0.32,hs*0.08,hs*0.62],'#1a1a1a',parts);
  makePart(headGroup,'eyeR',[hs*0.16,hs*0.16,0.02],[ hs*0.32,hs*0.08,hs*0.62],'#1a1a1a',parts);
  makePart(headGroup,'earL',[hs*0.18,hs*0.22,hs*0.1],[-hs*0.38,hs*0.42,0],'#b8902a',parts);
  makePart(headGroup,'earR',[hs*0.18,hs*0.22,hs*0.1],[ hs*0.38,hs*0.42,0],'#b8902a',parts);
  // Legs (long)
  const legs=[];const lw=0.2*s,ld=0.2*s;
  const lx=bodyW/2-lw/2,lz=bodyD/2-ld;
  const legPos=[[-lx,lz],[lx,lz],[-lx,-lz],[lx,-lz]];
  for(let i=0;i<4;i++){const pivot=new BABYLON.TransformNode('legPivot'+i,scene);pivot.parent=root;pivot.position.set(legPos[i][0],legY,legPos[i][1]);makePart(pivot,'leg'+i,[lw,legY,ld],[0,-legY/2,0],'#b8902a',parts);legs.push(pivot);}
  // Tail
  const tailPivot=new BABYLON.TransformNode('tailp',scene);tailPivot.parent=root;
  tailPivot.position.set(0,legY+bodyH*0.7,-bodyD/2);
  makePart(tailPivot,'tail',[0.1,0.3,0.08],[0,0.1,-0.04],'#b8902a',parts);
  return {root,legs,head:headGroup,bodyH:legY,parts,wings:[],tail:tailPivot};
}

// Turtle: wide flat body with dome shell.
function buildTurtleMesh(){
  const t=MOB_TYPES['turtle'];
  const root=new BABYLON.TransformNode('mob_turtle',scene);
  const parts=[];
  const s=1;
  const bodyW=0.72*s,bodyD=0.95*s,bodyH=t.bodyH*s,legY=t.legH*s;
  // Shell (dome-ish flat box with green top)
  makePart(root,'shell',[bodyW+0.12,bodyH+0.14,bodyD+0.08],[0,legY+bodyH/2+0.04,0],'#2e7d32',parts);
  // Shell pattern lines
  makePart(root,'shellLine1',[0.04,bodyH+0.16,bodyD*0.4],[bodyW*0.2,legY+bodyH/2+0.06,bodyD*0.1],'#1b5e20',parts);
  makePart(root,'shellLine2',[0.04,bodyH+0.16,bodyD*0.4],[-bodyW*0.2,legY+bodyH/2+0.06,bodyD*0.1],'#1b5e20',parts);
  // Belly (tan)
  makePart(root,'belly',[bodyW*0.8,0.06,bodyD*0.85],[0,legY+0.04,0],'#a5d6a7',parts);
  // Head (small and retractable-looking)
  const hs=t.headSize*s;
  const headGroup=new BABYLON.TransformNode('headGroup',scene);headGroup.parent=root;
  headGroup.position.set(0,legY+bodyH*0.8,bodyD/2+hs*0.2);
  makePart(headGroup,'head',[hs,hs*0.8,hs],[0,0,0],'#4caf50',parts);
  makePart(headGroup,'snout',[hs*0.48,hs*0.38,hs*0.32],[0,-hs*0.1,hs*0.55],'#388e3c',parts);
  makePart(headGroup,'eyeL',[hs*0.16,hs*0.16,0.02],[-hs*0.28,hs*0.12,hs*0.5],'#1a1a1a',parts);
  makePart(headGroup,'eyeR',[hs*0.16,hs*0.16,0.02],[ hs*0.28,hs*0.12,hs*0.5],'#1a1a1a',parts);
  // Short stubby legs
  const legs=[];const lw=0.18*s,ld=0.18*s;
  const lx=bodyW/2-lw/2+0.02,lz=bodyD/2-ld*0.8;
  const legPos=[[-lx,lz],[lx,lz],[-lx,-lz],[lx,-lz]];
  for(let i=0;i<4;i++){const pivot=new BABYLON.TransformNode('legPivot'+i,scene);pivot.parent=root;pivot.position.set(legPos[i][0],legY,legPos[i][1]);makePart(pivot,'leg'+i,[lw,legY,ld],[0,-legY/2,0],'#388e3c',parts);legs.push(pivot);}
  return {root,legs,head:headGroup,bodyH:legY,parts,wings:[]};
}

// Gecko / Axolotl: small lizard body with long tail.
function buildLizardMesh(type){
  const t=MOB_TYPES[type];
  const root=new BABYLON.TransformNode('mob_'+type,scene);
  const parts=[];
  const s=0.8;
  const bodyW=0.26*s,bodyD=0.6*s,bodyH=t.bodyH*s,legY=t.legH*s;
  makePart(root,'body',[bodyW,bodyH,bodyD],[0,legY+bodyH/2,0],t.body,parts);
  // Tail (thin, long box at back)
  const tailPivot=new BABYLON.TransformNode('tailp',scene);tailPivot.parent=root;
  tailPivot.position.set(0,legY+bodyH*0.55,-bodyD/2);
  makePart(tailPivot,'tail',[bodyW*0.55,bodyH*0.7,bodyD*0.9],[0,-bodyH*0.1,-bodyD*0.45],t.leg,parts);
  // Axolotl: feathery gills (side plumes)
  if(type==='axolotl'){
    makePart(root,'gillL',[0.05,0.22,0.05],[-bodyW*0.7,legY+bodyH*0.7,0],'#f06292',parts);
    makePart(root,'gillR',[0.05,0.22,0.05],[ bodyW*0.7,legY+bodyH*0.7,0],'#f06292',parts);
    makePart(root,'gillL2',[0.04,0.18,0.04],[-bodyW*0.8,legY+bodyH*0.55,bodyD*0.2],'#f06292',parts);
    makePart(root,'gillR2',[0.04,0.18,0.04],[ bodyW*0.8,legY+bodyH*0.55,bodyD*0.2],'#f06292',parts);
  }
  // Head
  const hs=t.headSize*s;
  const headGroup=new BABYLON.TransformNode('headGroup',scene);headGroup.parent=root;
  headGroup.position.set(0,legY+bodyH*0.6,bodyD/2+hs*0.28);
  makePart(headGroup,'head',[hs,hs*0.75,hs],[0,0,0],t.head,parts);
  makePart(headGroup,'snout',[hs*0.52,hs*0.36,hs*0.28],[0,-hs*0.12,hs*0.52],t.snout,parts);
  makePart(headGroup,'eyeL',[hs*0.18,hs*0.18,0.02],[-hs*0.28,hs*0.12,hs*0.46],'#1a1a1a',parts);
  makePart(headGroup,'eyeR',[hs*0.18,hs*0.18,0.02],[ hs*0.28,hs*0.12,hs*0.46],'#1a1a1a',parts);
  // 4 legs (very short)
  const legs=[];const lw=0.1*s,ld=0.1*s;
  const lx=bodyW/2+0.01,lz=bodyD*0.3;
  const legP=[[-lx,lz],[lx,lz],[-lx,-lz],[lx,-lz]];
  for(let i=0;i<4;i++){const pivot=new BABYLON.TransformNode('legPivot'+i,scene);pivot.parent=root;pivot.position.set(legP[i][0],legY,legP[i][1]);makePart(pivot,'leg'+i,[lw,legY,ld],[0,-legY/2,0],t.leg,parts);legs.push(pivot);}
  return {root,legs,head:headGroup,bodyH:legY,parts,wings:[],tail:tailPivot};
}

// Armadillo: armored body with curling behavior.
function buildArmadilloMesh(){
  const t=MOB_TYPES['armadillo'];
  const root=new BABYLON.TransformNode('mob_armadillo',scene);
  const parts=[];
  const s=1;
  const bodyW=0.44*s,bodyD=0.72*s,bodyH=t.bodyH*s,legY=t.legH*s;
  // Armored shell segments
  makePart(root,'shell1',[bodyW+0.1,bodyH*0.5,bodyD*0.38],[0,legY+bodyH*0.65,-bodyD*0.28],'#6d4c41',parts);
  makePart(root,'shell2',[bodyW+0.1,bodyH*0.5,bodyD*0.36],[0,legY+bodyH*0.65, bodyD*0.08],'#795548',parts);
  makePart(root,'shell3',[bodyW+0.1,bodyH*0.5,bodyD*0.32],[0,legY+bodyH*0.65, bodyD*0.36],'#8d6e63',parts);
  // Body (under shell)
  makePart(root,'body',[bodyW,bodyH,bodyD],[0,legY+bodyH/2,0],'#a1887f',parts);
  // Head (pointed snout, small)
  const hs=t.headSize*s;
  const headGroup=new BABYLON.TransformNode('headGroup',scene);headGroup.parent=root;
  headGroup.position.set(0,legY+bodyH*0.62,bodyD/2+hs*0.2);
  makePart(headGroup,'head',[hs,hs*0.7,hs*0.9],[0,0,0],'#8d6e63',parts);
  makePart(headGroup,'snout',[hs*0.4,hs*0.3,hs*0.38],[0,-hs*0.16,hs*0.52],'#5d4037',parts);
  makePart(headGroup,'eyeL',[hs*0.14,hs*0.14,0.02],[-hs*0.26,hs*0.06,hs*0.48],'#1a1a1a',parts);
  makePart(headGroup,'eyeR',[hs*0.14,hs*0.14,0.02],[ hs*0.26,hs*0.06,hs*0.48],'#1a1a1a',parts);
  // Ears (small)
  makePart(headGroup,'earL',[hs*0.18,hs*0.2,hs*0.08],[-hs*0.36,hs*0.38,0],'#4e342e',parts);
  makePart(headGroup,'earR',[hs*0.18,hs*0.2,hs*0.08],[ hs*0.36,hs*0.38,0],'#4e342e',parts);
  // Legs
  const legs=[];const lw=0.14*s,ld=0.14*s;
  const lx=bodyW/2-lw/2,lz=bodyD/2-ld*0.9;
  const legPos=[[-lx,lz],[lx,lz],[-lx,-lz],[lx,-lz]];
  for(let i=0;i<4;i++){const pivot=new BABYLON.TransformNode('legPivot'+i,scene);pivot.parent=root;pivot.position.set(legPos[i][0],legY,legPos[i][1]);makePart(pivot,'leg'+i,[lw,legY,ld],[0,-legY/2,0],'#4e342e',parts);legs.push(pivot);}
  // Tail
  const tailPivot=new BABYLON.TransformNode('tailp',scene);tailPivot.parent=root;
  tailPivot.position.set(0,legY+bodyH*0.5,-bodyD/2);
  makePart(tailPivot,'tail',[0.12,0.24,0.1],[0,0.06,-0.04],'#5d4037',parts);
  return {root,legs,head:headGroup,bodyH:legY,parts,wings:[],tail:tailPivot};
}

// ─── Spawn logic patches ─────────────────────────────────────────────────────
// We intercept pickAnimalType() to include new animals and add slime spawning.

// Override pickAnimalType with biome-diverse version.
window.pickAnimalType=function(){
  const r=Math.random();
  // Original animals: 0-0.86 → pig/sheep/cow/chicken/wolf (same as before)
  if(r<0.20)return 'pig';
  if(r<0.36)return 'sheep';
  if(r<0.50)return 'cow';
  if(r<0.62)return 'chicken';
  if(r<0.68)return 'wolf';
  // New animals
  if(r<0.73)return 'panda';
  if(r<0.77)return 'turtle';
  if(r<0.81)return 'gecko';
  if(r<0.85)return 'axolotl';
  if(r<0.91)return 'camel';
  return 'armadillo';
};

// Biome-aware animal spawning: override trySpawnMobs to add slimes.
window.trySpawnMobs=function(){
  if(typeof player==='undefined') return;
  const night=(typeof isNightTime==='function')&&isNightTime();
  // Slime spawning: swamp biome + night, or underground.
  if(night){
    for(let attempt=0;attempt<3&&mobs.length<MAX_MOBS;attempt++){
      const ang=Math.random()*Math.PI*2;
      const r=16+Math.random()*18;
      const x=Math.floor(player.pos.x+Math.cos(ang)*r);
      const z=Math.floor(player.pos.z+Math.sin(ang)*r);
      if(x<2||x>=WORLD_W-2||z<2||z>=WORLD_D-2) continue;
      // Check biome
      let isSwamp=false;
      if(typeof biomeMap!=='undefined'&&typeof BIOME!=='undefined'){
        const bi=biomeMap[(z*WORLD_W+x)];
        isSwamp=(bi===BIOME.SWAMP||bi===BIOME.MANGROVE);
      }
      if(!isSwamp&&Math.random()>0.15) continue; // rare underground slime
      const y=spawnHeightAt(x,z);
      if(y===null) continue;
      const sizeRoll=Math.random();
      const sType=sizeRoll<0.35?'slime_big':(sizeRoll<0.7?'slime_medium':'slime_small');
      spawnMob(sType,x,y,z);
    }
  }
  // Biome-aware animal spawning
  for(let attempt=0;attempt<6&&mobs.length<MAX_MOBS;attempt++){
    const ang=Math.random()*Math.PI*2;
    const r=(night?18:14)+Math.random()*16;
    const x=Math.floor(player.pos.x+Math.cos(ang)*r);
    const z=Math.floor(player.pos.z+Math.sin(ang)*r);
    if(x<2||x>=WORLD_W-2||z<2||z>=WORLD_D-2) continue;
    const y=spawnHeightAt(x,z);if(y===null) continue;

    let bi=0;
    if(typeof biomeMap!=='undefined') bi=biomeMap[(z*WORLD_W+x)];

    if(night&&(typeof countHostile==='function')&&countHostile()<MAX_HOSTILE&&Math.random()<0.7){
      spawnMob(pickHostileType(),x,y,z);
    }else{
      // Biome preference
      const type=pickBiomeAnimal(bi);
      spawnMob(type,x,y,z);
    }
  }
};

// Pick animal with biome preference.
function pickBiomeAnimal(bi){
  if(typeof BIOME==='undefined') return pickAnimalType();
  const r=Math.random();
  switch(bi){
    case BIOME.JUNGLE:
      return r<0.45?'panda':(r<0.75?'axolotl':'gecko');
    case BIOME.SWAMP: case BIOME.MANGROVE:
      return r<0.5?'axolotl':(r<0.8?'turtle':'gecko');
    case BIOME.DESERT: case BIOME.MESA: case BIOME.OASIS: case BIOME.SAVANNA:
      return r<0.45?'camel':(r<0.75?'armadillo':'gecko');
    case BIOME.OCEAN: case BIOME.BEACH:
      return r<0.7?'turtle':(r<0.9?'axolotl':pickAnimalType());
    default:
      return pickAnimalType();
  }
}

// killMob XP and slime handling are integrated directly into entities.js killMob().

// Mining XP is wired directly in player.js (window._lastMinedId + XP.mineXP).

// ─── Initialise everything once the DOM is ready ─────────────────────────────
(function initNewMobs(){
  function _tryInit(){
    if(typeof MOB_TYPES==='undefined'||typeof BIOME==='undefined') return setTimeout(_tryInit,100);
    registerSlimeTypes();
    registerDiverseFauna();
    if(typeof XP!=='undefined') XP.init();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',_tryInit);
  else _tryInit();
})();
