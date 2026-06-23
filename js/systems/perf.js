"use strict";
/* ===========================================================================
 * PERF — Adaptive performance governor.
 *
 * Targets 60 FPS on desktop, 30 FPS on mobile (iPad 7th gen and similar
 * low-GPU-bandwidth devices).  The governor monitors smoothed frame rate and
 * progressively reduces quality until the target is met, then gradually
 * restores quality when there is spare budget.
 *
 * Quality knobs (cheapest first):
 *   1. Render-distance scaling  — shrink VIEW_DIST_CHUNKS + fog end
 *   2. Hardware-scaling (DPR)   — render fewer device pixels and upscale
 *   3. Shadow quality           — disable shadows on mobile below 25 FPS
 *   4. God rays                 — disable on mobile below 28 FPS
 *
 * Mobile detection uses the existing isMobile flag from config.js so the
 * target FPS and knob thresholds differ automatically between platforms.
 *
 * Hysteresis + cooldowns prevent the view from visibly "pumping" in/out.
 * ========================================================================= */
const PERF = (function () {
  // Detect if we are running on a mobile / tablet device
  const _onMobile = (typeof isMobile !== 'undefined') ? isMobile
    : (('ontouchstart' in window) && /Mobi|Android|iPhone|iPad|Tablet/i.test(navigator.userAgent));

  // --------------------------------------------------------------------------
  // FPS targets differ per platform.
  // iPad 7 (A10 Fusion GPU) comfortably holds 30 FPS for a voxel scene at
  // 1× DPR; targeting 30 avoids constant quality oscillation on that device.
  // --------------------------------------------------------------------------
  const TARGET_FPS = _onMobile ? 30 : 60;

  // Action thresholds — defined as fractions of target so they scale with it
  const LOW_FPS  = Math.round(TARGET_FPS * 0.87);  // below → reduce quality
  const HIGH_FPS = Math.round(TARGET_FPS * 0.97);  // above → restore quality

  // Shadow / god-ray emergency thresholds (mobile only)
  const SHADOW_DISABLE_FPS   = Math.round(TARGET_FPS * 0.83); // e.g. 25 @ 30fps
  const GODRAY_DISABLE_FPS   = Math.round(TARGET_FPS * 0.93); // e.g. 28 @ 30fps

  // View-distance bounds (chunks)
  const MIN_DIST = _onMobile ? 3 : 4;
  let maxDist = _onMobile ? 8 : 14;
  let curDist  = maxDist;

  // Hardware-scaling (device-pixel ratio) bounds
  const baseScale = (typeof window !== 'undefined')
    ? Math.max(1, Math.min(2, window.devicePixelRatio || 1)) : 1;
  // On mobile we allow a coarser step (render at ~0.75× native and upscale)
  const MAX_SCALE = _onMobile
    ? Math.min(2.5, baseScale + 1.4)
    : Math.min(2.2, baseScale + 1.0);
  let curScale = baseScale;

  let enabled = true;
  let evalTimer = 0;
  const EVAL_INTERVAL = _onMobile ? 0.8 : 0.5; // check less often on mobile
  let lowStreak = 0, highStreak = 0;
  // How many consecutive low/high readings before acting (×EVAL_INTERVAL)
  const CONFIRM_DOWN = _onMobile ? 2 : 2;   // ~1.6s mobile / ~1.0s desktop
  const CONFIRM_UP   = _onMobile ? 8 : 6;   // ~6.4s mobile / ~3.0s desktop

  // Track whether we forcibly disabled optional effects due to low FPS
  let _shadowsKilled = false;
  let _godRaysKilled = false;

  // --------------------------------------------------------------------------
  // Re-read the user's chosen render-distance preset (called from settings)
  // --------------------------------------------------------------------------
  function syncCeiling() {
    if (typeof VIEW_DIST_CHUNKS === 'number') {
      // On mobile, cap the user's chosen value to a sane mobile maximum
      const rawCeil = VIEW_DIST_CHUNKS;
      maxDist = _onMobile ? Math.min(rawCeil, 10) : rawCeil;
      if (curDist > maxDist) { curDist = maxDist; applyDist(); }
    }
  }

  function applyDist() {
    if (typeof setViewDistance === 'function') setViewDistance(curDist);
    if (typeof scene !== 'undefined') {
      const end = curDist * CHUNK * 0.95;
      scene.fogEnd   = end;
      scene.fogStart = Math.max(CHUNK * 2, end * (_onMobile ? 0.50 : 0.55));
      if (typeof camera !== 'undefined') camera.maxZ = Math.max(200, end + 120);
    }
  }

  function applyScale() {
    if (typeof engine !== 'undefined' && engine.setHardwareScalingLevel) {
      engine.setHardwareScalingLevel(curScale);
    }
  }

  // Called by settings after the user picks a new render-distance preset
  function onPresetChanged(presetChunks) {
    const capped = _onMobile ? Math.min(presetChunks, 10) : presetChunks;
    maxDist = capped;
    curDist = capped;
    applyDist();
    lowStreak = highStreak = 0;
    evalTimer = 0;
  }

  function setEnabled(on) { enabled = !!on; }
  function isEnabled() { return enabled; }

  // --------------------------------------------------------------------------
  // Per-frame update: evaluate FPS every EVAL_INTERVAL seconds
  // --------------------------------------------------------------------------
  function update(dt) {
    if (!enabled) return;
    if (typeof engine === 'undefined') return;
    evalTimer += dt;
    if (evalTimer < EVAL_INTERVAL) return;
    evalTimer = 0;

    const fps = engine.getFps();
    if (!isFinite(fps) || fps <= 0) return;

    if (fps < LOW_FPS) {
      lowStreak++; highStreak = 0;
      // Mobile: emergency disable of expensive optional effects first
      if (_onMobile) _emergencyReduceMobile(fps);
      if (lowStreak >= CONFIRM_DOWN) {
        lowStreak = 0;
        stepDown();
      }
    } else if (fps > HIGH_FPS) {
      highStreak++; lowStreak = 0;
      if (highStreak >= CONFIRM_UP) {
        highStreak = 0;
        stepUp();
      }
    } else {
      if (lowStreak > 0) lowStreak--;
      if (highStreak > 0) highStreak--;
    }
  }

  // Mobile emergency: progressively kill optional effects before cutting DPR
  function _emergencyReduceMobile(fps) {
    if (fps < GODRAY_DISABLE_FPS && !_godRaysKilled) {
      _godRaysKilled = true;
      if (typeof SHADERFX !== 'undefined' && SHADERFX.setGodRaysEnabled) {
        SHADERFX.setGodRaysEnabled(false);
      }
    }
    if (fps < SHADOW_DISABLE_FPS && !_shadowsKilled) {
      _shadowsKilled = true;
      if (typeof SHADERFX !== 'undefined') {
        SHADERFX.setEnabled(false); // disables shadows + pipeline but not god rays
      }
    }
  }

  // Restore optional effects once FPS is healthy again (mobile only)
  function _emergencyRestoreMobile() {
    if (_shadowsKilled) {
      _shadowsKilled = false;
      if (typeof SHADERFX !== 'undefined') {
        SHADERFX.setEnabled(true);
      }
    }
    if (_godRaysKilled) {
      _godRaysKilled = false;
      if (typeof SHADERFX !== 'undefined' && SHADERFX.setGodRaysEnabled) {
        SHADERFX.setGodRaysEnabled(true);
      }
    }
  }

  // Reduce quality one notch: view distance first, then DPR
  function stepDown() {
    if (curDist > MIN_DIST) {
      curDist = Math.max(MIN_DIST, curDist - 2);
      applyDist();
    } else if (curScale < MAX_SCALE) {
      curScale = Math.min(MAX_SCALE, +(curScale + 0.20).toFixed(3));
      applyScale();
    }
  }

  // Restore quality one notch (DPR back to native first, then distance out)
  function stepUp() {
    // Try to re-enable effects before restoring rendering resolution
    if (_onMobile && (_shadowsKilled || _godRaysKilled)) {
      _emergencyRestoreMobile();
      return; // give it one evaluation cycle to prove stability
    }
    if (curScale > baseScale) {
      curScale = Math.max(baseScale, +(curScale - 0.20).toFixed(3));
      applyScale();
    } else if (curDist < maxDist) {
      curDist = Math.min(maxDist, curDist + 1);
      applyDist();
    }
  }

  function stats() {
    return {
      fps: (typeof engine !== 'undefined') ? Math.round(engine.getFps()) : 0,
      dist: curDist, maxDist,
      scale: +curScale.toFixed(2),
      enabled,
      mobile: _onMobile,
      targetFps: TARGET_FPS,
    };
  }

  return {
    update, onPresetChanged, syncCeiling,
    setEnabled, isEnabled, stats,
    TARGET_FPS,
    isMobileMode: () => _onMobile,
  };
})();
