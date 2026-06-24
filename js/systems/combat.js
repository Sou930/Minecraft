"use strict";
// ============================================================
//  COMBAT SYSTEMS: Armor, Shield, Bow/Crossbow, Status Effects, Potions
// ============================================================

// ---- Item ID ranges ----
// Armor: 300-324 (5 slots × 5 materials)
// Shield: 325-329 (5 dye colors)
// Bow/Crossbow: 330-335
// Arrows: 336-338
// Potions: 340-360
// Brewing materials: 361-370
// Blaze Rod / Nether Wart: 371-372

// ============================================================
//  ARMOR SYSTEM
// ============================================================
const ARMOR_SLOTS = ['helmet','chestplate','leggings','boots'];
const ARMOR_EMOJIS = {helmet:'⛑️',chestplate:'🦺',leggings:'👖',boots:'👟'};
const ARMOR_MATS = ['leather','iron','gold','diamond','netherite'];
const ARMOR_MAT_DEFS = {
  leather:   {name:'Leather',    color:'#9c6b3c', durability:55,  defense:{helmet:1,chestplate:3,leggings:2,boots:1}, emoji:'🟫'},
  iron:      {name:'Iron',       color:'#d8d8d8', durability:165, defense:{helmet:2,chestplate:6,leggings:5,boots:2}, emoji:'⬜'},
  gold:      {name:'Golden',     color:'#f7d24a', durability:77,  defense:{helmet:2,chestplate:5,leggings:3,boots:1}, emoji:'🟡'},
  diamond:   {name:'Diamond',    color:'#4fe6df', durability:363, defense:{helmet:3,chestplate:8,leggings:6,boots:3}, emoji:'💎'},
  netherite: {name:'Netherite',  color:'#4a4a4a', durability:407, defense:{helmet:3,chestplate:8,leggings:6,boots:3}, emoji:'⬛'},
};
const ARMOR_SLOT_PIECES = ['helmet','chestplate','leggings','boots'];
// Item IDs: armorId(mat_index, slot_index)
// mat: leather=0, iron=1, gold=2, diamond=3, netherite=4
// slot: helmet=0, chestplate=1, leggings=2, boots=3
function armorItemId(matIdx, slotIdx){ return 300 + matIdx * 4 + slotIdx; }

// Register all armor items
(function registerArmor(){
  const mats = ARMOR_MATS;
  const slots = ARMOR_SLOT_PIECES;
  for(let m=0;m<mats.length;m++){
    for(let s=0;s<slots.length;s++){
      const id = armorItemId(m,s);
      const mat = mats[m];
      const slot = slots[s];
      const matDef = ARMOR_MAT_DEFS[mat];
      ITEMS[id] = {
        name: matDef.name + ' ' + slot.charAt(0).toUpperCase() + slot.slice(1),
        emoji: ARMOR_EMOJIS[slot],
        armor: true,
        armorSlot: slot,
        armorMat: mat,
        defense: matDef.defense[slot],
        maxDur: matDef.durability,
        dur: matDef.durability,
        toolColor: matDef.color,
        armorMatEmoji: matDef.emoji,
      };
    }
  }
})();

// Equipped armor slots
let equippedArmor = {helmet:null, chestplate:null, leggings:null, boots:null};

function getTotalDefense(){
  let total = 0;
  for(const slot of ARMOR_SLOT_PIECES){
    const s = equippedArmor[slot];
    if(s && ITEMS[s.id]){
      total += ITEMS[s.id].defense || 0;
    }
  }
  return total;
}

// Apply armor damage reduction (Minecraft formula: dmg * (1 - defense/25))
function applyArmorReduction(rawDmg){
  if(typeof STATUS_EFFECTS !== 'undefined' && STATUS_EFFECTS.has('fire_resistance')){
    // Fire resistance makes lava immune
  }
  const def = getTotalDefense();
  const reduction = Math.min(0.8, def / 25);
  return rawDmg * (1 - reduction);
}

// Damage armor on hit
function damageArmor(rawDmg){
  for(const slot of ARMOR_SLOT_PIECES){
    const s = equippedArmor[slot];
    if(!s) continue;
    s.dur = (s.dur || 0) - 1;
    if(s.dur <= 0){
      equippedArmor[slot] = null;
      showCombatMsg(`${slot} broke!`);
    }
  }
  saveArmorToInventory();
}

function saveArmorToInventory(){
  // Persist equipped armor back (they live outside main inventory)
  try{
    const d = {};
    for(const slot of ARMOR_SLOT_PIECES) d[slot] = equippedArmor[slot];
    if(typeof WORLDS !== 'undefined') WORLDS.setItem('equipped_armor', JSON.stringify(d));
  }catch(e){}
}

function loadArmorFromSave(){
  try{
    const raw = typeof WORLDS !== 'undefined' ? WORLDS.getItem('equipped_armor') : null;
    if(!raw) return;
    const d = JSON.parse(raw);
    for(const slot of ARMOR_SLOT_PIECES){
      if(d[slot] && typeof d[slot].id === 'number' && ITEMS[d[slot].id]){
        equippedArmor[slot] = d[slot];
      }
    }
  }catch(e){}
}

