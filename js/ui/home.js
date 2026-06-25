"use strict";
/*
 * Home / world-select screen — Minecraft-style menu.
 * ---------------------------------------------------
 * Shows BLOCK WORLD title + three main buttons:
 *   • Singleplayer  → world list (create / load / delete)
 *   • Multiplayer   → P2P panel (host or join)
 *   • Settings      → opens existing settings panel
 */
(function(){
  function el(id){return document.getElementById(id);}
  function tr(key,fallback){return (typeof t==='function')?(t(key)!==key?t(key):fallback):fallback;}

  function fmtDate(ts){
    if(!ts)return '';
    try{const d=new Date(ts);return d.toLocaleDateString()+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
    catch(e){return '';}
  }

  /* ---------------------------------------------------------------------- */
  /*  Panel visibility helpers                                                */
  /* ---------------------------------------------------------------------- */
  var _mode='main'; // 'main' | 'single' | 'multi'

  function showMain(){
    _mode='main';
    el('home-nav').style.display='';
    el('home-worlds-wrap').classList.remove('show');
    el('p2p-panel').classList.remove('show');
    el('home-back-btn').classList.remove('show');
  }
  function showSingle(){
    _mode='single';
    el('home-nav').style.display='none';
    el('home-worlds-wrap').classList.add('show');
    el('p2p-panel').classList.remove('show');
    el('home-back-btn').classList.add('show');
    renderList();
  }
  function showMulti(){
    _mode='multi';
    el('home-nav').style.display='none';
    el('home-worlds-wrap').classList.remove('show');
    el('p2p-panel').classList.add('show');
    el('home-back-btn').classList.add('show');
    if(typeof P2P!=='undefined' && P2P.init) P2P.init();
  }

  /* ---------------------------------------------------------------------- */
  /*  World list rendering                                                    */
  /* ---------------------------------------------------------------------- */
  function renderList(){
    var ul=el('world-list'); if(!ul) return;
    var worlds=WORLDS.list();
    ul.innerHTML='';
    el('home-empty').style.display=worlds.length?'none':'block';
    worlds.forEach(function(w){
      var li=document.createElement('li');
      li.className='world-card';
      li.tabIndex=0;
      var playedLabel=tr('lastPlayed','Last played');
      var seedLabel=tr('seedLabel','Seed');
      li.innerHTML=
        '<div class="world-thumb"></div>'+
        '<div class="world-meta">'+
          '<div class="world-name"></div>'+
          '<div class="world-sub"></div>'+
        '</div>'+
        '<div class="world-actions">'+
          '<button class="wc-edit" title="Rename" aria-label="Rename">✏️</button>'+
          '<button class="wc-del" title="Delete" aria-label="Delete">🗑</button>'+
        '</div>';
      li.querySelector('.world-name').textContent=w.name;
      li.querySelector('.world-sub').textContent=seedLabel+': '+w.seed+' · '+playedLabel+': '+fmtDate(w.lastPlayed||w.created);
      li.addEventListener('click',function(e){ if(e.target.closest('.world-actions')) return; playWorld(w.id); });
      li.addEventListener('keydown',function(e){ if(e.key==='Enter') playWorld(w.id); });
      li.querySelector('.wc-edit').addEventListener('click',function(e){ e.stopPropagation(); renameWorld(w); });
      li.querySelector('.wc-del').addEventListener('click',function(e){ e.stopPropagation(); deleteWorld(w); });
      ul.appendChild(li);
    });
  }

  function renameWorld(w){
    var name=prompt(tr('renamePrompt','New world name:'), w.name);
    if(name===null) return;
    WORLDS.rename(w.id, name);
    renderList();
  }
  function deleteWorld(w){
    if(!confirm(tr('deleteConfirm','Delete this world? This cannot be undone.')+'\n\n"'+w.name+'"')) return;
    WORLDS.delete(w.id);
    renderList();
  }
  function playWorld(id){
    if(!WORLDS.setActive(id)) return;
    hideHome();
    bootstrapWorld();
  }

  /* ---------------------------------------------------------------------- */
  /*  New-world dialog                                                        */
  /* ---------------------------------------------------------------------- */
  function openDialog(){
    el('wd-name').value='';
    el('wd-seed').value='';
    el('world-dialog').classList.add('show');
    setTimeout(function(){el('wd-name').focus();},50);
  }
  function closeDialog(){ el('world-dialog').classList.remove('show'); }
  function confirmDialog(){
    var name=el('wd-name').value.trim()|| tr('defaultWorldName','World');
    var seed=el('wd-seed').value.trim();
    var w=WORLDS.create(name, seed);
    closeDialog();
    playWorld(w.id);
  }

  /* ---------------------------------------------------------------------- */
  /*  Show / hide home overlay                                                */
  /* ---------------------------------------------------------------------- */
  function showHome(){
    if(typeof applyHomeLang==='function') applyHomeLang();
    showMain();
    el('home-overlay').classList.add('show');
    document.body.classList.remove('playing');
  }
  function hideHome(){ el('home-overlay').classList.remove('show'); }

  function applyHomeLang(){
    var set=function(id,key,fb){var e=el(id);if(e)e.textContent=tr(key,fb);};
    set('home-subtitle','homeSubtitle','Minecraft-style 3D Survival');
    set('home-worlds-title','worlds','Your Worlds');
    set('btn-new-world','newWorld','＋ New World');
    set('home-empty','noWorlds','No worlds yet — create one to start playing!');
    set('world-dialog-title','createWorld','Create New World');
    set('wd-name-label','worldName','World Name');
    set('wd-seed-label','seedOptional','Seed (optional)');
    set('wd-seed-hint','seedHint','Same seed → same terrain. Leave empty for a random world.');
    set('wd-cancel','cancel','Cancel');
    set('wd-confirm','createPlay','Create & Play');
    var np=el('wd-name');if(np)np.placeholder=tr('defaultWorldName','My World');
  }

  /* ---------------------------------------------------------------------- */
  /*  Wire up                                                                 */
  /* ---------------------------------------------------------------------- */
  function init(){
    /* Main nav */
    var sp=el('btn-singleplayer'); if(sp)sp.addEventListener('click',showSingle);
    var mp=el('btn-multiplayer');  if(mp)mp.addEventListener('click',showMulti);
    var st=el('btn-home-settings');
    if(st) st.addEventListener('click',function(){
      var so=el('settings-overlay');
      if(so){ so.style.display='flex'; }
    });
    var bb=el('home-back-btn');
    if(bb) bb.addEventListener('click',showMain);

    /* Single player world list */
    var nb=el('btn-new-world'); if(nb)nb.addEventListener('click',openDialog);
    var wc=el('wd-cancel');    if(wc)wc.addEventListener('click',closeDialog);
    var wf=el('wd-confirm');   if(wf)wf.addEventListener('click',confirmDialog);
    var ov=el('world-dialog');
    if(ov) ov.addEventListener('click',function(e){if(e.target.id==='world-dialog')closeDialog();});
    var ns=el('wd-seed'); if(ns)ns.addEventListener('keydown',function(e){if(e.key==='Enter')confirmDialog();});
    var nn=el('wd-name'); if(nn)nn.addEventListener('keydown',function(e){if(e.key==='Enter')confirmDialog();});

    /* P2P tabs */
    var tabs=document.querySelectorAll('.p2p-tab');
    tabs.forEach(function(tab){
      tab.addEventListener('click',function(){
        tabs.forEach(function(t){t.classList.remove('active');});
        tab.classList.add('active');
        var target=tab.getAttribute('data-p2p-tab');
        document.querySelectorAll('.p2p-section').forEach(function(s){s.classList.remove('active');});
        var sec=el('p2p-'+target+'-section');
        if(sec) sec.classList.add('active');
      });
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

  /* Expose to main.js / settings */
  window.showHome=showHome;
  window.hideHome=hideHome;
  window.applyHomeLang=applyHomeLang;
})();
