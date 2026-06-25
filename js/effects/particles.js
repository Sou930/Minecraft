"use strict";
// ===========================================================================
// Ambient particle effects: cherry-blossom petals & drifting falling leaves.
// Extracted out of main.js so all "weather"-style visual effects live in one
// place under js/effects/.
//
// Two camera-anchored particle clouds drift around the player:
//   * petalSystem  - soft pink cherry blossom, emits inside CHERRY groves.
//   * leafSystem   - tumbling leaves that now appear under ANY leafy tree.
//                    The emitter scans the blocks around the player for leaf
//                    blocks and tints / enables the system to match whatever
//                    foliage is overhead (autumn maples, oak, jungle, etc.).
// ===========================================================================

// --- Cherry blossom petals -------------------------------------------------
let petalSystem=null;
function buildPetalSystem(){
  if(petalSystem||typeof BABYLON==='undefined')return;
  // small soft pink petal sprite drawn to a dynamic texture
  const tex=new BABYLON.DynamicTexture('petalTex',{width:16,height:16},scene,false);
  tex.hasAlpha=true;const c=tex.getContext();c.clearRect(0,0,16,16);
  c.fillStyle='#f7b6d2';c.beginPath();c.ellipse(8,8,5,3,Math.PI/4,0,Math.PI*2);c.fill();
  c.fillStyle='#ffd9e8';c.beginPath();c.ellipse(7,7,2.5,1.5,Math.PI/4,0,Math.PI*2);c.fill();tex.update();
  const ps=new BABYLON.ParticleSystem('petals',360,scene);
  ps.particleTexture=tex;ps.emitter=camera;
  ps.minEmitBox=new BABYLON.Vector3(-22,14,-22);ps.maxEmitBox=new BABYLON.Vector3(22,20,22);
  ps.color1=new BABYLON.Color4(1,0.78,0.88,0.95);ps.color2=new BABYLON.Color4(0.95,0.55,0.72,0.9);ps.colorDead=new BABYLON.Color4(1,0.8,0.9,0);
  ps.minSize=0.18;ps.maxSize=0.34;ps.minLifeTime=4.0;ps.maxLifeTime=7.0;
  ps.emitRate=0;ps.blendMode=BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  ps.gravity=new BABYLON.Vector3(0,-1.1,0);
  ps.direction1=new BABYLON.Vector3(-1.2,-0.8,-1.2);ps.direction2=new BABYLON.Vector3(1.2,-0.4,1.2);
  ps.minAngularSpeed=-2.0;ps.maxAngularSpeed=2.0;ps.minEmitPower=0.3;ps.maxEmitPower=1.0;ps.updateSpeed=0.02;
  ps.start();petalSystem=ps;
}