// ---- Armor crafting recipes ----
(function addArmorRecipes(){
  const matSrc = {
    leather:   ITEM_LEATHER,
    iron:      B.IRON_ORE,
    gold:      B.GOLD_ORE,
    diamond:   B.DIAMOND_ORE,
    netherite: B.OBSIDIAN, // proxy for netherite ingot
  };
  const mats = ARMOR_MATS;
  // Helmet: 5 in T+side shape
  // Chestplate: 8 surrounding
  // Leggings: 7 in upside-down T shape
  // Boots: 4 in U shape
  for(let m=0;m<mats.length;m++){
    const mat = mats[m];
    const src = matSrc[mat];
    const H = armorItemId(m,0); // helmet
    const C = armorItemId(m,1); // chestplate
    const L = armorItemId(m,2); // leggings
    const Bo= armorItemId(m,3); // boots
    RECIPES.push({cat:'tools',pattern:[[src,src,src],[src,null,src]],out:{id:H,count:1}});
    RECIPES.push({cat:'tools',pattern:[[src,null,src],[src,src,src],[src,src,src]],out:{id:C,count:1}});
    RECIPES.push({cat:'tools',pattern:[[src,src,src],[src,null,src],[src,null,src]],out:{id:L,count:1}});
    RECIPES.push({cat:'tools',pattern:[[src,null,src],[src,null,src]],out:{id:Bo,count:1}});
  }
})();

// ============================================================
//  SHIELD SYSTEM
// ============================================================
const ITEM_SHIELD_BASE = 325;
const SHIELD_COLORS = [
  {name:'Shield',         color:'#8B4513', emoji:'🛡️'},
  {name:'Red Shield',     color:'#cc2222', emoji:'🛡️'},
  {name:'Blue Shield',    color:'#2244cc', emoji:'🛡️'},
  {name:'Green Shield',   color:'#228822', emoji:'🛡️'},
  {name:'Gold Shield',    color:'#f7d24a', emoji:'🛡️'},
];

for(let i=0;i<SHIELD_COLORS.length;i++){
  const sc = SHIELD_COLORS[i];
  ITEMS[ITEM_SHIELD_BASE+i] = {
    name: sc.name,
    emoji: sc.emoji,
    shield: true,
    shieldColor: sc.color,
    maxDur: 336,
    dur: 336,
    toolColor: sc.color,
  };
}

// Shield base crafting: 6 planks + 1 iron
RECIPES.push({cat:'tools',pattern:[[B.PLANKS,B.IRON_ORE,B.PLANKS],[B.PLANKS,B.PLANKS,B.PLANKS],[null,B.PLANKS,null]],out:{id:ITEM_SHIELD_BASE,count:1}});
// Dyed shields
const SHIELD_DYE_SRCS = [B.FLOWER_POPPY, B.FLOWER_CORNFLOWER, B.MOSS, B.GOLD_ORE];
for(let i=0;i<SHIELD_DYE_SRCS.length;i++){
  RECIPES.push({cat:'tools',pattern:[[ITEM_SHIELD_BASE,SHIELD_DYE_SRCS[i]]],out:{id:ITEM_SHIELD_BASE+1+i,count:1}});
}

// Shield blocking state
let shieldBlocking = false;
let shieldCooldown = 0;
const SHIELD_BLOCK_REDUCTION = 0.85; // blocks 85% damage

function tryShieldBlock(){
  const slot = inventory[selectedSlot];
  if(slot && ITEMS[slot.id] && ITEMS[slot.id].shield && shieldCooldown <= 0){
    shieldBlocking = true;
    return true;
  }
  return false;
}

function releaseShield(){
  if(shieldBlocking){
    shieldBlocking = false;
    shieldCooldown = 0.3;
  }
}

// ============================================================
//  BOW & CROSSBOW + ARROWS
// ============================================================
const ITEM_BOW       = 330;
const ITEM_CROSSBOW  = 331;
const ITEM_ARROW     = 336;
const ITEM_FLAME_ARROW = 337;
const ITEM_SPLASH_ARROW= 338;

ITEMS[ITEM_BOW] = {
  name:'Bow', emoji:'🏹',
  ranged:true, rangedType:'bow',
  maxDur:384, dur:384, toolColor:'#9c6b3c',
};
ITEMS[ITEM_CROSSBOW] = {
  name:'Crossbow', emoji:'🏹',
  ranged:true, rangedType:'crossbow',
  maxDur:465, dur:465, toolColor:'#555',
};
ITEMS[ITEM_ARROW]       = {name:'Arrow',        emoji:'🪃'};
ITEMS[ITEM_FLAME_ARROW] = {name:'Flame Arrow',  emoji:'🔥'};
ITEMS[ITEM_SPLASH_ARROW]= {name:'Splash Arrow', emoji:'💧'};

// Crafting recipes
// Bow: 3 sticks + 3 cobweb
RECIPES.push({cat:'tools',pattern:[[null,ITEM_STICK,B.COBWEB],[ITEM_STICK,null,B.COBWEB],[null,ITEM_STICK,B.COBWEB]],out:{id:ITEM_BOW,count:1}});
// Crossbow: 3 iron + 2 sticks + 1 string + 1 tripwire hook (use cobweb)
RECIPES.push({cat:'tools',pattern:[[B.IRON_ORE,ITEM_STICK,B.IRON_ORE],[B.COBWEB,ITEM_STICK,B.COBWEB],[null,B.IRON_ORE,null]],out:{id:ITEM_CROSSBOW,count:1}});
// Arrows: flint(gravel)+stick+feather → 4 arrows
RECIPES.push({cat:'tools',pattern:[[B.GRAVEL],[ITEM_STICK],[ITEM_FEATHER]],out:{id:ITEM_ARROW,count:4}});
// Flame arrow: arrow + coal
RECIPES.push({cat:'tools',pattern:[[ITEM_ARROW],[B.COAL_ORE]],out:{id:ITEM_FLAME_ARROW,count:1}});
// Splash arrow: arrow + glass
RECIPES.push({cat:'tools',pattern:[[ITEM_ARROW],[B.GLASS]],out:{id:ITEM_SPLASH_ARROW,count:1}});

