"use strict";
// SFX — procedural audio via Web Audio API (no external files)
const SFX = (function () {
  let ctx = null;
  let master = null;
  let enabled = true;
  let masterVol = 0.6;

  let ambient = null;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { enabled = false; return null; }
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = masterVol;
    master.connect(ctx.destination);
    return ctx;
  }

  function resume() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
  }

  // White noise buffer
  let noiseBuf = null;
  function noiseBuffer() {
    if (noiseBuf) return noiseBuf;
    const len = ctx.sampleRate * 1.0;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  // Filtered noise burst
  function noiseBurst({ dur = 0.15, vol = 0.4, type = 'bandpass', freq = 800, q = 1, decay = 1, dest = null }) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    filt.Q.value = q;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0008, now + dur * decay);
    src.connect(filt); filt.connect(g); g.connect(dest || master);
    src.start(now); src.stop(now + dur * decay + 0.02);
  }

  // Oscillator tone
  function tone({ freq = 440, dur = 0.12, vol = 0.25, type = 'sine', glide = 0, dest = null }) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + glide), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0006, now + dur);
    osc.connect(g); g.connect(dest || master);
    osc.start(now); osc.stop(now + dur + 0.02);
  }

  // Block ID → material category
  function materialOf(id) {
    if (typeof B === 'undefined') return 'stone';
    switch (id) {
      case B.GRASS: case B.MOSS: case B.PATH: return 'grass';
      case B.DIRT: case B.FARMLAND: case B.FARMLAND_WET: return 'dirt';
      case B.SAND: case B.SANDSTONE: return 'sand';
      case B.GRAVEL: return 'gravel';
      case B.LOG: case B.BIRCH_LOG: case B.DEAD_LOG: case B.PLANKS:
      case B.CRAFTING: case B.BOOKSHELF: case B.CACTUS: return 'wood';
      case B.GLASS: case B.ICE: case B.AMETHYST_BLOCK: case B.AMETHYST_CLUSTER: return 'glass';
      case B.IRON_ORE: case B.GOLD_ORE: case B.DIAMOND_ORE: case B.LANTERN:
      case B.RAIL: return 'metal';
      case B.LEAVES: case B.BIRCH_LEAVES: case B.SEAWEED: case B.COBWEB:
      case B.GLOW_LICHEN: return 'leaves';
      case B.WOOL_RED: case B.WOOL_WHITE: case B.HAY: return 'wool';
      case B.WHEAT: case B.CARROT: case B.POTATO: case B.PUMPKIN: case B.MELON:
      case B.DEAD_BUSH: case B.CORAL_PINK: case B.CORAL_PURPLE: case B.CORAL_BLUE:
      case B.TORCH: return 'plant';
      case B.WATER: case B.LAVA: return 'liquid';
      case B.SNOW: return 'snow';
      case B.STONE: case B.COBBLE: case B.BRICK: case B.BEDROCK: case B.OBSIDIAN:
      case B.COAL_ORE: case B.STONE_BRICK: case B.MOSSY_BRICK: case B.CRACKED_BRICK:
      case B.DRIPSTONE: case B.CALCITE: case B.SMOOTH_BASALT: case B.FURNACE:
      default: return 'stone';
    }
  }

  // Full break sound
  function dig(id, opts) { return _step(id, true, opts); }
  function place(id, opts) {
    const mat = materialOf(id);
    if (!ensure() || !enabled) return;
    resume();
    switch (mat) {
      case 'wood': tone({ freq: 180, dur: 0.1, vol: 0.22, type: 'square', glide: -60 }); noiseBurst({ dur: 0.06, vol: 0.12, freq: 900, q: 1.2 }); break;
      case 'glass': tone({ freq: 1200, dur: 0.08, vol: 0.16, type: 'triangle' }); tone({ freq: 1800, dur: 0.06, vol: 0.1, type: 'sine' }); break;
      case 'metal': tone({ freq: 520, dur: 0.13, vol: 0.18, type: 'triangle', glide: 120 }); break;
      case 'wool': noiseBurst({ dur: 0.12, vol: 0.18, freq: 420, q: 0.7, type: 'lowpass' }); break;
      case 'sand': case 'gravel': case 'snow': noiseBurst({ dur: 0.1, vol: 0.22, freq: 1400, q: 0.6 }); break;
      case 'dirt': case 'grass': noiseBurst({ dur: 0.1, vol: 0.2, freq: 500, q: 0.8, type: 'lowpass' }); break;
      case 'plant': case 'leaves': noiseBurst({ dur: 0.09, vol: 0.14, freq: 2600, q: 0.5 }); break;
      default: tone({ freq: 150, dur: 0.09, vol: 0.2, type: 'square', glide: -40 }); noiseBurst({ dur: 0.07, vol: 0.16, freq: 700, q: 1.0 });
    }
  }

  // Footstep sound
  function footstep(id) {
    if (!ensure() || !enabled) return;
    resume();
    const mat = materialOf(id);
    const v = 0.10 + Math.random() * 0.04;
    switch (mat) {
      case 'grass': case 'plant': case 'leaves': noiseBurst({ dur: 0.08, vol: v, freq: 1700 + Math.random() * 400, q: 0.6 }); break;
      case 'dirt': noiseBurst({ dur: 0.08, vol: v, freq: 600 + Math.random() * 200, q: 0.7, type: 'lowpass' }); break;
      case 'sand': noiseBurst({ dur: 0.09, vol: v * 0.9, freq: 1100 + Math.random() * 300, q: 0.5 }); break;
      case 'gravel': noiseBurst({ dur: 0.07, vol: v, freq: 2000 + Math.random() * 600, q: 0.4 }); break;
      case 'snow': noiseBurst({ dur: 0.1, vol: v * 0.8, freq: 2400 + Math.random() * 500, q: 0.4 }); break;
      case 'wood': noiseBurst({ dur: 0.06, vol: v, freq: 380, q: 1.4 }); tone({ freq: 150, dur: 0.05, vol: v * 0.5, type: 'square' }); break;
      case 'glass': case 'metal': tone({ freq: 700 + Math.random() * 200, dur: 0.05, vol: v * 0.6, type: 'triangle' }); break;
      case 'wool': noiseBurst({ dur: 0.09, vol: v * 0.7, freq: 350, q: 0.6, type: 'lowpass' }); break;
      case 'liquid': noiseBurst({ dur: 0.12, vol: v * 0.8, freq: 900, q: 0.5, type: 'lowpass' }); break;
      default: noiseBurst({ dur: 0.07, vol: v, freq: 500 + Math.random() * 200, q: 0.9, type: 'lowpass' }); // stone
    }
  }

  function _step(id, isDig, opts) {
    if (!ensure() || !enabled) return;
    resume();
    const mat = materialOf(id);
    const v = (opts && opts.vol) || 0.3;
    switch (mat) {
      case 'wood':
        noiseBurst({ dur: 0.18, vol: v, freq: 420, q: 1.2, type: 'bandpass' });
        tone({ freq: 130, dur: 0.14, vol: v * 0.6, type: 'square', glide: -50 }); break;
      case 'glass':
          tone({ freq: 1800, dur: 0.12, vol: v * 0.6, type: 'triangle' });
        tone({ freq: 2600, dur: 0.1, vol: v * 0.45, type: 'sine' });
        noiseBurst({ dur: 0.12, vol: v * 0.5, freq: 4000, q: 0.6 }); break;
      case 'metal':
        tone({ freq: 600, dur: 0.16, vol: v * 0.5, type: 'triangle', glide: 200 });
        tone({ freq: 900, dur: 0.12, vol: v * 0.35, type: 'sine', glide: -150 }); break;
      case 'dirt': case 'grass':
        noiseBurst({ dur: 0.16, vol: v, freq: 520, q: 0.8, type: 'lowpass' }); break;
      case 'sand': case 'snow':
        noiseBurst({ dur: 0.18, vol: v, freq: 1500, q: 0.5 }); break;
      case 'gravel':
        noiseBurst({ dur: 0.16, vol: v, freq: 2200, q: 0.4 });
        noiseBurst({ dur: 0.1, vol: v * 0.6, freq: 900, q: 0.6 }); break;
      case 'leaves': case 'plant':
        noiseBurst({ dur: 0.14, vol: v * 0.7, freq: 3000, q: 0.4 }); break;
      case 'wool':
        noiseBurst({ dur: 0.16, vol: v * 0.7, freq: 380, q: 0.7, type: 'lowpass' }); break;
      case 'liquid':
        noiseBurst({ dur: 0.2, vol: v * 0.7, freq: 700, q: 0.5, type: 'lowpass' }); break;
      default: // stone
        noiseBurst({ dur: 0.16, vol: v, freq: 800, q: 1.1, type: 'bandpass' });
        tone({ freq: 110, dur: 0.1, vol: v * 0.4, type: 'square' });
    }
  }

  // Mining hit sound
  function digHit(id) {
    if (!ensure() || !enabled) return;
    resume();
    const mat = materialOf(id);
    const v = 0.14;
    switch (mat) {
      case 'wood': noiseBurst({ dur: 0.06, vol: v, freq: 350, q: 1.5 }); break;
      case 'glass': tone({ freq: 1600, dur: 0.04, vol: v * 0.6, type: 'triangle' }); break;
      case 'metal': tone({ freq: 700, dur: 0.05, vol: v * 0.5, type: 'triangle' }); break;
      case 'dirt': case 'grass': case 'wool': noiseBurst({ dur: 0.06, vol: v * 0.9, freq: 480, q: 0.8, type: 'lowpass' }); break;
      case 'sand': case 'gravel': case 'snow': noiseBurst({ dur: 0.06, vol: v, freq: 1600, q: 0.5 }); break;
      case 'leaves': case 'plant': noiseBurst({ dur: 0.05, vol: v * 0.7, freq: 2800, q: 0.4 }); break;
      default: noiseBurst({ dur: 0.05, vol: v, freq: 750, q: 1.2, type: 'bandpass' });
    }
  }

  // Ambient loops: wind, water, cave
  function startAmbient() {
    if (!ensure() || !enabled || ambient) return;
    resume();
    const now = ctx.currentTime;
    // Wind
    const windSrc = ctx.createBufferSource(); windSrc.buffer = noiseBuffer(); windSrc.loop = true;
    const windFilt = ctx.createBiquadFilter(); windFilt.type = 'lowpass'; windFilt.frequency.value = 500; windFilt.Q.value = 0.6;
    const windGain = ctx.createGain(); windGain.gain.value = 0.0;
    windSrc.connect(windFilt); windFilt.connect(windGain); windGain.connect(master);
    const windLfo = ctx.createOscillator(); windLfo.frequency.value = 0.07;
    const windLfoGain = ctx.createGain(); windLfoGain.gain.value = 220;
    windLfo.connect(windLfoGain); windLfoGain.connect(windFilt.frequency);
    windSrc.start(now); windLfo.start(now);

    // Water
    const waterSrc = ctx.createBufferSource(); waterSrc.buffer = noiseBuffer(); waterSrc.loop = true;
    const waterFilt = ctx.createBiquadFilter(); waterFilt.type = 'bandpass'; waterFilt.frequency.value = 2600; waterFilt.Q.value = 0.8;
    const waterGain = ctx.createGain(); waterGain.gain.value = 0.0;
    waterSrc.connect(waterFilt); waterFilt.connect(waterGain); waterGain.connect(master);
    const waterLfo = ctx.createOscillator(); waterLfo.frequency.value = 6;
    const waterLfoGain = ctx.createGain(); waterLfoGain.gain.value = 800;
    waterLfo.connect(waterLfoGain); waterLfoGain.connect(waterFilt.frequency);
    waterSrc.start(now); waterLfo.start(now);

    // Cave
    const caveSrc = ctx.createBufferSource(); caveSrc.buffer = noiseBuffer(); caveSrc.loop = true;
    const caveFilt = ctx.createBiquadFilter(); caveFilt.type = 'lowpass'; caveFilt.frequency.value = 180; caveFilt.Q.value = 0.5;
    const caveGain = ctx.createGain(); caveGain.gain.value = 0.0;
    caveSrc.connect(caveFilt); caveFilt.connect(caveGain); caveGain.connect(master);
    caveSrc.start(now);

    ambient = {
      windGain, waterGain, caveGain,
      _dripTimer: 0,
      targets: { wind: 0, water: 0, cave: 0 },
    };
  }

  // Update ambient volumes each frame
  function updateAmbient(dt, state) {
    if (!ambient || !ctx) return;
    const t = ambient.targets;
    t.wind = state.underground ? 0.015 : (0.04 + (1 - state.daylight) * 0.02);
    t.cave = state.underground ? 0.085 : 0.0;
    t.water = state.nearWater ? (state.underground ? 0.05 : 0.09) : 0.0;
    const lerp = (g, target) => { g.gain.value += (target - g.gain.value) * Math.min(1, dt * 1.5); };
    lerp(ambient.windGain, t.wind);
    lerp(ambient.waterGain, t.water);
    lerp(ambient.caveGain, t.cave);

    // Cave drip
    if (state.underground) {
      ambient._dripTimer -= dt;
      if (ambient._dripTimer <= 0) {
        ambient._dripTimer = 4 + Math.random() * 7;
        caveDrip();
      }
    }
  }

  // Cave drip with delay feedback
  function caveDrip() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const delay = ctx.createDelay(); delay.delayTime.value = 0.28;
    const fb = ctx.createGain(); fb.gain.value = 0.45;
    const wet = ctx.createGain(); wet.gain.value = 0.5;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
    const osc = ctx.createOscillator(); osc.type = 'sine';
    const g = ctx.createGain();
    const f0 = 900 + Math.random() * 600;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.5, now + 0.12);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.16);
    osc.connect(g); g.connect(master); g.connect(delay);
    osc.start(now); osc.stop(now + 0.2);
  }

  function splash() {
    if (!ensure() || !enabled) return;
    resume();
    noiseBurst({ dur: 0.3, vol: 0.3, freq: 1400, q: 0.5, type: 'bandpass' });
    tone({ freq: 500, dur: 0.18, vol: 0.12, type: 'sine', glide: -200 });
  }

  function hurt() {
    if (!ensure() || !enabled) return;
    resume();
    tone({ freq: 200, dur: 0.18, vol: 0.3, type: 'square', glide: -80 });
    noiseBurst({ dur: 0.1, vol: 0.18, freq: 300, q: 0.8, type: 'lowpass' });
  }

  // Bow/arrow release: a short airy "thwip".
  function shoot() {
    if (!ensure() || !enabled) return;
    resume();
    noiseBurst({ dur: 0.12, vol: 0.16, freq: 2200, q: 1.2, type: 'bandpass' });
    tone({ freq: 900, dur: 0.1, vol: 0.06, type: 'triangle', glide: -500 });
  }

  function setMuted(m) {
    enabled = !m;
    if (master) master.gain.value = enabled ? masterVol : 0;
  }
  function isMuted() { return !enabled; }

  return {
    resume, dig, place, footstep, digHit, splash, hurt, shoot,
    startAmbient, updateAmbient, materialOf,
    setMuted, isMuted,
  };
})();
