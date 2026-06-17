"use strict";
// Farm system: plant crops, grow over time, harvest when mature
const FARM=(function(){
  const STORE_KEY='bw_crops';
  // key: "x,y,z" -> {stage, t}
  const crops=new Map();
  function key(x,y,z){return x+','+y+','+z;}

  let saveTimer=null;
  function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{
    try{const o={};for(const[k,v]of crops)o[k]=v.stage;localStorage.setItem(STORE_KEY,JSON.stringify(o));}catch(e){}
  },500);}
  function load(){try{const d=JSON.parse(localStorage.getItem(STORE_KEY)||'null');if(d&&typeof d==='object'){for(const k in d){crops.set(k,{stage:d[k]|0,t:0});}}}catch(e){}}

  // Check if water is within radius 4
  function nearWater(x,y,z){
    for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++)for(let dy=0;dy<=1;dy++){
      if(getBlock(x+dx,y-dy,z+dz)===B.WATER)return true;
    }
    return false;
  }
  function onWetFarmland(x,y,z){return getBlock(x,y-1,z)===B.FARMLAND_WET;}
  function onFarmland(x,y,z){const b=getBlock(x,y-1,z);return b===B.FARMLAND||b===B.FARMLAND_WET;}

  // Plant a crop on farmland
  function plant(x,y,z,blockId){
    if(!onFarmland(x,y,z))return false;
    if(getBlock(x,y,z)!==B.AIR)return false;
    setBlock(x,y,z,blockId);
    crops.set(key(x,y,z),{stage:0,t:0});
    scheduleSave();
    return true;
  }

  // Return current growth stage tile
  function stageTileAt(x,y,z,def){
    const c=crops.get(key(x,y,z));
    const stage=c?Math.min(c.stage,def.maxStage):def.maxStage;
    return def.stages[Math.min(stage,def.stages.length-1)];
  }
  function stageAt(x,y,z){const c=crops.get(key(x,y,z));return c?c.stage:0;}
  function isMature(x,y,z,def){return stageAt(x,y,z)>=def.maxStage;}

  function onBlockChanged(x,y,z,newId){
    const k=key(x,y,z);
    if(crops.has(k)&&!(BLOCKS[newId]&&BLOCKS[newId].crop)){crops.delete(k);scheduleSave();}
  }

  // Harvest: add drops based on growth stage
  function harvest(x,y,z,id){
    const def=BLOCKS[id];if(!def||!def.crop)return;
    const mature=isMature(x,y,z,def);
    const rint=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
    if(mature&&def.harvest){const n=rint(def.harvest.min,def.harvest.max);for(let i=0;i<n;i++)addToInventory(def.harvest.id,1);}
    // Drop seeds
    if(def.seedDrop){
      let n=mature?rint(def.seedDrop.min,def.seedDrop.max):1;
      if(!mature&&def.harvest&&def.harvest.id===def.seed)n=1;
      for(let i=0;i<n;i++)addToInventory(def.seed,1);
    }
    crops.delete(key(x,y,z));scheduleSave();
  }

  let acc=0;
  function update(dt){
    acc+=dt;
    if(acc<1.0)return;
    const step=acc;acc=0;
    let changed=new Set();
    for(const[k,c]of crops){
      const[x,y,z]=k.split(',').map(Number);
      const id=getBlock(x,y,z);const def=BLOCKS[id];
      if(!def||!def.crop){crops.delete(k);continue;}
      if(c.stage>=def.maxStage)continue;
      let rate=1.0;
      if(onWetFarmland(x,y,z))rate*=2.2;else if(onFarmland(x,y,z))rate*=1.0;else rate*=0.4;
      c.t+=step*rate;
      const need=12;
      if(c.t>=need){c.t=0;c.stage++;changed.add((z>>4)*0+0);
        rebuildAround(x,y,z);
      }
    }
    scheduleSave();
  }

  function rebuildAround(x,y,z){
    const cx=Math.floor(x/CHUNK),cz=Math.floor(z/CHUNK);
    if(typeof buildChunk==='function'){
      buildChunk(cx,cz);
    }
  }

  // Update farmland wetness around player
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