// --- Falling leaves --------------------------------------------------------
// Leaves no longer rain from an invisible box in the sky around the player —
// each leaf now spawns at the position of an actual leaf BLOCK and drifts
// gently down from it. A scan around the player keeps a list of nearby leaf
// block positions; the particle emitter picks one of those for every leaf it
// spawns. The emission rate is deliberately low and the fall is slow so the
// effect reads as "the occasional leaf drifting off the tree" rather than a
// constant storm. The particle tint follows the dominant nearby leaf colour.
let leafSystem=null;
// World-space positions of leaf blocks near the player (refreshed in update).
let _leafBlockPositions=[];
function buildLeafSystem(){
  if(leafSystem||typeof BABYLON==='undefined')return;
  // a small maple-leaf-ish sprite drawn to a dynamic texture (white so we can
  // tint it freely with the per-emission colours below)
  const tex=new BABYLON.DynamicTexture('leafTex',{width:16,height:16},scene,false);
  tex.hasAlpha=true;const c=tex.getContext();c.clearRect(0,0,16,16);
  c.fillStyle='#ffffff';c.beginPath();c.moveTo(8,2);c.lineTo(13,8);c.lineTo(10,9);c.lineTo(12,14);c.lineTo(8,11);c.lineTo(4,14);c.lineTo(6,9);c.lineTo(3,8);c.closePath();c.fill();
  c.fillStyle='#e6e6e6';c.fillRect(7,6,2,5);tex.update();
  const ps=new BABYLON.ParticleSystem('leaves',260,scene);
  // World-space emission (emitter at origin) so we can place each leaf exactly
  // at the world position of a leaf block via a custom start-position function.
  ps.particleTexture=tex;ps.emitter=BABYLON.Vector3.Zero();
  ps.isLocal=false;
  ps.startPositionFunction=(worldMatrix,positionToUpdate)=>{
    const list=_leafBlockPositions;
    if(!list||list.length===0){
      // No foliage tracked right now — park the particle far below the world so
      // it is effectively invisible until a real leaf block is available.
      positionToUpdate.copyFromFloats(0,-1000,0);return;
    }
    const p=list[(Math.random()*list.length)|0];
    // spawn somewhere within the leaf block's cube, biased to its underside
    positionToUpdate.copyFromFloats(
      p.x+Math.random(),
      p.y+Math.random()*0.6,
      p.z+Math.random());
  };
  // default to warm autumn colours; _applyLeafTint() overrides these per biome
  ps.color1=new BABYLON.Color4(0.85,0.27,0.18,0.95);ps.color2=new BABYLON.Color4(0.95,0.66,0.22,0.95);ps.colorDead=new BABYLON.Color4(0.8,0.5,0.2,0);
  ps.minSize=0.18;ps.maxSize=0.34;
  // Long lifetimes + tiny gravity => a slow, lingering descent.
  ps.minLifeTime=6.0;ps.maxLifeTime=10.0;
  ps.emitRate=0;ps.blendMode=BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  ps.gravity=new BABYLON.Vector3(0,-0.55,0);
  // gentle horizontal drift so leaves tumble & sway as they fall
  ps.direction1=new BABYLON.Vector3(-0.5,-0.25,-0.5);ps.direction2=new BABYLON.Vector3(0.5,-0.05,0.5);
  ps.minAngularSpeed=-2.0;ps.maxAngularSpeed=2.0;ps.minEmitPower=0.1;ps.maxEmitPower=0.4;ps.updateSpeed=0.02;
  ps.start();leafSystem=ps;
}

// --- Snowfall --------------------------------------------------------------
// Snowy biomes get gently drifting snowflakes instead of leaves. The flakes
// fall from a wide box high above the player so the whole nearby area looks
// like it is snowing.
let snowSystem=null;
function buildSnowSystem(){
  if(snowSystem||typeof BABYLON==='undefined')return;
  const tex=new BABYLON.DynamicTexture('snowTex',{width:16,height:16},scene,false);
  tex.hasAlpha=true;const c=tex.getContext();c.clearRect(0,0,16,16);
  c.fillStyle='#ffffff';c.beginPath();c.arc(8,8,3.2,0,Math.PI*2);c.fill();
  c.globalAlpha=0.5;c.beginPath();c.arc(8,8,5.5,0,Math.PI*2);c.fill();tex.update();
  const ps=new BABYLON.ParticleSystem('snow',900,scene);
  ps.particleTexture=tex;ps.emitter=camera;
  ps.minEmitBox=new BABYLON.Vector3(-24,14,-24);ps.maxEmitBox=new BABYLON.Vector3(24,22,24);
  ps.color1=new BABYLON.Color4(1,1,1,0.95);ps.color2=new BABYLON.Color4(0.9,0.95,1,0.9);ps.colorDead=new BABYLON.Color4(1,1,1,0);
  ps.minSize=0.07;ps.maxSize=0.16;ps.minLifeTime=5.0;ps.maxLifeTime=9.0;
  ps.emitRate=0;ps.blendMode=BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  ps.gravity=new BABYLON.Vector3(0,-1.3,0);
  ps.direction1=new BABYLON.Vector3(-0.6,-0.6,-0.6);ps.direction2=new BABYLON.Vector3(0.6,-0.3,0.6);
  ps.minAngularSpeed=-0.6;ps.maxAngularSpeed=0.6;ps.minEmitPower=0.2;ps.maxEmitPower=0.7;ps.updateSpeed=0.02;
  ps.start();snowSystem=ps;
}

