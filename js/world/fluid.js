// ===========================================================================
//
//
//
// ===========================================================================
"use strict";

const FLUID = (function () {
  const LEVEL_SOURCE = 8;
  const MAX_FLOW = 7;

  const levels = new Map();        // blockIndex -> level(1..8)

  function idx(x, y, z) { return (y * WORLD_D + z) * WORLD_W + x; }

  function getLevel(x, y, z) {
    const id = getBlock(x, y, z);
    if (id !== B.WATER && id !== B.LAVA) return 0;
    const v = levels.get(idx(x, y, z));
    return v === undefined ? LEVEL_SOURCE : v;
  }
  function setLevel(x, y, z, lv) {
    const i = idx(x, y, z);
    if (lv >= LEVEL_SOURCE) levels.delete(i);
    else levels.set(i, lv);
  }
  function clearLevel(x, y, z) { levels.delete(idx(x, y, z)); }

  // Active cell sets for current and next tick
  let active = new Set();
  let nextActive = new Set();

  const SIM_RADIUS = 6 * CHUNK;

  function inSimRange(x, y, z) {
    if (typeof player === "undefined") return true;
    const dx = x - player.pos.x, dz = z - player.pos.z;
    return dx * dx + dz * dz <= SIM_RADIUS * SIM_RADIUS;
  }

  function wake(x, y, z) {
    if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H || z < 0 || z >= WORLD_D) return;
    nextActive.add(idx(x, y, z));
  }
  function wakeNeighbors(x, y, z) {
    wake(x, y, z);
    wake(x + 1, y, z); wake(x - 1, y, z);
    wake(x, y + 1, z); wake(x, y - 1, z);
    wake(x, y, z + 1); wake(x, y, z - 1);
  }

  function isWater(id) { return id === B.WATER; }
  function isLava(id) { return id === B.LAVA; }
  function isFluid(id) { return id === B.WATER || id === B.LAVA; }
  function isReplaceable(id) {
    return id === B.AIR;
  }

  const dirtyChunks = new Set();
  function markChunk(x, z) {
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    dirtyChunks.add(cz * CHUNKS_X + cx);
    if (x % CHUNK === 0) dirtyChunks.add(cz * CHUNKS_X + (cx - 1));
    if (x % CHUNK === CHUNK - 1) dirtyChunks.add(cz * CHUNKS_X + (cx + 1));
    if (z % CHUNK === 0) dirtyChunks.add((cz - 1) * CHUNKS_X + cx);
    if (z % CHUNK === CHUNK - 1) dirtyChunks.add((cz + 1) * CHUNKS_X + cx);
  }

  function placeBlock(x, y, z, id, level, persist) {
    if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H || z < 0 || z >= WORLD_D) return;
    const i = idx(x, y, z);
    world[i] = id;
    if (id === B.WATER || id === B.LAVA) {
      if (level >= LEVEL_SOURCE) levels.delete(i); else levels.set(i, level);
    } else {
      levels.delete(i);
    }
    if (persist) { worldEdits[`${x},${y},${z}`] = id; }
    markChunk(x, z);
    wakeNeighbors(x, y, z);
  }

  const NB6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  function resolveContact(x, y, z) {
    const id = getBlock(x, y, z);
    if (!isFluid(id)) return false;
    const myLevel = getLevel(x, y, z);

    for (const [dx, dy, dz] of NB6) {
      const nid = getBlock(x + dx, y + dy, z + dz);
      if (!isFluid(nid)) continue;
      if (id === nid) continue;

      if (isLava(id)) {
        const nLevel = getLevel(x + dx, y + dy, z + dz);
        if (myLevel >= LEVEL_SOURCE && nLevel >= LEVEL_SOURCE) {
          placeBlock(x, y, z, B.OBSIDIAN, 0, true);
        } else if (myLevel >= LEVEL_SOURCE) {
          placeBlock(x, y, z, B.OBSIDIAN, 0, true);
        } else {
          placeBlock(x, y, z, B.COBBLE, 0, true);
        }
        return true;
      } else {
      }
    }
    return false;
  }

  function simulateCell(x, y, z) {
    const id = getBlock(x, y, z);
    if (!isFluid(id)) return;

    if (resolveContact(x, y, z)) return;

    let level = getLevel(x, y, z);

    if (level < LEVEL_SOURCE) {
      const upId = getBlock(x, y + 1, z);
      let supported = false;
      let bestSrc = 0;
      if (upId === id) {
        supported = true;
        bestSrc = MAX_FLOW;
      } else {
        for (const [dx, , dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) {
          const nid = getBlock(x + dx, y, z + dz);
          if (nid === id) {
            const nl = getLevel(x + dx, y, z + dz);
            if (nl > bestSrc) bestSrc = nl;
          }
        }
        supported = bestSrc >= 2;
      }

      if (id === B.WATER) {
        let srcCount = 0;
        for (const [dx, , dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) {
          if (getBlock(x + dx, y, z + dz) === B.WATER && getLevel(x + dx, y, z + dz) >= LEVEL_SOURCE) srcCount++;
        }
        if (srcCount >= 2) {
          if (level !== LEVEL_SOURCE) { setLevel(x, y, z, LEVEL_SOURCE); markChunk(x, z); wakeNeighbors(x, y, z); }
          level = LEVEL_SOURCE;
        }
      }

      if (level < LEVEL_SOURCE) {
        if (!supported) {
          placeBlock(x, y, z, B.AIR, 0, false);
          delete worldEdits[`${x},${y},${z}`];
          return;
        }
        const want = upId === id ? MAX_FLOW : (bestSrc - 1);
        if (want !== level) {
          if (want <= 0) { placeBlock(x, y, z, B.AIR, 0, false); delete worldEdits[`${x},${y},${z}`]; return; }
          setLevel(x, y, z, want);
          markChunk(x, z);
          level = want;
          wakeNeighbors(x, y, z);
        }
      }
    }

    const belowId = getBlock(x, y - 1, z);
    if (isReplaceable(belowId)) {
      placeBlock(x, y - 1, z, id, MAX_FLOW, false);
      wakeNeighbors(x, y, z);
      return;
    }
    if (isFluid(belowId)) {
      if (belowId === id) {
        const bl = getLevel(x, y - 1, z);
        if (bl < MAX_FLOW) { setLevel(x, y - 1, z, MAX_FLOW); markChunk(x, z); wakeNeighbors(x, y - 1, z); }
        return;
      }
      wakeNeighbors(x, y - 1, z);
    }

    if (level <= 1) return;
    const spreadLevel = level - 1;
    for (const [dx, , dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) {
      const nx = x + dx, nz = z + dz;
      const nid = getBlock(nx, y, nz);
      if (isReplaceable(nid)) {
        if (!inSimRange(nx, y, nz)) continue;
        placeBlock(nx, y, nz, id, spreadLevel, false);
      } else if (nid === id) {
        const nl = getLevel(nx, y, nz);
        if (nl < spreadLevel) {
          setLevel(nx, y, nz, spreadLevel);
          markChunk(nx, nz);
          wakeNeighbors(nx, y, nz);
        }
      } else if (isFluid(nid)) {
        wake(nx, y, nz);
      }
    }
  }

  let accum = 0;
  const WATER_TICK = 0.36;   // was 0.18 → 1/2 speed (longer interval = slower flow)
  const LAVA_TICK = 0.90;    // was 0.45 → 1/2 speed
  let lavaPhase = 0;
  let initialized = false;

  function tickOnce(doLava) {
    if (active.size === 0 && nextActive.size === 0) return;
    active = nextActive;
    nextActive = new Set();

    // FIX: Skip sort when the active set is small — sort is O(n log n) and
    // unnecessary for correctness; it only affects flow aesthetics.
    const cells = Array.from(active);
    active.clear();

    if (cells.length > 64) cells.sort((a, b) => a - b);

    for (const i of cells) {
      const x = i % WORLD_W;
      const t = (i - x) / WORLD_W;
      const z = t % WORLD_D;
      const y = (t - z) / WORLD_D;
      const id = world[i];
      if (!isFluid(id)) continue;
      if (isLava(id) && !doLava) { nextActive.add(i); continue; }
      if (!inSimRange(x, y, z)) { nextActive.add(i); continue; }
      simulateCell(x, y, z);
    }

    flushDirtyChunks();
  }

  function flushDirtyChunks() {
    if (dirtyChunks.size === 0) return;
    for (const key of dirtyChunks) {
      const cx = key % CHUNKS_X;
      const cz = (key - cx) / CHUNKS_X;
      if (cx < 0 || cx >= CHUNKS_X || cz < 0 || cz >= CHUNKS_Z) continue;
      if (typeof chunkBuilt !== "undefined" && chunkBuilt[cz * CHUNKS_X + cx]) {
        buildChunk(cx, cz);
      }
    }
    dirtyChunks.clear();
  }


  function seedActiveFromWorld() {
    if (initialized) return;
    initialized = true;
  }

  function notifyBlockChanged(x, y, z) {
    wakeNeighbors(x, y, z);
    wake(x, y + 1, z);
    wake(x, y + 2, z);
  }

  function placeSource(x, y, z, id) {
    placeBlock(x, y, z, id, LEVEL_SOURCE, true);
    flushDirtyChunks();
  }

  function update(dt) {
    if (typeof worldReady === "undefined" || !worldReady) return;
    if (!initialized) seedActiveFromWorld();
    accum += dt;
    while (accum >= WATER_TICK) {
      accum -= WATER_TICK;
      lavaPhase++;
      const doLava = (lavaPhase % Math.round(LAVA_TICK / WATER_TICK)) === 0;
      tickOnce(doLava);
    }
  }

  function surfaceHeight(x, y, z) {
    const id = getBlock(x, y, z);
    if (!isFluid(id)) return 0;
    if (getBlock(x, y + 1, z) === id) return 1.0;
    const lv = getLevel(x, y, z);
    if (lv >= LEVEL_SOURCE) return 1.0;
    return Math.max(0.1, (lv / LEVEL_SOURCE) * 1.0);
  }

  return {
    update, notifyBlockChanged, placeSource, surfaceHeight,
    getLevel, LEVEL_SOURCE,
    _stats: () => ({ levels: levels.size, active: active.size + nextActive.size }),
  };
})();
