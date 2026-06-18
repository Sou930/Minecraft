"use strict";
/* ===========================================================================
 * Settings system: language selection, render-distance switching, and a
 * low-quality-texture toggle. Opened with the "O" key in-game.
 *
 * State is persisted to localStorage and applied live where possible:
 *   - language        : updates all translated UI strings immediately
 *   - renderDistance  : adjusts the voxel view distance / fog and re-streams
 *   - lowQualityTex   : down-samples the block atlas + tool textures
 * ========================================================================= */

// ---- i18n -----------------------------------------------------------------
const I18N = {
  en: {
    langName:'English',
    settings:'Settings',
    language:'Language',
    renderDistance:'Render Distance',
    lowQuality:'Low-Quality Textures',
    lowQualityHint:'Blurs/down-samples textures for better performance',
    close:'Close',
    near:'Near', medium:'Medium', far:'Far', extreme:'Extreme',
    on:'On', off:'Off',
    openHint:'Press O for settings',
    inventory:'Inventory', recipes:'Recipes', achievements:'Achievements',
    play:'Play', resume:'Resume', paused:'Paused',
    resetWorld:'Reset World (clears terrain & builds)',
  },
  ja: {
    langName:'日本語',
    settings:'設定',
    language:'言語',
    renderDistance:'描画距離',
    lowQuality:'低画質テクスチャ',
    lowQualityHint:'テクスチャを低画質化して動作を軽くします',
    close:'閉じる',
    near:'近い', medium:'普通', far:'遠い', extreme:'最大',
    on:'オン', off:'オフ',
    openHint:'O キーで設定',
    inventory:'インベントリ', recipes:'レシピ', achievements:'実績',
    play:'プレイ', resume:'再開', paused:'一時停止',
    resetWorld:'ワールドをリセット（地形と建築を消去）',
  },
};
const LANG_ORDER=['en','ja'];

// Render distance presets (in chunks). VIEW_DIST_CHUNKS is set from these.
const RENDER_PRESETS=[
  {id:'near',   chunks:6,  fogStart:70,  fogEnd:120},
  {id:'medium', chunks:10, fogStart:110, fogEnd:190},
  {id:'far',    chunks:14, fogStart:140, fogEnd:260},
  {id:'extreme',chunks:20, fogStart:200, fogEnd:360},
];

const SETTINGS = {
  lang: localStorage.getItem('bw_lang') || (navigator.language||'en').slice(0,2),
  renderPreset: localStorage.getItem('bw_render') || 'far',
  lowQualityTex: localStorage.getItem('bw_lowqual') === '1',
};
if(!I18N[SETTINGS.lang]) SETTINGS.lang='en';
if(!RENDER_PRESETS.some(p=>p.id===SETTINGS.renderPreset)) SETTINGS.renderPreset='far';

function t(key){const d=I18N[SETTINGS.lang]||I18N.en;return d[key]!==undefined?d[key]:(I18N.en[key]||key);}
function currentRenderPreset(){return RENDER_PRESETS.find(p=>p.id===SETTINGS.renderPreset)||RENDER_PRESETS[2];}

function saveSettings(){
  localStorage.setItem('bw_lang',SETTINGS.lang);
  localStorage.setItem('bw_render',SETTINGS.renderPreset);
  localStorage.setItem('bw_lowqual',SETTINGS.lowQualityTex?'1':'0');
}

// ---- Apply language to existing DOM ---------------------------------------
function applyLanguageToUI(){
  document.documentElement.lang = SETTINGS.lang;
  const map = {
    '#settings-title':'settings',
    '#set-lang-label':'language',
    '#set-render-label':'renderDistance',
    '#set-lowqual-label':'lowQuality',
    '#set-lowqual-hint':'lowQualityHint',
  };
  for(const sel in map){const el=document.querySelector(sel);if(el)el.textContent=t(map[sel]);}
  // Buttons with translatable labels
  const btnClose=document.getElementById('btn-settings-close');if(btnClose)btnClose.setAttribute('aria-label',t('close'));
  // Top-right / inventory buttons titles
  const setTitle=(id,key)=>{const e=document.getElementById(id);if(e){e.title=t(key);e.setAttribute('aria-label',t(key));}};
  setTitle('btn-achievements','achievements');
  setTitle('btn-inventory','inventory');
  setTitle('btn-recipes','recipes');
  // Reset-world button label
  const rw=document.getElementById('btn-reset-world');if(rw)rw.textContent='🗑 '+t('resetWorld');
  // Settings hint pill
  const hint=document.getElementById('settings-hint');if(hint)hint.textContent='⚙ '+t('openHint');
  // Re-render the option chips so their localized names update
  if(typeof renderSettingsOptions==='function')renderSettingsOptions();
}

