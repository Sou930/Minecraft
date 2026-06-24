"use strict";
// DECORATIONS — manages in-world text for signs and item displays for item frames.
// Signs render a dynamic-texture text plane mounted on top of the sign board geometry.
// Item frames render an icon from the held item's texture.
const DECORATIONS = (function () {
  // Map: "x,y,z" → { mesh, type, ... }
  const _meshes = new Map();

  // ---- Sign text rendering ----
  const SIGN_W = 128, SIGN_H = 48;
  function makeSignMesh(x, y, z, text, facing) {
    const key = x + ',' + y + ',' + z;
    // Remove old mesh if any
    removeAt(x, y, z);

    if (!text || !text.trim()) return;

    const tex = new BABYLON.DynamicTexture('signTex_' + key, { width: SIGN_W, height: SIGN_H }, scene, false,
      BABYLON.Texture.NEAREST_SAMPLINGMODE);
    tex.hasAlpha = true;

    const ctx = tex.getContext();
    ctx.clearRect(0, 0, SIGN_W, SIGN_H);
    ctx.fillStyle = 'rgba(201,160,106,0.85)';
    ctx.fillRect(0, 0, SIGN_W, SIGN_H);
    ctx.fillStyle = '#2a1a08';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Wrap text into up to 3 lines
    const words = text.split('\n');
    const lines = [];
    for (const w of words) {
      const chunks = [];
      let line = '';
      for (const ch of w) {
        if (ctx.measureText(line + ch).width > SIGN_W - 12) {
          chunks.push(line);
          line = ch;
        } else line += ch;
      }
      if (line) chunks.push(line);
      lines.push(...chunks);
      if (lines.length >= 3) break;
    }
    const lineH = SIGN_H / Math.max(lines.length, 1);
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      ctx.fillText(lines[i], SIGN_W / 2, lineH * i + lineH / 2);
    }
    tex.update();

    const mat = new BABYLON.StandardMaterial('signMat_' + key, scene);
    mat.emissiveTexture = tex;
    mat.opacityTexture = tex;
    mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    mat.specularColor = new BABYLON.Color3(0, 0, 0);
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    mat.fogEnabled = false;

    const mesh = BABYLON.MeshBuilder.CreatePlane('signText_' + key,
      { width: 0.78, height: 0.28 }, scene);
    mesh.material = mat;
    mesh.isPickable = false;

    // Position the text in front of the sign face
    const f = (facing || 0);
    const offsets = [
      [0, 0.67, -0.46],  // N: z-
      [0.46, 0.67, 0],   // E: x+
      [0, 0.67, 0.46],   // S: z+
      [-0.46, 0.67, 0],  // W: x-
    ];
    const [ox, oy, oz] = offsets[f] || offsets[0];
    mesh.position.set(x + 0.5 + ox, y + oy, z + 0.5 + oz);
    // Rotate to face outward
    const yaws = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    mesh.rotation.y = yaws[f] || 0;

    mesh.freezeWorldMatrix();
    _meshes.set(key, { mesh, tex, mat });
  }

  function removeAt(x, y, z) {
    const key = x + ',' + y + ',' + z;
    const entry = _meshes.get(key);
    if (entry) {
      entry.mesh.dispose();
      entry.tex.dispose();
      entry.mat.dispose();
      _meshes.delete(key);
    }
  }

  function updateSign(x, y, z) {
    const id = getBlock(x, y, z);
    const def = BLOCKS[id];
    if (!def || !def.sign) { removeAt(x, y, z); return; }
    const text = (window._signTexts && window._signTexts[x + ',' + y + ',' + z]) || def.signText || '';
    makeSignMesh(x, y, z, text, def.signFacing);
  }

  // Scan nearby signs and update their text meshes.
  let _scanTimer = 0;
  function update(dt) {
    if (typeof player === 'undefined' || typeof worldReady === 'undefined' || !worldReady) return;
    _scanTimer -= dt;
    if (_scanTimer > 0) return;
    _scanTimer = 1.5;

    const px = Math.floor(player.pos.x), py = Math.floor(player.pos.y), pz = Math.floor(player.pos.z);
    const R = 24;
    // Remove stale meshes
    for (const [key, entry] of _meshes) {
      const [kx, ky, kz] = key.split(',').map(Number);
      const dist = Math.max(Math.abs(kx - px), Math.abs(kz - pz));
      if (dist > R + 4) removeAt(kx, ky, kz);
      else {
        const id = getBlock(kx, ky, kz);
        const def = BLOCKS[id];
        if (!def || !def.sign) removeAt(kx, ky, kz);
      }
    }
    // Scan for signs in range
    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        for (let dy = -4; dy <= 4; dy++) {
          const bx = px + dx, by = py + dy, bz = pz + dz;
          if (bx < 0 || bx >= WORLD_W || by < 0 || by >= WORLD_H || bz < 0 || bz >= WORLD_D) continue;
          const id = getBlock(bx, by, bz);
          const def = BLOCKS[id];
          if (!def || !def.sign) continue;
          const key = bx + ',' + by + ',' + bz;
          if (!_meshes.has(key)) updateSign(bx, by, bz);
        }
      }
    }
  }

  return { update, updateSign, removeAt };
})();
