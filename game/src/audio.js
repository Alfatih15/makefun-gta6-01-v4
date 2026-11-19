// NOVA BAY — synthesized sound: every effect and the music loop are
// built with WebAudio oscillators and filtered noise. No audio files.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.musicTimer = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      this.startMusic();
    } catch {}
  }

  blip(freq, dur, type = 'sine', vol = 0.2) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noiseBurst(dur, vol = 0.3, lowpass = 1200) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  shot() {
    this.noiseBurst(0.12, 0.5, 2600);
    this.blip(180, 0.08, 'square', 0.12);
  }

  pickup() {
    this.blip(660, 0.09);
    setTimeout(() => this.blip(990, 0.12), 70);
  }

  missionDone() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'triangle', 0.22), i * 90));
  }

  busted() {
    [392, 311, 233].forEach((f, i) => setTimeout(() => this.blip(f, 0.25, 'sawtooth', 0.15), i * 140));
  }

  crash() {
    this.noiseBurst(0.3, 0.4, 500);
  }

  setEngine(rpm01) {
    if (!this.ctx || this.muted) return;
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 700;
      this.engineOsc.connect(f);
      f.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
    }
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(60 + rpm01 * 160, t, 0.05);
    this.engineGain.gain.setTargetAtTime(0.02 + rpm01 * 0.06, t, 0.1);
  }

  setSiren(on) {
    if (!this.ctx) return;
    if (on && !this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0.05;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.8;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 350;
      lfo.connect(lfoGain);
      lfoGain.connect(this.sirenOsc.frequency);
      this.sirenOsc.frequency.value = 850;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      lfo.start();
      this._sirenLfo = lfo;
    } else if (!on && this.sirenOsc) {
      try {
        this.sirenOsc.stop();
        this._sirenLfo.stop();
      } catch {}
      this.sirenOsc = null;
    }
  }

  // A slow minor-key bassline + hats, scheduled with a lookahead timer.
  startMusic() {
    const bass = [55, 55, 65.4, 49, 55, 55, 82.4, 73.4];
    let step = 0;
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      const f = bass[step % bass.length];
      this.blip(f, 0.42, 'triangle', 0.10);
      if (step % 2 === 0) this.noiseBurst(0.03, 0.04, 6000);
      step++;
    }, 300);
  }
}
