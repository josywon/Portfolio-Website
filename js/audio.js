// Sound: console-menu style effects + a calm ambient hum, all synthesised in
// the browser (no audio files to download).
//
// Everything is tuned to one scale (D major pentatonic) so that interactions
// string together into little melodies over the hum instead of clashing.
//
// To use a real track for the background instead of the generated hum, put the
// file in assets/audio/ and set MUSIC_FILE below, e.g. 'assets/audio/music.mp3'.
// Only use music you have the rights to publish on a public site.
const MUSIC_FILE = null;

// Browsers only allow sound after the visitor has clicked, tapped or pressed a
// key, so nothing plays until the first interaction.

const SCALE = [293.66, 329.63, 369.99, 440.0, 493.88];           // D4 E4 F#4 A4 B4
const note = (i) => SCALE[((i % 5) + 5) % 5] * Math.pow(2, Math.floor(i / 5));
const DRONE = [73.42, 110.0, 146.83, 220.0, 277.18, 329.63];     // D2 A2 D3 A3 C#4 E4

const read = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v == null ? fallback : Math.min(1, Math.max(0, +v)); } catch { return fallback; }
};
const write = (key, v) => { try { localStorage.setItem(key, String(v)); } catch { /* private mode */ } };

export class Sound {
  constructor() {
    this.musicVol = read('vol-music', 0.5);
    this.sfxVol = read('vol-sfx', 0.6);
    this.ctx = null;
    this.step = 0;          // where the carousel "melody" currently sits in the scale
  }

  /** Call from a click / key / touch handler. Builds the audio graph on first use. */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = (this.ctx = new Ctx());

    const out = ctx.createDynamicsCompressor();
    out.threshold.value = -14; out.ratio.value = 4;
    out.connect(ctx.destination);

    // soft hall reverb from a generated impulse
    const len = Math.floor(ctx.sampleRate * 3.2);
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = impulse;
    const wet = ctx.createGain(); wet.gain.value = 0.55;
    this.reverb.connect(wet).connect(out);

    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.sfxVol;
    this.sfxBus.connect(out);
    this.sfxSend = ctx.createGain(); this.sfxSend.gain.value = 0.5;
    this.sfxBus.connect(this.sfxSend).connect(this.reverb);

    this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0;
    this.musicBus.connect(out);
    this.musicBus.gain.setTargetAtTime(this.musicVol, ctx.currentTime, 2.5);     // fade in