// ---- Projectile system ----
const playerArrows = [];
let bowCharge = 0;
let bowCharging = false;
const PLAYER_ARROW_GRAVITY = -18;
const ARROW_SPEED_BASE = 22;
const MAX_BOW_CHARGE = 1.0;

function startBowCharge(){
  const slot = inventory[selectedSlot];
  if(!slot || !ITEMS[slot.id] || !ITEMS[slot.id].ranged) return;
  // Need at least 1 arrow
  const hasArrow = inventory.some(s=>s&&(s.id===ITEM_ARROW||s.id===ITEM_FLAME_ARROW||s.id===ITEM_SPLASH_ARROW));
  if(!hasArrow) return;
  bowCharging = true;
  bowCharge = 0;
}

function releaseBow(){
  if(!bowCharging) return;
  bowCharging = false;
  if(bowCharge < 0.1){ bowCharge = 0; return; }

  const slot = inventory[selectedSlot];
  if(!slot || !ITEMS[slot.id] || !ITEMS[slot.id].ranged) return;

  // Find arrow
  let arrowType = ITEM_ARROW;
  for(let i=0;i<inventory.length;i++){
    const s = inventory[i];
    if(s && (s.id===ITEM_FLAME_ARROW||s.id===ITEM_SPLASH_ARROW||s.id===ITEM_ARROW)){
      arrowType = s.id;
      consumeFromSlot(i,1);
      break;
    }
  }

  // Consume durability
  slot.dur = (slot.dur||0) - 1;
  if(slot.dur <= 0){ inventory[selectedSlot]=null; }

  const isCrossbow = ITEMS[slot.id].rangedType === 'crossbow';
  const speed = ARROW_SPEED_BASE * (isCrossbow ? 1.3 : Math.min(1, bowCharge + 0.2));
  const dir = camera.getDirection(BABYLON.Vector3.Forward());

  playerArrows.push({
    pos: camera.position.clone(),
    vel: dir.scale(speed),
    type: arrowType,
    life: 8.0,
    hasHit: false,
    flame: arrowType === ITEM_FLAME_ARROW,
    splash: arrowType === ITEM_SPLASH_ARROW,
  });

  bowCharge = 0;
  if(typeof SFX !== 'undefined' && SFX.place) SFX.place(B.COBWEB);
  showCombatMsg(isCrossbow ? '⚡ Crossbow fired!' : '🏹 Arrow loosed!');
}

function updateProjectiles(dt){
  if(bowCharging){
    bowCharge = Math.min(MAX_BOW_CHARGE, bowCharge + dt);
  }
  if(shieldCooldown > 0) shieldCooldown -= dt;

  for(let i = playerArrows.length-1; i >= 0; i--){
    const a = playerArrows[i];
    if(a.hasHit){ playerArrows.splice(i,1); continue; }
    a.life -= dt;
    if(a.life <= 0){ playerArrows.splice(i,1); continue; }

    a.vel.y += PLAYER_ARROW_GRAVITY * dt;
    a.pos.x += a.vel.x * dt;
    a.pos.y += a.vel.y * dt;
    a.pos.z += a.vel.z * dt;

    // Check block collision
    const bx = Math.floor(a.pos.x), by = Math.floor(a.pos.y), bz = Math.floor(a.pos.z);
    if(getBlock(bx,by,bz) && isSolid(getBlock(bx,by,bz))){
      if(a.splash) applySplashEffect(a.pos);
      playerArrows.splice(i,1);
      continue;
    }

    // Check mob collision (via entities system)
    if(typeof ENTITY_LIST !== 'undefined'){
      for(const ent of ENTITY_LIST){
        if(!ent || ent.dead) continue;
        const dx = ent.pos.x - a.pos.x;
        const dy = ent.pos.y + 0.9 - a.pos.y;
        const dz = ent.pos.z - a.pos.z;
        if(dx*dx+dy*dy+dz*dz < 0.6){
          const dmg = a.flame ? 5 : (a.splash ? 3 : 4);
          if(typeof ent.takeDamage === 'function') ent.takeDamage(dmg);
          else if(ent.hp !== undefined){ ent.hp -= dmg; }
          a.hasHit = true;
          if(typeof SFX !== 'undefined' && SFX.hurt) SFX.hurt();
          break;
        }
      }
    }
  }
}

function applySplashEffect(pos){
  // Hits player if close
  const dx = player.pos.x - pos.x;
  const dy = player.pos.y + 0.9 - pos.y;
  const dz = player.pos.z - pos.z;
  const dist = Math.sqrt(dx*dx+dy*dy+dz*dz);
  if(dist < 3){
    const dmg = Math.floor(3 * (1 - dist/3));
    if(dmg > 0) damage(dmg);
  }
}

