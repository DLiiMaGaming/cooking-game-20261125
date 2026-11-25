// Dapur Senja — tiny synthesised sounds, no audio files.
// One job: short WebAudio blips for pickup, chopping, cooking, serving and mistakes.
export class Sounds {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      } catch (error) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  blip(freq, seconds, type, gainValue) {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(gainValue || 0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + seconds);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + seconds);
    } catch (error) {
      // A sound that cannot play never stops the game.
    }
  }

  pickup() { this.ensure(); this.blip(520, 0.09, 'triangle', 0.07); }
  chop() { this.ensure(); this.blip(180, 0.05, 'square', 0.05); }
  sizzle() { this.ensure(); this.blip(880, 0.06, 'sawtooth', 0.03); }
  ready() { this.ensure(); this.blip(660, 0.12, 'triangle', 0.08); this.blip(990, 0.16, 'triangle', 0.06); }
  serve() {
    this.ensure();
    this.blip(523, 0.1, 'triangle', 0.08);
    setTimeout(() => this.blip(784, 0.14, 'triangle', 0.08), 90);
  }
  bad() { this.ensure(); this.blip(140, 0.18, 'sawtooth', 0.06); }
  tick() { this.ensure(); this.blip(1100, 0.04, 'square', 0.03); }
}