// Map a leaf block id -> a pair of [color1, color2] tints (0..1 rgb).
// Returns null for non-leaf blocks.
const _LEAF_TINTS={};
function _leafTints(){
  if(_LEAF_TINTS._ready)return _LEAF_TINTS;
  // helper to register a tint pair for a block id (guarded with typeof so a
  // missing block constant never throws)
  const reg=(id,a,b)=>{if(typeof id==='number')_LEAF_TINTS[id]=[a,b];};
  // greens (oak / birch / jungle-ish / spruce / mangrove / palm)
  const green1=[0.30,0.55,0.20],green2=[0.42,0.68,0.26];
  reg(B.LEAVES,green1,green2);
  reg(B.BIRCH_LEAVES,[0.46,0.62,0.30],[0.58,0.72,0.36]);
  reg(B.SPRUCE_LEAVES,[0.22,0.40,0.24],[0.30,0.50,0.28]);
  reg(B.ACACIA_LEAVES,[0.46,0.58,0.22],[0.58,0.66,0.28]);
  reg(B.MANGROVE_LEAVES,[0.26,0.46,0.22],[0.36,0.56,0.28]);
  reg(B.PALM_LEAVES,[0.34,0.56,0.24],[0.46,0.66,0.30]);
  // cherry (soft pink)
  reg(B.CHERRY_LEAVES,[0.95,0.62,0.78],[1.0,0.78,0.88]);
  // maple autumn variants
  reg(B.MAPLE_LEAVES_RED,[0.78,0.18,0.14],[0.92,0.36,0.20]);
  reg(B.MAPLE_LEAVES_ORANGE,[0.88,0.45,0.16],[0.96,0.62,0.24]);
  reg(B.MAPLE_LEAVES_YELLOW,[0.86,0.72,0.18],[0.96,0.84,0.30]);
  _LEAF_TINTS._ready=true;
  return _LEAF_TINTS;
}

// Scan a small box around the player for leaf blocks. Returns the most common
// leaf-block id nearby, or -1 if there is no foliage in range. As a side effect
// it also rebuilds _leafBlockPositions with the world positions of the leaf
// blocks found (so the emitter can drop leaves from the actual trees). Only
// blocks with open air directly beneath them are kept, so leaves only ever
// shed from the underside / edges of a canopy rather than from inside it.
let _leafScanCacheKey='',_leafScanCacheVal=-1;
function dominantNearbyLeaf(px,py,pz){
  const key=px+','+py+','+pz;
  if(key===_leafScanCacheKey)return _leafScanCacheVal;
  _leafScanCacheKey=key;
  const tints=_leafTints();
  const counts={};let best=-1,bestN=0;
  const positions=[];
  // FIX: Reduced scan radius from 9→6 and step 1→2 to cut iterations from 5054→729.
  // The result is the same visually (leaves still fall from nearby canopy edges).
  for(let dx=-6;dx<=6;dx+=2)
    for(let dz=-6;dz<=6;dz+=2)
      for(let dy=-1;dy<=10;dy+=1){
        const wx=px+dx,wy=py+dy,wz=pz+dz;
        const id=getBlock(wx,wy,wz);
        if(tints[id]===undefined)continue;
        const n=(counts[id]=(counts[id]||0)+1);
        if(n>bestN){bestN=n;best=id;}
        // only emit from leaf blocks that have air below them (canopy edge),
        // and keep the list bounded so it stays cheap to pick from
        if(positions.length<80&&getBlock(wx,wy-1,wz)===B.AIR)positions.push({x:wx,y:wy,z:wz});
      }
  _leafBlockPositions=positions;
  _leafScanCacheVal=(bestN>0)?best:-1;
  return _leafScanCacheVal;
}