// ============================================================
//  STATUS EFFECTS SYSTEM
// ============================================================
const STATUS_EFFECTS = {
  _active: {},
  
  // Add or refresh a status effect
  apply(type, duration, level=1){
    const def = STATUS_EFFECT_DEFS[type];
    if(!def) return;
    const existing = this._active[type];
    if(!existing || existing.duration < duration){
      this._active[type] = {duration, level, timer: 0};
    }
    updateStatusEffectsUI();
    if(typeof showCombatMsg === 'function') showCombatMsg(`${def.emoji} ${def.name}`);
  },

  remove(type){
    delete this._active[type];
    updateStatusEffectsUI();
  },

  has(type){
    return !!this._active[type];
  },

  get(type){
    return this._active[type] || null;
  },

  update(dt){
    let changed = false;
    for(const type in this._active){
      const eff = this._active[type];
      eff.duration -= dt;
      eff.timer += dt;
      if(eff.duration <= 0){
        delete this._active[type];
        changed = true;
        continue;
      }
      // Apply per-tick effects
      const def = STATUS_EFFECT_DEFS[type];
      if(def && def.tick){
        const interval = def.tickInterval || 1.0;
        if(eff.timer >= interval){
          eff.timer -= interval;
          def.tick(eff.level);
        }
      }
    }
    if(changed) updateStatusEffectsUI();

    // Speed modifier
    // (handled in getSpeedModifier)
  },

  getSpeedModifier(){
    let m = 1.0;
    if(this._active['swiftness']) m *= 1.2 + (this._active['swiftness'].level - 1) * 0.1;
    if(this._active['slowness'])  m *= 0.8 - (this._active['slowness'].level - 1) * 0.1;
    return Math.max(0.1, m);
  },

  isFireResistant(){ return !!this._active['fire_resistance']; },
  isInvisible()    { return !!this._active['invisibility']; },
  hasLevitation()  { return !!this._active['levitation']; },
};

const STATUS_EFFECT_DEFS = {
  poison: {
    name:'Poison', emoji:'☠️', color:'#4a9944',
    tickInterval: 1.5,
    tick(lvl){ if(player.hp > 1) damage(lvl); },
  },
  regeneration: {
    name:'Regeneration', emoji:'💚', color:'#ff69b4',
    tickInterval: 2.0,
    tick(lvl){ player.hp = Math.min(20, player.hp + lvl); updateVitalsUI(); },
  },
  swiftness: {
    name:'Speed', emoji:'⚡', color:'#7fffd4',
  },
  fire_resistance: {
    name:'Fire Resistance', emoji:'🔥', color:'#ff8800',
  },
  invisibility: {
    name:'Invisibility', emoji:'👻', color:'#aaaaaa',
  },
  slowness: {
    name:'Slowness', emoji:'🐢', color:'#5a5a7f',
  },
  hunger: {
    name:'Hunger', emoji:'🍖', color:'#587d3e',
    tickInterval: 2.0,
    tick(lvl){ if(player.hunger > 0){ player.hunger = Math.max(0, player.hunger - lvl); updateVitalsUI(); } },
  },
  levitation: {
    name:'Levitation', emoji:'🎈', color:'#e8e8ff',
  },
};

function updateStatusEffectsUI(){
  let el = document.getElementById('status-effects-display');
  if(!el){
    el = document.createElement('div');
    el.id = 'status-effects-display';
    el.style.cssText = `
      position:fixed; bottom:70px; left:50%; transform:translateX(-50%);
      display:flex; gap:6px; pointer-events:none; z-index:200;
      flex-wrap:wrap; justify-content:center; max-width:90vw;
    `;
    document.body.appendChild(el);
  }
  el.innerHTML = '';
  for(const type in STATUS_EFFECTS._active){
    const eff = STATUS_EFFECTS._active[type];
    const def = STATUS_EFFECT_DEFS[type];
    if(!def) continue;
    const span = document.createElement('div');
    span.style.cssText = `
      background:rgba(0,0,0,0.7); border:2px solid ${def.color};
      border-radius:6px; padding:3px 7px; font-size:13px; color:${def.color};
      font-family:monospace; white-space:nowrap;
    `;
    const secs = Math.ceil(eff.duration);
    span.textContent = `${def.emoji} ${def.name} ${secs}s`;
    el.appendChild(span);
  }
}

// ============================================================
//  POTION BREWING SYSTEM
// ============================================================
const ITEM_BLAZE_ROD   = 361;
const ITEM_NETHER_WART = 362;
const ITEM_SPIDER_EYE  = 363;
const ITEM_MAGMA_CREAM = 364;
const ITEM_SUGAR       = 365;
const ITEM_GHAST_TEAR  = 366;
const ITEM_GLASS_BOTTLE= 367;
const ITEM_WATER_BOTTLE= 368;

// Potions
const ITEM_POT_HEALING    = 341;
const ITEM_POT_POISON      = 342;
const ITEM_POT_REGEN       = 343;
const ITEM_POT_SWIFTNESS   = 344;
const ITEM_POT_FIRE_RES    = 345;
const ITEM_POT_INVISIBILITY= 346;
const ITEM_POT_SLOWNESS    = 347;
const ITEM_POT_HUNGER      = 348;
const ITEM_POT_LEVITATION  = 349;

ITEMS[ITEM_BLAZE_ROD]   = {name:'Blaze Rod',    emoji:'🕯️'};
ITEMS[ITEM_NETHER_WART] = {name:'Nether Wart',  emoji:'🌱'};
ITEMS[ITEM_SPIDER_EYE]  = {name:'Spider Eye',   emoji:'🕷️'};
ITEMS[ITEM_MAGMA_CREAM] = {name:'Magma Cream',  emoji:'🫧'};
ITEMS[ITEM_SUGAR]       = {name:'Sugar',         emoji:'🍬'};
ITEMS[ITEM_GHAST_TEAR]  = {name:'Ghast Tear',   emoji:'💧'};
ITEMS[ITEM_GLASS_BOTTLE]= {name:'Glass Bottle', emoji:'🍶'};
ITEMS[ITEM_WATER_BOTTLE]= {name:'Water Bottle', emoji:'💧'};

