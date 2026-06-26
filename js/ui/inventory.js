const INV_SIZE=36;let inventory=new Array(INV_SIZE).fill(null);let craftSize=2;let craftGrid=new Array(craftSize*craftSize).fill(null);let heldStack=null;let inventoryOpen=false;
function makeStack(id,count){const st={id,count:(isTool(id)||( ITEMS[id]&&(ITEMS[id].armor||ITEMS[id].shield||ITEMS[id].ranged)))?1:count};if(isTool(id)){const def=toolDef(id);st.dur=def?def.maxDur:1;}else if(ITEMS[id]&&(ITEMS[id].armor||ITEMS[id].shield||ITEMS[id].ranged)){st.dur=ITEMS[id].maxDur||1;}return st;}
function loadInventory(){try{const d=JSON.parse(WORLDS.getItem('inventory')||'null');if(Array.isArray(d)&&d.length===INV_SIZE)
inventory=d.map(s=>{if(!s||typeof s.id!=='number'||s.count<=0)return null;if(isTool(s.id)){const def=toolDef(s.id);const dur=(typeof s.dur==='number'&&s.dur>0)?Math.min(s.dur,def.maxDur):def.maxDur;return{id:s.id,count:1,dur};}if(ITEMS[s.id]&&(ITEMS[s.id].armor||ITEMS[s.id].shield||ITEMS[s.id].ranged)){const maxDur=ITEMS[s.id].maxDur||1;const dur=(typeof s.dur==='number'&&s.dur>0)?Math.min(s.dur,maxDur):maxDur;return{id:s.id,count:1,dur};}return{id:s.id,count:Math.min(STACK_MAX,s.count)};});}catch(e){}}
let invSaveTimer=null;function scheduleInvSave(){clearTimeout(invSaveTimer);invSaveTimer=setTimeout(()=>{try{WORLDS.setItem('inventory',JSON.stringify(inventory));}catch(e){}},400);}
function itemName(id){return ITEMS[id]?ITEMS[id].name:(BLOCKS[id]?BLOCKS[id].name:'?');}
function addToInventory(id,count){let left=count;
// Tools, armor, shields, ranged weapons do not stack
if(isTool(id)||(typeof isArmorLike==='function'&&isArmorLike(id))){for(let i=0;i<INV_SIZE&&left>0;i++){if(!inventory[i]){inventory[i]=makeStack(id,1);left--;}}
renderHotbar();if(inventoryOpen)renderInventory();scheduleInvSave();return left;}
const cap=STACK_MAX;for(let i=0;i<INV_SIZE&&left>0;i++){const s=inventory[i];if(s&&s.id===id&&s.count<cap){const n=Math.min(cap-s.count,left);s.count+=n;left-=n;}}
for(let i=0;i<INV_SIZE&&left>0;i++){if(!inventory[i]){const n=Math.min(cap,left);inventory[i]={id,count:n};left-=n;}}
renderHotbar();if(inventoryOpen)renderInventory();scheduleInvSave();return left;}
function consumeFromSlot(i,n){const s=inventory[i];if(!s)return;s.count-=n;if(s.count<=0)inventory[i]=null;renderHotbar();if(inventoryOpen)renderInventory();scheduleInvSave();}
function makeItemNode(id){
// Tools & sticks: use the dedicated per-material pixel-art texture when available.
if(typeof toolTextureFor==='function'){const tt=toolTextureFor(id);if(tt){const c=document.createElement('canvas');c.width=32;c.height=32;const ictx=c.getContext('2d');ictx.imageSmoothingEnabled=false;ictx.drawImage(tt,0,0,32,32);c.classList.add('tool-tex');return c;}}
if(ITEMS[id]){const def=ITEMS[id];const em=document.createElement('span');em.className='item-emoji';em.textContent=def.emoji;
if(def.toolColor){em.classList.add('tool-emoji');em.style.setProperty('--tool-color',def.toolColor);}
// Potions: show colored tint
if(def.isPotion&&def.color){em.style.filter=`drop-shadow(0 0 4px ${def.color})`;}
return em;}
const c=document.createElement('canvas');c.width=32;c.height=32;const ictx=c.getContext('2d');ictx.imageSmoothingEnabled=false;const def=BLOCKS[id];const tile=def.all!==undefined?def.all:def.side;ictx.drawImage(atlasCanvas,(tile%ATLAS_TILES)*TILE_PX,Math.floor(tile/ATLAS_TILES)*TILE_PX,TILE_PX,TILE_PX,0,0,32,32);return c;}
function fillSlotEl(el,stack){el.innerHTML='';el.title='';if(!stack)return;el.appendChild(makeItemNode(stack.id));if(stack.count>1){const cnt=document.createElement('span');cnt.className='slot-count';cnt.textContent=stack.count;el.appendChild(cnt);}
// Durability bar for tools AND armor/shields/ranged weapons
const hasMaxDur=ITEMS[stack.id]&&ITEMS[stack.id].maxDur&&(isTool(stack.id)||ITEMS[stack.id].armor||ITEMS[stack.id].shield||ITEMS[stack.id].ranged);
if(hasMaxDur){const def=ITEMS[stack.id];const max=def.maxDur||1;const ratio=Math.max(0,Math.min(1,(stack.dur||0)/max));const bar=document.createElement('span');bar.className='dur-bar';const fill=document.createElement('span');fill.className='dur-fill';fill.style.width=(ratio*100).toFixed(1)+'%';const hue=ratio>0.5?120:(ratio>0.2?55:0);fill.style.background=`hsl(${hue},80%,48%)`;bar.appendChild(fill);if(ratio>=1)bar.style.opacity='0';el.appendChild(bar);}
el.title=itemName(stack.id)+(hasMaxDur?` (${stack.dur||'?'}/${ITEMS[stack.id].maxDur})`:'');}
// Build durability bar element
function makeDurBar(stack){const def=toolDef(stack.id);const max=def?def.maxDur:1;const ratio=Math.max(0,Math.min(1,(stack.dur||0)/max));const bar=document.createElement('span');bar.className='dur-bar';const fill=document.createElement('span');fill.className='dur-fill';fill.style.width=(ratio*100).toFixed(1)+'%';
const hue=ratio>0.5?120:(ratio>0.2?55:0);fill.style.background=`hsl(${hue},80%,48%)`;bar.appendChild(fill);
if(ratio>=1)bar.style.opacity='0';return bar;}
function craftResultNow(){const n=craftSize;const ids=craftGrid.map(s=>s?s.id:null);let minR=n,maxR=-1,minC=n,maxC=-1;for(let r=0;r<n;r++)for(let c=0;c<n;c++){if(ids[r*n+c]!==null){minR=Math.min(minR,r);maxR=Math.max(maxR,r);minC=Math.min(minC,c);maxC=Math.max(maxC,c);}}
if(maxR<0)return null;const h=maxR-minR+1,w=maxC-minC+1;for(const rec of RECIPES){if(rec.pattern.length!==h||rec.pattern[0].length!==w)continue;let ok=true;for(let r=0;r<h&&ok;r++)
for(let c=0;c<w&&ok;c++)
if((rec.pattern[r][c]??null)!==ids[(minR+r)*n+(minC+c)])ok=false;if(ok)return{id:rec.out.id,count:rec.out.count};}
return null;}
function getSlotByLoc(loc){if(!loc)return null;if(loc.kind==='inv')return inventory[loc.i];if(loc.kind==='craft')return craftGrid[loc.i];return null;}
function setSlotByLoc(loc,s){if(!loc)return;if(loc.kind==='inv')inventory[loc.i]=s;else if(loc.kind==='craft')craftGrid[loc.i]=s;}
function leftClickSlot(loc){const s=getSlotByLoc(loc);const cap=heldStack?maxStackOf(heldStack.id):STACK_MAX;if(!heldStack){if(s){setSlotByLoc(loc,null);heldStack=s;}}else if(!s){setSlotByLoc(loc,heldStack);heldStack=null;}else if(s.id===heldStack.id&&!isTool(s.id)&&s.count<cap){const n=Math.min(cap-s.count,heldStack.count);s.count+=n;heldStack.count-=n;if(heldStack.count<=0)heldStack=null;}else{setSlotByLoc(loc,heldStack);heldStack=s;}
afterInvChange();}
function rightClickSlot(loc){const s=getSlotByLoc(loc);
// Tools can't be split
if(heldStack&&isTool(heldStack.id)||s&&isTool(s.id)){leftClickSlot(loc);return;}
if(!heldStack){if(s){const take=Math.ceil(s.count/2);heldStack={id:s.id,count:take};s.count-=take;if(s.count<=0)setSlotByLoc(loc,null);}}else{if(!s){setSlotByLoc(loc,{id:heldStack.id,count:1});heldStack.count--;}
else if(s.id===heldStack.id&&s.count<STACK_MAX){s.count++;heldStack.count--;}
if(heldStack&&heldStack.count<=0)heldStack=null;}
afterInvChange();}
function takeCraftResult(){const out=craftResultNow();if(!out)return;
// Tools: only take one at a time
if(isTool(out.id)){if(heldStack)return;heldStack=makeStack(out.id,1);}
else if(heldStack){if(heldStack.id!==out.id||heldStack.count+out.count>STACK_MAX)return;heldStack.count+=out.count;}else{heldStack={id:out.id,count:out.count};}
for(let i=0;i<craftGrid.length;i++){if(craftGrid[i]){craftGrid[i].count--;if(craftGrid[i].count<=0)craftGrid[i]=null;}}
if(typeof ACH!=='undefined')ACH.track('crafted');afterInvChange();}
function afterInvChange(){renderInventory();renderHotbar();updateHeldUI();scheduleInvSave();if(recipePanelOpen&&inventoryOpen)renderRecipeBook();if(typeof armorPanelOpen!=='undefined'&&armorPanelOpen&&typeof buildArmorPanel==='function')buildArmorPanel();}
const heldEl=document.getElementById('held-item');function updateHeldUI(){heldEl.innerHTML='';if(heldStack){heldEl.appendChild(makeItemNode(heldStack.id));if(heldStack.count>1){const c=document.createElement('span');c.className='slot-count';c.textContent=heldStack.count;heldEl.appendChild(c);}
if(isTool(heldStack.id))heldEl.appendChild(makeDurBar(heldStack));
heldEl.style.display='block';
document.body.classList.add('holding-stack');
}else{heldEl.style.display='none';
document.body.classList.remove('holding-stack');
document.body.classList.remove('inv-dragging');
}}
// Smooth held-item tracking using requestAnimationFrame + lerp
let _heldTargetX=0,_heldTargetY=0,_heldCurrentX=0,_heldCurrentY=0,_heldRafId=null;
function _animateHeld(){
  // Instantly snap on first frame after pickup; smooth after that
  const dx=_heldTargetX-_heldCurrentX,dy=_heldTargetY-_heldCurrentY;
  if(Math.abs(dx)+Math.abs(dy)>0.3){
    _heldCurrentX+=dx*0.62;_heldCurrentY+=dy*0.62;
    heldEl.style.transform=`translate(${(_heldCurrentX-16).toFixed(1)}px,${(_heldCurrentY-16).toFixed(1)}px)`;
    _heldRafId=requestAnimationFrame(_animateHeld);
  }else{
    _heldCurrentX=_heldTargetX;_heldCurrentY=_heldTargetY;
    heldEl.style.transform=`translate(${(_heldCurrentX-16).toFixed(1)}px,${(_heldCurrentY-16).toFixed(1)}px)`;
    _heldRafId=null;
  }
}
function moveHeldTo(x,y){
  _heldTargetX=x;_heldTargetY=y;
  if(!_heldRafId){_heldCurrentX=x;_heldCurrentY=y;
    heldEl.style.transform=`translate(${(x-16).toFixed(1)}px,${(y-16).toFixed(1)}px)`;
  }
  if(!_heldRafId&&heldStack)_heldRafId=requestAnimationFrame(_animateHeld);
}
document.addEventListener('pointermove',(e)=>{
  if(!heldStack)return;
  _heldTargetX=e.clientX;_heldTargetY=e.clientY;
  if(!_heldRafId)_heldRafId=requestAnimationFrame(_animateHeld);
});

