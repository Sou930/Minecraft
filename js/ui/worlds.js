"use strict";
/*
 * Multi-world management.
 * ----------------------------------------------------------------------------
 * This module loads BEFORE every other game script. It decides which world is
 * "active" and exposes a tiny key-namespacing helper so that all per-world save
 * data (terrain edits, inventory, crops, achievements, seed, …) lives under a
 * world-specific localStorage prefix:  bw_w_<id>_<key>.
 *
 * Global settings (language / render distance / quality) stay un-namespaced.
 *
 * The world list itself is stored under `bw_worlds` and the active id under
 * `bw_active_world`. A first-run migration moves any legacy single-world save
 * data (bw_seed / bw_edits / …) into a freshly created "world".
 */
(function(){
  const LIST_KEY   = 'bw_worlds';        // [{id,name,seed,created,lastPlayed}]
  const ACTIVE_KEY = 'bw_active_world';   // id of the world to load on boot
  // Keys that are scoped to a single world (everything except global settings).
  const WORLD_SCOPED = ['seed','edits','inventory','crops','ach_stats','ach_done','world_version'];

  function uid(){ return 'w'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

  function loadList(){
    try{ const a=JSON.parse(localStorage.getItem(LIST_KEY)||'[]'); return Array.isArray(a)?a:[]; }
    catch(e){ return []; }
  }
  function saveList(list){ try{ localStorage.setItem(LIST_KEY, JSON.stringify(list)); }catch(e){} }

  // -------------------------------------------------------------------------
  // One-time migration of legacy (single-world) save data.
  // -------------------------------------------------------------------------
  function migrateLegacy(list){
    const legacySeed = localStorage.getItem('bw_seed');
    const legacyEdits = localStorage.getItem('bw_edits');
    if(legacySeed===null && legacyEdits===null) return list; // nothing to migrate
    const id = uid();
    const seed = parseInt(legacySeed||'0',10) || ((Math.random()*2147483646+1)|0);
    const w = { id, name:'My World', seed, created:Date.now(), lastPlayed:Date.now() };
    // Move all legacy world-scoped keys under the new world prefix.
    const moves = {
      seed: legacySeed!==null?legacySeed:String(seed),
      edits: legacyEdits,
      inventory: localStorage.getItem('bw_inventory'),
      crops: localStorage.getItem('bw_crops'),
      ach_stats: localStorage.getItem('bw_ach_stats'),
      ach_done: localStorage.getItem('bw_ach_done'),
      world_version: localStorage.getItem('bw_world_version'),
    };
    const prefix = 'bw_w_'+id+'_';
    for(const k in moves){ if(moves[k]!==null) localStorage.setItem(prefix+k, moves[k]); }
    // Clean up the old global keys so they aren't accidentally reused.
    ['bw_seed','bw_edits','bw_inventory','bw_crops','bw_ach_stats','bw_ach_done','bw_world_version']
      .forEach(k=>localStorage.removeItem(k));
    list.push(w);
    saveList(list);
    localStorage.setItem(ACTIVE_KEY, id);
    return list;
  }

  let list = loadList();
  list = migrateLegacy(list);

  // Active world id: clamp to an existing world if possible (may be null → home).
  let activeId = localStorage.getItem(ACTIVE_KEY);
  if(activeId && !list.some(w=>w.id===activeId)) activeId = null;

  function prefix(){ return 'bw_w_'+activeId+'_'; }

  const API = {
    // --- list management ---------------------------------------------------
    list(){ return loadList().slice().sort((a,b)=>(b.lastPlayed||0)-(a.lastPlayed||0)); },
    get(id){ return loadList().find(w=>w.id===id)||null; },
    count(){ return loadList().length; },

    create(name, seed){
      const l = loadList();
      const id = uid();
      let s = parseInt(seed,10);
      if(!Number.isFinite(s) || s===0) s = (Math.random()*2147483646+1)|0;
      const w = { id, name:(name||'World').trim()||'World', seed:s>>>0||s, created:Date.now(), lastPlayed:Date.now() };
      l.push(w); saveList(l);
      return w;
    },

    rename(id, name){
      const l=loadList(); const w=l.find(x=>x.id===id); if(!w) return;
      w.name=(name||'World').trim()||'World'; saveList(l);
    },

    delete(id){
      const l=loadList().filter(w=>w.id!==id); saveList(l);
      // Wipe all per-world keys for that id.
      const p='bw_w_'+id+'_';
      const toRemove=[];
      for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.indexOf(p)===0) toRemove.push(k); }
      toRemove.forEach(k=>localStorage.removeItem(k));
      if(activeId===id){ activeId=null; localStorage.removeItem(ACTIVE_KEY); }
    },

    // Mark a world active (called right before loading it).
    setActive(id){
      const w=this.get(id); if(!w) return false;
      activeId=id; localStorage.setItem(ACTIVE_KEY,id);
      const l=loadList(); const ww=l.find(x=>x.id===id); if(ww){ ww.lastPlayed=Date.now(); saveList(l); }
      return true;
    },
    clearActive(){ activeId=null; localStorage.removeItem(ACTIVE_KEY); },
    activeId(){ return activeId; },
    active(){ return activeId?this.get(activeId):null; },
    hasActive(){ return !!activeId; },

    // --- namespaced storage accessors used by the rest of the game ---------
    // `key` is the bare suffix, e.g. 'edits'. Falls back to no-op if no active
    // world (shouldn't happen once a world is loaded).
    getItem(key){ if(!activeId) return null; return localStorage.getItem(prefix()+key); },
    setItem(key,val){ if(!activeId) return; localStorage.setItem(prefix()+key,val); },
    removeItem(key){ if(!activeId) return; localStorage.removeItem(prefix()+key); },
  };

  window.WORLDS = API;
})();
