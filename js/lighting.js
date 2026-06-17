"use strict";
// LIGHTING — manages nightFactor and notifies on block changes
const LIGHTING = (function () {
  // Block light is baked into vertex colours; PointLights are disabled
  const USE_POINT_LIGHTS = false;
  // Light source definitions (unused; kept for reference)
  const LIGHT_DEFS = {};
  function defs() {
    if (Object.keys(LIGHT_DEFS).length) return LIGHT_DEFS;
    if (typeof B === 'undefined') return LIGHT_DEFS;
    LIGHT_DEFS[B.TORCH] = { intensity: 0.95, range: 11, color: [1.0, 0.78, 0.42] };
    LIGHT_DEFS[B.LANTERN] = { intensity: 1.15, range: 14, color: [1.0, 0.85, 0.55] };
    LIGHT_DEFS[B.LAVA] = { intensity: 1.3, range: 12, color: [1.0, 0.5, 0.16] };
    LIGHT_DEFS[B.AMETHYST_CLUSTER] = { intensity: 0.6, range: 8, color: [0.72, 0.5, 1.0] };
    LIGHT_DEFS[B.GLOW_LICHEN] = { intensity: 0.45, range: 7, color: [0.55, 0.95, 0.7] };
    LIGHT_DEFS[B.FURNACE] = { intensity: 0.0, range: 0, color: [1, 0.6, 0.2] };
    return LIGHT_DEFS;
  }

  const POOL_SIZE = 24;
  let pool = [];
  let activeMap = new Map();
  let inited = false;
  let nightFactor = 1.0;

  function init() {
    if (inited || typeof scene === 'undefined') return;
    if (!USE_POINT_LIGHTS) { inited = true; return; }
    for (let i = 0; i < POOL_SIZE; i++) {
      const l = new BABYLON.PointLight('plight' + i, new BABYLON.Vector3(0, -999, 0), scene);
      l.intensity = 0;
      l.range = 12;
      l.specular = new BABYLON.Color3(0, 0, 0);
      l.setEnabled(false);
      pool.push({ light: l, key: null, def: null, free: true });
    }
    inited = true;
  }

  function isLightSource(id) { return !!defs()[id] && defs()[id].intensity > 0; }

  let scanTimer = 0;
  const SCAN_RADIUS = 18;
  function update(dt) {
    if (!inited || !USE_POINT_LIGHTS) return;
    scanTimer -= dt;
    if (scanTimer > 0) return;
    scanTimer = 0.2;

    const px = Math.floor(player.pos.x), py = Math.floor(player.pos.y), pz = Math.floor(player.pos.z);
    const found = [];
    const r = SCAN_RADIUS;
    const x0 = Math.max(0, px - r), x1 = Math.min(WORLD_W - 1, px + r);
    const y0 = Math.max(0, py - r), y1 = Math.min(WORLD_H - 1, py + r);
    const z0 = Math.max(0, pz - r), z1 = Math.min(WORLD_D - 1, pz + r);
    const D = defs();
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        for (let y = y0; y <= y1; y++) {
          const id = world[blockIndex(x, y, z)];
          const d = D[id];
          if (!d || d.intensity <= 0) continue;
          const dx = x + 0.5 - player.pos.x, dy = y + 0.5 - player.pos.y, dz = z + 0.5 - player.pos.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > (r + 2) * (r + 2)) continue;
          found.push({ key: x + ',' + y + ',' + z, x, y, z, def: d, d2 });
        }
      }
    }
    found.sort((a, b) => a.d2 - b.d2);
    const keep = found.slice(0, POOL_SIZE);
    const keepKeys = new Set(keep.map(f => f.key));

    // Release out-of-range lights
    for (const [key, idx] of activeMap) {
      if (!keepKeys.has(key)) {
        const slot = pool[idx];
        slot.light.intensity = 0; slot.light.setEnabled(false);
        slot.free = true; slot.key = null;
        activeMap.delete(key);
      }
    }
    // Assign new/continuing lights
    for (const f of keep) {
      let idx = activeMap.get(f.key);
      if (idx === undefined) {
        idx = pool.findIndex(s => s.free);
        if (idx < 0) break;
        pool[idx].free = false; pool[idx].key = f.key;
        activeMap.set(f.key, idx);
      }
      const slot = pool[idx];
      const c = f.def.color;
      slot.light.position.set(f.x + 0.5, f.y + 0.55, f.z + 0.5);
      slot.light.diffuse = new BABYLON.Color3(c[0], c[1], c[2]);
      slot.light.intensity = f.def.intensity * (1 + (1 - nightFactor) * 0.25);
      slot.light.range = f.def.range;
      slot.light.setEnabled(true);
    }
  }

  // Notify on block change to update light source assignment
  function notifyBlockChanged(x, y, z) {
    if (!inited || !USE_POINT_LIGHTS) return;
    const key = x + ',' + y + ',' + z;
    const id = getBlock(x, y, z);
    if (!isLightSource(id)) {
      const idx = activeMap.get(key);
      if (idx !== undefined) {
        pool[idx].light.intensity = 0; pool[idx].light.setEnabled(false);
        pool[idx].free = true; pool[idx].key = null; activeMap.delete(key);
      }
    }
    scanTimer = 0;
  }

  function setNightFactor(f) { nightFactor = Math.max(0, Math.min(1, f)); }
  function getNightFactor() { return nightFactor; }

  return { init, update, notifyBlockChanged, isLightSource, setNightFactor, getNightFactor, defs };
})();