function _applyLeafTint(id){
  const tints=_leafTints();const t=tints[id];if(!t||!leafSystem)return;
  const[a,b]=t;
  leafSystem.color1=new BABYLON.Color4(a[0],a[1],a[2],0.95);
  leafSystem.color2=new BABYLON.Color4(b[0],b[1],b[2],0.95);
  leafSystem.colorDead=new BABYLON.Color4((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,0);
}

let _petalTimer=0,_lastLeafId=-2;
function updatePetals(dt){
  // Biome / nearby blocks only change as the player walks, so re-evaluate a few
  // times a second instead of every frame. The particle systems keep animating
  // regardless of how often we touch their emit rate.
  _petalTimer+=dt;if(_petalTimer<0.2)return;_petalTimer=0;
  if(typeof player==='undefined'||typeof camera==='undefined')return;
  if(!petalSystem)buildPetalSystem();
  if(!leafSystem)buildLeafSystem();
  if(!snowSystem)buildSnowSystem();
  const bx=Math.floor(player.pos.x),by=Math.floor(player.pos.y),bz=Math.floor(player.pos.z);
  const bio=(typeof biomeMap!=='undefined'&&bx>=0&&bx<WORLD_W&&bz>=0&&bz<WORLD_D)?biomeMap[colIndex(bx,bz)]:(typeof biomeAt==='function'?biomeAt(bx,bz):-1);
  const snowy=(bio===BIOME.SNOWY);

  // Cherry petals: still biome-driven (the blossom storm is a CHERRY feature).
  if(petalSystem)petalSystem.emitRate=(bio===BIOME.CHERRY)?120:0;

  // Snowfall: only in the snowy biome.
  if(snowSystem)snowSystem.emitRate=snowy?260:0;

  // Falling leaves: each leaf drifts down from a real leaf block near the
  // player, at a deliberately low rate so it looks like the occasional leaf
  // coming loose. The autumn biome sheds a little more than other forests.
  // In the snowy biome we suppress leaves entirely and let it snow instead.
  if(leafSystem){
    let rate=0;
    if(snowy){
      // make sure no stale leaf positions keep emitting in the snow
      _leafBlockPositions=[];_leafScanCacheKey='snow';_leafScanCacheVal=-1;
    }else{
      const nearLeaf=dominantNearbyLeaf(bx,by,bz);
      const haveFoliage=_leafBlockPositions.length>0;
      if(bio===BIOME.AUTUMN&&haveFoliage){
        rate=14;
        // prefer an actual nearby maple tint, else default warm autumn palette
        _applyLeafTint(nearLeaf>=0?nearLeaf:B.MAPLE_LEAVES_ORANGE);
        _lastLeafId=nearLeaf;
      }else if(nearLeaf>=0&&nearLeaf!==B.CHERRY_LEAVES&&haveFoliage){
        // cherry handled by the petal system, so skip pink leaves there
        rate=7;
        if(nearLeaf!==_lastLeafId){_applyLeafTint(nearLeaf);_lastLeafId=nearLeaf;}
      }
    }
    leafSystem.emitRate=rate;
  }
}

// --- Heart burst (wolf taming / feeding feedback) --------------------------
// A small one-shot puff of pink hearts above a position, mirroring the classic
// Minecraft "love mode" particles shown when an animal is tamed or fed.
let _heartSystem=null;
function buildHeartSystem(){
  if(_heartSystem||typeof BABYLON==='undefined')return;
  const tex=new BABYLON.DynamicTexture('heartTex',{width:16,height:16},scene,false);
  tex.hasAlpha=true;const c=tex.getContext();c.clearRect(0,0,16,16);
  // draw a tiny pixel heart
  c.fillStyle='#ff5b7a';
  c.beginPath();c.arc(5.5,6,3,0,Math.PI*2);c.arc(10.5,6,3,0,Math.PI*2);c.fill();
  c.beginPath();c.moveTo(2.5,7.5);c.lineTo(8,13.5);c.lineTo(13.5,7.5);c.closePath();c.fill();
  c.fillStyle='#ff9bb0';c.beginPath();c.arc(5,5,1.1,0,Math.PI*2);c.fill();tex.update();
  const ps=new BABYLON.ParticleSystem('hearts',60,scene);
  ps.particleTexture=tex;
  ps.color1=new BABYLON.Color4(1,0.5,0.62,1);ps.color2=new BABYLON.Color4(1,0.7,0.8,1);ps.colorDead=new BABYLON.Color4(1,0.6,0.7,0);
  ps.minSize=0.18;ps.maxSize=0.32;ps.minLifeTime=0.6;ps.maxLifeTime=1.1;
  ps.emitRate=0;ps.blendMode=BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  ps.gravity=new BABYLON.Vector3(0,0.6,0);
  ps.direction1=new BABYLON.Vector3(-0.5,1.2,-0.5);ps.direction2=new BABYLON.Vector3(0.5,1.8,0.5);
  ps.minEmitPower=0.4;ps.maxEmitPower=0.9;ps.minAngularSpeed=-1;ps.maxAngularSpeed=1;ps.updateSpeed=0.02;
  ps.start();_heartSystem=ps;
}
// Emit a quick burst of hearts at a world position (mob.pos). `pos` is a
// BABYLON.Vector3; we lift it to roughly the animal's head height.
function spawnHeartParticles(pos){
  if(typeof BABYLON==='undefined'||!pos)return;
  if(!_heartSystem)buildHeartSystem();
  if(!_heartSystem)return;
  _heartSystem.emitter=new BABYLON.Vector3(pos.x,pos.y+0.9,pos.z);
  _heartSystem.minEmitBox=new BABYLON.Vector3(-0.25,0,-0.25);
  _heartSystem.maxEmitBox=new BABYLON.Vector3(0.25,0.3,0.25);
  _heartSystem.manualEmitCount=(_heartSystem.manualEmitCount||0)+7;
}