ITEMS[ITEM_POT_HEALING]    = {name:'Potion of Healing',      emoji:'🧪', potion:'healing',      color:'#ff5555', food:0};
ITEMS[ITEM_POT_POISON]     = {name:'Potion of Poison',       emoji:'🧪', potion:'poison',       color:'#4a9944', food:0};
ITEMS[ITEM_POT_REGEN]      = {name:'Potion of Regeneration', emoji:'🧪', potion:'regeneration', color:'#ff69b4', food:0};
ITEMS[ITEM_POT_SWIFTNESS]  = {name:'Potion of Swiftness',    emoji:'🧪', potion:'swiftness',    color:'#7fffd4', food:0};
ITEMS[ITEM_POT_FIRE_RES]   = {name:'Potion of Fire Resistance',emoji:'🧪',potion:'fire_resistance',color:'#ff8800',food:0};
ITEMS[ITEM_POT_INVISIBILITY]={name:'Potion of Invisibility', emoji:'🧪', potion:'invisibility', color:'#aaaaaa', food:0};
ITEMS[ITEM_POT_SLOWNESS]   = {name:'Potion of Slowness',     emoji:'🧪', potion:'slowness',     color:'#5a5a7f', food:0};
ITEMS[ITEM_POT_HUNGER]     = {name:'Potion of Hunger',       emoji:'🧪', potion:'hunger',       color:'#587d3e', food:0};
ITEMS[ITEM_POT_LEVITATION] = {name:'Potion of Levitation',   emoji:'🧪', potion:'levitation',   color:'#e8e8ff', food:0};

// Potion effects when drunk
const POTION_EFFECTS = {
  healing:       {instant:true,  hp:+4},
  poison:        {effect:'poison',       duration:18},
  regeneration:  {effect:'regeneration', duration:22},
  swiftness:     {effect:'swiftness',    duration:180},
  fire_resistance:{effect:'fire_resistance',duration:240},
  invisibility:  {effect:'invisibility', duration:180},
  slowness:      {effect:'slowness',     duration:90},
  hunger:        {effect:'hunger',       duration:30},
  levitation:    {effect:'levitation',   duration:40},
};

// Make potions drinkable (they act as food with special effects)
for(const id of [ITEM_POT_HEALING,ITEM_POT_POISON,ITEM_POT_REGEN,ITEM_POT_SWIFTNESS,
                  ITEM_POT_FIRE_RES,ITEM_POT_INVISIBILITY,ITEM_POT_SLOWNESS,ITEM_POT_HUNGER,ITEM_POT_LEVITATION]){
  ITEMS[id].food = 0;
  ITEMS[id].isPotion = true;
}

// Brewing recipes: water_bottle + ingredient → potion
// Uses the Brewing Stand (BREWING_STAND block)
const BREWING_RECIPES = [
  {base: ITEM_WATER_BOTTLE, ingredient: ITEM_NETHER_WART, out: ITEM_POT_HEALING},
  {base: ITEM_WATER_BOTTLE, ingredient: ITEM_SPIDER_EYE,  out: ITEM_POT_POISON},
  {base: ITEM_WATER_BOTTLE, ingredient: ITEM_GHAST_TEAR,  out: ITEM_POT_REGEN},
  {base: ITEM_WATER_BOTTLE, ingredient: ITEM_SUGAR,       out: ITEM_POT_SWIFTNESS},
  {base: ITEM_WATER_BOTTLE, ingredient: ITEM_MAGMA_CREAM, out: ITEM_POT_FIRE_RES},
  {base: ITEM_WATER_BOTTLE, ingredient: B.GLASS,          out: ITEM_POT_INVISIBILITY},
  {base: ITEM_WATER_BOTTLE, ingredient: B.ICE,            out: ITEM_POT_SLOWNESS},
  {base: ITEM_WATER_BOTTLE, ingredient: B.NETHERRACK,     out: ITEM_POT_HUNGER},
  {base: ITEM_WATER_BOTTLE, ingredient: B.AMETHYST_CLUSTER,out:ITEM_POT_LEVITATION},
  // Also allow direct crafting as recipe-book entries
];

// Add brewing as crafting recipes too (stand = cobble proxy: blaze rod = fuel)
RECIPES.push({cat:'tools',pattern:[[ITEM_BLAZE_ROD],[B.COBBLE],[B.COBBLE]],out:{id:ITEM_GLASS_BOTTLE,count:3}});
RECIPES.push({cat:'tools',pattern:[[ITEM_GLASS_BOTTLE],[B.WATER]],out:{id:ITEM_WATER_BOTTLE,count:1}});

// Brewing Stand crafting
RECIPES.push({cat:'tools',pattern:[[null,ITEM_BLAZE_ROD,null],[B.COBBLE,B.COBBLE,B.COBBLE]],out:{id:ITEM_WATER_BOTTLE,count:1}});

// Ingredient gathering
RECIPES.push({cat:'food',pattern:[[B.NETHERRACK],[ITEM_STICK]],out:{id:ITEM_BLAZE_ROD,count:1}});
RECIPES.push({cat:'food',pattern:[[B.NETHER_BRICK]],out:{id:ITEM_NETHER_WART,count:2}});
RECIPES.push({cat:'food',pattern:[[B.COBWEB],[ITEM_FEATHER]],out:{id:ITEM_SPIDER_EYE,count:1}});
RECIPES.push({cat:'food',pattern:[[B.LAVA],[B.COBWEB]],out:{id:ITEM_MAGMA_CREAM,count:1}});
RECIPES.push({cat:'food',pattern:[[B.BAMBOO]],out:{id:ITEM_SUGAR,count:2}});
RECIPES.push({cat:'food',pattern:[[B.GLASS],[B.WATER]],out:{id:ITEM_GHAST_TEAR,count:1}});

