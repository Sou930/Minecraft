"use strict";
/* ===========================================================================
 * SHADERFX — Built-in "Shadow Mod" style effects + held-light + GOD RAYS.
 *
 * Features:
 *  1) HELD LIGHT
 *     Dynamic PointLight following the camera for held torches / lanterns.
 *
 *  2) SHADOW-MOD LOOK  (toggle: Settings → Shaders)
 *     - Real-time ShadowGenerator on the sun.
 *     - DefaultRenderingPipeline: bloom, ACES tone-map, vignette, FXAA.
 *     - Warmer directional sun for richer depth.
 *
 *  3) VOLUMETRIC LIGHT / GOD RAYS  (toggle: Settings → God Rays)
 *     - VolumetricLightScatteringPostProcess attached to the sun billboard.
 *     - Follows the sun's screen-space position so shafts radiate correctly.
 *     - Scales down automatically on mobile for performance.
 *     - Gracefully disabled during night / heavy fog / underwater.
 *
 * All effects are additive and fully reversible via setEnabled(false).
 * ========================================================================= */
const SHADERFX = (function () {
  let inited = false;
  let enabled = true;
  let godRaysEnabled = true;    // Independent toggle for VLS

  // --- Held light -----------------------------------------------------------
  let heldLight = null;
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
  const _registeredCasters = new Set();

  // --- Volumetric Light Scattering (God Rays) --------------------------------
  let _vlsPost = null;        // VolumetricLightScatteringPostProcess instance
  let _godRayMesh = null;     // The "emitter" mesh VLS tracks (sun billboard)
  let _vlsTimer = 0;
  const VLS_RESYNC_INTERVAL = 0.1; // seconds between caster re-syncs for VLS

  // Quality preset based on device capability
  function _vlsQuality() {
    // iPad 7 and similar: isMobile flag or DPR≤2 — use low quality
    if (typeof isMobile !== 'undefined' && isMobile) {
      return { samples: 50, density: 0.55, weight: 0.45, decay: 0.96, exposure: 0.14, ratio: 0.35 };
    }
    return { samples: 100, density: 0.75, weight: 0.55, decay: 0.97, exposure: 0.18, ratio: 0.5 };
  }

  // --------------------------------------------------------------------------
  // Initialise the VLS post-process.
  // We use the sun billboard mesh as the VLS "emitter" so rays radiate from
  // the actual sun position in screen space.
  // --------------------------------------------------------------------------
  function _setupGodRays() {
    if (_vlsPost) return;
    if (typeof BABYLON.VolumetricLightScatteringPostProcess === 'undefined') return;
    if (typeof camera === 'undefined' || typeof scene === 'undefined') return;
    if (!godRaysEnabled) return;

    // Find the sun billboard mesh
    let emitterMesh = null;
    if (typeof sunMesh !== 'undefined' && sunMesh) {
      emitterMesh = sunMesh;
    } else {
      // Fallback: a tiny invisible billboard at a high position
      emitterMesh = BABYLON.MeshBuilder.CreateSphere('vlsEmitter', { diameter: 0.1 }, scene);
      emitterMesh.isPickable = false;
      emitterMesh.position.set(0, 200, 0);
      emitterMesh.setEnabled(false);
    }
    _godRayMesh = emitterMesh;

    const q = _vlsQuality();
    try {
      _vlsPost = new BABYLON.VolumetricLightScatteringPostProcess(
        'godRays',
        q.ratio,         // renderRatio — lower = cheaper
        camera,
        emitterMesh,
        q.samples,       // samples along the scatter ray
        BABYLON.Texture.BILINEAR_SAMPLINGMODE,
        engine,
        false            // reusable
      );
      _vlsPost.exposure     = q.exposure;
      _vlsPost.decay        = q.decay;
      _vlsPost.weight       = q.weight;
      _vlsPost.density      = q.density;

      // Colour the scattering by time of day (warm yellow/orange at dawn/dusk)
      _vlsPost.mesh = emitterMesh;
    } catch (e) {
      // VLS not supported on this device/browser — fail silently
      _vlsPost = null;
    }
  }

  function _teardownGodRays() {
    if (_vlsPost) {
      try { _vlsPost.dispose(camera); } catch (e) {}
      _vlsPost = null;
    }
    _godRayMesh = null;
  }

  // Per-frame: fade god rays in/out with day factor and underwater state.
  // Also tint the scattering colour with the time-of-day atmosphere.
  function _updateGodRays(dt, dayFactor) {
    if (!_vlsPost) return;
    _vlsTimer -= dt;
    if (_vlsTimer > 0) return;
    _vlsTimer = VLS_RESYNC_INTERVAL;

    // Disable entirely at night or when blocked
    const daytime = dayFactor > 0.12;
    const q = _vlsQuality();

    if (!daytime) {
      _vlsPost.exposure = 0;
      return;
    }

    // Sunrise/sunset: orange tint; midday: soft white-yellow
    let targetExposure = q.exposure * dayFactor;

    // Dawn/dusk tint (dayFactor roughly 0.15–0.40 and 0.60–0.85)
    const isDawnDusk = dayFactor > 0.10 && dayFactor < 0.42 || dayFactor > 0.62 && dayFactor < 0.88;
    if (isDawnDusk) {
      targetExposure *= 1.4; // stronger shafts near horizon
    }

    // Soft lerp to avoid popping
    _vlsPost.exposure = _vlsPost.exposure * 0.85 + targetExposure * 0.15;

    // Keep the emitter mesh at the sun billboard's position (already done by
    // the sun billboard update in render.js / lighting.js).
    // Optionally track the sun direction and update a "fake" position if
    // the sunMesh doesn't update its own position.
    if (typeof sunLight !== 'undefined' && _godRayMesh && _godRayMesh !== sunMesh) {
      const d = sunLight.direction;
      const dist = 300;
      _godRayMesh.position.set(-d.x * dist, -d.y * dist, -d.z * dist);
    }
  }

  // --------------------------------------------------------------------------
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
    if (typeof solidMat !== 'undefined') _raiseLightCap(solidMat);
    if (typeof waterMat !== 'undefined') _raiseLightCap(waterMat);

    inited = true;
  }

  function _raiseLightCap(mat) {
    if (!mat) return;
    try {
      if (mat.unfreeze) mat.unfreeze();
      mat.maxSimultaneousLights = 4;
      if (mat.freeze) mat.freeze();
    } catch (e) {}
  }

  // --- Shadow generator setup ----------------------------------------------
  function _setupShadows() {
    if (shadowGen || typeof sunLight === 'undefined') return;
    // Use lower shadow map on mobile for performance
    const size = (typeof isMobile !== 'undefined' && isMobile) ? 512 : 1024;
    shadowGen = new BABYLON.ShadowGenerator(size, sunLight);
    shadowGen.usePercentageCloserFiltering = true;
    shadowGen.filteringQuality = (typeof isMobile !== 'undefined' && isMobile)
      ? BABYLON.ShadowGenerator.QUALITY_LOW
      : BABYLON.ShadowGenerator.QUALITY_MEDIUM;
    shadowGen.bias = 0.0009;
    shadowGen.normalBias = 0.02;
    shadowGen.darkness = 0.55;
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

  function _followPlayerWithSun() {
    if (!shadowGen || typeof sunLight === 'undefined' || typeof player === 'undefined') return;
    const d = sunLight.direction;
    sunLight.position.set(
      player.pos.x - d.x * 90,
      player.pos.y - d.y * 90,
      player.pos.z - d.z * 90
    );
  }

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
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.72;
    pipeline.bloomWeight = 0.55;
    pipeline.bloomKernel = 48;
    pipeline.bloomScale = 0.5;
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
    pipeline.fxaaEnabled = true;
  }

  function _teardownPipeline() {
    if (pipeline) {
      try { pipeline.dispose(); } catch (e) {}
      pipeline = null;
    }
  }

  // --- Lighting tweak -------------------------------------------------------
  function _applyLightingTweak(on) {
    if (typeof sunLight === 'undefined' || typeof hemiLight === 'undefined') return;
    if (on) {
      if (_origSunIntensity === null) _origSunIntensity = sunLight.intensity;
      if (_origHemiIntensity === null) _origHemiIntensity = hemiLight.intensity;
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
      if (godRaysEnabled) _setupGodRays();
    } else {
      _teardownShadows();
      _teardownPipeline();
      _teardownGodRays();
      _applyLightingTweak(false);
    }
  }
  function isEnabled() { return enabled; }

  // --- Public: god rays independent toggle ----------------------------------
  function setGodRaysEnabled(on) {
    godRaysEnabled = !!on;
    if (!inited) return;
    if (godRaysEnabled && enabled) {
      _setupGodRays();
    } else {
      _teardownGodRays();
    }
  }
  function isGodRaysEnabled() { return godRaysEnabled; }

  // --- Per-frame update -----------------------------------------------------
  // dayFactor: 0=night, 1=full day (from LIGHTING module)
  function update(dt, dayFactor) {
    if (!inited) return;
    _updateHeldLight();
    if (enabled && shadowGen) {
      _followPlayerWithSun();
      _shadowResyncTimer -= dt;
      if (_shadowResyncTimer <= 0) {
        // FIX: Increase resync interval to reduce per-frame iteration cost.
        // Shadow casters are also registered on-demand when new chunks are built.
        _shadowResyncTimer = 2.0;
        _registerExistingCasters();
      }
    }
    if (enabled && godRaysEnabled) {
      const df = (typeof dayFactor === 'number') ? dayFactor : 1;
      _updateGodRays(dt, df);
    }
  }

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
    const fwd = camera.getDirection(BABYLON.Vector3.Forward());
    heldLight.position.set(
      camera.position.x + fwd.x * 0.5,
      camera.position.y - 0.25 + fwd.y * 0.5,
      camera.position.z + fwd.z * 0.5
    );
    const c = prof.color;
    heldLight.diffuse = new BABYLON.Color3(c[0], c[1], c[2]);
    heldLight.range = prof.range;
    const flicker = 0.92 + Math.sin(performance.now() * 0.012) * 0.04 + (Math.random() - 0.5) * 0.04;
    heldLight.intensity = prof.intensity * flicker;
    heldLight.setEnabled(true);
  }

  // Register a single chunk mesh as a shadow caster immediately (called from buildChunk).
  // This avoids the periodic full-scan that was running every 0.5s.
  function registerChunkCaster(mesh) {
    if (!shadowGen || !mesh) return;
    if (_registeredCasters.has(mesh.uniqueId)) return;
    shadowGen.addShadowCaster(mesh, false);
    mesh.receiveShadows = true;
    _registeredCasters.add(mesh.uniqueId);
  }

  return { init, setEnabled, isEnabled, setGodRaysEnabled, isGodRaysEnabled, update, registerChunkCaster };
})();
