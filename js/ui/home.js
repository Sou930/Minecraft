"use strict";
/*
 * Home / world-select screen.
 * ----------------------------------------------------------------------------
 * Shown on first load (or whenever no world is active). Lets the player create
 * new worlds (with an optional seed), play / rename / delete existing ones.
 * Selecting a world sets it active in WORLDS and calls bootstrapWorld() (main.js)
 * which kicks off terrain generation for that world.
 */
(function(){
  function el(id){return document.getElementById(id);}

  // --- i18n helper (falls back to English) ---------------------------------
  function tr(key,fallback){return (typeof t==='function')?(t(key)!==key?t(key):fallback):fallback;}

  function fmtDate(ts){
    if(!ts)return '';
    try{const d=new Date(ts);return d.toLocaleDateString()+' '+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});}
    catch(e){return '';}
  }

  // --- render the saved-world list -----------------------------------------
  function renderList(){
    const ul=el('world-list'); if(!ul) return;
    const worlds=WORLDS.list();
    ul.innerHTML='';
    el('home-empty').style.display=worlds.length?'none':'block';
    worlds.forEach(w=>{
      const li=document.createElement('li');
      li.className='world-card';
      li.tabIndex=0;
      const playedLabel=tr('lastPlayed','Last played');
      const seedLabel=tr('seedLabel','Seed');
      li.innerHTML=
        '<div class="world-thumb"></div>'+
        '<div class="world-meta">'+
          '<div class="world-name"></div>'+
          '<div class="world-sub"></div>'+
        '</div>'+
        '<div class="world-actions">'+
          '<button class="wc-edit" title="'+tr('rename','Rename')+'" aria-label="Rename">✏️</button>'+
          '<button class="wc-del" title="'+tr('delete','Delete')+'" aria-label="Delete">🗑</button>'+
        '</div>';
      li.querySelector('.world-name').textContent=w.name;
      li.querySelector('.world-sub').textContent=seedLabel+': '+w.seed+' · '+playedLabel+': '+fmtDate(w.lastPlayed||w.created);
      // Play on card click (but not when an action button was hit).
      li.addEventListener('click',(e)=>{ if(e.target.closest('.world-actions')) return; playWorld(w.id); });
      li.addEventListener('keydown',(e)=>{ if(e.key==='Enter') playWorld(w.id); });
      li.querySelector('.wc-edit').addEventListener('click',(e)=>{ e.stopPropagation(); renameWorld(w); });
      li.querySelector('.wc-del').addEventListener('click',(e)=>{ e.stopPropagation(); deleteWorld(w); });
      ul.appendChild(li);
    });
  }

  function renameWorld(w){
    const name=prompt(tr('renamePrompt','New world name:'), w.name);
    if(name===null) return;
    WORLDS.rename(w.id, name);
    renderList();
  }

  function deleteWorld(w){
    if(!confirm(tr('deleteConfirm','Delete this world? This cannot be undone.')+'\n\n“'+w.name+'”')) return;
    WORLDS.delete(w.id);
    renderList();
  }

  function playWorld(id){
    if(!WORLDS.setActive(id)) return;
    hideHome();
    bootstrapWorld();
  }

  // --- new-world dialog ----------------------------------------------------
  function openDialog(){
    el('wd-name').value='';
    el('wd-seed').value='';
    el('world-dialog').classList.add('show');
    setTimeout(()=>el('wd-name').focus(),50);
  }
  function closeDialog(){ el('world-dialog').classList.remove('show'); }
  function confirmDialog(){
    const name=el('wd-name').value.trim()|| tr('defaultWorldName','World');
    const seed=el('wd-seed').value.trim();
    const w=WORLDS.create(name, seed);
    closeDialog();
    playWorld(w.id);
  }

  // --- show / hide ---------------------------------------------------------
  function showHome(){
    if(typeof applyHomeLang==='function')applyHomeLang();
    renderList();
    el('home-overlay').classList.add('show');
    document.body.classList.remove('playing');
  }
  function hideHome(){ el('home-overlay').classList.remove('show'); }

  // Translate static home-screen labels.
  function applyHomeLang(){
    const set=(id,key,fb)=>{const e=el(id);if(e)e.textContent=tr(key,fb);};
    set('home-subtitle','homeSubtitle','Minecraft-style 3D Survival');
    set('home-worlds-title','worlds','Worlds');
    set('btn-new-world','newWorld','＋ New World');
    set('home-empty','noWorlds','No worlds yet — create one to start playing!');
    set('world-dialog-title','createWorld','Create New World');
    set('wd-name-label','worldName','World Name');
    set('wd-seed-label','seedOptional','Seed (optional)');
    set('wd-seed-hint','seedHint','Same seed → same terrain. Leave empty for a random world.');
    set('wd-cancel','cancel','Cancel');
    set('wd-confirm','createPlay','Create & Play');
    const np=el('wd-name');if(np)np.placeholder=tr('defaultWorldName','My World');
  }

  // --- wire up -------------------------------------------------------------
  function init(){
    const nb=el('btn-new-world'); if(nb)nb.addEventListener('click',openDialog);
    const wc=el('wd-cancel'); if(wc)wc.addEventListener('click',closeDialog);
    const wf=el('wd-confirm'); if(wf)wf.addEventListener('click',confirmDialog);
    const ov=el('world-dialog'); if(ov)ov.addEventListener('click',(e)=>{if(e.target.id==='world-dialog')closeDialog();});
    const ns=el('wd-seed'); if(ns)ns.addEventListener('keydown',(e)=>{if(e.key==='Enter')confirmDialog();});
    const nn=el('wd-name'); if(nn)nn.addEventListener('keydown',(e)=>{if(e.key==='Enter')confirmDialog();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();

  // Expose to main.js / settings.
  window.showHome=showHome;
  window.applyHomeLang=applyHomeLang;
})();