// Direct potion crafting (no brewing stand needed — craft-table shortcut)
RECIPES.push({cat:'food',pattern:[[ITEM_WATER_BOTTLE,ITEM_NETHER_WART]],out:{id:ITEM_POT_HEALING,count:1}});
RECIPES.push({cat:'food',pattern:[[ITEM_WATER_BOTTLE,ITEM_SPIDER_EYE]],out:{id:ITEM_POT_POISON,count:1}});
RECIPES.push({cat:'food',pattern:[[ITEM_WATER_BOTTLE,ITEM_GHAST_TEAR]],out:{id:ITEM_POT_REGEN,count:1}});
RECIPES.push({cat:'food',pattern:[[ITEM_WATER_BOTTLE,ITEM_SUGAR]],out:{id:ITEM_POT_SWIFTNESS,count:1}});
RECIPES.push({cat:'food',pattern:[[ITEM_WATER_BOTTLE,ITEM_MAGMA_CREAM]],out:{id:ITEM_POT_FIRE_RES,count:1}});
RECIPES.push({cat:'food',pattern:[[ITEM_WATER_BOTTLE,B.GLASS]],out:{id:ITEM_POT_INVISIBILITY,count:1}});
RECIPES.push({cat:'food',pattern:[[ITEM_WATER_BOTTLE,B.ICE]],out:{id:ITEM_POT_SLOWNESS,count:1}});
RECIPES.push({cat:'food',pattern:[[ITEM_WATER_BOTTLE,B.NETHERRACK]],out:{id:ITEM_POT_HUNGER,count:1}});
RECIPES.push({cat:'food',pattern:[[ITEM_WATER_BOTTLE,B.AMETHYST_CLUSTER]],out:{id:ITEM_POT_LEVITATION,count:1}});

// Drink potion function (called from eatFood)
function drinkPotion(itemId){
  const def = ITEMS[itemId];
  if(!def || !def.isPotion) return;
  const pot = POTION_EFFECTS[def.potion];
  if(!pot) return;

  if(pot.instant){
    if(pot.hp > 0){ player.hp = Math.min(20, player.hp + pot.hp); updateVitalsUI(); }
    if(pot.hp < 0){ damage(-pot.hp); }
    showCombatMsg(`${def.emoji} ${def.name} applied!`);
  } else {
    STATUS_EFFECTS.apply(pot.effect, pot.duration, 1);
  }
  if(typeof SFX !== 'undefined' && SFX.place) SFX.place(B.GLASS);
}

// ---- Override eatFood to handle potions ----
const _origEatFood = typeof eatFood !== 'undefined' ? eatFood : null;
function eatFood(slotIndex){
  const slot = inventory[slotIndex];
  if(!slot || !ITEMS[slot.id]) return;
  if(ITEMS[slot.id].isPotion){
    if(player.eatCooldown > 0) return;
    player.eatCooldown = 1.0;
    drinkPotion(slot.id);
    consumeFromSlot(slotIndex, 1);
    // Give back empty bottle
    addToInventory(ITEM_GLASS_BOTTLE, 1);
    return;
  }
  // Fall through to original
  if(player.eatCooldown > 0 || player.hunger >= 20) return;
  player.hunger = Math.min(20, player.hunger + (ITEMS[slot.id].food||0));
  player.eatCooldown = 1.5;
  consumeFromSlot(slotIndex, 1);
  updateVitalsUI();
  if(typeof ACH !== 'undefined') ACH.track('eaten');
}

// ============================================================
//  ARMOR EQUIPMENT UI
// ============================================================
let armorPanelOpen = false;

