// ==========================================
// DYNAMIC SOUND SYNTHESIZER (Web Audio API)
// High-Fidelity Harmonic Audio Engine for Cyberverse
// Warm sine/triangle harmonics, acoustic body filters
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
    this.volume = 0.7;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  toggleSound() {
    return this.toggle();
  }

  playWarmTone(freq, type = 'sine', duration = 0.15, gainVal = 0.12, pitchBend = null, filterFreq = 2200) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, t);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (pitchBend) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, pitchBend), t + duration);
      }

      // Smooth attack and natural exponential decay
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(gainVal, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + duration);
    } catch (e) {
      // Audio suppression protection
    }
  }

  // UI Sounds
  click() {
    this.playWarmTone(659.25, 'sine', 0.05, 0.08); // E5
  }

  buttonHover() {
    this.playWarmTone(440, 'triangle', 0.04, 0.03, null, 1200);
  }

  chatMessage() {
    this.playWarmTone(587.33, 'sine', 0.08, 0.1); // D5
    setTimeout(() => this.playWarmTone(880, 'sine', 0.14, 0.09), 60); // A5
  }

  // 1. CHESS SOUNDS (Tactile acoustic feel)
  chessMove() {
    // Soft wooden tap
    this.playWarmTone(180, 'triangle', 0.07, 0.18, 90, 800);
    setTimeout(() => this.playWarmTone(280, 'sine', 0.05, 0.09, 140, 600), 20);
  }

  chessCapture() {
    // Crisp tactile impact
    this.playWarmTone(240, 'triangle', 0.1, 0.22, 70, 1100);
    setTimeout(() => this.playWarmTone(480, 'sine', 0.08, 0.12, 160, 900), 30);
  }

  chessCheck() {
    // Dramatic orchestral warning chord
    this.playWarmTone(440, 'sine', 0.25, 0.14); // A4
    setTimeout(() => this.playWarmTone(554.37, 'sine', 0.3, 0.14), 40); // C#5
    setTimeout(() => this.playWarmTone(659.25, 'sine', 0.35, 0.16), 80); // E5
  }

  // 2. CARROM SOUNDS (Authentic wooden board physics)
  carromStrike() {
    // Deep solid striker cue impact
    this.playWarmTone(160, 'triangle', 0.09, 0.25, 60, 750);
    setTimeout(() => this.playWarmTone(340, 'sine', 0.04, 0.12, 120, 600), 20);
  }

  carromClack() {
    // Crisp wooden disc-on-disc clack
    this.playWarmTone(520, 'triangle', 0.04, 0.14, 210, 1800);
  }

  carromPocket() {
    // Deep pocket drop + cheerful reward chime
    this.playWarmTone(120, 'triangle', 0.12, 0.2, 50, 400); // Thud in pocket
    setTimeout(() => this.playWarmTone(523.25, 'sine', 0.12, 0.14), 70); // C5
    setTimeout(() => this.playWarmTone(659.25, 'sine', 0.14, 0.16), 140); // E5
    setTimeout(() => this.playWarmTone(783.99, 'sine', 0.25, 0.18), 210); // G5
  }

  carromFoul() {
    // Gentle warning descending tone
    this.playWarmTone(320, 'triangle', 0.18, 0.18, 160, 600);
  }

  // 3. LUDO SOUNDS (Warm, playful arcade)
  diceRoll() {
    if (!this.enabled) return;
    let count = 0;
    const interval = setInterval(() => {
      const randFreq = 260 + Math.random() * 220;
      this.playWarmTone(randFreq, 'triangle', 0.035, 0.09, null, 900);
      count++;
      if (count > 7) {
        clearInterval(interval);
        // Landing click
        setTimeout(() => this.playWarmTone(520, 'sine', 0.08, 0.14, null, 1400), 40);
      }
    }, 45);
  }

  tokenStep() {
    // Warm marimba pop
    this.playWarmTone(440, 'sine', 0.05, 0.11, null, 1500);
  }

  tokenUnlock() {
    // Uplifting power-up arpeggio
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((f, i) => {
      setTimeout(() => this.playWarmTone(f, 'sine', 0.11, 0.12), i * 65);
    });
  }

  tokenCapture() {
    // Fun arcade defeat burst
    this.playWarmTone(330, 'triangle', 0.12, 0.2, 110, 1000);
    setTimeout(() => this.playWarmTone(440, 'sine', 0.1, 0.15, 220), 50);
  }

  // 4. SNAKES & LADDERS SOUNDS
  ladderClimb() {
    // Celestial crystalline ladder ascendance
    const melody = [392, 493.88, 587.33, 659.25, 783.99, 987.77, 1174.66];
    melody.forEach((freq, idx) => {
      setTimeout(() => this.playWarmTone(freq, 'sine', 0.12, 0.14, null, 2500), idx * 60);
    });
  }

  snakeBite() {
    // Ominous dramatic slide with low bass rumble
    const tones = [550, 440, 330, 240, 160, 90];
    tones.forEach((freq, idx) => {
      setTimeout(() => this.playWarmTone(freq, 'triangle', 0.14, 0.16, null, 700), idx * 80);
    });
  }

  // VICTORY CELEBRATION CHORD
  victory() {
    const melody = [
      { f: 523.25, d: 150 }, // C5
      { f: 659.25, d: 150 }, // E5
      { f: 783.99, d: 180 }, // G5
      { f: 1046.50, d: 380 } // C6
    ];
    melody.forEach((note, idx) => {
      setTimeout(() => {
        this.playWarmTone(note.f, 'sine', note.d / 1000, 0.2, null, 3000);
      }, idx * 130);
    });
  }
}

// Global Sound Controller
window.soundFX = new SoundFX();
