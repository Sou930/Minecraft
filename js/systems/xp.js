"use strict";
// =============================================================================
// XP / LEVEL SYSTEM
// Experience points accumulate from mining blocks and defeating mobs.
// Levels follow the Minecraft-style XP curve:
//   lvl 1-15:  XP_to_next = 2*lvl + 7
//   lvl 16-30: XP_to_next = 5*lvl - 38
//   lvl 31+:   XP_to_next = 9*lvl - 158
// The XP bar floats above the hotbar; numbers pulse when XP is gained.
// =============================================================================

const XP = (function(){
  let _xp    = 0;   // current XP within current level
  let _level = 0;   // current level (0-indexed, displayed as level+1 or 0-based)
  let _total = 0;   // total lifetime XP (for display / achievements)

  // XP required to advance FROM `lvl` to `lvl+1`.
  function xpForLevel(lvl){
    if(lvl<15) return 2*lvl+7;
    if(lvl<30) return 5*lvl-38;
    return 9*lvl-158;
  }

  // Grant `amount` of XP; handle level-ups.
  function gain(amount){
    if(amount<=0) return;
    _xp   += amount;
    _total += amount;
    // Level up loop (multiple levels at once from big XP bursts)
    let leveled = false;
    while(_xp >= xpForLevel(_level)){
      _xp -= xpForLevel(_level);
      _level++;
      leveled = true;
    }
    _updateUI();
    if(leveled) _onLevelUp();
    _pulseXP();
    // Achievements
    if(typeof ACH!=='undefined'){
      if(_level>=5)  ACH.flag('xp_level5');
      if(_level>=10) ACH.flag('xp_level10');
      if(_level>=20) ACH.flag('xp_level20');
    }
  }

  // Mining rewards: small base value for common blocks, more for rare ones.
  const _MINE_XP={};
  function _buildMineTable(){
    // These IDs are safe to reference lazily (called after config.js loads).
    if(typeof B==='undefined') return;
    _MINE_XP[B.COAL_ORE]    = 1;
    _MINE_XP[B.IRON_ORE]    = 2;
    _MINE_XP[B.GOLD_ORE]    = 3;
    _MINE_XP[B.DIAMOND_ORE] = 5;
    _MINE_XP[B.AMETHYST_CLUSTER] = 2;
    _MINE_XP[B.AMETHYST_BLOCK]   = 1;
    _MINE_XP[B.LAPIS_ORE]   = 4; // future-safe
  }
  function mineXP(blockId){
    if(!Object.keys(_MINE_XP).length) _buildMineTable();
    const v = _MINE_XP[blockId];
    if(v) gain(v);
    else if(typeof BLOCKS!=='undefined'&&BLOCKS[blockId]&&BLOCKS[blockId].breakTime>=5) gain(1);
  }

  // Kill rewards (called from killMob).
  function killXP(mobType){
    const MAP={
      pig:1,sheep:1,cow:1,chicken:1,wolf:2,
      ghoul:5,bonearcher:7,
      slime_big:4,slime_medium:2,slime_small:1,
      panda:2,turtle:2,gecko:1,axolotl:2,camel:2,armadillo:2,
    };
    gain(MAP[mobType]||1);
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  let _bar=null,_fill=null,_label=null,_numEl=null;

  function _buildUI(){
    if(_bar) return;
    const existing=document.getElementById('xp-bar-wrap');
    if(existing){_bar=existing;_fill=existing.querySelector('#xp-bar-fill');_label=existing.querySelector('#xp-level-label');_numEl=existing.querySelector('#xp-num');return;}
    const wrap=document.createElement('div');
    wrap.id='xp-bar-wrap';
    wrap.innerHTML=`
      <div id="xp-bar-row">
        <span id="xp-level-label">Lv 0</span>
        <div id="xp-bar"><div id="xp-bar-fill"></div></div>
        <span id="xp-num"></span>
      </div>`;
    // Insert between hotbar and vitals
    const hotbar=document.getElementById('hotbar');
    if(hotbar&&hotbar.parentNode) hotbar.parentNode.insertBefore(wrap,hotbar);
    else document.body.appendChild(wrap);
    _bar   = wrap;
    _fill  = document.getElementById('xp-bar-fill');
    _label = document.getElementById('xp-level-label');
    _numEl = document.getElementById('xp-num');
  }

  function _updateUI(){
    if(!_bar) _buildUI();
    if(!_fill||!_label) return;
    const need=xpForLevel(_level);
    const pct=need>0?Math.min(100,(_xp/need)*100):100;
    _fill.style.width=pct.toFixed(1)+'%';
    _label.textContent='Lv '+_level;
    if(_numEl) _numEl.textContent=_xp+'/'+need;
  }

  let _pulseTO=null;
  function _pulseXP(){
    if(!_bar) return;
    _bar.classList.add('xp-pulse');
    clearTimeout(_pulseTO);
    _pulseTO=setTimeout(()=>_bar&&_bar.classList.remove('xp-pulse'),350);
  }

  function _onLevelUp(){
    if(typeof showBedMessage==='function')
      showBedMessage('⭐ Level up! You are now level '+_level+'!');
    if(!_bar) return;
    _bar.classList.add('xp-levelup');
    clearTimeout(_pulseTO);
    _pulseTO=setTimeout(()=>_bar&&_bar.classList.remove('xp-levelup'),700);
  }

  // Save / load
  function save(){
    if(typeof WORLDS==='undefined') return;
    try{ WORLDS.setItem('xp_state',JSON.stringify({xp:_xp,level:_level,total:_total})); }catch(e){}
  }
  function load(){
    if(typeof WORLDS==='undefined') return;
    try{
      const s=JSON.parse(WORLDS.getItem('xp_state')||'null');
      if(s&&typeof s.level==='number'){_xp=s.xp||0;_level=s.level||0;_total=s.total||0;}
    }catch(e){}
    _buildUI();
    _updateUI();
  }

  function init(){
    _buildUI();
    _updateUI();
  }

  return {gain,mineXP,killXP,init,save,load,
    getLevel:()=>_level,
    getXP:()=>_xp,
    getTotal:()=>_total,
  };
})();