// ---- Render distance / low-quality application ----------------------------
function applyRenderDistance(){
  const p=currentRenderPreset();
  if(typeof setViewDistance==='function')setViewDistance(p.chunks);
  if(typeof scene!=='undefined'){scene.fogStart=p.fogStart;scene.fogEnd=p.fogEnd;}
  if(typeof camera!=='undefined')camera.maxZ=Math.max(520,p.fogEnd+120);
  if(typeof updateChunkStreaming==='function'&&typeof worldReady!=='undefined'&&worldReady)updateChunkStreaming(40);
}
function applyLowQuality(){
  if(typeof applyAtlasQuality==='function')applyAtlasQuality(SETTINGS.lowQualityTex);
}

// ---- Settings panel build / open / close ----------------------------------
let settingsOpen=false;
function renderSettingsOptions(){
  // Language chips
  const langWrap=document.getElementById('set-lang-options');
  if(langWrap){langWrap.innerHTML='';for(const code of LANG_ORDER){const b=document.createElement('button');b.className='set-chip'+(code===SETTINGS.lang?' active':'');b.textContent=I18N[code].langName;b.addEventListener('click',()=>{SETTINGS.lang=code;saveSettings();applyLanguageToUI();});langWrap.appendChild(b);}}
  // Render-distance chips
  const rWrap=document.getElementById('set-render-options');
  if(rWrap){rWrap.innerHTML='';for(const p of RENDER_PRESETS){const b=document.createElement('button');b.className='set-chip'+(p.id===SETTINGS.renderPreset?' active':'');b.textContent=t(p.id)+' ('+p.chunks+')';b.addEventListener('click',()=>{SETTINGS.renderPreset=p.id;saveSettings();renderSettingsOptions();applyRenderDistance();});rWrap.appendChild(b);}}
  // Low-quality toggle
  const tg=document.getElementById('set-lowqual-toggle');
  if(tg){tg.textContent=SETTINGS.lowQualityTex?t('on'):t('off');tg.classList.toggle('on',SETTINGS.lowQualityTex);}
}
function toggleSettings(force){
  const open=force!==undefined?force:!settingsOpen;
  settingsOpen=open;
  const ov=document.getElementById('settings-overlay');
  if(!ov)return;
  if(open){renderSettingsOptions();ov.style.display='flex';
    if(typeof isMobile!=='undefined'&&!isMobile&&typeof canvas!=='undefined'&&document.pointerLockElement===canvas)document.exitPointerLock();
  }else{ov.style.display='none';
    if(typeof isMobile!=='undefined'&&!isMobile&&typeof started!=='undefined'&&started&&typeof inventoryOpen!=='undefined'&&!inventoryOpen&&typeof lockPointer==='function')lockPointer();
  }
}
function initSettingsUI(){
  const closeBtn=document.getElementById('btn-settings-close');if(closeBtn)closeBtn.addEventListener('click',()=>toggleSettings(false));
  const ov=document.getElementById('settings-overlay');if(ov)ov.addEventListener('click',(e)=>{if(e.target.id==='settings-overlay')toggleSettings(false);});
  const tg=document.getElementById('set-lowqual-toggle');if(tg)tg.addEventListener('click',()=>{SETTINGS.lowQualityTex=!SETTINGS.lowQualityTex;saveSettings();renderSettingsOptions();applyLowQuality();});
  const gear=document.getElementById('btn-settings');if(gear)gear.addEventListener('click',(e)=>{e.stopPropagation();toggleSettings();});
  applyLanguageToUI();
}