// ── Drag-and-drop state ─────────────────────────────────────────────────────
// When the user presses mousedown on a non-empty slot and moves the mouse
// (more than DRAG_THRESHOLD px) before releasing, it becomes a drag.
// Releasing over a slot swaps/merges exactly like a left-click.
// Releasing over empty space (or outside inventory) drops the held stack back.
const DRAG_THRESHOLD=6;
let _dragOriginLoc=null;  // loc object of the slot being dragged from
let _dragOriginPos={x:0,y:0};
let _isDragging=false;
let _allSlotEls=[];       // flat list of {el, loc, onLeft, onRight} — built in mkInvSlot

// Right-drag: paint one item into each slot the cursor sweeps over (Minecraft-style)
let _rightDragging=false;
let _rightDragVisited=new Set();

const slotEls={craft:[],result:null,main:[],hotbar:[]};

function _findLocForEl(el){
  for(const s of _allSlotEls){if(s.el===el)return s;}
  return null;
}

// ── Drag ghost: faded copy of the original slot during a drag ──────────────
let _dragGhostEl=null;
function _startDragGhost(el){
  if(_dragGhostEl)_dragGhostEl.remove();
  _dragGhostEl=el.cloneNode(true);
  _dragGhostEl.style.cssText=`opacity:0.35;pointer-events:none;position:absolute;left:0;top:0;width:100%;height:100%;z-index:1;`;
  el.style.position='relative';
  el.appendChild(_dragGhostEl);
}
function _clearDragGhost(){
  if(_dragGhostEl){_dragGhostEl.remove();_dragGhostEl=null;}
}
// Current drop-target highlight
let _dropHighlightEl=null;
function _setDropHighlight(el){
  if(_dropHighlightEl===el)return;
  if(_dropHighlightEl)_dropHighlightEl.classList.remove('slot-drop-target');
  _dropHighlightEl=el;
  if(el)el.classList.add('slot-drop-target');
}

