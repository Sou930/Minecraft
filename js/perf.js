"use strict";
/* ===========================================================================
 * PERF — adaptive performance governor that targets ~60 FPS.
 *
 * Strategy (cheapest knob first, most visible knob last):
 *   1. Render-distance scaling  — shrink VIEW_DIST_CHUNKS / fog when slow,
 *                                 grow it back when there is spare frame budget.
 *   2. Hardware-scaling (DPR)   — render fewer device pixels and upscale; this
 *                                 is the heaviest hammer so it is only pulled
 *                                 after distance is already at its floor.
 *
 * The governor samples a smoothed FPS (engine.getFps()) a few times a second
 * and nudges one knob per evaluation, with hysteresis + cooldowns so the view
 * never visibly "pumps" in and out. It is fully self-contained: it only reads
 * engine.getFps() and calls existing setViewDistance()/fog helpers, so the rest
 * of the game does not need to know it exists.
 * ========================================================================= */
const PERF = (function () {
  const TARGET_FPS = 60;
  // Act when we drift outside this band around the target.
  const LOW_FPS = 52;   // below this for a while -> reduce quality
  const HIGH_FPS = 58;  // sustained above this -> try to restore quality

  // View-distance bounds (in chunks). The governor only moves within this band;
  // the user's chosen render-distance preset sets the *ceiling*.
  const MIN_DIST = 4;
  let maxDist = 14;          // updated from the active render preset
  let curDist = 14;

  // Hardware-scaling (device-pixel ratio) bounds. 1.0 = native; >1 = upscale.
  const baseScale = (typeof window !== 'undefined') ? Math.max(1, Math.min(2, window.devicePixelRatio || 1)) : 1;
  const MAX_SCALE = Math.min(2.2, baseScale + 1.0); // allow up to ~+1 step coarser
  let curScale = baseScale;

  let enabled = true;
  let evalTimer = 0;
  const EVAL_INTERVAL = 0.5;   // seconds between decisions
  let lowStreak = 0, highStreak = 0;
  // Frames to confirm a trend before acting (×EVAL_INTERVAL).
  const CONFIRM_DOWN = 2;      // ~1.0s sustained slowdown
  const CONFIRM_UP = 6;        // ~3.0s sustained headroom (restore conservatively)

  // Re-read the ceiling whenever the user changes the render-distance preset.
  function syncCeiling() {
    if (typeof VIEW_DIST_CHUNKS === 'number') {
      maxDist = VIEW_DIST_CHUNKS;
      // Snap current toward the new ceiling (don't exceed it).
      if (curDist > maxDist) { curDist = maxDist; applyDist(); }
    }
  }

  function applyDist() {
    if (typeof setViewDistance === 'function') setViewDistance(curDist);
    // Pull fog in with the view distance so the world fades out at the edge of
    // what is actually rendered (avoids hard "pop" at the cull boundary).
    if (typeof scene !== 'undefined') {
      const end = curDist * CHUNK * 0.95;
      scene.fogEnd = end;
      scene.fogStart = Math.max(CHUNK * 2, end * 0.55);
      if (typeof camera !== 'undefined') camera.maxZ = Math.max(200, end + 120);
    }
  }

  function applyScale() {
    if (typeof engine !== 'undefined' && engine.setHardwareScalingLevel) {
      engine.setHardwareScalingLevel(curScale);
    }
  }

  // Called by settings.applyRenderDistance() so the governor's ceiling tracks
  // the user's preset and it restarts from that preset's distance.
  function onPresetChanged(presetChunks) {
    maxDist = presetChunks;
    curDist = presetChunks;
    applyDist();
    // Give the new setting a clean slate to prove itself before adapting.
    lowStreak = highStreak = 0;
    evalTimer = 0;
  }

  function setEnabled(on) { enabled = !!on; }
  function isEnabled() { return enabled; }

  function update(dt) {
    if (!enabled) return;
    if (typeof engine === 'undefined') return;
    evalTimer += dt;
    if (evalTimer < EVAL_INTERVAL) return;
    evalTimer = 0;

    const fps = engine.getFps();
    // Ignore warm-up / tab-hidden garbage readings.
    if (!isFinite(fps) || fps <= 0) return;

    if (fps < LOW_FPS) {
      lowStreak++; highStreak = 0;
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
      // Inside the comfort band: decay both streaks toward neutral.
      if (lowStreak > 0) lowStreak--;
      if (highStreak > 0) highStreak--;
    }
  }

  // Reduce quality one notch: shrink view distance first, then coarsen DPR.
  function stepDown() {
    if (curDist > MIN_DIST) {
      curDist = Math.max(MIN_DIST, curDist - 2);
      applyDist();
    } else if (curScale < MAX_SCALE) {
      curScale = Math.min(MAX_SCALE, +(curScale + 0.15).toFixed(3));
      applyScale();
    }
  }

  // Restore quality one notch in the reverse order (DPR back to native first,
  // then push view distance back out toward the user's ceiling).
  function stepUp() {
    if (curScale > baseScale) {
      curScale = Math.max(baseScale, +(curScale - 0.15).toFixed(3));
      applyScale();
    } else if (curDist < maxDist) {
      curDist = Math.min(maxDist, curDist + 1);
      applyDist();
    }
  }

  function stats() {
    return {
      fps: (typeof engine !== 'undefined') ? Math.round(engine.getFps()) : 0,
      dist: curDist, maxDist, scale: +curScale.toFixed(2), enabled,
    };
  }

  return { update, onPresetChanged, syncCeiling, setEnabled, isEnabled, stats, TARGET_FPS };
})();