function buildArmorPanel(){
  let panel = document.getElementById('armor-panel');
  if(panel){ panel.innerHTML=''; }
  else {
    panel = document.createElement('div');
    panel.id = 'armor-panel';
    panel.style.cssText = `
      display:none; position:absolute; right:0; top:0; bottom:0; width:160px;
      background:rgba(0,0,0,0.85); border-left:2px solid #555; padding:10px;
      flex-direction:column; gap:6px; overflow-y:auto; z-index:10;
    `;
    const invOverlay = document.getElementById('inventory-panel');
    if(invOverlay) invOverlay.style.position = 'relative';
    document.getElementById('inventory-overlay').appendChild(panel);
  }

  const title = document.createElement('div');
  title.style.cssText = 'color:#ffd54f;font-size:14px;font-weight:bold;margin-bottom:6px;text-align:center;font-family:monospace;';
  title.textContent = '🛡 Armor';
  panel.appendChild(title);

  for(const slot of ARMOR_SLOT_PIECES){
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:2px 0;';

    const label = document.createElement('span');
    label.style.cssText = 'font-size:12px;color:#aaa;font-family:monospace;width:72px;';
    label.textContent = ARMOR_EMOJIS[slot] + ' ' + slot.slice(0,5);
    row.appendChild(label);

    const slotEl = document.createElement('div');
    slotEl.className = 'inv-slot armor-equip-slot';
    slotEl.dataset.armorSlot = slot;
    slotEl.style.cssText = 'width:38px;height:38px;cursor:pointer;border:2px solid #555;border-radius:4px;background:#1a1a1a;display:flex;align-items:center;justify-content:center;position:relative;';

    const equipped = equippedArmor[slot];
    if(equipped && ITEMS[equipped.id]){
      const def = ITEMS[equipped.id];
      const em = document.createElement('span');
      em.style.cssText = `font-size:18px;`;
      em.textContent = def.emoji;
      slotEl.appendChild(em);
      // Durability bar
      const maxDur = def.maxDur || 1;
      const ratio = Math.max(0, Math.min(1, (equipped.dur||0) / maxDur));
      const bar = document.createElement('div');
      bar.style.cssText = `position:absolute;bottom:2px;left:2px;right:2px;height:3px;background:#333;border-radius:2px;`;
      const fill = document.createElement('div');
      fill.style.cssText = `height:100%;border-radius:2px;width:${(ratio*100).toFixed(0)}%;background:hsl(${ratio>0.5?120:ratio>0.2?55:0},80%,48%);`;
      bar.appendChild(fill);
      slotEl.appendChild(bar);
      slotEl.title = `${def.name} (${equipped.dur}/${maxDur})`;
    } else {
      slotEl.title = `Empty ${slot} slot`;
    }

    slotEl.addEventListener('click', ()=>toggleArmorSlot(slot));
    row.appendChild(slotEl);
    panel.appendChild(row);
  }

  // Defense total
  const defRow = document.createElement('div');
  defRow.style.cssText = 'margin-top:8px;color:#7ec8e3;font-size:12px;font-family:monospace;text-align:center;border-top:1px solid #444;padding-top:6px;';
  defRow.textContent = `🛡 Defense: ${getTotalDefense()}/20`;
  panel.appendChild(defRow);

  // Shield slot
  const shieldTitle = document.createElement('div');
  shieldTitle.style.cssText = 'color:#ffd54f;font-size:13px;font-weight:bold;margin-top:8px;text-align:center;font-family:monospace;border-top:1px solid #444;padding-top:6px;';
  shieldTitle.textContent = '🛡 Off-hand';
  panel.appendChild(shieldTitle);

  const shieldSlotEl = document.createElement('div');
  shieldSlotEl.id = 'shield-slot';
  shieldSlotEl.style.cssText = 'width:38px;height:38px;cursor:pointer;border:2px solid #555;border-radius:4px;background:#1a1a1a;display:flex;align-items:center;justify-content:center;margin:4px auto;position:relative;';
  // Find equipped shield in inventory
  const shieldStack = inventory.find(s=>s&&ITEMS[s.id]&&ITEMS[s.id].shield);
  if(shieldStack){
    const em = document.createElement('span');
    em.style.fontSize='20px';
    em.textContent = '🛡️';
    shieldSlotEl.appendChild(em);
    const ratio = Math.max(0,Math.min(1,(shieldStack.dur||0)/(ITEMS[shieldStack.id].maxDur||1)));
    const bar = document.createElement('div');
    bar.style.cssText=`position:absolute;bottom:2px;left:2px;right:2px;height:3px;background:#333;border-radius:2px;`;
    const fill=document.createElement('div');
    fill.style.cssText=`height:100%;border-radius:2px;width:${(ratio*100).toFixed(0)}%;background:hsl(${ratio>0.5?120:ratio>0.2?55:0},80%,48%);`;
    bar.appendChild(fill);
    shieldSlotEl.appendChild(bar);
    shieldSlotEl.title=`${ITEMS[shieldStack.id].name} (${shieldStack.dur}/${ITEMS[shieldStack.id].maxDur})`;
  } else {
    shieldSlotEl.title='No shield equipped';
    const em=document.createElement('span');em.style.cssText='font-size:20px;opacity:0.3;';em.textContent='🛡️';
    shieldSlotEl.appendChild(em);
  }
  panel.appendChild(shieldSlotEl);

  panel.style.display = armorPanelOpen ? 'flex' : 'none';
}

function toggleArmorPanel(force){
  armorPanelOpen = force !== undefined ? force : !armorPanelOpen;
  const panel = document.getElementById('armor-panel');
  if(panel) panel.style.display = armorPanelOpen ? 'flex' : 'none';
  if(armorPanelOpen) buildArmorPanel();
}

function toggleArmorSlot(slot){
  // If holding an item that fits this slot, equip it
  if(heldStack && ITEMS[heldStack.id] && ITEMS[heldStack.id].armor && ITEMS[heldStack.id].armorSlot === slot){
    const prev = equippedArmor[slot];
    equippedArmor[slot] = {id: heldStack.id, dur: heldStack.dur || ITEMS[heldStack.id].maxDur};
    heldStack = prev;
    saveArmorToInventory();
    buildArmorPanel();
    afterInvChange();
    return;
  }
  // Else unequip into held
  if(equippedArmor[slot]){
    if(!heldStack){
      heldStack = equippedArmor[slot];
      equippedArmor[slot] = null;
      saveArmorToInventory();
      buildArmorPanel();
      afterInvChange();
    }
  }
}

// Inject armor button into inventory UI
function injectArmorButton(){
  const header = document.getElementById('inventory-header');
  if(!header) return;
  if(document.getElementById('btn-armor')) return;
  const btn = document.createElement('button');
  btn.id = 'btn-armor';
  btn.textContent = '🛡 Armor';
  btn.title = 'Equipment / Armor';
  btn.style.cssText = 'font-size:13px;padding:4px 8px;background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:6px;cursor:pointer;font-family:monospace;';
  btn.addEventListener('click', ()=>toggleArmorPanel());
  // Insert before close button
  const closeBtn = document.getElementById('btn-inv-close');
  if(closeBtn) header.insertBefore(btn, closeBtn);
  else header.appendChild(btn);
}

