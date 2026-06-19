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
// A drifting cloud of leaves. Instead of only firing inside the AUTUMN biome,
// the leaves now appear whenever there is foliage near the player, and the
// particle tint follows the dominant nearby leaf colour so oak forests rain
// green leaves while maple groves rain warm red/orange/yellow ones.
let leafSystem=null;
function buildLeafSystem(){
  if(leafSystem||typeof BABYLON==='undefined')return;
  // a small maple-leaf-ish sprite drawn to a dynamic texture (white so we can
  // tint it freely with the per-emission colours below)
  const tex=new BABYLON.DynamicTexture('leafTex',{width:16,height:16},scene,false);
  tex.hasAlpha=true;const c=tex.getContext();c.clearRect(0,0,16,16);
  c.fillStyle='#ffffff';c.beginPath();c.moveTo(8,2);c.lineTo(13,8);c.lineTo(10,9);c.lineTo(12,14);c.lineTo(8,11);c.lineTo(4,14);c.lineTo(6,9);c.lineTo(3,8);c.closePath();c.fill();
  c.fillStyle='#e6e6e6';c.fillRect(7,6,2,5);tex.update();
  const ps=new BABYLON.ParticleSystem('leaves',420,scene);
  ps.particleTexture=tex;ps.emitter=camera;
  ps.minEmitBox=new BABYLON.Vector3(-20,12,-20);ps.maxEmitBox=new BABYLON.Vector3(20,20,20);
  // default to warm autumn colours; updateLeafTint() overrides these per biome
  ps.color1=new BABYLON.Color4(0.85,0.27,0.18,0.95);ps.color2=new BABYLON.Color4(0.95,0.66,0.22,0.95);ps.colorDead=new BABYLON.Color4(0.8,0.5,0.2,0);
  ps.minSize=0.20;ps.maxSize=0.40;ps.minLifeTime=4.5;ps.maxLifeTime=8.0;
  ps.emitRate=0;ps.blendMode=BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  ps.gravity=new BABYLON.Vector3(0,-1.0,0);
  // gentle horizontal drift so leaves tumble & sway as they fall
  ps.direction1=new BABYLON.Vector3(-1.4,-0.7,-1.4);ps.direction2=new BABYLON.Vector3(1.4,-0.3,1.4);
  ps.minAngularSpeed=-2.4;ps.maxAngularSpeed=2.4;ps.minEmitPower=0.3;ps.maxEmitPower=1.1;ps.updateSpeed=0.02;
  ps.start();leafSystem=ps;
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
// leaf-block id nearby, or -1 if there is no foliage in range.
let _leafScanCacheKey='',_leafScanCacheVal=-1;
function dominantNearbyLeaf(px,py,pz){
  const key=px+','+py+','+pz;
  if(key===_leafScanCacheKey)return _leafScanCacheVal;
  _leafScanCacheKey=key;
  const tints=_leafTints();
  const counts={};let best=-1,bestN=0;
  // sample a sparse 9x9 column slab around the player (step 2 for speed)
  for(let dx=-8;dx<=8;dx+=2)
    for(let dz=-8;dz<=8;dz+=2)
      for(let dy=-1;dy<=10;dy+=2){
        const id=getBlock(px+dx,py+dy,pz+dz);
        if(tints[id]===undefined)continue;
        const n=(counts[id]=(counts[id]||0)+1);
        if(n>bestN){bestN=n;best=id;}
      }
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
  const bx=Math.floor(player.pos.x),by=Math.floor(player.pos.y),bz=Math.floor(player.pos.z);
  const bio=(typeof biomeMap!=='undefined'&&bx>=0&&bx<WORLD_W&&bz>=0&&bz<WORLD_D)?biomeMap[colIndex(bx,bz)]:(typeof biomeAt==='function'?biomeAt(bx,bz):-1);

  // Cherry petals: still biome-driven (the blossom storm is a CHERRY feature).
  if(petalSystem)petalSystem.emitRate=(bio===BIOME.CHERRY)?120:0;

  // Falling leaves: appear under any nearby foliage. The autumn biome rains
  // leaves heavily; elsewhere a lighter sprinkle falls only when actually
  // standing near leaf blocks.
  if(leafSystem){
    const nearLeaf=dominantNearbyLeaf(bx,by,bz);
    let rate=0;
    if(bio===BIOME.AUTUMN){
      rate=110;
      // prefer an actual nearby maple tint, else default warm autumn palette
      _applyLeafTint(nearLeaf>=0?nearLeaf:B.MAPLE_LEAVES_ORANGE);
      _lastLeafId=nearLeaf;
    }else if(nearLeaf>=0&&nearLeaf!==B.CHERRY_LEAVES){
      // cherry handled by the petal system, so skip pink leaves there
      rate=55;
      if(nearLeaf!==_lastLeafId){_applyLeafTint(nearLeaf);_lastLeafId=nearLeaf;}
    }
    leafSystem.emitRate=rate;
  }
}
