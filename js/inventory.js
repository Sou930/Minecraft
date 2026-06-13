const INV_SIZE=36;let inventory=new Array(INV_SIZE).fill(null);let craftSize=2;let craftGrid=new Array(craftSize*craftSize).fill(null);let heldStack=null;let inventoryOpen=false;function loadInventory(){try{const d=JSON.parse(localStorage.getItem('bw_inventory')||'null');if(Array.isArray(d)&&d.length===INV_SIZE)
inventory=d.map(s=>(s&&typeof s.id==='number'&&s.count>0)?{id:s.id,count:Math.min(STACK_MAX,s.count)}:null);}catch(e){}}
let invSaveTimer=null;function scheduleInvSave(){clearTimeout(invSaveTimer);invSaveTimer=setTimeout(()=>{try{localStorage.setItem('bw_inventory',JSON.stringify(inventory));}catch(e){}},400);}
function itemName(id){return ITEMS[id]?ITEMS[id].name:(BLOCKS[id]?BLOCKS[id].name:'?');}
function addToInventory(id,count){let left=count;for(let i=0;i<INV_SIZE&&left>0;i++){const s=inventory[i];if(s&&s.id===id&&s.count<STACK_MAX){const n=Math.min(STACK_MAX-s.count,left);s.count+=n;left-=n;}}
for(let i=0;i<INV_SIZE&&left>0;i++){if(!inventory[i]){const n=Math.min(STACK_MAX,left);inventory[i]={id,count:n};left-=n;}}
renderHotbar();if(inventoryOpen)renderInventory();scheduleInvSave();return left;}
function consumeFromSlot(i,n){const s=inventory[i];if(!s)return;s.count-=n;if(s.count<=0)inventory[i]=null;renderHotbar();if(inventoryOpen)renderInventory();scheduleInvSave();}
function makeItemNode(id){if(ITEMS[id]){const em=document.createElement('span');em.className='item-emoji';em.textContent=ITEMS[id].emoji;return em;}
const c=document.createElement('canvas');c.width=32;c.height=32;const ictx=c.getContext('2d');ictx.imageSmoothingEnabled=false;const def=BLOCKS[id];const tile=def.all!==undefined?def.all:def.side;ictx.drawImage(atlasCanvas,(tile%ATLAS_TILES)*TILE_PX,Math.floor(tile/ATLAS_TILES)*TILE_PX,TILE_PX,TILE_PX,0,0,32,32);return c;}
function fillSlotEl(el,stack){el.innerHTML='';el.title='';if(!stack)return;el.appendChild(makeItemNode(stack.id));if(stack.count>1){const cnt=document.createElement('span');cnt.className='slot-count';cnt.textContent=stack.count;el.appendChild(cnt);}
el.title=itemName(stack.id);}
function craftResultNow(){const n=craftSize;const ids=craftGrid.map(s=>s?s.id:null);let minR=n,maxR=-1,minC=n,maxC=-1;for(let r=0;r<n;r++)for(let c=0;c<n;c++){if(ids[r*n+c]!==null){minR=Math.min(minR,r);maxR=Math.max(maxR,r);minC=Math.min(minC,c);maxC=Math.max(maxC,c);}}
if(maxR<0)return null;const h=maxR-minR+1,w=maxC-minC+1;for(const rec of RECIPES){if(rec.pattern.length!==h||rec.pattern[0].length!==w)continue;let ok=true;for(let r=0;r<h&&ok;r++)
for(let c=0;c<w&&ok;c++)
if((rec.pattern[r][c]??null)!==ids[(minR+r)*n+(minC+c)])ok=false;if(ok)return{id:rec.out.id,count:rec.out.count};}
return null;}
function getSlotByLoc(loc){return loc.kind==='inv'?inventory[loc.i]:craftGrid[loc.i];}
function setSlotByLoc(loc,s){if(loc.kind==='inv')inventory[loc.i]=s;else craftGrid[loc.i]=s;}
function leftClickSlot(loc){const s=getSlotByLoc(loc);if(!heldStack){if(s){setSlotByLoc(loc,null);heldStack=s;}}else if(!s){setSlotByLoc(loc,heldStack);heldStack=null;}else if(s.id===heldStack.id&&s.count<STACK_MAX){const n=Math.min(STACK_MAX-s.count,heldStack.count);s.count+=n;heldStack.count-=n;if(heldStack.count<=0)heldStack=null;}else{setSlotByLoc(loc,heldStack);heldStack=s;}
afterInvChange();}
function rightClickSlot(loc){const s=getSlotByLoc(loc);if(!heldStack){if(s){const take=Math.ceil(s.count/2);heldStack={id:s.id,count:take};s.count-=take;if(s.count<=0)setSlotByLoc(loc,null);}}else{if(!s){setSlotByLoc(loc,{id:heldStack.id,count:1});heldStack.count--;}
else if(s.id===heldStack.id&&s.count<STACK_MAX){s.count++;heldStack.count--;}
if(heldStack&&heldStack.count<=0)heldStack=null;}
afterInvChange();}
function takeCraftResult(){const out=craftResultNow();if(!out)return;if(heldStack){if(heldStack.id!==out.id||heldStack.count+out.count>STACK_MAX)return;heldStack.count+=out.count;}else{heldStack=out;}
for(let i=0;i<craftGrid.length;i++){if(craftGrid[i]){craftGrid[i].count--;if(craftGrid[i].count<=0)craftGrid[i]=null;}}
if(typeof ACH!=='undefined')ACH.track('crafted');afterInvChange();}
function afterInvChange(){renderInventory();renderHotbar();updateHeldUI();scheduleInvSave();if(recipePanelOpen&&inventoryOpen)renderRecipeBook();}
const heldEl=document.getElementById('held-item');function updateHeldUI(){heldEl.innerHTML='';if(heldStack){heldEl.appendChild(makeItemNode(heldStack.id));if(heldStack.count>1){const c=document.createElement('span');c.className='slot-count';c.textContent=heldStack.count;heldEl.appendChild(c);}
heldEl.style.display='block';}else{heldEl.style.display='none';}}
function moveHeldTo(x,y){heldEl.style.left=x+'px';heldEl.style.top=y+'px';}
document.addEventListener('pointermove',(e)=>{if(heldStack)moveHeldTo(e.clientX,e.clientY);});const slotEls={craft:[],result:null,main:[],hotbar:[]};function mkInvSlot(parent,onLeft,onRight){const el=document.createElement('div');el.className='inv-slot';
// モバイル: スロットをタップしたら左クリックと同じ「手持ち(held)へ移動/配置」を
// 行う。タッチではポインタ移動で held が追従しないので、タップ座標へ held を
// 移動してから処理する。touchend で処理した直後の合成 click は無視する。
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
el.addEventListener('click',(e)=>{if(touchHandled)return;moveHeldTo(e.clientX,e.clientY);onLeft();});
el.addEventListener('contextmenu',(e)=>{e.preventDefault();moveHeldTo(e.clientX,e.clientY);onRight();});parent.appendChild(el);return el;}
function buildCraftGrid(){const craftWrap=document.getElementById('craft-grid');craftWrap.innerHTML='';craftWrap.classList.toggle('size-3',craftSize===3);slotEls.craft=[];for(let i=0;i<craftSize*craftSize;i++){const loc={kind:'craft',i};slotEls.craft.push(mkInvSlot(craftWrap,()=>leftClickSlot(loc),()=>rightClickSlot(loc)));}
document.getElementById('craft-label').textContent=craftSize===3?'作業台（3×3）':'クラフト（2×2）';document.querySelector('#inventory-header h2').textContent=craftSize===3?'作業台':'インベントリ';}
function setCraftMode(n){if(craftSize!==n){for(let i=0;i<craftGrid.length;i++){if(craftGrid[i]){addToInventory(craftGrid[i].id,craftGrid[i].count);craftGrid[i]=null;}}
craftSize=n;craftGrid=new Array(n*n).fill(null);}
buildCraftGrid();}
function createInventoryUI(){const mkSlot=mkInvSlot;buildCraftGrid();slotEls.result=mkSlot(document.getElementById('craft-result'),takeCraftResult,takeCraftResult);const main=document.getElementById('inv-main');for(let i=9;i<INV_SIZE;i++){const loc={kind:'inv',i};slotEls.main.push(mkSlot(main,()=>leftClickSlot(loc),()=>rightClickSlot(loc)));}
const hb=document.getElementById('inv-hotbar');for(let i=0;i<9;i++){const loc={kind:'inv',i};slotEls.hotbar.push(mkSlot(hb,()=>leftClickSlot(loc),()=>rightClickSlot(loc)));}
document.getElementById('btn-inventory').addEventListener('click',(e)=>{e.stopPropagation();if(started&&!player.dead)toggleInventory();});document.getElementById('btn-inv-close').addEventListener('click',()=>toggleInventory(false));document.getElementById('btn-recipes').addEventListener('click',()=>setRecipePanel(!recipePanelOpen));document.getElementById('btn-recipe-close').addEventListener('click',()=>setRecipePanel(false));document.getElementById('inventory-overlay').addEventListener('click',(e)=>{if(e.target.id==='inventory-overlay')toggleInventory(false);});canvas.addEventListener('click',()=>{if(!isMobile&&started&&!paused&&!inventoryOpen&&document.pointerLockElement!==canvas)lockPointer();});}
function renderInventory(){for(let i=0;i<craftGrid.length;i++)fillSlotEl(slotEls.craft[i],craftGrid[i]);fillSlotEl(slotEls.result,craftResultNow());for(let i=9;i<INV_SIZE;i++)fillSlotEl(slotEls.main[i-9],inventory[i]);for(let i=0;i<9;i++)fillSlotEl(slotEls.hotbar[i],inventory[i]);}
function lockPointer(){try{const p=canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
function toggleInventory(force,mode){const open=force!==undefined?force:!inventoryOpen;if(open===inventoryOpen||!started||player.dead)return;inventoryOpen=open;const ov=document.getElementById('inventory-overlay');if(open){if(mode===3&&typeof ACH!=='undefined')ACH.flag('workbench');setCraftMode(mode===3?3:2);mining.active=false;resetMining();clearInterval(actionInterval);ov.style.display='flex';renderInventory();updateHeldUI();document.getElementById('recipe-panel').style.display=recipePanelOpen?'flex':'none';document.getElementById('btn-recipes').classList.toggle('active',recipePanelOpen);if(recipePanelOpen)renderRecipeBook();if(!isMobile&&document.pointerLockElement===canvas)document.exitPointerLock();}else{for(let i=0;i<craftGrid.length;i++){if(craftGrid[i]){addToInventory(craftGrid[i].id,craftGrid[i].count);craftGrid[i]=null;}}
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
function renderRecipeBook(){const list=document.getElementById('recipe-list');list.innerHTML='';const shown=RECIPES.filter(r=>currentRecipeCat==='all'||r.cat===currentRecipeCat);if(shown.length===0){const empty=document.createElement('li');empty.className='recipe-empty';empty.textContent='このカテゴリのレシピはありません';list.appendChild(empty);return;}
for(const rec of shown){const fits=recipeFits(rec);const can=canCraftRecipe(rec);const li=document.createElement('li');const btn=document.createElement('button');btn.className='recipe-entry'+(can?'':' disabled');const outIcon=document.createElement('span');outIcon.className='recipe-icon';outIcon.appendChild(makeItemNode(rec.out.id));const info=document.createElement('span');info.className='recipe-info';const nameEl=document.createElement('span');nameEl.className='recipe-name';nameEl.textContent=itemName(rec.out.id)+(rec.out.count>1?` ×${rec.out.count}`:'');const matsEl=document.createElement('span');matsEl.className='recipe-mats';for(const[id,n]of recipeNeeds(rec)){const have=countMaterial(id);const m=document.createElement('span');m.className='recipe-mat'+(have>=n?'':' missing');const ic=document.createElement('span');ic.className='recipe-mat-icon';ic.appendChild(makeItemNode(id));m.appendChild(ic);const cn=document.createElement('span');cn.textContent='×'+n;m.appendChild(cn);m.title=`${itemName(id)} ×${n}（所持 ${have}）`;matsEl.appendChild(m);}
info.appendChild(nameEl);info.appendChild(matsEl);btn.appendChild(outIcon);btn.appendChild(info);if(!fits){const badge=document.createElement('span');badge.className='recipe-badge';badge.textContent='要作業台';btn.appendChild(badge);}
btn.title=can?'クリックでクラフト':(!fits?'作業台（3×3）を右クリックで開くとクラフトできます':'材料が足りません');btn.addEventListener('click',()=>craftFromRecipe(rec,btn));li.appendChild(btn);list.appendChild(li);}}
function renderHotbar(){const bar=document.getElementById('hotbar');bar.innerHTML='';for(let i=0;i<9;i++){const slot=document.createElement('button');slot.className='hotbar-slot'+(i===selectedSlot?' selected':'');const s=inventory[i];slot.setAttribute('aria-label',s?itemName(s.id):`空きスロット${i + 1}`);const key=document.createElement('span');key.className='slot-key';key.textContent=String(i+1);slot.appendChild(key);if(s){slot.appendChild(makeItemNode(s.id));if(s.count>1){const c=document.createElement('span');c.className='slot-count';c.textContent=s.count;slot.appendChild(c);}}
slot.addEventListener('click',()=>selectSlot(i));slot.addEventListener('touchstart',(e)=>{e.preventDefault();selectSlot(i);},{passive:false});bar.appendChild(slot);}}
function selectSlot(i){selectedSlot=i;document.querySelectorAll('#hotbar .hotbar-slot').forEach((s,idx)=>s.classList.toggle('selected',idx===i));}
function updateVitalsUI(){const hearts=document.getElementById('hearts');const hunger=document.getElementById('hunger');let h='';for(let i=0;i<10;i++)h+=`<span class="${i < Math.ceil(player.hp / 2) ? 'full' : 'empty'}">♥</span>`;hearts.innerHTML=h;let g='';for(let i=0;i<10;i++)g+=`<span class="${i < Math.ceil(player.hunger / 2) ? 'full' : 'empty'}">🍗</span>`;hunger.innerHTML=g;}
