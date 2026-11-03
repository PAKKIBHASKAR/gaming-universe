// ==========================================
// PROCEDURAL SOUND SYNTHESIZER (Web Audio API)
// Authentic arcade, sci-fi and board game SFX
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  click() {
    this.playTone(800, 'sine', 0.05, 0.08);
  }

  buttonHover() {
    this.playTone(440, 'triangle', 0.04, 0.03);
  }

  diceRoll() {
    if (!this.enabled) return;
    let count = 0;
    const interval = setInterval(() => {
      this.playTone(300 + Math.random() * 400, 'square', 0.04, 0.05);
      count++;
      if (count > 6) clearInterval(interval);
    }, 60);
  }

  chessMove() {
    this.playTone(220, 'triangle', 0.12, 0.15);
    setTimeout(() => this.playTone(440, 'sine', 0.08, 0.1), 60);
  }

  chessCapture() {
    this.playTone(180, 'sawtooth', 0.15, 0.2);
    setTimeout(() => this.playTone(90, 'sine', 0.2, 0.25), 50);
  }

  carromStrike() {
    this.playTone(350, 'sawtooth', 0.08, 0.2);
    setTimeout(() => this.playTone(600, 'triangle', 0.05, 0.15), 40);
  }

  carromPocket() {
    this.playTone(523.25, 'sine', 0.15, 0.2); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.15, 0.2), 100); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.3, 0.2), 200); // G5
  }

  ladderClimb() {
    const notes = [300, 400, 500, 600, 750];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.1, 0.12), idx * 80);
    });
  }

  snakeBite() {
    const notes = [600, 500, 380, 260, 150];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.12, 0.15), idx * 90);
    });
  }

  victory() {
    const melody = [523, 659, 783, 1046];
    melody.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'square', 0.2, 0.15), i * 140);
    });
  }

  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

window.soundFX = new SoundFX();