// ============================================================
//  COMBAT MSG HELPER
// ============================================================
function showCombatMsg(msg){
  let el = document.getElementById('combat-msg');
  if(!el){
    el = document.createElement('div');
    el.id='combat-msg';
    el.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#fff;padding:5px 12px;border-radius:8px;font-family:monospace;font-size:14px;pointer-events:none;z-index:300;transition:opacity 0.4s;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity='1';
  clearTimeout(el._t);
  el._t = setTimeout(()=>{ el.style.opacity='0'; }, 2000);
}

// ============================================================
//  OVERRIDE damage() to apply armor and shields
// ============================================================
const _origDamage = typeof damage !== 'undefined' ? damage : null;
window._combatDamagePatched = false;

function patchDamageFunction(){
  if(window._combatDamagePatched) return;
  window._combatDamagePatched = true;
  // We monkey-patch by wrapping the global damage() call
  const original = window.damage;
  window.damage = function(amount, source){
    if(player.dead || amount <= 0) return;
    
    // Fire resistance
    if(source === 'fire' && STATUS_EFFECTS.isFireResistant()) return;
    
    // Shield block (right-click held)
    if(shieldBlocking){
      amount *= (1 - SHIELD_BLOCK_REDUCTION);
      const shieldSlot = inventory.find((s,i)=>s&&ITEMS[s.id]&&ITEMS[s.id].shield);
      if(shieldSlot){
        shieldSlot.dur = (shieldSlot.dur||0) - 1;
        if(shieldSlot.dur <= 0){
          const idx = inventory.indexOf(shieldSlot);
          if(idx >= 0) inventory[idx] = null;
          showCombatMsg('🛡 Shield broke!');
        }
      }
    }
    
    // Armor reduction
    const reduced = applyArmorReduction(amount);
    if(reduced < amount && reduced < amount - 0.5) damageArmor(amount);
    
    original(Math.max(0, reduced));
  };
}

// ============================================================
//  SPEED MODIFIER — hook into update loop
// ============================================================
function getCombatSpeedMod(){
  return STATUS_EFFECTS.getSpeedModifier();
}

// Levitation effect
function applyLevitationEffect(dt){
  if(STATUS_EFFECTS.hasLevitation() && !player.flying){
    player.vel.y += 12 * dt;
    if(player.vel.y > 5) player.vel.y = 5;
  }
}

// ============================================================
//  ADD "combat" RECIPE CATEGORY
// ============================================================
(function addCombatCategory(){
  const existing = RECIPE_CATEGORIES.find(c=>c.id==='combat');
  if(!existing) RECIPE_CATEGORIES.push({id:'combat',name:'Combat',emoji:'⚔️'});
  const existing2 = RECIPE_CATEGORIES.find(c=>c.id==='brewing');
  if(!existing2) RECIPE_CATEGORIES.push({id:'brewing',name:'Brewing',emoji:'🧪'});

  // Re-tag recipes
  const combatIds = [ITEM_BOW,ITEM_CROSSBOW,ITEM_ARROW,ITEM_FLAME_ARROW,ITEM_SPLASH_ARROW,ITEM_SHIELD_BASE];
  for(let i=1;i<5;i++) combatIds.push(ITEM_SHIELD_BASE+i);
  for(let m=0;m<ARMOR_MATS.length;m++) for(let s=0;s<4;s++) combatIds.push(armorItemId(m,s));

  const brewingIds = [ITEM_POT_HEALING,ITEM_POT_POISON,ITEM_POT_REGEN,ITEM_POT_SWIFTNESS,
    ITEM_POT_FIRE_RES,ITEM_POT_INVISIBILITY,ITEM_POT_SLOWNESS,ITEM_POT_HUNGER,ITEM_POT_LEVITATION,
    ITEM_GLASS_BOTTLE,ITEM_WATER_BOTTLE,ITEM_BLAZE_ROD,ITEM_NETHER_WART,ITEM_SPIDER_EYE,
    ITEM_MAGMA_CREAM,ITEM_SUGAR,ITEM_GHAST_TEAR];

  for(const rec of RECIPES){
    if(combatIds.includes(rec.out.id)) rec.cat = 'combat';
    if(brewingIds.includes(rec.out.id)) rec.cat = 'brewing';
  }
})();

// ============================================================
//  INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', ()=>{
  loadArmorFromSave();
});

// Called after inventory UI is built
function initCombatUI(){
  injectArmorButton();
  buildArmorPanel();
  patchDamageFunction();

  // Right-click for shield while in game
  document.addEventListener('mousedown', (e)=>{
    if(e.button === 2 && started && !paused && !inventoryOpen && document.pointerLockElement === canvas){
      const slot = inventory[selectedSlot];
      if(slot && ITEMS[slot.id] && ITEMS[slot.id].shield){
        tryShieldBlock();
        return;
      }
      if(slot && ITEMS[slot.id] && ITEMS[slot.id].ranged){
        startBowCharge();
      }
    }
  });
  document.addEventListener('mouseup', (e)=>{
    if(e.button === 2){
      releaseShield();
      releaseBow();
    }
  });
}

// Called every frame from main update
function updateCombatSystems(dt){
  STATUS_EFFECTS.update(dt);
  updateProjectiles(dt);
  applyLevitationEffect(dt);
  // Bow charge bar UI
  const chargeBar = document.getElementById('bow-charge-bar');
  const chargeFill = document.getElementById('bow-charge-fill');
  if(chargeBar && chargeFill){
    if(bowCharging){
      chargeBar.style.display = 'block';
      chargeFill.style.width = (Math.min(1, bowCharge / MAX_BOW_CHARGE) * 100).toFixed(1) + '%';
    } else {
      chargeBar.style.display = 'none';
    }
  }
}
