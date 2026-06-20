"use strict";
/* ===========================================================================
 * SHADERFX — Built-in "Shadow Mod" style effects + held-light system.
 *
 * Two features live here, both designed to work out-of-the-box on the existing
 * Babylon.js voxel renderer without touching the chunk meshing pipeline:
 *
 *  1) HELD LIGHT
 *     A dynamic PointLight that follows the camera whenever the player is
 *     holding a light-emitting item (torch / lantern / glowstone-like blocks).
 *     This makes "just holding a torch lights up your surroundings" true even
 *     before the torch is placed — exactly like a held light source.
 *
 *  2) SHADOW-MOD LOOK  (toggle: Settings → Shaders)
 *     - A real-time ShadowGenerator attached to the sun (DirectionalLight) so
 *       chunks cast soft sun shadows.
 *     - A DefaultRenderingPipeline adding bloom (glowing torches/lava/sun),
 *       gentle tone-mapping/contrast and subtle vignette for a richer,
 *       "shader pack" feel.
 *     - A slightly warmer, more directional sun so terrain reads with more
 *       depth than the flat default lighting.
 *
 * All of this is additive and fully reversible via setEnabled(false), which
 * restores the vanilla flat look.
 * ========================================================================= */
const SHADERFX = (function () {
  let inited = false;
  let enabled = true;

  // --- Held light -----------------------------------------------------------
  let heldLight = null;
  // Light profiles per held block id. Tuned so a torch throws a warm, fairly
  // wide pool of light around the player.
  function heldLightProfiles() {
    if (typeof B === 'undefined') return {};
    const P = {};
    P[B.TORCH]   = { intensity: 1.9, range: 17, color: [1.0, 0.80, 0.45] };
    P[B.LANTERN] = { intensity: 2.2, range: 19, color: [1.0, 0.86, 0.58] };
    P[B.GLOW_LICHEN] = { intensity: 1.1, range: 11, color: [0.6, 0.95, 0.72] };
    P[B.AMETHYST_CLUSTER] = { intensity: 1.0, range: 10, color: [0.75, 0.55, 1.0] };
    if (typeof B.LAVA !== 'undefined') P[B.LAVA] = { intensity: 1.6, range: 13, color: [1.0, 0.5, 0.18] };
    return P;
  }
  let _profiles = null;

  // --- Shadow + post pipeline ----------------------------------------------
  let shadowGen = null;
  let pipeline = null;
  let _origSunIntensity = null;
  let _origHemiIntensity = null;
  let _shadowResyncTimer = 0;
  // Track which chunk meshes are registered as shadow casters so we only add new ones.
  const _registeredCasters = new Set();

  function init() {
    if (inited) return;
    if (typeof scene === 'undefined' || typeof BABYLON === 'undefined') return;
    _profiles = heldLightProfiles();

    // Held light: one reusable point light, disabled until needed.
    heldLight = new BABYLON.PointLight('heldLight', new BABYLON.Vector3(0, -999, 0), scene);
    heldLight.intensity = 0;
    heldLight.range = 16;
    heldLight.specular = new BABYLON.Color3(0, 0, 0);
    heldLight.setEnabled(false);
    // The voxel chunk materials cap simultaneous lights at 2 (sun + hemi). Bump
    // the chunk materials so the held light can actually affect them.
    if (typeof solidMat !== 'undefined') _raiseLightCap(solidMat);
    if (typeof waterMat !== 'undefined') _raiseLightCap(waterMat);

    inited = true;
  }

  // Raise a frozen material's max simultaneous lights so the held PointLight can
  // contribute. Materials are frozen for perf; briefly unfreeze to change the cap.
  function _raiseLightCap(mat) {
    if (!mat) return;
    try {
      if (mat.unfreeze) mat.unfreeze();
      mat.maxSimultaneousLights = 4;
      if (mat.freeze) mat.freeze();
    } catch (e) { /* ignore */ }
  }

  // --- Shadow generator setup ----------------------------------------------
  function _setupShadows() {
    if (shadowGen || typeof sunLight === 'undefined') return;
    // Map size kept modest for perf on a voxel scene; soft PCF for clean edges.
    const size = 1024;
    shadowGen = new BABYLON.ShadowGenerator(size, sunLight);
    // Percentage-closer filtering gives soft edges; it must NOT be combined with
    // the exponential shadow map (they are mutually exclusive in Babylon).
    shadowGen.usePercentageCloserFiltering = true;
    shadowGen.filteringQuality = BABYLON.ShadowGenerator.QUALITY_MEDIUM;
    shadowGen.bias = 0.0009;
    shadowGen.normalBias = 0.02;
    shadowGen.darkness = 0.55; // 0=black shadow, 1=no shadow
    // Constrain the shadow frustum to a local box around the player so the
    // shadow map resolution is spent near the camera (the world is huge).
    sunLight.autoUpdateExtends = false;
    sunLight.autoCalcShadowZBounds = false;
    sunLight.shadowMinZ = -120;
    sunLight.shadowMaxZ = 120;
    sunLight.shadowOrthoScale = 0.1;
    sunLight.orthoLeft = -70;
    sunLight.orthoRight = 70;
    sunLight.orthoTop = 70;
    sunLight.orthoBottom = -70;
    _registerExistingCasters();
  }
  // Keep the directional shadow frustum centred on the player each frame so
  // shadows stay sharp and local instead of trying to cover the whole map.
  function _followPlayerWithSun() {
    if (!shadowGen || typeof sunLight === 'undefined' || typeof player === 'undefined') return;
    // Anchor the light's notional position above the player along -direction so
    // the orthographic shadow box brackets the area around the camera.
    const d = sunLight.direction;
    sunLight.position.set(
      player.pos.x - d.x * 90,
      player.pos.y - d.y * 90,
      player.pos.z - d.z * 90
    );
  }

  // Register all currently-built chunk solid meshes as shadow casters/receivers.
  function _registerExistingCasters() {
    if (!shadowGen || typeof chunkMeshes === 'undefined') return;
    for (const m of chunkMeshes) {
      if (!m || !m.solid) continue;
      if (_registeredCasters.has(m.solid.uniqueId)) continue;
      shadowGen.addShadowCaster(m.solid, false);
      m.solid.receiveShadows = true;
      _registeredCasters.add(m.solid.uniqueId);
    }
  }

  function _teardownShadows() {
    if (shadowGen) {
      try { shadowGen.dispose(); } catch (e) {}
      shadowGen = null;
    }
    _registeredCasters.clear();
  }

  // --- Post-processing pipeline (bloom / tone / vignette) -------------------
  function _setupPipeline() {
    if (pipeline || typeof camera === 'undefined') return;
    pipeline = new BABYLON.DefaultRenderingPipeline('shaderfx', true, scene, [camera]);
    // Bloom — makes torches, lava, the sun and bright sky glow.
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.72;
    pipeline.bloomWeight = 0.55;
    pipeline.bloomKernel = 48;
    pipeline.bloomScale = 0.5;
    // Tone mapping + slight contrast for a richer, shader-pack feel.
    pipeline.imageProcessingEnabled = true;
    const ip = pipeline.imageProcessing;
    ip.toneMappingEnabled = true;
    ip.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    ip.exposure = 1.05;
    ip.contrast = 1.12;
    ip.vignetteEnabled = true;
    ip.vignetteWeight = 1.4;
    ip.vignetteStretch = 0.5;
    ip.vignetteColor = new BABYLON.Color4(0, 0, 0, 0);
    // Soft FXAA to take the edge off shimmering voxel edges with post on.
    pipeline.fxaaEnabled = true;
  }

  function _teardownPipeline() {
    if (pipeline) {
      try { pipeline.dispose(); } catch (e) {}
      pipeline = null;
    }
  }

  // --- Lighting tweak (warmer / more directional sun while shaders on) ------
  function _applyLightingTweak(on) {
    if (typeof sunLight === 'undefined' || typeof hemiLight === 'undefined') return;
    if (on) {
      if (_origSunIntensity === null) _origSunIntensity = sunLight.intensity;
      if (_origHemiIntensity === null) _origHemiIntensity = hemiLight.intensity;
      // Warmer sun + slightly lower fill so shadows/depth read more strongly.
      sunLight.diffuse = new BABYLON.Color3(1.0, 0.95, 0.84);
      hemiLight.intensity = 0.7;
    } else {
      if (_origSunIntensity !== null) sunLight.intensity = _origSunIntensity;
      if (_origHemiIntensity !== null) hemiLight.intensity = _origHemiIntensity;
      sunLight.diffuse = new BABYLON.Color3(1, 1, 1);
    }
  }

  // --- Public: enable / disable whole shadow-mod stack ----------------------
  function setEnabled(on) {
    enabled = !!on;
    if (!inited) init();
    if (enabled) {
      _setupShadows();
      _setupPipeline();
      _applyLightingTweak(true);
    } else {
      _teardownShadows();
      _teardownPipeline();
      _applyLightingTweak(false);
    }
  }
  function isEnabled() { return enabled; }

  // --- Per-frame update -----------------------------------------------------
  function update(dt) {
    if (!inited) return;
    _updateHeldLight();
    if (enabled && shadowGen) {
      _followPlayerWithSun();
      // New chunks stream in over time; periodically pick them up as casters.
      _shadowResyncTimer -= dt;
      if (_shadowResyncTimer <= 0) {
        _shadowResyncTimer = 0.5;
        _registerExistingCasters();
      }
    }
  }

  // Decide whether the player is currently holding a light source, and if so
  // position + power the held light at the camera. Works in every camera view.
  function _updateHeldLight() {
    if (!heldLight) return;
    let prof = null;
    if (typeof inventory !== 'undefined' && typeof selectedSlot !== 'undefined') {
      const slot = inventory[selectedSlot];
      if (slot && _profiles && _profiles[slot.id]) prof = _profiles[slot.id];
    }
    if (!prof) {
      if (heldLight.intensity !== 0) { heldLight.intensity = 0; heldLight.setEnabled(false); }
      return;
    }
    if (typeof camera === 'undefined') return;
    // Position a touch in front of / below the eye so it reads like a hand-held
    // torch rather than a light stuck to the face.
    const fwd = camera.getDirection(BABYLON.Vector3.Forward());
    heldLight.position.set(
      camera.position.x + fwd.x * 0.5,
      camera.position.y - 0.25 + fwd.y * 0.5,
      camera.position.z + fwd.z * 0.5
    );
    const c = prof.color;
    heldLight.diffuse = new BABYLON.Color3(c[0], c[1], c[2]);
    heldLight.range = prof.range;
    // A gentle flicker for a living-flame feel.
    const flicker = 0.92 + Math.sin(performance.now() * 0.012) * 0.04 + (Math.random() - 0.5) * 0.04;
    heldLight.intensity = prof.intensity * flicker;
    heldLight.setEnabled(true);
  }

  return { init, setEnabled, isEnabled, update };
})();
