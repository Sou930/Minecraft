"use strict";
// =====================================================================
// LIGHTING — 光源・照明システム
//   ・松明 / ランタン / 溶岩 / アメジスト / ヒカリゴケ等の発光ブロックが
//     周囲を照らす（Babylon.js PointLight のプールで実装）。
//   ・洞窟内（空が見えない場所）は真っ暗 — メッシュ生成時に「天空光(skylight)」
//     を頂点色へ焼き込み、夜は天空光を弱めることで暗闇を表現する。
//   ・溶岩は光源 + ダメージ（ダメージは player.js 側で処理）。
// =====================================================================
const LIGHTING = (function () {
  // 発光ブロックごとの光の強さ・半径・色。
  // intensity: PointLight 強度 / range: 届く距離 / color
  const LIGHT_DEFS = {};
  function defs() {
    if (Object.keys(LIGHT_DEFS).length) return LIGHT_DEFS;
    if (typeof B === 'undefined') return LIGHT_DEFS;
    LIGHT_DEFS[B.TORCH] = { intensity: 0.95, range: 11, color: [1.0, 0.78, 0.42] };
    LIGHT_DEFS[B.LANTERN] = { intensity: 1.15, range: 14, color: [1.0, 0.85, 0.55] };
    LIGHT_DEFS[B.LAVA] = { intensity: 1.3, range: 12, color: [1.0, 0.5, 0.16] };
    LIGHT_DEFS[B.AMETHYST_CLUSTER] = { intensity: 0.6, range: 8, color: [0.72, 0.5, 1.0] };
    LIGHT_DEFS[B.GLOW_LICHEN] = { intensity: 0.45, range: 7, color: [0.55, 0.95, 0.7] };
    LIGHT_DEFS[B.FURNACE] = { intensity: 0.0, range: 0, color: [1, 0.6, 0.2] }; // 既定はオフ
    return LIGHT_DEFS;
  }

  const POOL_SIZE = 24;     // 同時に有効な PointLight の最大数
  let pool = [];            // PointLight の配列
  let activeMap = new Map();// "x,y,z" -> light index
  let inited = false;
  let nightFactor = 1.0;    // 1=昼, 0=夜（夜は光源を少し強調）

  function init() {
    if (inited || typeof scene === 'undefined') return;
    for (let i = 0; i < POOL_SIZE; i++) {
      const l = new BABYLON.PointLight('plight' + i, new BABYLON.Vector3(0, -999, 0), scene);
      l.intensity = 0;
      l.range = 12;
      l.specular = new BABYLON.Color3(0, 0, 0);
      l.setEnabled(false);
      // パフォーマンス: 含めるメッシュを限定せず、影は無し（既定）。
      pool.push({ light: l, key: null, def: null, free: true });
    }
    inited = true;
  }

  function isLightSource(id) { return !!defs()[id] && defs()[id].intensity > 0; }

  // プレイヤー周辺の発光ブロックを走査して PointLight を割り当てる。
  // 重い全走査を避けるため、プレイヤー中心の限られた立方体だけ調べる。
  let scanTimer = 0;
  const SCAN_RADIUS = 18;   // この範囲内の発光ブロックだけ光源にする
  function update(dt) {
    if (!inited) return;
    scanTimer -= dt;
    if (scanTimer > 0) return;
    scanTimer = 0.2; // 5回/秒で十分滑らか

    const px = Math.floor(player.pos.x), py = Math.floor(player.pos.y), pz = Math.floor(player.pos.z);
    const found = []; // {key,x,y,z,def,d2}
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
    // 近い順に POOL_SIZE 個だけ採用。
    found.sort((a, b) => a.d2 - b.d2);
    const keep = found.slice(0, POOL_SIZE);
    const keepKeys = new Set(keep.map(f => f.key));

    // 既に割り当て済みでもう範囲外/対象外になった光源を解放。
    for (const [key, idx] of activeMap) {
      if (!keepKeys.has(key)) {
        const slot = pool[idx];
        slot.light.intensity = 0; slot.light.setEnabled(false);
        slot.free = true; slot.key = null;
        activeMap.delete(key);
      }
    }
    // 新規/継続の光源を割り当て。
    for (const f of keep) {
      let idx = activeMap.get(f.key);
      if (idx === undefined) {
        idx = pool.findIndex(s => s.free);
        if (idx < 0) break; // プール満杯
        pool[idx].free = false; pool[idx].key = f.key;
        activeMap.set(f.key, idx);
      }
      const slot = pool[idx];
      const c = f.def.color;
      slot.light.position.set(f.x + 0.5, f.y + 0.55, f.z + 0.5);
      slot.light.diffuse = new BABYLON.Color3(c[0], c[1], c[2]);
      // 夜はわずかに強める。距離フェードは Babylon の range が担う。
      slot.light.intensity = f.def.intensity * (1 + (1 - nightFactor) * 0.25);
      slot.light.range = f.def.range;
      slot.light.setEnabled(true);
    }
  }

  // 1ブロックが変化したら、その位置の光源割り当てを即時更新（消灯/点灯を反映）。
  function notifyBlockChanged(x, y, z) {
    if (!inited) return;
    const key = x + ',' + y + ',' + z;
    const id = getBlock(x, y, z);
    if (!isLightSource(id)) {
      // 消えた光源を解放
      const idx = activeMap.get(key);
      if (idx !== undefined) {
        pool[idx].light.intensity = 0; pool[idx].light.setEnabled(false);
        pool[idx].free = true; pool[idx].key = null; activeMap.delete(key);
      }
    }
    scanTimer = 0; // 次フレームで再スキャン
  }

  // 昼夜サイクルから呼ばれ、夜の暗さを記録（mesher の skylight 焼き込みに使用）。
  function setNightFactor(f) { nightFactor = Math.max(0, Math.min(1, f)); }
  function getNightFactor() { return nightFactor; }

  return { init, update, notifyBlockChanged, isLightSource, setNightFactor, getNightFactor, defs };
})();