function mkInvSlot(parent,onLeft,onRight){
  const el=document.createElement('div');
  el.className='inv-slot';

  // ── Desktop drag-and-drop ───────────────────────────────────────────────
  el.addEventListener('mousedown',(e)=>{
    if(e.button!==0&&e.button!==2)return;
    const info=_findLocForEl(el);if(!info)return;
    if(e.button===2){
      // Right-drag: start paint mode
      _rightDragging=true;
      _rightDragVisited.clear();
      return;
    }
    const s=info.loc?getSlotByLoc(info.loc):null;
    if(!s&&!heldStack)return; // nothing to drag
    _dragOriginLoc=info.loc;
    _dragOriginPos={x:e.clientX,y:e.clientY};
    _isDragging=false;
  });

  el.addEventListener('mouseenter',(e)=>{
    el.classList.add('slot-hover');
    // Highlight as drop target while dragging
    if(_isDragging)_setDropHighlight(el);
    // Right drag: paint one item into each entered slot
    if(_rightDragging&&heldStack){
      const info=_findLocForEl(el);
      if(info&&info.loc&&!_rightDragVisited.has(el)){
        _rightDragVisited.add(el);
        onRight();
        moveHeldTo(e.clientX,e.clientY);
      }
    }
    // Show tooltip with item name above the slot
    const info=_findLocForEl(el);
    if(info&&info.loc){
      const s=getSlotByLoc(info.loc);
      if(s&&s.id!==undefined){
        let tip=el.title||(typeof itemName==='function'?itemName(s.id):'');
        el.setAttribute('data-tip',tip);
      }
    }
  });
  el.addEventListener('mouseleave',()=>{
    el.classList.remove('slot-hover');
    if(_dropHighlightEl===el){_dropHighlightEl.classList.remove('slot-drop-target');_dropHighlightEl=null;}
  });

  el.addEventListener('mouseup',(e)=>{
    if(e.button===1){
      // Middle-click: quick split to one (place one into held if held is null)
      const info=_findLocForEl(el);if(!info)return;
      const s=getSlotByLoc(info.loc);
      if(!heldStack&&s&&s.count>1){
        heldStack={id:s.id,count:1};
        s.count-=1;if(s.count<=0)setSlotByLoc(info.loc,null);
        afterInvChange();moveHeldTo(e.clientX,e.clientY);
      }
      return;
    }
    _setDropHighlight(null);
    if(_isDragging&&_dragOriginLoc){
      // Dragged: treat release as left-click on destination
      _clearDragGhost();
      const info=_findLocForEl(el);
      if(info&&info.loc){
        moveHeldTo(e.clientX,e.clientY);
        // If heldStack is null we need to first pick up from origin
        if(!heldStack){
          const orig=getSlotByLoc(_dragOriginLoc);
          if(orig){setSlotByLoc(_dragOriginLoc,null);heldStack=orig;afterInvChange();}
        }
        onLeft();
      }
      _isDragging=false;_dragOriginLoc=null;
      return;
    }
    _isDragging=false;_dragOriginLoc=null;
  });

  // ── Double-click: gather all matching items into held stack ─────────────
  let _lastClickTime=0;
  el.addEventListener('click',(e)=>{
    if(e.button!==0)return;
    const now=Date.now();
    const isDouble=(now-_lastClickTime)<380;
    _lastClickTime=now;
    if(isDouble&&!_isDragging&&heldStack&&!isTool(heldStack.id)){
      // Collect matching items from all inventory slots into held
      let cap=STACK_MAX;let gathered=heldStack.count;
      for(let i=0;i<INV_SIZE&&gathered<cap;i++){
        const s=inventory[i];if(!s||s.id!==heldStack.id)continue;
        const take=Math.min(cap-gathered,s.count);s.count-=take;gathered+=take;
        if(s.count<=0)inventory[i]=null;
      }
      for(let i=0;i<craftGrid.length&&gathered<cap;i++){
        const s=craftGrid[i];if(!s||s.id!==heldStack.id)continue;
        const take=Math.min(cap-gathered,s.count);s.count-=take;gathered+=take;
        if(s.count<=0)craftGrid[i]=null;
      }
      heldStack.count=gathered;
      afterInvChange();moveHeldTo(e.clientX,e.clientY);
      return;
    }
    if(_isDragging)return;
    moveHeldTo(e.clientX,e.clientY);onLeft();
  });
  el.addEventListener('contextmenu',(e)=>{e.preventDefault();moveHeldTo(e.clientX,e.clientY);onRight();});

  // Mobile tap: same as left click
  let touchHandled=false;
  el.addEventListener('touchend',(e)=>{
    if(e.cancelable)e.preventDefault();
    e.stopPropagation();
    const t=e.changedTouches&&e.changedTouches[0];
    if(t)moveHeldTo(t.clientX,t.clientY);
    onLeft();
    if(heldStack){const tt=t||{};moveHeldTo(tt.clientX||0,tt.clientY||0);}
    touchHandled=true;setTimeout(()=>{touchHandled=false;},400);
  },{passive:false});
  parent.appendChild(el);
  _allSlotEls.push({el,loc:null,onLeft,onRight});// loc filled later by caller
  return el;
}
// Helper to associate a loc with the most recently pushed slot entry
function _assignLastLoc(loc){
  if(_allSlotEls.length){_allSlotEls[_allSlotEls.length-1].loc=loc;}
}
function buildCraftGrid(){
  // Clear loc entries for old craft slots
  _allSlotEls=_allSlotEls.filter(s=>s.loc&&s.loc.kind!=='craft');
  const craftWrap=document.getElementById('craft-grid');craftWrap.innerHTML='';
  craftWrap.classList.toggle('size-3',craftSize===3);slotEls.craft=[];
  for(let i=0;i<craftSize*craftSize;i++){
    const loc={kind:'craft',i};
    const el=mkInvSlot(craftWrap,()=>leftClickSlot(loc),()=>rightClickSlot(loc));
    _assignLastLoc(loc);
    slotEls.craft.push(el);
  }
  document.getElementById('craft-label').textContent=craftSize===3?'Crafting Table (3×3)':'Crafting (2×2)';
  document.querySelector('#inventory-header h2').textContent=craftSize===3?'Crafting Table':'Inventory';
}
function setCraftMode(n){if(craftSize!==n){for(let i=0;i<craftGrid.length;i++){if(craftGrid[i]){addToInventory(craftGrid[i].id,craftGrid[i].count);craftGrid[i]=null;}}
craftSize=n;craftGrid=new Array(n*n).fill(null);}
buildCraftGrid();}
function createInventoryUI(){
  buildCraftGrid();
  // Craft result slot
  const resLoc={kind:'result'};
  slotEls.result=mkInvSlot(document.getElementById('craft-result'),takeCraftResult,takeCraftResult);
  _assignLastLoc(resLoc);
  // Main inventory slots (9–35)
  const main=document.getElementById('inv-main');
  for(let i=9;i<INV_SIZE;i++){
    const loc={kind:'inv',i};
    mkInvSlot(main,()=>leftClickSlot(loc),()=>rightClickSlot(loc));
    _assignLastLoc(loc);
    slotEls.main.push(_allSlotEls[_allSlotEls.length-1].el);
  }
  // Hotbar slots (0–8)
  const hb=document.getElementById('inv-hotbar');
  for(let i=0;i<9;i++){
    const loc={kind:'inv',i};
    mkInvSlot(hb,()=>leftClickSlot(loc),()=>rightClickSlot(loc));
    _assignLastLoc(loc);
    slotEls.hotbar.push(_allSlotEls[_allSlotEls.length-1].el);
  }
  // ── Global drag handlers ──────────────────────────────────────────────────
  document.addEventListener('mousemove',(e)=>{
    if(_dragOriginLoc&&!_isDragging){
      const dx=e.clientX-_dragOriginPos.x,dy=e.clientY-_dragOriginPos.y;
      if(Math.hypot(dx,dy)>DRAG_THRESHOLD){
        // Transition to dragging: pick up from origin slot
        _isDragging=true;
        document.body.classList.add('inv-dragging');
        if(!heldStack){
          const orig=getSlotByLoc(_dragOriginLoc);
          if(orig){setSlotByLoc(_dragOriginLoc,null);heldStack=orig;afterInvChange();updateHeldUI();}
        }
      }
    }
    if(_isDragging&&heldStack){
      // Use smooth lerp tracking
      _heldTargetX=e.clientX;_heldTargetY=e.clientY;
      if(!_heldRafId)_heldRafId=requestAnimationFrame(_animateHeld);
      // Highlight slot under cursor
      const underEl=document.elementFromPoint(e.clientX,e.clientY);
      const slotUnder=underEl&&underEl.closest('.inv-slot');
      _setDropHighlight(slotUnder||null);
    }
  });
  document.addEventListener('mouseup',(e)=>{
    _rightDragging=false;_rightDragVisited.clear();
    _setDropHighlight(null);
    if(_isDragging&&!e.target.closest('.inv-slot')){
      // Released outside any slot: return held stack to inventory
      if(heldStack){addToInventory(heldStack.id,heldStack.count);heldStack=null;afterInvChange();updateHeldUI();}
    }
    _isDragging=false;_dragOriginLoc=null;
    document.body.classList.remove('inv-dragging');
  });

  document.getElementById('btn-inventory').addEventListener('click',(e)=>{e.stopPropagation();if(started&&!player.dead)toggleInventory();});
  document.getElementById('btn-inv-close').addEventListener('click',()=>toggleInventory(false));
  document.getElementById('btn-recipes').addEventListener('click',()=>setRecipePanel(!recipePanelOpen));
  document.getElementById('btn-recipe-close').addEventListener('click',()=>setRecipePanel(false));
  document.getElementById('inventory-overlay').addEventListener('click',(e)=>{if(e.target.id==='inventory-overlay')toggleInventory(false);});
  canvas.addEventListener('click',()=>{if(!isMobile&&started&&!paused&&!inventoryOpen&&document.pointerLockElement!==canvas)lockPointer();});
}
function renderInventory(){for(let i=0;i<craftGrid.length;i++)fillSlotEl(slotEls.craft[i],craftGrid[i]);fillSlotEl(slotEls.result,craftResultNow());for(let i=9;i<INV_SIZE;i++)fillSlotEl(slotEls.main[i-9],inventory[i]);for(let i=0;i<9;i++)fillSlotEl(slotEls.hotbar[i],inventory[i]);}
function lockPointer(){try{const p=canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
function toggleInventory(force,mode){const open=force!==undefined?force:!inventoryOpen;if(open===inventoryOpen||!started||player.dead)return;inventoryOpen=open;const ov=document.getElementById('inventory-overlay');if(open){if(mode===3&&typeof ACH!=='undefined')ACH.flag('workbench');setCraftMode(mode===3?3:2);mining.active=false;resetMining();clearInterval(actionInterval);ov.style.display='flex';renderInventory();updateHeldUI();document.getElementById('recipe-panel').style.display=recipePanelOpen?'flex':'none';document.getElementById('btn-recipes').classList.toggle('active',recipePanelOpen);if(recipePanelOpen)renderRecipeBook();if(typeof buildArmorPanel==='function')buildArmorPanel();if(!isMobile&&document.pointerLockElement===canvas)document.exitPointerLock();}else{for(let i=0;i<craftGrid.length;i++){if(craftGrid[i]){addToInventory(craftGrid[i].id,craftGrid[i].count);craftGrid[i]=null;}}
if(heldStack){addToInventory(heldStack.id,heldStack.count);heldStack=null;}
updateHeldUI();ov.style.display='none';renderHotbar();scheduleInvSave();if(!isMobile)lockPointer();}}
let recipePanelOpen=false;function recipeNeeds(rec){const m=new Map();for(const row of rec.pattern)
for(const c of row)
if(c!==null&&c!==undefined)m.set(c,(m.get(c)||0)+1);return m;}
function recipeFits(rec){const w=Math.max(...rec.pattern.map(r=>r.length));return rec.pattern.length<=craftSize&&w<=craftSize;}
function countMaterial(id){let n=0;for(const s of inventory)if(s&&s.id===id)n+=s.count;for(const s of craftGrid)if(s&&s.id===id)n+=s.count;return n;}
function canCraftRecipe(rec){if(!recipeFits(rec))return false;for(const[id,n]of recipeNeeds(rec))if(countMaterial(id)<n)return false;return true;}
function consumeMaterial(id,n){let left=n;for(let i=0;i<craftGrid.length&&left>0;i++){const s=craftGrid[i];if(s&&s.id===id){const t=Math.min(s.count,left);s.count-=t;left-=t;if(s.count<=0)craftGrid[i]=null;}}
for(let i=0;i<INV_SIZE&&left>0;i++){const s=inventory[i];if(s&&s.id===id){const t=Math.min(s.count,left);s.count-=t;left-=t;if(s.count<=0)inventory[i]=null;}}}
function craftFromRecipe(rec,entryEl){if(!canCraftRecipe(rec))return;for(const[id,n]of recipeNeeds(rec))consumeMaterial(id,n);addToInventory(rec.out.id,rec.out.count);if(typeof ACH!=='undefined')ACH.track('crafted');afterInvChange();if(entryEl){entryEl.classList.add('crafted');setTimeout(()=>entryEl.classList.remove('crafted'),250);}}
function setRecipePanel(open){recipePanelOpen=open;document.getElementById('recipe-panel').style.display=open?'flex':'none';document.getElementById('btn-recipes').classList.toggle('active',open);if(open){buildRecipeTabs();renderRecipeBook();}}
let currentRecipeCat='all';function buildRecipeTabs(){const wrap=document.getElementById('recipe-tabs');if(!wrap)return;if(wrap.childElementCount>0)return;for(const cat of RECIPE_CATEGORIES){const btn=document.createElement('button');btn.className='recipe-tab'+(cat.id===currentRecipeCat?' active':'');btn.dataset.cat=cat.id;btn.innerHTML='<span class="rt-emoji">'+cat.emoji+'</span><span class="rt-name">'+cat.name+'</span>';btn.title=cat.name;btn.addEventListener('click',()=>{currentRecipeCat=cat.id;wrap.querySelectorAll('.recipe-tab').forEach(b=>b.classList.toggle('active',b.dataset.cat===cat.id));renderRecipeBook();});wrap.appendChild(btn);}}
function renderRecipeBook(){const list=document.getElementById('recipe-list');list.innerHTML='';const shown=RECIPES.filter(r=>currentRecipeCat==='all'||r.cat===currentRecipeCat);if(shown.length===0){const empty=document.createElement('li');empty.className='recipe-empty';empty.textContent='No recipes in this category';list.appendChild(empty);return;}
for(const rec of shown){const fits=recipeFits(rec);const can=canCraftRecipe(rec);const li=document.createElement('li');const btn=document.createElement('button');btn.className='recipe-entry'+(can?'':' disabled');const outIcon=document.createElement('span');outIcon.className='recipe-icon';outIcon.appendChild(makeItemNode(rec.out.id));const info=document.createElement('span');info.className='recipe-info';const nameEl=document.createElement('span');nameEl.className='recipe-name';nameEl.textContent=itemName(rec.out.id)+(rec.out.count>1?` ×${rec.out.count}`:'');const matsEl=document.createElement('span');matsEl.className='recipe-mats';for(const[id,n]of recipeNeeds(rec)){const have=countMaterial(id);const m=document.createElement('span');m.className='recipe-mat'+(have>=n?'':' missing');const ic=document.createElement('span');ic.className='recipe-mat-icon';ic.appendChild(makeItemNode(id));m.appendChild(ic);const cn=document.createElement('span');cn.textContent='×'+n;m.appendChild(cn);m.title=`${itemName(id)} x${n} (have ${have})`;matsEl.appendChild(m);}
info.appendChild(nameEl);info.appendChild(matsEl);btn.appendChild(outIcon);btn.appendChild(info);if(!fits){const badge=document.createElement('span');badge.className='recipe-badge';badge.textContent='Needs table';btn.appendChild(badge);}
btn.title=can?'Click to craft':(!fits?'Open crafting table (3×3) to craft':'Not enough materials');btn.addEventListener('click',()=>craftFromRecipe(rec,btn));li.appendChild(btn);list.appendChild(li);}}
function renderHotbar(){const bar=document.getElementById('hotbar');bar.innerHTML='';for(let i=0;i<9;i++){const slot=document.createElement('button');slot.className='hotbar-slot'+(i===selectedSlot?' selected':'');const s=inventory[i];slot.setAttribute('aria-label',s?itemName(s.id):`Empty slot ${i + 1}`);const key=document.createElement('span');key.className='slot-key';key.textContent=String(i+1);slot.appendChild(key);if(s){slot.appendChild(makeItemNode(s.id));if(s.count>1){const c=document.createElement('span');c.className='slot-count';c.textContent=s.count;slot.appendChild(c);}if(isTool(s.id))slot.appendChild(makeDurBar(s));}
slot.addEventListener('click',()=>selectSlot(i));slot.addEventListener('touchstart',(e)=>{e.preventDefault();selectSlot(i);},{passive:false});bar.appendChild(slot);}}
function selectSlot(i){selectedSlot=i;document.querySelectorAll('#hotbar .hotbar-slot').forEach((s,idx)=>s.classList.toggle('selected',idx===i));}
function refreshToolUI(){renderHotbar();if(inventoryOpen)renderInventory();scheduleInvSave();}

// =====================================================================
// CHEST UI — 27-slot shared storage at a world position
// =====================================================================
const CHEST_SIZE=27;
const _chestData={};  // key "x,y,z" -> Array(27) of stacks
let _chestOverlay=null;
let _chestOpen=false;
let _chestKey=null;

function _getChestInv(x,y,z){
  const k=`${x},${y},${z}`;
  if(!_chestData[k])_chestData[k]=new Array(CHEST_SIZE).fill(null);
  return _chestData[k];
}

function openChestUI(x,y,z){
  if(_chestOpen)closeChestUI();
  _chestKey=`${x},${y},${z}`;
  const inv=_getChestInv(x,y,z);

  // Create overlay
  const ov=document.createElement('div');
  ov.id='chest-overlay';
  ov.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:2000;display:flex;align-items:center;justify-content:center;';

  const panel=document.createElement('div');
  panel.style.cssText='background:#3a3a3a;border:3px solid #666;border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:10px;min-width:330px;';

  const header=document.createElement('div');
  header.style.cssText='display:flex;justify-content:space-between;align-items:center;color:#e0d8c0;font-family:monospace;font-size:16px;font-weight:bold;';
  header.innerHTML='<span>📦 Chest</span>';
  const closeBtn=document.createElement('button');
  closeBtn.textContent='✕';
  closeBtn.style.cssText='background:#666;color:#fff;border:none;border-radius:4px;cursor:pointer;padding:2px 8px;font-size:14px;';
  closeBtn.onclick=()=>closeChestUI();
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const grid=document.createElement('div');
  grid.style.cssText='display:grid;grid-template-columns:repeat(9,36px);gap:3px;';

  for(let i=0;i<CHEST_SIZE;i++){
    const slot=document.createElement('div');
    slot.className='inv-slot';
    slot.style.cssText='width:36px;height:36px;background:#555;border:2px solid #888;border-radius:3px;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;';
    if(inv[i])fillSlotEl(slot,inv[i]);
    slot.addEventListener('click',(e)=>{
      const s=inv[i];
      if(!heldStack){
        if(s){heldStack=s;inv[i]=null;fillSlotEl(slot,null);updateHeldUI();moveHeldTo(e.clientX,e.clientY);}
      }else{
        if(!s){inv[i]=heldStack;heldStack=null;fillSlotEl(slot,inv[i]);updateHeldUI();}
        else if(s.id===heldStack.id&&!isTool(s.id)&&s.count<STACK_MAX){
          const n=Math.min(STACK_MAX-s.count,heldStack.count);s.count+=n;heldStack.count-=n;
          if(heldStack.count<=0)heldStack=null;fillSlotEl(slot,inv[i]);updateHeldUI();
        }else{inv[i]=heldStack;heldStack=s;fillSlotEl(slot,inv[i]);updateHeldUI();moveHeldTo(e.clientX,e.clientY);}
      }
      _saveChestData();renderHotbar();
    });
    slot.addEventListener('contextmenu',(e)=>{
      e.preventDefault();
      const s=inv[i];
      if(!heldStack){
        if(s){const take=Math.ceil(s.count/2);heldStack={id:s.id,count:take};s.count-=take;if(s.count<=0)inv[i]=null;fillSlotEl(slot,inv[i]);updateHeldUI();moveHeldTo(e.clientX,e.clientY);}
      }else{
        if(!s){inv[i]={id:heldStack.id,count:1};heldStack.count--;if(heldStack.count<=0)heldStack=null;fillSlotEl(slot,inv[i]);updateHeldUI();}
      }
      _saveChestData();
    });
    grid.appendChild(slot);
  }
  panel.appendChild(grid);

  const plabel=document.createElement('div');
  plabel.style.cssText='color:#b0a890;font-family:monospace;font-size:12px;text-align:center;';
  plabel.textContent='Click to take/place • Right-click for half';
  panel.appendChild(plabel);
  ov.appendChild(panel);
  ov.addEventListener('click',(e)=>{if(e.target===ov)closeChestUI();});
  document.body.appendChild(ov);
  _chestOverlay=ov;
  _chestOpen=true;

  if(!isMobile&&document.pointerLockElement)document.exitPointerLock();
}

function closeChestUI(){
  if(!_chestOpen)return;
  if(heldStack){addToInventory(heldStack.id,heldStack.count);heldStack=null;updateHeldUI();}
  _chestOverlay&&_chestOverlay.remove();
  _chestOverlay=null;_chestOpen=false;_chestKey=null;
  renderHotbar();
  if(!isMobile)try{const p=document.getElementById('game-canvas');if(p)p.requestPointerLock&&p.requestPointerLock();}catch(e){}
}

function _saveChestData(){
  try{WORLDS.setItem('chests',JSON.stringify(_chestData));}catch(e){}
}
function loadChestData(){
  try{const d=JSON.parse(WORLDS.getItem('chests')||'null');if(d&&typeof d==='object'){for(const k in d){const arr=d[k];if(Array.isArray(arr)){_chestData[k]=arr.map(s=>{if(!s||typeof s.id!=='number'||s.count<=0)return null;return{id:s.id,count:Math.min(STACK_MAX,s.count)};});}}}}catch(e){}
}

// =====================================================================
// FURNACE UI — Smelting interface with input/fuel/output slots
// =====================================================================
const _furnaceData={};  // key "x,y,z" → {input:stack|null, fuel:stack|null, output:stack|null, progress:0, smeltTimer:0}
let _furnaceOverlay=null;
let _furnaceOpen=false;
let _furnaceKey=null;
let _furnaceInterval=null;

// Smelt recipes: input block/item ID → output block/item ID + xp
const SMELT_RECIPES=[
  {in:B.IRON_ORE,  out:{id:B.COPPER,count:1},    xp:0.7, name:'Iron Ingot'},
  {in:B.GOLD_ORE,  out:{id:B.GOLD_ORE,count:1},   xp:1.0, name:'Gold Ingot'},
  {in:B.SAND,      out:{id:B.GLASS,count:1},       xp:0.1, name:'Glass'},
  {in:B.COBBLE,    out:{id:B.STONE,count:1},        xp:0.1, name:'Stone'},
  {in:B.STONE_BRICK,out:{id:B.CRACKED_BRICK,count:1},xp:0.1,name:'Cracked Stone Brick'},
  {in:ITEM_FISH,   out:{id:ITEM_COOKED_FISH,count:1},xp:0.35,name:'Cooked Fish'},
  {in:ITEM_PORKCHOP,out:{id:ITEM_PORKCHOP,count:1}, xp:0.35,name:'Cooked Porkchop'},
  {in:ITEM_BEEF,   out:{id:ITEM_BEEF,count:1},      xp:0.35,name:'Cooked Beef'},
  {in:ITEM_CHICKEN,out:{id:ITEM_CHICKEN,count:1},   xp:0.35,name:'Cooked Chicken'},
  {in:ITEM_POTATO, out:{id:ITEM_BAKED_POTATO,count:1},xp:0.35,name:'Baked Potato'},
  {in:B.CLAY,      out:{id:B.TERRACOTTA,count:1},   xp:0.35,name:'Terracotta'},
  {in:B.WOOD_PLANK,out:{id:B.WOOD_PLANK,count:1},  xp:0.15,name:'Charcoal'},
  {in:B.LOG,       out:{id:B.COAL_ORE,count:1},     xp:0.15,name:'Charcoal'},
];

// Fuel items (smelt time in seconds each provides)
const FURNACE_FUELS={
  [B.COAL_ORE]: {secs:80, label:'Coal'},
  [B.LOG]:      {secs:15, label:'Log'},
  [B.PLANKS]:   {secs:15, label:'Planks'},
  [B.BIRCH_LOG]:{secs:15, label:'Birch Log'},
  [B.SPRUCE_LOG]:{secs:15,label:'Spruce Log'},
  [B.BAMBOO]:   {secs:2.5,label:'Bamboo'},
  [ITEM_STICK]: {secs:5,  label:'Stick'},
};

const SMELT_TIME=10; // seconds per item

function _getFurnaceData(x,y,z){
  const k=`${x},${y},${z}`;
  if(!_furnaceData[k])_furnaceData[k]={input:null,fuel:null,output:null,progress:0,fuelLeft:0,burning:false};
  return _furnaceData[k];
}

function _getSmeltRecipe(id){return SMELT_RECIPES.find(r=>r.in===id)||null;}

function openFurnaceUI(x,y,z){
  if(_furnaceOpen)closeFurnaceUI();
  _furnaceKey=`${x},${y},${z}`;
  const fd=_getFurnaceData(x,y,z);
  const ov=document.createElement('div');
  ov.id='furnace-overlay';
  ov.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:2000;display:flex;align-items:center;justify-content:center;';

  const panel=document.createElement('div');
  panel.style.cssText='background:#3a2f25;border:3px solid #8b6040;border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:12px;min-width:320px;font-family:monospace;';

  // Header
  const header=document.createElement('div');
  header.style.cssText='display:flex;justify-content:space-between;align-items:center;color:#f5dfa0;font-size:17px;font-weight:bold;';
  header.innerHTML='<span>🔥 Furnace</span>';
  const closeBtn=document.createElement('button');
  closeBtn.textContent='✕';closeBtn.style.cssText='background:#5a3a2a;color:#fff;border:none;border-radius:4px;cursor:pointer;padding:2px 8px;font-size:14px;';
  closeBtn.onclick=()=>closeFurnaceUI();
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // Main smelting area
  const smeltArea=document.createElement('div');
  smeltArea.style.cssText='display:flex;align-items:center;gap:10px;justify-content:center;';

  // Left column: input + fuel
  const leftCol=document.createElement('div');
  leftCol.style.cssText='display:flex;flex-direction:column;gap:6px;align-items:center;';

  // Input slot
  const inputLabel=document.createElement('div');
  inputLabel.textContent='Input';inputLabel.style.cssText='color:#c8b090;font-size:11px;';
  leftCol.appendChild(inputLabel);
  const inputSlot=document.createElement('div');
  inputSlot.className='inv-slot';
  inputSlot.style.cssText='width:44px;height:44px;background:#4a3020;border:2px solid #8b6040;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;font-size:20px;';
  if(fd.input)fillSlotEl(inputSlot,fd.input);
  leftCol.appendChild(inputSlot);

  // Fuel slot
  const fuelLabel=document.createElement('div');
  fuelLabel.textContent='🔥 Fuel';fuelLabel.style.cssText='color:#c8b090;font-size:11px;margin-top:4px;';
  leftCol.appendChild(fuelLabel);
  const fuelSlot=document.createElement('div');
  fuelSlot.className='inv-slot';
  fuelSlot.style.cssText='width:44px;height:44px;background:#4a3020;border:2px solid #8b6040;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;font-size:20px;';
  if(fd.fuel)fillSlotEl(fuelSlot,fd.fuel);
  leftCol.appendChild(fuelSlot);
  smeltArea.appendChild(leftCol);

  // Progress area
  const progCol=document.createElement('div');
  progCol.style.cssText='display:flex;flex-direction:column;align-items:center;gap:4px;';
  const progArrow=document.createElement('div');
  progArrow.style.cssText='font-size:22px;color:#f5a030;';progArrow.textContent='➜';
  const progBar=document.createElement('div');
  progBar.style.cssText='width:60px;height:10px;background:#2a1a0a;border:1px solid #5a3a1a;border-radius:4px;overflow:hidden;';
  const progFill=document.createElement('div');
  progFill.id='furnace-prog-fill';
  progFill.style.cssText=`height:100%;width:${Math.round(fd.progress*100)}%;background:#f5a030;transition:width 0.5s;`;
  progBar.appendChild(progFill);
  const burnIcon=document.createElement('div');
  burnIcon.id='furnace-burn-icon';
  burnIcon.style.cssText='font-size:16px;margin-top:2px;';
  burnIcon.textContent=fd.burning?'🔥':'';
  progCol.appendChild(progArrow);
  progCol.appendChild(progBar);
  progCol.appendChild(burnIcon);
  smeltArea.appendChild(progCol);

  // Output slot
  const outCol=document.createElement('div');
  outCol.style.cssText='display:flex;flex-direction:column;align-items:center;gap:6px;';
  const outLabel=document.createElement('div');
  outLabel.textContent='Output';outLabel.style.cssText='color:#c8b090;font-size:11px;';
  outCol.appendChild(outLabel);
  const outSlot=document.createElement('div');
  outSlot.className='inv-slot';
  outSlot.style.cssText='width:44px;height:44px;background:#2a2a2a;border:2px solid #8b6040;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;font-size:20px;';
  if(fd.output)fillSlotEl(outSlot,fd.output);
  outCol.appendChild(outSlot);
  smeltArea.appendChild(outCol);
  panel.appendChild(smeltArea);

  // Status label
  const statusLabel=document.createElement('div');
  statusLabel.id='furnace-status';
  statusLabel.style.cssText='color:#a09070;font-size:12px;text-align:center;';
  statusLabel.textContent=fd.burning?'Smelting...':(!fd.fuelLeft?'No fuel':'Ready');
  panel.appendChild(statusLabel);

  // Hint
  const hint=document.createElement('div');
  hint.style.cssText='color:#706050;font-size:11px;text-align:center;';
  hint.textContent='Click input/output to transfer items • Add fuel to smelt';
  panel.appendChild(hint);

  ov.appendChild(panel);
  ov.addEventListener('click',(e)=>{if(e.target===ov)closeFurnaceUI();});
  document.body.appendChild(ov);
  _furnaceOverlay=ov;
  _furnaceOpen=true;
  if(!isMobile&&document.pointerLockElement)document.exitPointerLock();

  // Slot click handlers
  function slotClick(slot,getVal,setVal,acceptFn){
    slot.addEventListener('click',()=>{
      const s=getVal();
      if(!heldStack){
        if(s){heldStack=s;setVal(null);fillSlotEl(slot,null);updateHeldUI();}
      }else{
        if(acceptFn&&!acceptFn(heldStack.id)){return;}
        if(!s){setVal({...heldStack});heldStack=null;fillSlotEl(slot,getVal());updateHeldUI();}
        else if(s.id===heldStack.id&&!isTool(s.id)&&s.count<STACK_MAX){
          const n=Math.min(STACK_MAX-s.count,heldStack.count);s.count+=n;heldStack.count-=n;
          if(heldStack.count<=0)heldStack=null;fillSlotEl(slot,s);updateHeldUI();
        }else{setVal(heldStack);heldStack=s;fillSlotEl(slot,getVal());updateHeldUI();}
      }
      _saveFurnaceData();_refreshFurnaceStatus();renderHotbar();
    });
  }
  slotClick(inputSlot,()=>fd.input,(v)=>{fd.input=v;},null);
  slotClick(fuelSlot,()=>fd.fuel,(v)=>{fd.fuel=v;},(id)=>!!(FURNACE_FUELS[id]));
  // Output: only take, don't place
  outSlot.addEventListener('click',()=>{
    if(!fd.output)return;
    if(!heldStack){heldStack=fd.output;fd.output=null;fillSlotEl(outSlot,null);updateHeldUI();}
    else if(heldStack.id===fd.output.id&&heldStack.count<STACK_MAX){
      const n=Math.min(STACK_MAX-heldStack.count,fd.output.count);heldStack.count+=n;fd.output.count-=n;
      if(fd.output.count<=0)fd.output=null;fillSlotEl(outSlot,fd.output);updateHeldUI();
    }
    _saveFurnaceData();renderHotbar();
  });

  // Tick the furnace every second
  _furnaceInterval=setInterval(()=>_tickFurnace(x,y,z),1000);
}

function _refreshFurnaceStatus(){
  if(!_furnaceOpen)return;
  const fd=_furnaceData[_furnaceKey];if(!fd)return;
  const pf=document.getElementById('furnace-prog-fill');
  if(pf)pf.style.width=Math.round(fd.progress*100)+'%';
  const bi=document.getElementById('furnace-burn-icon');
  if(bi)bi.textContent=fd.burning?'🔥':'';
  const sl=document.getElementById('furnace-status');
  if(sl)sl.textContent=fd.burning?'Smelting...':(fd.fuelLeft>0?'Ready — add input':'No fuel');
}

function _tickFurnace(x,y,z){
  const fd=_getFurnaceData(x,y,z);
  // Consume fuel if empty
  if(fd.fuelLeft<=0&&fd.fuel&&FURNACE_FUELS[fd.fuel.id]){
    fd.fuelLeft=FURNACE_FUELS[fd.fuel.id].secs;
    fd.fuel.count--;if(fd.fuel.count<=0)fd.fuel=null;
    fd.burning=true;
  }
  if(fd.fuelLeft<=0){fd.burning=false;fd.progress=0;_saveFurnaceData();_refreshFurnaceStatus();return;}
  fd.fuelLeft=Math.max(0,fd.fuelLeft-1);
  // Try to smelt
  if(fd.input){
    const recipe=_getSmeltRecipe(fd.input.id);
    if(recipe){
      fd.progress=Math.min(1,fd.progress+1/SMELT_TIME);
      if(fd.progress>=1){
        fd.progress=0;
        // Move result to output
        if(!fd.output){fd.output={id:recipe.out.id,count:1};}
        else if(fd.output.id===recipe.out.id&&fd.output.count<STACK_MAX){fd.output.count++;}
        fd.input.count--;if(fd.input.count<=0)fd.input=null;
        if(typeof XP!=='undefined'&&XP.add)XP.add(Math.round(recipe.xp*10));
      }
    }else{fd.progress=0;}
  }else{fd.progress=0;}
  _saveFurnaceData();_refreshFurnaceStatus();
}

function closeFurnaceUI(){
  if(!_furnaceOpen)return;
  clearInterval(_furnaceInterval);_furnaceInterval=null;
  if(heldStack){addToInventory(heldStack.id,heldStack.count);heldStack=null;updateHeldUI();}
  _furnaceOverlay&&_furnaceOverlay.remove();
  _furnaceOverlay=null;_furnaceOpen=false;_furnaceKey=null;
  renderHotbar();
  if(!isMobile)try{const p=document.getElementById('game-canvas');if(p)p.requestPointerLock&&p.requestPointerLock();}catch(e){}
}

function _saveFurnaceData(){
  try{WORLDS.setItem('furnaces',JSON.stringify(_furnaceData));}catch(e){}
}
function loadFurnaceData(){
  try{const d=JSON.parse(WORLDS.getItem('furnaces')||'null');if(d&&typeof d==='object'){for(const k in d){_furnaceData[k]=d[k];}}}catch(e){}
}

function updateVitalsUI(){const hearts=document.getElementById('hearts');const hunger=document.getElementById('hunger');let h='';for(let i=0;i<10;i++){const v=player.hp-i*2;let cls='empty';if(v>=2)cls='full';else if(v>=1)cls='half';h+=`<span class="${cls}">♥</span>`;}hearts.innerHTML=h;let g='';for(let i=0;i<10;i++){const v=player.hunger-i*2;let cls='empty';if(v>=2)cls='full';else if(v>=1)cls='half';g+=`<span class="${cls}">🍗</span>`;}hunger.innerHTML=g;}