    if (MUSIC_FILE) this.#startFile(); else this.#startHum();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
  }

  setMusic(v) {
    this.musicVol = v; write('vol-music', v);
    if (this.ctx) this.musicBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.08);
  }

  setSfx(v) {
    this.sfxVol = v; write('vol-sfx', v);
    if (this.ctx) this.sfxBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  }

  /* ── background ─────────────────────────────────────────── */

  #startFile() {
    const el = new Audio(MUSIC_FILE);
    el.loop = true;
    this.ctx.createMediaElementSource(el).connect(this.musicBus);
    el.play().catch(() => {});
  }

  // slow, breathing pad: each drone note swells on its own cycle under a moving low-pass
  #startHum() {
    const ctx = this.ctx, t = ctx.currentTime;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 700; filter.Q.value = 0.4;
    const sweep = ctx.createOscillator(), sweepAmt = ctx.createGain();
    sweep.frequency.value = 0.04; sweepAmt.gain.value = 320;
    sweep.connect(sweepAmt).connect(filter.frequency); sweep.start(t);

    const pad = ctx.createGain(); pad.gain.value = 0.5;
    filter.connect(pad).connect(this.musicBus);
    const send = ctx.createGain(); send.gain.value = 0.6;
    pad.connect(send).connect(this.reverb);

    DRONE.forEach((f, i) => {
      const voice = ctx.createGain(); voice.gain.value = 0.085 / (1 + i * 0.25);
      const swell = ctx.createOscillator(), swellAmt = ctx.createGain();
      swell.frequency.value = 0.03 + i * 0.011; swellAmt.gain.value = voice.gain.value * 0.7;
      swell.connect(swellAmt).connect(voice.gain); swell.start(t);
      for (const [type, detune, level] of [['sine', -4, 1], ['triangle', 5, 0.35]]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = f; o.detune.value = detune; g.gain.value = level;
        o.connect(g).connect(voice); o.start(t);
      }
      voice.connect(filter);
    });

    // now and then, a quiet glassy note high above the pad
    const sparkle = () => {
      if (!document.hidden) {
        this.#pluck(this.musicBus, note(5 + Math.floor(Math.random() * 8)), { vol: 0.035, decay: 3.5, send: this.reverb, sendVol: 0.5 });
      }
      setTimeout(sparkle, 5000 + Math.random() * 7000);
    };
    setTimeout(sparkle, 4000);
  }

  /* ── effects ────────────────────────────────────────────── */

  // glassy bell/pluck: a sine with a quiet inharmonic partial, instant attack, long tail
  #pluck(bus, freq, { vol = 0.2, decay = 0.6, delay = 0, bright = 0.25, send = null, sendVol = 0 } = {}) {
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    g.connect(bus);
    if (send) { const s = ctx.createGain(); s.gain.value = sendVol; g.connect(s).connect(send); }
    for (const [mult, level, type] of [[1, 1, 'sine'], [2, bright, 'sine'], [2.76, bright * 0.45, 'sine']]) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = type; o.frequency.value = freq * mult; og.gain.value = level;
      o.connect(og).connect(g); o.start(t); o.stop(t + decay + 0.05);
    }
  }

  // short breathy sweep under movement
  #whoosh(up = true, vol = 0.05) {
    const ctx = this.ctx, t = ctx.currentTime, dur = 0.22;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(up ? 500 : 2400, t);
    bp.frequency.exponentialRampToValueAtTime(up ? 2400 : 500, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(this.sfxBus); src.start(t);
  }

  /** pointer lands on something clickable */
  hover() { if (this.ctx) this.#pluck(this.sfxBus, note(10), { vol: 0.07, decay: 0.18, bright: 0.12 }); }

  /** carousel moves one place: walks up or down the scale */
  move(dir) {
    if (!this.ctx) return;
    this.step = Math.min(9, Math.max(0, this.step + dir));
    if (this.step === 0 && dir < 0) this.step = 4;      // wrap so it never gets stuck at an end
    if (this.step === 9 && dir > 0) this.step = 5;
    this.#whoosh(dir > 0, 0.035);
    this.#pluck(this.sfxBus, note(this.step), { vol: 0.2, decay: 0.55 });
  }

  /** plain button press */
  click() { if (this.ctx) { this.#pluck(this.sfxBus, note(7), { vol: 0.16, decay: 0.25 }); this.#pluck(this.sfxBus, note(9), { vol: 0.12, decay: 0.35, delay: 0.05 }); } }

  /** opening a project: rising chime */
  open() {
    if (!this.ctx) return;
    this.#whoosh(true, 0.05);
    [0, 2, 3, 5, 8].forEach((n, i) => this.#pluck(this.sfxBus, note(n + 5), { vol: 0.17, decay: 0.9 + i * 0.12, delay: i * 0.07 }));
  }

  /** going back: the same shape falling */
  back() {
    if (!this.ctx) return;
    this.#whoosh(false, 0.045);
    [8, 5, 3].forEach((n, i) => this.#pluck(this.sfxBus, note(n), { vol: 0.16, decay: 0.6, delay: i * 0.075 }));
  }

  /** tiny tick while dragging a volume slider */
  tick() { if (this.ctx) this.#pluck(this.sfxBus, note(12), { vol: 0.08, decay: 0.09, bright: 0.05 }); }
}
