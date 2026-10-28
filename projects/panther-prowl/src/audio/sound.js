// Sound effects, made with code using the Web Audio API.
//
// There are no sound files: each effect is built from simple pieces, such as
// tones (beeps that slide up or down) and noise (a "shhh"), shaped by volume
// envelopes. So there are no licensing questions and nothing extra to download.
//
// Phones and tablets block sound until the player taps the screen, so
// `unlock()` must be called from a tap, click or key press (main.js does this).

let audio = null;  // the AudioContext, created on the first tap
let master = null; // one volume knob for everything
let noiseBuffer = null;
let muted = false;
const VOLUME = 0.5;

export function unlock() {
  if (!audio) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audio = new AudioContextClass();
    master = audio.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    master.connect(audio.destination);
    noiseBuffer = makeNoise(audio);
  }
  if (audio.state === 'suspended') audio.resume();
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : VOLUME;
}

export const isMuted = () => muted;

function makeNoise(ctx) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function ready() {
  return audio && audio.state === 'running' && !muted;
}

/** A tone that slides from one pitch to another, with an optional wobble. */
function tone({ from, to = from, duration, volume = 0.3, type = 'sine', delay = 0, vibrato = 0 }) {
  const t = audio.currentTime + delay;
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + duration);
  if (vibrato) {
    const lfo = audio.createOscillator();
    const depth = audio.createGain();
    lfo.frequency.value = 7;
    depth.gain.value = vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + duration + 0.05);
  }
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

/** A short burst of filtered noise. */
function noise({ duration, volume = 0.2, from = 2000, to = from, delay = 0, filter = 'bandpass' }) {
  const t = audio.currentTime + delay;
  const source = audio.createBufferSource();
  source.buffer = noiseBuffer;
  const shaper = audio.createBiquadFilter();
  shaper.type = filter;
  shaper.frequency.setValueAtTime(from, t);
  shaper.frequency.exponentialRampToValueAtTime(to, t + duration);
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  source.connect(shaper).connect(gain).connect(master);
  source.start(t);
  source.stop(t + duration + 0.05);
}

// A spooky-sounding scale (minor pentatonic). Candy notes climb through it as
// you eat a row, so a long run of candy plays a little tune.
const SCALE = [0, 3, 5, 7, 10, 12, 15, 17];
const note = (base, step) => base * 2 ** (step / 12);
let candyStep = 0;
let lastCandyTime = 0;

export const sounds = {
  candy() {
    if (!ready()) return;
    const now = audio.currentTime;
    if (now - lastCandyTime < 0.05) return; // don't stack up sounds
    candyStep = now - lastCandyTime > 0.6 ? 0 : (candyStep + 1) % SCALE.length;
    lastCandyTime = now;
    tone({ from: note(523, SCALE[candyStep]), duration: 0.07, volume: 0.12, type: 'triangle' });
    noise({ duration: 0.03, volume: 0.05, from: 5000, filter: 'highpass' });
  },

  power() {
    if (!ready()) return;
    // A low panther growl, then a rising sparkle.
    tone({ from: 70, to: 110, duration: 0.5, volume: 0.25, type: 'sawtooth', vibrato: 12 });
    noise({ duration: 0.45, volume: 0.12, from: 300, to: 900 });
    [0, 4, 7, 12].forEach((step, i) => tone({ from: note(392, step), duration: 0.18, volume: 0.14, type: 'square', delay: 0.12 + i * 0.07 }));
  },

  powerEnd() {
    if (!ready()) return;
    tone({ from: 660, to: 330, duration: 0.25, volume: 0.1, type: 'triangle' });
  },

  pounce(chain = 1) {
    if (!ready()) return;
    // Higher pitch for each ghost in a combo.
    const base = 330 * 2 ** ((chain - 1) / 4);
    noise({ duration: 0.12, volume: 0.18, from: 1200, to: 4000 });
    tone({ from: base, to: base * 3, duration: 0.18, volume: 0.22, type: 'square' });
    tone({ from: base * 2, duration: 0.3, volume: 0.15, type: 'triangle', delay: 0.12 });
  },

  caught() {
    if (!ready()) return;
    tone({ from: 600, to: 90, duration: 1.2, volume: 0.25, type: 'sawtooth', vibrato: 20 });
    noise({ duration: 0.4, volume: 0.15, from: 800, to: 200, delay: 0.1 });
  },

  ready() {
    if (!ready()) return;
    // A short, original "spooky theremin" motif.
    [[0, 0.22], [3, 0.22], [7, 0.22], [6, 0.5]].reduce((delay, [step, length]) => {
      tone({ from: note(330, step), duration: length + 0.1, volume: 0.16, type: 'sine', vibrato: 6, delay });
      return delay + length;
    }, 0);
  },

  go() {
    if (!ready()) return;
    tone({ from: 440, to: 880, duration: 0.15, volume: 0.16, type: 'square' });
  },

  cleared() {
    if (!ready()) return;
    [0, 4, 7, 12, 16].forEach((step, i) => tone({ from: note(523, step), duration: 0.25, volume: 0.15, type: 'triangle', delay: i * 0.09 }));
  },

  extraLife() {
    if (!ready()) return;
    [12, 16, 19, 24].forEach((step, i) => tone({ from: note(523, step), duration: 0.12, volume: 0.12, type: 'sine', delay: i * 0.06 }));
  },

  gameOver() {
    if (!ready()) return;
    [7, 6, 3, 0].forEach((step, i) => tone({ from: note(220, step), duration: 0.35, volume: 0.15, type: 'triangle', delay: i * 0.25, vibrato: 4 }));
  },

  treatAppears() {
    if (!ready()) return;
    [0, 7, 12].forEach((step, i) => tone({ from: note(784, step), duration: 0.1, volume: 0.08, type: 'sine', delay: i * 0.05 }));
  },

  treat() {
    if (!ready()) return;
    noise({ duration: 0.08, volume: 0.15, from: 3000, filter: 'highpass' });
    [0, 4, 7, 12, 16].forEach((step, i) => tone({ from: note(659, step), duration: 0.12, volume: 0.12, type: 'square', delay: i * 0.04 }));
  },

  /** A tick for the last seconds of the Challenge. */
  tick(urgent = false) {
    if (!ready()) return;
    tone({ from: urgent ? 1320 : 880, duration: 0.05, volume: 0.1, type: 'square' });
  },

  tap() {
    if (!ready()) return;
    tone({ from: 880, to: 1200, duration: 0.05, volume: 0.08, type: 'triangle' });
  },
};
