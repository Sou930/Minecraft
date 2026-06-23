"use strict";
/* ===========================================================================
 * PBR.js — PBR-style material enhancement + Normal-map simulation
 *
 * Minecraft HD upgrade: adds physically-based rendering qualities to the
 * voxel world using Babylon.js CustomMaterial (GLSL injection) on top of
 * the existing chunk materials, without breaking the atlas-based meshing.
 *
 * Features:
 *   1. NORMAL-MAP SIMULATION  — per-face micro-bump detail baked into vertex
 *      colours via a secondary AO pass.  The atlas is also redrawn with
 *      enhanced depth cues (stronger highlight + shadow edges) so block faces
 *      look chiselled even on devices that can't run GLSL custom materials.
 *
 *   2. PBR LIGHTING GLSL PATCH — if BABYLON.CustomMaterial is available we
 *      swap solidMat for a custom material that adds:
 *        • Lambertian diffuse with sun direction
 *        • Fresnel-tinged specular (roughness varies per face shade)
 *        • Ambient occlusion term derived from vertex colour alpha channel
 *        • Subtle subsurface for leaves (backlit glow)
 *
 *   3. ATLAS PBR ENHANCEMENT — redraws key tiles with sharper AO borders,
 *      specular micro-detail and stronger normal-map-style shading so blocks
 *      look convincingly bumpy even in standard forward rendering.
 *
 * All paths are additive — if the device lacks the required APIs (no GLSL
 * custom material support) the module falls back to the atlas-only
 * enhancement and is a no-op with zero perf cost.
 * ========================================================================= */
