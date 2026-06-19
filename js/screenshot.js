"use strict";
/*
 * Screenshot mode.
 * ----------------------------------------------------------------------------
 * Hides ALL gameplay UI (HUD, hotbar, crosshair, joystick, touch buttons, …)
 * leaving only the rendered world so the player can capture clean scenery.
 * Toggle with the 📷 button or the P key; exit with P / Esc / the ✕ button.
 *
 * On PC, pointer lock stays active so the player can still look around (move the
 * mouse) while in screenshot mode. Gameplay input that would change UI state is
 * naturally hidden, but movement/looking still works for framing the shot.
 */
(function(){
  let active=false;

  function isActive(){return active;}

  function enter(){
    if(active)return;
    if(typeof started==='undefined'||!started)return; // only while in-game
    if(typeof inventoryOpen!=='undefined'&&inventoryOpen&&typeof toggleInventory==='function')toggleInventory(false);
    if(typeof settingsOpen!=='undefined'&&settingsOpen&&typeof toggleSettings==='function')toggleSettings(false);
    active=true;
    document.body.classList.add('screenshot-mode');
    // Keep pointer lock so the player can frame the shot by looking around (PC).
    if(typeof isMobile!=='undefined'&&!isMobile&&typeof canvas!=='undefined'&&document.pointerLockElement!==canvas){
      try{canvas.requestPointerLock();}catch(e){}
    }
  }

  function exit(){
    if(!active)return;
    active=false;
    document.body.classList.remove('screenshot-mode');
  }

  function toggle(){ active?exit():enter(); }

  // --- input bindings ------------------------------------------------------
  document.addEventListener('keydown',(e)=>{
    if(e.code==='KeyP'){e.preventDefault();toggle();return;}
    if(active&&e.code==='Escape'){e.preventDefault();exit();}
  });

  function init(){
    const btn=document.getElementById('btn-screenshot');
    if(btn)btn.addEventListener('click',(e)=>{e.stopPropagation();enter();});
    const ex=document.getElementById('btn-screenshot-exit');
    if(ex)ex.addEventListener('click',(e)=>{e.stopPropagation();exit();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();

  window.SCREENSHOT={enter,exit,toggle,isActive};
})();
