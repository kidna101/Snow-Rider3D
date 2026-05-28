// ── Synthesised audio — no external files needed ─────────────────────────────
// All sounds are generated via the Web Audio API using oscillators + envelopes.
// AudioContext is created lazily on first user interaction (browser autoplay policy).

let ctx = null;
let muted = false;

/** Call on first user gesture (tap/keydown) to satisfy browser autoplay policy. */
export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    console.warn('Web Audio API not available — sound disabled.');
  }
}

export function setMuted(val) { muted = val; }
export function isMuted() { return muted; }

// ── Internal helpers ──────────────────────────────────────────────────────────

function tone(freq, duration, type = 'sine', gainPeak = 0.4) {
  if (!ctx || muted) return;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(gainPeak, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function sweep(freqStart, freqEnd, duration, type = 'sine', gainPeak = 0.35) {
  if (!ctx || muted) return;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
  gain.gain.setValueAtTime(gainPeak, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

// ── Public sound library ──────────────────────────────────────────────────────

const SOUNDS = {
  coin: () => {
    sweep(660, 1100, 0.10, 'triangle', 0.3);
  },

  goldBag: () => {
    sweep(440, 660, 0.15, 'triangle', 0.4);
    setTimeout(() => tone(880, 0.18, 'sine', 0.35), 140);
  },

  jump: () => {
    sweep(220, 440, 0.12, 'sine', 0.25);
  },

  doubleJump: () => {
    sweep(440, 880, 0.12, 'sine', 0.28);
  },

  crash: () => {
    tone(80, 0.12, 'sawtooth', 0.5);
    setTimeout(() => tone(55, 0.20, 'triangle', 0.35), 80);
  },

  hen: () => {
    tone(280, 0.07, 'square', 0.2);
    setTimeout(() => tone(240, 0.07, 'square', 0.2), 100);
  },

  boulder: () => {
    sweep(60, 40, 0.4, 'sawtooth', 0.4);
  },

  ravineWarn: () => {
    sweep(200, 100, 0.15, 'triangle', 0.2);
  },
};

export function playSound(name) {
  if (!ctx || muted) return;
  // Resume context if suspended (e.g. after tab-hide on iOS)
  if (ctx.state === 'suspended') ctx.resume();
  const fn = SOUNDS[name];
  if (fn) fn();
}
