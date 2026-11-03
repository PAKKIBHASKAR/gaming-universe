// ==========================================
// DYNAMIC SOUND SYNTHESIZER (Web Audio API)
// Tailored procedural audio for all 4 games
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

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1, pitchBend = null) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (pitchBend) {
        osc.frequency.exponentialRampToValueAtTime(pitchBend, this.ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio suppression on un-interacted page
    }
  }

  // UI Sounds
  click() {
    this.playTone(880, 'sine', 0.04, 0.08);
  }

  buttonHover() {
    this.playTone(440, 'triangle', 0.03, 0.02);
  }

  chatMessage() {
    this.playTone(740, 'sine', 0.08, 0.1);
    setTimeout(() => this.playTone(987.77, 'sine', 0.12, 0.09), 60);
  }

  // 1. CHESS SOUNDS
  chessMove() {
    this.playTone(200, 'triangle', 0.08, 0.15, 120);
    setTimeout(() => this.playTone(320, 'sine', 0.05, 0.08), 30);
  }

  chessCapture() {
    this.playTone(280, 'sawtooth', 0.12, 0.2, 80);
    setTimeout(() => this.playTone(550, 'square', 0.08, 0.12, 180), 40);
  }

  chessCheck() {
    this.playTone(600, 'sawtooth', 0.15, 0.15);
    setTimeout(() => this.playTone(750, 'sawtooth', 0.25, 0.18), 120);
  }

  // 2. CARROM SOUNDS
  carromStrike() {
    this.playTone(320, 'triangle', 0.07, 0.22, 140);
    setTimeout(() => this.playTone(450, 'sine', 0.04, 0.1), 25);
  }

  carromClack() {
    this.playTone(580, 'triangle', 0.04, 0.12, 220);
  }

  carromPocket() {
    this.playTone(523.25, 'sine', 0.12, 0.18); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.14, 0.18), 80); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.25, 0.2), 160); // G5
  }

  carromFoul() {
    this.playTone(240, 'sawtooth', 0.2, 0.25, 120);
  }

  // 3. LUDO SOUNDS
  diceRoll() {
    if (!this.enabled) return;
    let count = 0;
    const interval = setInterval(() => {
      const randFreq = 320 + Math.random() * 380;
      this.playTone(randFreq, 'triangle', 0.03, 0.09);
      count++;
      if (count > 7) {
        clearInterval(interval);
        setTimeout(() => this.playTone(600, 'sine', 0.08, 0.15), 30);
      }
    }, 45);
  }

  tokenStep() {
    this.playTone(480, 'sine', 0.04, 0.08);
  }

  tokenUnlock() {
    const notes = [440, 554, 659, 880];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.09, 0.12), i * 60);
    });
  }

  tokenCapture() {
    this.playTone(350, 'sawtooth', 0.15, 0.2, 100);
    setTimeout(() => this.playTone(180, 'square', 0.18, 0.22, 60), 60);
  }

  // 4. SNAKES & LADDERS SOUNDS
  ladderClimb() {
    const melody = [330, 440, 550, 660, 880, 1100];
    melody.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.1, 0.14), idx * 70);
    });
  }

  snakeBite() {
    const tones = [700, 560, 420, 300, 180, 100];
    tones.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.12, 0.16), idx * 75);
    });
  }

  // VICTORY CELEBRATION
  victory() {
    const melody = [
      { f: 523.25, d: 150 },
      { f: 659.25, d: 150 },
      { f: 783.99, d: 200 },
      { f: 1046.50, d: 400 }
    ];
    let time = 0;
    melody.forEach((m) => {
      setTimeout(() => this.playTone(m.f, 'square', 0.22, 0.18), time);
      time += m.d;
    });
  }

  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

window.soundFX = new SoundFX();
