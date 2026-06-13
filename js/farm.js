"use strict";
// =============================================================================
// 農業システム (FARM)
//   - 耕地(FARMLAND)を作り、種を植え、時間経過で作物が成長する。
//   - 作物の成長段階は座標キーの Map で保持し localStorage に保存する。
//   - 近くに水があると耕地が湿り、作物の成長が早くなる。
//   - 完全に育った作物を壊すと収穫物＋種がドロップする。
// =============================================================================
const FARM=(function(){
  const STORE_KEY='bw_crops';
  // "x,y,z" -> {stage, t}  stage: 現在の成長段階, t: 次成長までの蓄積時間
  const crops=new Map();
  function key(x,y,z){return x+','+y+','+z;}

  let saveTimer=null;
  function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{
    try{const o={};for(const[k,v]of crops)o[k]=v.stage;localStorage.setItem(STORE_KEY,JSON.stringify(o));}catch(e){}
  },500);}
  function load(){try{const d=JSON.parse(localStorage.getItem(STORE_KEY)||'null');if(d&&typeof d==='object'){for(const k in d){crops.set(k,{stage:d[k]|0,t:0});}}}catch(e){}}

  // 近傍(半径4・同一/直下高さ)に水があるか → 耕地が湿るか判定。
  function nearWater(x,y,z){
    for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++)for(let dy=0;dy<=1;dy++){
      if(getBlock(x+dx,y-dy,z+dz)===B.WATER)return true;
    }
    return false;
  }
  // 作物の真下が湿った耕地かどうか(成長ブースト用)。
  function onWetFarmland(x,y,z){return getBlock(x,y-1,z)===B.FARMLAND_WET;}
  function onFarmland(x,y,z){const b=getBlock(x,y-1,z);return b===B.FARMLAND||b===B.FARMLAND_WET;}

  // 作物を植える。下が耕地のときのみ成功。
  function plant(x,y,z,blockId){
    if(!onFarmland(x,y,z))return false;
    if(getBlock(x,y,z)!==B.AIR)return false;
    setBlock(x,y,z,blockId);
    crops.set(key(x,y,z),{stage:0,t:0});
    scheduleSave();
    return true;
  }

  // render から呼ばれ、その座標の作物の現在段階タイルを返す。
  function stageTileAt(x,y,z,def){
    const c=crops.get(key(x,y,z));
    const stage=c?Math.min(c.stage,def.maxStage):def.maxStage;
    return def.stages[Math.min(stage,def.stages.length-1)];
  }
  function stageAt(x,y,z){const c=crops.get(key(x,y,z));return c?c.stage:0;}
  function isMature(x,y,z,def){return stageAt(x,y,z)>=def.maxStage;}

  // 作物・耕地が変化したときに段階データを掃除する。
  function onBlockChanged(x,y,z,newId){
    const k=key(x,y,z);
    if(crops.has(k)&&!(BLOCKS[newId]&&BLOCKS[newId].crop)){crops.delete(k);scheduleSave();}
  }

  // 収穫: 成長段階に応じてドロップを inventory に加える。戻り値は何かドロップしたか。
  function harvest(x,y,z,id){
    const def=BLOCKS[id];if(!def||!def.crop)return;
    const mature=isMature(x,y,z,def);
    const rint=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
    if(mature&&def.harvest){const n=rint(def.harvest.min,def.harvest.max);for(let i=0;i<n;i++)addToInventory(def.harvest.id,1);}
    // 種は成熟時に追加で落ちる。未成熟なら最低1個（植え直し用）。
    if(def.seedDrop){
      let n=mature?rint(def.seedDrop.min,def.seedDrop.max):1;
      // ニンジン/ジャガイモは収穫物自体が種なので seedDrop=0、未成熟なら1個戻す。
      if(!mature&&def.harvest&&def.harvest.id===def.seed)n=1;
      for(let i=0;i<n;i++)addToInventory(def.seed,1);
    }
    crops.delete(key(x,y,z));scheduleSave();
  }

  // 成長の蓄積。一定時間ごとに段階を1進める。湿地+明るさで加速。
  let acc=0;
  function update(dt){
    acc+=dt;
    if(acc<1.0)return; // 1秒ごとにまとめて処理
    const step=acc;acc=0;
    let changed=new Set();
    for(const[k,c]of crops){
      const[x,y,z]=k.split(',').map(Number);
      const id=getBlock(x,y,z);const def=BLOCKS[id];
      if(!def||!def.crop){crops.delete(k);continue;}
      if(c.stage>=def.maxStage)continue;
      // 基本成長速度: 1段階あたり 約12秒。湿った耕地なら半分の時間。
      let rate=1.0;
      if(onWetFarmland(x,y,z))rate*=2.2;else if(onFarmland(x,y,z))rate*=1.0;else rate*=0.4;
      c.t+=step*rate;
      const need=12;
      if(c.t>=need){c.t=0;c.stage++;changed.add((z>>4)*0+0);
        // メッシュ再構築をトリガー
        rebuildAround(x,y,z);
      }
    }
    scheduleSave();
  }

  // 作物セルを含むチャンク(と境界)を再メッシュ。
  function rebuildAround(x,y,z){
    const cx=Math.floor(x/CHUNK),cz=Math.floor(z/CHUNK);
    if(typeof buildChunk==='function'){
      buildChunk(cx,cz);
    }
  }

  // 耕地の乾湿を更新(まれに実行)。プレイヤー周辺のみ走査して負荷を抑える。
  let dryAcc=0;
  function updateFarmlandWetness(dt){
    dryAcc+=dt;if(dryAcc<2.5)return;dryAcc=0;
    if(typeof player==='undefined')return;
    const px=Math.floor(player.pos.x),py=Math.floor(player.pos.y),pz=Math.floor(player.pos.z);
    const R=12;
    for(let x=px-R;x<=px+R;x++)for(let z=pz-R;z<=pz+R;z++)for(let y=py-4;y<=py+2;y++){
      const id=getBlock(x,y,z);
      if(id===B.FARMLAND&&nearWater(x,y,z))setBlock(x,y,z,B.FARMLAND_WET);
      else if(id===B.FARMLAND_WET&&!nearWater(x,y,z))setBlock(x,y,z,B.FARMLAND);
    }
  }

  load();
  return {plant,stageTileAt,stageAt,isMature,onBlockChanged,harvest,update,updateFarmlandWetness,_crops:crops};
})();
