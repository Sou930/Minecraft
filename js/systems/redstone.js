"use strict";
// =============================================================================
//  REDSTONE SYSTEM
//  Handles: Lever, Redstone Dust, Redstone Torch, Repeater,
//           Piston / Sticky Piston, Dispenser, Dropper, Hopper, Observer
// =============================================================================

const REDSTONE = (() => {
  // ---- Signal propagation constants ----
  const MAX_SIGNAL = 15;

  // ---- Per-block "powered" state table  ----
  // Maps packed world position → { powered:bool, signal:0-15 }
  // This is kept separate from BLOCKS[] so multiple placed instances stay
  // independent (BLOCKS[] entries are prototype templates, not per-instance).
  const _state = new Map(); // key = "x,y,z"

  function key(x, y, z) { return x + ',' + y + ',' + z; }
  function getState(x, y, z) { return _state.get(key(x, y, z)) || { powered: false, signal: 0 }; }
  function setState(x, y, z, powered, signal) {
    _state.set(key(x, y, z), { powered: !!powered, signal: signal | 0 });
  }

  // ---- Direction helpers (N=+Z, S=-Z, E=+X, W=-X, Up=+Y, Down=-Y) ----
  const DIRS6 = [
    { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 },
  ];

  // ---- Redstone source check ----
  function isPoweredSource(x, y, z) {
    const id = getBlock(x, y, z);
    if (id === B.LEVER) return getState(x, y, z).powered;
    if (id === B.REDSTONE_TORCH_ON) return true;
    if (id === B.REDSTONE_TORCH_OFF) return false;
    if (id === B.REPEATER) return getState(x, y, z).powered;
    if (id === B.REDSTONE_DUST) return getState(x, y, z).signal > 0;
    if (id === B.PRESSURE_PLATE_WOOD || id === B.PRESSURE_PLATE_STONE) return getState(x, y, z).powered;
    if (id === B.BUTTON_WOOD || id === B.BUTTON_STONE) return getState(x, y, z).powered;
    return false;
  }

  // ---- Get signal strength at a position ----
  function signalAt(x, y, z) {
    const id = getBlock(x, y, z);
    if (id === B.REDSTONE_TORCH_ON) return MAX_SIGNAL;
    if (id === B.LEVER && getState(x, y, z).powered) return MAX_SIGNAL;
    if (id === B.REPEATER && getState(x, y, z).powered) return MAX_SIGNAL;
    if (id === B.PRESSURE_PLATE_WOOD || id === B.PRESSURE_PLATE_STONE) return getState(x, y, z).powered ? MAX_SIGNAL : 0;
    if (id === B.BUTTON_WOOD || id === B.BUTTON_STONE) return getState(x, y, z).powered ? MAX_SIGNAL : 0;
    if (id === B.REDSTONE_DUST) return getState(x, y, z).signal;
    return 0;
  }

  // ---- Flood-fill dust signal propagation ----
  // Uses BFS outward from powered sources, reducing signal by 1 per step.
  function propagateDust() {
    // Step 1: reset all dust to 0
    const dustPositions = [];
    // We only process chunks near the player for performance
    const px = typeof player !== 'undefined' ? Math.floor(player.pos.x) : 0;
    const pz = typeof player !== 'undefined' ? Math.floor(player.pos.z) : 0;
    const RANGE = 48;

    for (let x = px - RANGE; x <= px + RANGE; x++) {
      for (let z = pz - RANGE; z <= pz + RANGE; z++) {
        for (let y = 0; y < WORLD_H; y++) {
          if (getBlock(x, y, z) === B.REDSTONE_DUST) {
            setState(x, y, z, false, 0);
            dustPositions.push({ x, y, z });
          }
        }
      }
    }

    // Step 2: BFS from all powered sources
    const queue = [];
    // seed from torches and levers
    for (const { x, y, z } of dustPositions) {
      for (const d of DIRS6) {
        const nx = x + d.x, ny = y + d.y, nz = z + d.z;
        const sig = signalAt(nx, ny, nz);
        if (sig > 0) {
          const curSig = getState(x, y, z).signal;
          const newSig = sig - 1;
          if (newSig > curSig) {
            setState(x, y, z, newSig > 0, newSig);
            queue.push({ x, y, z, signal: newSig });
          }
        }
      }
    }

    // propagate through dust
    let head = 0;
    while (head < queue.length) {
      const { x, y, z, signal } = queue[head++];
      if (signal <= 0) continue;
      for (const d of DIRS6) {
        const nx = x + d.x, ny = y + d.y, nz = z + d.z;
        if (getBlock(nx, ny, nz) === B.REDSTONE_DUST) {
          const cur = getState(nx, ny, nz).signal;
          const ns = signal - 1;
          if (ns > cur) {
            setState(nx, ny, nz, ns > 0, ns);
            queue.push({ x: nx, y: ny, z: nz, signal: ns });
          }
        }
      }
    }

    // Step 3: rebuild visual tiles for changed dust
    const dirtyChunks = new Set();
    for (const { x, y, z } of dustPositions) {
      const s = getState(x, y, z);
      const powered = s.signal > 0;
      // update the stored dust tile (visual only — block ID stays B.REDSTONE_DUST)
      const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
      dirtyChunks.add(cx + ',' + cz);
    }
    for (const ck of dirtyChunks) {
      const [cx, cz] = ck.split(',').map(Number);
      if (typeof buildChunk === 'function') buildChunk(cx, cz);
    }
  }

  // ---- Update pistons triggered by power changes ----
  const _pistonTimers = new Map(); // key → frames to fire

  function schedulePiston(x, y, z, extend) {
    _pistonTimers.set(key(x, y, z), { extend, x, y, z, timer: 0.1 });
  }

  function extendPiston(x, y, z) {
    const id = getBlock(x, y, z);
    if (id !== B.PISTON && id !== B.PISTON_STICKY) return;
    const def = BLOCKS[id];
    if (!def) return;
    const sticky = def.sticky;
    // Facing: 0=up,1=north(-Z),2=south(+Z),3=west(-X),4=east(+X),5=down
    const facing = getState(x, y, z).facing || 0;
    const fd = pistonFacingDir(facing);
    const hx = x + fd.x, hy = y + fd.y, hz = z + fd.z; // head position
    const tx = hx + fd.x, ty = hy + fd.y, tz = hz + fd.z; // block to push

    // Don't extend if already extended
    if (getState(x, y, z).extended) return;
    // Can only push if target is empty or pushable
    const targetId = getBlock(tx, ty, tz);
    if (targetId !== B.AIR && !isPushable(targetId)) return;

    if (targetId !== B.AIR) {
      setBlock(tx, ty, tz, targetId);
      // physically move target block
      const nx = tx + fd.x, ny = ty + fd.y, nz = tz + fd.z;
      if (getBlock(nx, ny, nz) === B.AIR) {
        setBlock(nx, ny, nz, targetId);
        setBlock(tx, ty, tz, B.AIR);
      }
    }
    // Place piston head
    const headId = sticky ? B.PISTON_HEAD_STICKY : B.PISTON_HEAD;
    setBlock(hx, hy, hz, headId);
    setState(x, y, z, true, MAX_SIGNAL);
    _state.get(key(x, y, z)).extended = true;
    _state.get(key(x, y, z)).facing = facing;
    rebuildAround(x, y, z);
  }

  function retractPiston(x, y, z) {
    const id = getBlock(x, y, z);
    if (id !== B.PISTON && id !== B.PISTON_STICKY) return;
    if (!getState(x, y, z).extended) return;
    const def = BLOCKS[id];
    const sticky = def && def.sticky;
    const facing = getState(x, y, z).facing || 0;
    const fd = pistonFacingDir(facing);
    const hx = x + fd.x, hy = y + fd.y, hz = z + fd.z;
    const headId = getBlock(hx, hy, hz);

    if (headId === B.PISTON_HEAD || headId === B.PISTON_HEAD_STICKY) {
      setBlock(hx, hy, hz, B.AIR);
      if (sticky) {
        // pull the block one step beyond back
        const bx = hx + fd.x, by = hy + fd.y, bz = hz + fd.z;
        const pulled = getBlock(bx, by, bz);
        if (pulled !== B.AIR && isPushable(pulled)) {
          setBlock(hx, hy, hz, pulled);
          setBlock(bx, by, bz, B.AIR);
        }
      }
    }
    setState(x, y, z, false, 0);
    _state.get(key(x, y, z)).extended = false;
    rebuildAround(x, y, z);
  }

  function isPushable(id) {
    const def = BLOCKS[id];
    if (!def) return false;
    if (id === B.BEDROCK || id === B.OBSIDIAN || id === B.CRAFTING || id === B.FURNACE ||
        id === B.CHEST || id === B.DISPENSER || id === B.DROPPER || id === B.HOPPER) return false;
    return true;
  }

  function pistonFacingDir(facing) {
    // facing: 0=up, 1=north(-Z), 2=south(+Z), 3=west(-X), 4=east(+X), 5=down
    const dirs = [
      { x: 0, y: 1, z: 0 },   // 0 up
      { x: 0, y: 0, z: -1 },  // 1 north
      { x: 0, y: 0, z: 1 },   // 2 south
      { x: -1, y: 0, z: 0 },  // 3 west
      { x: 1, y: 0, z: 0 },   // 4 east
      { x: 0, y: -1, z: 0 },  // 5 down
    ];
    return dirs[facing] || dirs[0];
  }

  function rebuildAround(x, y, z) {
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    if (typeof buildChunk === 'function') buildChunk(cx, cz);
  }

  // ---- Dispenser: fire an item projectile ----
  function activateDispenser(x, y, z) {
    const st = getState(x, y, z);
    const inv = st.inv || [];
    // find first non-empty slot
    let slot = inv.find(s => s && s.count > 0);
    if (!slot) return;
    const facing = st.facing || 2; // default south
    const fd = pistonFacingDir(facing);
    // Spawn a particle/notification (visual only — no full projectile physics)
    if (typeof showFloatingText === 'function') {
      showFloatingText(x + 0.5, y + 1.5, z + 0.5, '💥 ' + (ITEMS[slot.id] ? ITEMS[slot.id].name : '?'));
    }
    slot.count--;
    if (slot.count <= 0) inv.splice(inv.indexOf(slot), 1);
  }

  // ---- Dropper: move item to adjacent inventory or drop it ----
  function activateDropper(x, y, z) {
    const st = getState(x, y, z);
    const inv = st.inv || [];
    let slot = inv.find(s => s && s.count > 0);
    if (!slot) return;
    if (typeof showFloatingText === 'function') {
      showFloatingText(x + 0.5, y + 1.5, z + 0.5, '📦 ' + (ITEMS[slot.id] ? ITEMS[slot.id].name : '?'));
    }
    slot.count--;
    if (slot.count <= 0) inv.splice(inv.indexOf(slot), 1);
  }

  // ---- Hopper: transfer items from above / to below ----
  let _hopperTimer = 0;
  const HOPPER_TICK = 0.4; // seconds between transfers

  function updateHoppers(dt) {
    _hopperTimer += dt;
    if (_hopperTimer < HOPPER_TICK) return;
    _hopperTimer = 0;

    const px = typeof player !== 'undefined' ? Math.floor(player.pos.x) : 0;
    const pz = typeof player !== 'undefined' ? Math.floor(player.pos.z) : 0;
    const RANGE = 32;

    for (let x = px - RANGE; x <= px + RANGE; x++) {
      for (let z = pz - RANGE; z <= pz + RANGE; z++) {
        for (let y = 1; y < WORLD_H - 1; y++) {
          if (getBlock(x, y, z) === B.HOPPER) {
            tickHopper(x, y, z);
          }
        }
      }
    }
  }

  function tickHopper(x, y, z) {
    const st = getState(x, y, z);
    if (!st.inv) st.inv = [];
    // Pull from above (chest/dispenser/dropper/hopper)
    const above = getBlock(x, y + 1, z);
    if (above === B.CHEST || above === B.HOPPER || above === B.DISPENSER || above === B.DROPPER) {
      const aboveSt = getState(x, y + 1, z);
      if (aboveSt.inv && aboveSt.inv.length > 0 && st.inv.length < 5) {
        const pulled = aboveSt.inv.shift();
        if (pulled) st.inv.push(pulled);
      }
    }
    // Push below
    const below = getBlock(x, y - 1, z);
    if (below === B.CHEST || below === B.HOPPER || below === B.DISPENSER || below === B.DROPPER) {
      if (st.inv.length > 0) {
        const belowSt = getState(x, y - 1, z);
        if (!belowSt.inv) belowSt.inv = [];
        if (belowSt.inv.length < 5) {
          const pushed = st.inv.shift();
          if (pushed) belowSt.inv.push(pushed);
        }
      }
    }
  }

  // ---- Observer: detect block changes ----
  const _observerQueue = []; // { x,y,z, timer }

  function notifyObserversAt(bx, by, bz) {
    // Check all 6 neighbors for an observer pointing at this block
    for (const d of DIRS6) {
      const ox = bx - d.x, oy = by - d.y, oz = bz - d.z;
      if (getBlock(ox, oy, oz) === B.OBSERVER) {
        const facing = getState(ox, oy, oz).facing || 2;
        const fd = pistonFacingDir(facing);
        // Observer fires if it faces toward the changed block
        if (fd.x === d.x && fd.y === d.y && fd.z === d.z) {
          _observerQueue.push({ x: ox, y: oy, z: oz, timer: 0.1 });
        }
      }
    }
  }

  // ---- Main update: process repeater/observer queues ----
  const _repeaterQueue = [];
  let _updateTimer = 0;
  const UPDATE_TICK = 0.1; // 2 game ticks at 20 tps

  function update(dt) {
    _updateTimer += dt;
    if (_updateTimer < UPDATE_TICK) return;
    _updateTimer = 0;

    // Process observer pulses
    for (let i = _observerQueue.length - 1; i >= 0; i--) {
      const o = _observerQueue[i];
      o.timer -= UPDATE_TICK;
      if (o.timer <= 0) {
        // Fire: emit redstone pulse from observer back face
        const st = getState(o.x, o.y, o.z);
        const facing = st.facing || 2;
        const fd = pistonFacingDir(facing);
        const bx = o.x - fd.x, by = o.y - fd.y, bz = o.z - fd.z;
        // Power dust/piston behind the observer
        onBlockPowered(bx, by, bz, true);
        setTimeout(() => onBlockPowered(bx, by, bz, false), 100);
        _observerQueue.splice(i, 1);
      }
    }

    // Process piston timers
    for (const [k, entry] of _pistonTimers.entries()) {
      entry.timer -= UPDATE_TICK;
      if (entry.timer <= 0) {
        if (entry.extend) extendPiston(entry.x, entry.y, entry.z);
        else retractPiston(entry.x, entry.y, entry.z);
        _pistonTimers.delete(k);
      }
    }
  }

  // ---- React to a power-change event at position ----
  function onBlockPowered(x, y, z, powered) {
    const id = getBlock(x, y, z);
    if (!id || id === B.AIR) return;

    if (id === B.PISTON || id === B.PISTON_STICKY) {
      const k = key(x, y, z);
      if (!_state.has(k)) setState(x, y, z, false, 0);
      if (powered) { schedulePiston(x, y, z, true); if (typeof ACH !== 'undefined') ACH.track('piston_fire'); }
      else schedulePiston(x, y, z, false);
      return;
    }
    if (id === B.DISPENSER && powered) { activateDispenser(x, y, z); return; }
    if (id === B.DROPPER && powered) { activateDropper(x, y, z); return; }
    if (id === B.REPEATER) {
      // Repeater: delay output signal
      const st = getState(x, y, z);
      const delay = (st.delay || 1) * UPDATE_TICK * 2;
      setTimeout(() => {
        setState(x, y, z, powered, powered ? MAX_SIGNAL : 0);
        propagateDust();
      }, delay * 1000);
      return;
    }
  }

  // ---- Handle right-click interactions ----
  function onInteract(x, y, z) {
    const id = getBlock(x, y, z);

    // Lever: toggle
    if (id === B.LEVER) {
      const k = key(x, y, z);
      if (!_state.has(k)) setState(x, y, z, false, 0);
      const st = _state.get(k);
      st.powered = !st.powered;
      st.signal = st.powered ? MAX_SIGNAL : 0;
      if (typeof SFX !== 'undefined' && SFX.place) SFX.place(id);
      if (typeof ACH !== 'undefined') ACH.track('lever_flip');
      // trigger adjacent blocks
      for (const d of DIRS6) onBlockPowered(x + d.x, y + d.y, z + d.z, st.powered);
      propagateDust();
      // rebuild chunk to show lever orientation change
      rebuildAround(x, y, z);
      return true;
    }

    // Repeater: cycle delay (1–4 ticks)
    if (id === B.REPEATER) {
      const k = key(x, y, z);
      if (!_state.has(k)) setState(x, y, z, false, 0);
      const st = _state.get(k);
      st.delay = ((st.delay || 1) % 4) + 1;
      if (typeof showFloatingText === 'function')
        showFloatingText(x + 0.5, y + 1, z + 0.5, '⏱ ' + st.delay + ' tick' + (st.delay > 1 ? 's' : ''));
      rebuildAround(x, y, z);
      return true;
    }

    return false;
  }

  // ---- Called by player.js when a block is placed or broken ----
  function onBlockChanged(x, y, z, newId) {
    // Notify observers watching this position
    notifyObserversAt(x, y, z);
    // If the changed block is a redstone source, re-propagate
    if (newId === B.AIR || newId === B.REDSTONE_DUST ||
        newId === B.REDSTONE_TORCH_ON || newId === B.LEVER ||
        newId === B.REPEATER) {
      propagateDust();
    }
    // If a piston head was removed directly (e.g., player breaks it), retract piston
    if (newId === B.AIR) {
      for (const d of DIRS6) {
        const nx = x + d.x, ny = y + d.y, nz = z + d.z;
        const nid = getBlock(nx, ny, nz);
        if ((nid === B.PISTON || nid === B.PISTON_STICKY) && getState(nx, ny, nz).extended) {
          setState(nx, ny, nz, false, 0);
          _state.get(key(nx, ny, nz)).extended = false;
          rebuildAround(nx, ny, nz);
        }
      }
    }
    // Initialize state for newly placed redstone blocks
    if (!_state.has(key(x, y, z))) {
      if (newId === B.LEVER) setState(x, y, z, false, 0);
      if (newId === B.REDSTONE_DUST) setState(x, y, z, false, 0);
      if (newId === B.REPEATER) {
        setState(x, y, z, false, 0);
        _state.get(key(x, y, z)).delay = 1;
        _state.get(key(x, y, z)).facing = typeof playerFacingDir === 'function' ? playerFacingDir() : 0;
      }
      if (newId === B.PISTON || newId === B.PISTON_STICKY) {
        setState(x, y, z, false, 0);
        _state.get(key(x, y, z)).extended = false;
        _state.get(key(x, y, z)).facing = typeof playerFacingDir === 'function' ? playerFacingDir() : 0;
      }
      if (newId === B.OBSERVER) {
        setState(x, y, z, false, 0);
        _state.get(key(x, y, z)).facing = typeof playerFacingDir === 'function' ? playerFacingDir() : 2;
      }
      if (newId === B.DISPENSER || newId === B.DROPPER || newId === B.HOPPER) {
        setState(x, y, z, false, 0);
        _state.get(key(x, y, z)).inv = [];
        _state.get(key(x, y, z)).facing = typeof playerFacingDir === 'function' ? playerFacingDir() : 2;
      }
    }
  }

  // ---- Visual: which tile to use for redstone dust (on vs off) ----
  function dustTile(x, y, z) {
    const sig = getState(x, y, z).signal;
    return sig > 0 ? T.REDSTONE_DUST_ON : T.REDSTONE_DUST_OFF;
  }

  // ---- Visual: lever orientation ----
  function leverTile(x, y, z) {
    return getState(x, y, z).powered ? T.LEVER_ON : T.LEVER_SIDE;
  }

  // ---- Visual: repeater tile ----
  function repeaterTile(x, y, z) {
    return getState(x, y, z).powered ? T.REPEATER_ON : T.REPEATER_OFF;
  }

  return {
    update,
    updateHoppers,
    onInteract,
    onBlockChanged,
    getState,
    setState,
    key,
    signalAt,
    isPoweredSource,
    dustTile,
    leverTile,
    repeaterTile,
    propagateDust,
    notifyObserversAt,
    pistonFacingDir,
  };
})();