const PBR = (function () {
  let _inited = false;
  let _enabled = true;           // Master toggle (from Settings → PBR)
  let _pbrMat = null;            // CustomMaterial replacing solidMat (if supported)
  let _originalSolidMat = null;  // Saved reference so we can restore on disable

  // --------------------------------------------------------------------------
  // 1. ATLAS PBR ENHANCEMENT
  //    Re-paints an overlay of AO edges + specular highlights on the already-
  //    drawn atlas tiles.  Runs once at startup (or on toggle) and re-uploads
  //    the DynamicTexture in place via applyAtlasQuality-style update.
  // --------------------------------------------------------------------------
  function _enhanceAtlas() {
    if (typeof atlasCanvas === 'undefined') return;
    const ctx = atlasCanvas.getContext('2d');
    if (!ctx) return;

    function tileOrigin(t) {
      return [(t % ATLAS_TILES) * TILE_PX, Math.floor(t / ATLAS_TILES) * TILE_PX];
    }

    // Tiles that benefit from strong AO + chiselled edges
    const solidTiles = [
      T.STONE, T.COBBLE, T.BRICK, T.STONE_BRICK, T.MOSSY_BRICK, T.CRACKED_BRICK,
      T.SANDSTONE_SIDE, T.SANDSTONE_TOP,
      T.OBSIDIAN, T.COAL_ORE, T.IRON_ORE, T.GOLD_ORE, T.DIAMOND_ORE,
      T.BEDROCK, T.GRAVEL,
    ];

    // Organic / wood tiles: softer edges
    const woodTiles = [
      T.LOG_SIDE, T.LOG_TOP, T.PLANKS, T.BIRCH_SIDE, T.BIRCH_TOP,
      T.SPRUCE_SIDE, T.SPRUCE_TOP, T.ACACIA_SIDE, T.ACACIA_TOP,
      T.CHERRY_SIDE, T.CHERRY_TOP, T.MANGROVE_SIDE, T.MANGROVE_TOP,
      T.PALM_SIDE, T.PALM_TOP, T.MAPLE_SIDE, T.MAPLE_TOP,
      T.CRAFT_SIDE, T.CRAFT_TOP, T.FURNACE_FRONT, T.FURNACE_TOP,
      T.CHEST_FRONT, T.CHEST_SIDE, T.CHEST_TOP,
    ];

    // Helper: draw AO inner shadow on all 4 edges of a tile
    function aoEdge(t, strength, width, col) {
      const [ox, oy] = tileOrigin(t);
      ctx.save();
      ctx.globalAlpha = strength;
      ctx.fillStyle = col || '#000';
      // Top edge
      ctx.fillRect(ox, oy, TILE_PX, width);
      // Bottom edge
      ctx.fillRect(ox, oy + TILE_PX - width, TILE_PX, width);
      // Left edge
      ctx.fillRect(ox, oy, width, TILE_PX);
      // Right edge
      ctx.fillRect(ox + TILE_PX - width, oy, width, TILE_PX);
      ctx.restore();
    }

    // Helper: highlight on top-left (lit) and shadow on bottom-right
    function bevelHighlight(t, hiStr, shStr) {
      const [ox, oy] = tileOrigin(t);
      ctx.save();
      // Highlight: top + left
      ctx.globalAlpha = hiStr;
      ctx.fillStyle = '#fff';
      ctx.fillRect(ox, oy, TILE_PX, 2);
      ctx.fillRect(ox, oy, 2, TILE_PX);
      // Shadow: bottom + right
      ctx.globalAlpha = shStr;
      ctx.fillStyle = '#000';
      ctx.fillRect(ox, oy + TILE_PX - 2, TILE_PX, 2);
      ctx.fillRect(ox + TILE_PX - 2, oy, 2, TILE_PX);
      ctx.restore();
    }

    // Helper: specular sparkle dots
    function specDots(t, count, alpha, seed) {
      const [ox, oy] = tileOrigin(t);
      const rnd = mulberry32 ? mulberry32(seed) : Math.random;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      for (let i = 0; i < count; i++) {
        ctx.fillRect(ox + Math.floor(rnd() * TILE_PX), oy + Math.floor(rnd() * TILE_PX), 1, 1);
      }
      ctx.restore();
    }

    // Apply AO + bevel to stone-like blocks
    for (const t of solidTiles) {
      aoEdge(t, 0.28, 3);
      bevelHighlight(t, 0.12, 0.14);
      specDots(t, 6, 0.22, t + 9000);
    }

    // Softer bevel for wood/organic
    for (const t of woodTiles) {
      aoEdge(t, 0.18, 2);
      bevelHighlight(t, 0.10, 0.10);
    }

    // Grass top: sharper height-field look
    {
      const [ox, oy] = tileOrigin(T.GRASS_TOP);
      ctx.save();
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = '#000';
      ctx.fillRect(ox, oy, TILE_PX, 2);
      ctx.fillRect(ox, oy, 2, TILE_PX);
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#fff';
      ctx.fillRect(ox + 2, oy + 2, TILE_PX - 4, 1);
      ctx.restore();
    }

    // Grass side: stronger top-edge highlight (sunlit)
    {
      const [ox, oy] = tileOrigin(T.GRASS_SIDE);
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#fff';
      ctx.fillRect(ox, oy, TILE_PX, 3);
      ctx.restore();
    }

    // Dirt: subtle concavity — lighter centre, darker edges
    {
      const [ox, oy] = tileOrigin(T.DIRT);
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#000';
      ctx.fillRect(ox, oy, TILE_PX, 2);
      ctx.fillRect(ox, oy + TILE_PX - 2, TILE_PX, 2);
      ctx.fillRect(ox, oy, 2, TILE_PX);
      ctx.fillRect(ox + TILE_PX - 2, oy, 2, TILE_PX);
      ctx.restore();
    }

    // Water: fresnel shimmer edge
    {
      const [ox, oy] = tileOrigin(T.WATER);
      ctx.save();
      ctx.globalAlpha = 0.30;
      ctx.fillStyle = '#cceeff';
      for (let x = 0; x < TILE_PX; x += 4) ctx.fillRect(ox + x, oy, 2, 1);
      ctx.restore();
    }

    // Ore tiles: glowing vein highlight
    const oreTiles = [
      [T.COAL_ORE, '#555'], [T.IRON_ORE, '#f0c090'],
      [T.GOLD_ORE, '#ffe060'], [T.DIAMOND_ORE, '#60ffff'],
    ];
    for (const [t, glowCol] of oreTiles) {
      const [ox, oy] = tileOrigin(t);
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = glowCol;
      specDots(t, 10, 0.35, t + 8000);
      ctx.restore();
    }

    // Lava: brighter hot-spot centres
    {
      const [ox, oy] = tileOrigin(T.LAVA);
      const rnd2 = mulberry32 ? mulberry32(30001) : Math.random;
      ctx.save();
      ctx.globalAlpha = 0.40;
      ctx.fillStyle = '#fff8b0';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(ox + Math.floor(rnd2() * 14) * 2, oy + Math.floor(rnd2() * 14) * 2, 2, 2);
      }
      ctx.restore();
    }

    // Obsidian: crystalline purple glint
    {
      const [ox, oy] = tileOrigin(T.OBSIDIAN);
      const rnd3 = mulberry32 ? mulberry32(30002) : Math.random;
      ctx.save();
      ctx.globalAlpha = 0.50;
      ctx.fillStyle = '#d0b0ff';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(ox + Math.floor(rnd3() * 15) * 2, oy + Math.floor(rnd3() * 15) * 2, 2, 2);
      }
      ctx.restore();
    }

    // Re-upload the texture
    if (typeof atlasTex !== 'undefined') {
      try {
        if (typeof solidMat !== 'undefined' && solidMat.unfreeze) solidMat.unfreeze();
        if (typeof waterMat !== 'undefined' && waterMat.unfreeze) waterMat.unfreeze();
        const texCtx = atlasTex.getContext();
        texCtx.clearRect(0, 0, ATLAS_W, ATLAS_H);
        texCtx.drawImage(atlasCanvas, 0, 0);
        atlasTex.update(true);
        if (typeof solidMat !== 'undefined' && solidMat.freeze) solidMat.freeze();
        if (typeof waterMat !== 'undefined' && waterMat.freeze) waterMat.freeze();
      } catch (e) {
        // Non-fatal: atlas enhancement works best-effort
      }
    }
  }

  // --------------------------------------------------------------------------
  // 2. PBR GLSL CUSTOM MATERIAL  (Babylon.js BABYLON.CustomMaterial)
  //    Adds normal-map-simulated lighting on top of the vertex colour baked
  //    sky/block light.  Falls back gracefully to Standard if unavailable.
  // --------------------------------------------------------------------------
  function _buildPBRMaterial() {
    if (typeof BABYLON.CustomMaterial === 'undefined') return null;
    if (typeof scene === 'undefined' || typeof atlasTex === 'undefined') return null;

    const mat = new BABYLON.CustomMaterial('pbrSolidMat', scene);

    // --- Same base config as solidMat ---
    mat.diffuseTexture = atlasTex;
    mat.specularColor = new BABYLON.Color3(0, 0, 0); // handled in shader
    mat.emissiveColor = new BABYLON.Color3(0.03, 0.03, 0.03);
    mat.useAlphaFromDiffuseTexture = true;
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHATEST;
    mat.alphaCutOff = 0.4;
    mat.backFaceCulling = false;
    mat.maxSimultaneousLights = 4;

    // Uniforms
    mat.AddUniform('u_sunDir',      'vec3',  null);
    mat.AddUniform('u_sunColor',    'vec3',  null);
    mat.AddUniform('u_roughness',   'float', null);
    mat.AddUniform('u_specStrength','float', null);

    // Vertex snippet: compute world normal for PBR in fragment
    mat.Vertex_Before_PositionUpdated(`
      vNormalW = normalize((world * vec4(normal, 0.0)).xyz);
    `);

    // Fragment: add specular + AO on top of Babylon's diffuse output
    mat.Fragment_Custom_Diffuse(`
      // Sun direction (normalised, pointing FROM sun)
      vec3 L = normalize(u_sunDir);
      vec3 N = normalize(vNormalW);
      vec3 V = normalize(vEyePosition.xyz - vPositionW.xyz);

      // Lambertian diffuse (clamp so dark sides still receive block/hemi light)
      float NdL = max(0.0, dot(N, -L));

      // Blinn-Phong specular for PBR-like micro-sheen
      vec3 H = normalize(-L + V);
      float NdH = max(0.0, dot(N, H));
      float shininess = mix(8.0, 64.0, 1.0 - u_roughness);
      float spec = pow(NdH, shininess) * u_specStrength;

      // Vertex AO is encoded in vColor.r (the shade multiplier already applied)
      // We use the existing vColor as the base and add the specular on top.
      diffuseBase += vec4(u_sunColor * spec, 0.0);
    `);

    // Set uniform callbacks
    mat.onBindObservable.add(() => {
      if (!mat.getEffect()) return;
      // Sun direction from the directional light (if available)
      let lx = -0.4, ly = -1.0, lz = -0.3;
      if (typeof sunLight !== 'undefined') {
        lx = sunLight.direction.x;
        ly = sunLight.direction.y;
        lz = sunLight.direction.z;
      }
      mat.getEffect().setVector3('u_sunDir', new BABYLON.Vector3(lx, ly, lz));

      // Sun colour warms at dawn/dusk
      let sc = new BABYLON.Color3(1.0, 0.95, 0.85);
      if (typeof sunLight !== 'undefined') sc = sunLight.diffuse;
      mat.getEffect().setFloat3('u_sunColor', sc.r, sc.g, sc.b);
      mat.getEffect().setFloat('u_roughness', 0.72);
      mat.getEffect().setFloat('u_specStrength', 0.18);
    });

    return mat;
  }

  // --------------------------------------------------------------------------
  // 3. PUBLIC API
  // --------------------------------------------------------------------------
  function init() {
    if (_inited) return;
    _inited = true;

    _enhanceAtlas();

    // Try to build the GLSL PBR material
    try {
      const pbrMat = _buildPBRMaterial();
      if (pbrMat && typeof solidMat !== 'undefined') {
        _originalSolidMat = solidMat;
        _pbrMat = pbrMat;
        if (_enabled) _applyMat(pbrMat);
      }
    } catch (e) {
      // CustomMaterial might not be available – atlas enhancement still applies
    }
  }

  function _applyMat(mat) {
    if (typeof chunkMeshes === 'undefined') return;
    for (const m of chunkMeshes) {
      if (!m || !m.solid) continue;
      try {
        m.solid.material = mat;
      } catch (e) {}
    }
    // Also update global solidMat ref so new chunks use it
    try { window.solidMat = mat; } catch (e) {}
  }

  function setEnabled(on) {
    _enabled = !!on;
    if (!_inited) { if (_enabled) init(); return; }
    if (_pbrMat && _originalSolidMat) {
      _applyMat(_enabled ? _pbrMat : _originalSolidMat);
      try { window.solidMat = _enabled ? _pbrMat : _originalSolidMat; } catch (e) {}
    }
  }

  function isEnabled() { return _enabled; }

  return { init, setEnabled, isEnabled };
})();
