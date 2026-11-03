// ==========================================
// GAME 2: CYBER CARROM BOARD (PHYSICS ENGINE)
// Supports vs Computer & 2P / 3P / 4P (Local & Online)
// Enhanced Striker Controls, Aim Guide & Board Orientation
// ==========================================
class CyberCarromGame {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.mode = options.mode || 'local';
    this.roomData = options.roomData || null;
    this.isOnline = this.mode === 'multiplayer';

    if (this.isOnline && this.roomData && this.roomData.maxPlayers) {
      this.playerCount = this.roomData.maxPlayers;
    } else {
      this.playerCount = options.playerCount || 2;
    }

    this.isAI = !this.isOnline && this.playerCount === 1;
    this.totalSeats = this.isAI ? 2 : this.playerCount;

    // Board rotation angle for ergonomic player view (Player 2 plays facing from their side)
    this.rotationAngle = 0;
    if (this.isOnline && window.multiplayerManager.playerIndex === 1 && this.playerCount === 2) {
      this.rotationAngle = Math.PI; // 180 deg flip for Player 2
    }

    this.canvas = null;
    this.ctx = null;
    this.animId = null;

    // Board specs (virtual units 600x600)
    this.V_WIDTH = 600;
    this.V_HEIGHT = 600;

    this.BOARD_PAD = 35;
    this.POCKET_RADIUS = 28;
    this.COIN_RADIUS = 13;
    this.STRIKER_RADIUS = 19;
    this.FRICTION = 0.980;

    this.pockets = [
      { x: this.BOARD_PAD + 15, y: this.BOARD_PAD + 15 },
      { x: this.V_WIDTH - this.BOARD_PAD - 15, y: this.BOARD_PAD + 15 },
      { x: this.BOARD_PAD + 15, y: this.V_HEIGHT - this.BOARD_PAD - 15 },
      { x: this.V_WIDTH - this.BOARD_PAD - 15, y: this.V_HEIGHT - this.BOARD_PAD - 15 }
    ];

    this.coins = [];
    this.striker = null;
    this.players = [];
    this.currentTurn = 0;

    // Striking & Aiming state
    this.isAiming = false;
    this.aimAngle = -Math.PI / 2; // Default aim pointing UP towards center
    this.aimPower = 14;           // 5 to 22
    this.isMoving = false;
    this.strikerBaseX = 300;
    this.motionTimer = null;

    this.init();
  }

  init() {
    this.initPlayers();
    this.renderLayout();
    this.setupCanvas();
    this.resetBoard();
    this.startLoop();

    if (this.isOnline) {
      window.multiplayerManager.clearActionListeners();
      window.multiplayerManager.onAction((data) => {
        if (data.actionType === 'carrom_strike') {
          this.applyStrike(data.payload.strikerPos, data.payload.vx, data.payload.vy, false);
        }
      });
    }
  }

  initPlayers() {
    this.players = [];
    const colors = ['#00f0ff', '#ff0077', '#ffbd00', '#00ff66'];

    for (let i = 0; i < this.totalSeats; i++) {
      let pName = `Player ${i + 1}`;
      let pAvatar = ['⚔️', '🥷', '👨‍🚀', '⚡'][i];

      if (this.isAI) {
        pName = i === 0 ? 'Player 1' : 'Cyber AI Bot';
        pAvatar = i === 0 ? '⚔️' : '🤖';
      } else if (this.isOnline && this.roomData && this.roomData.players && this.roomData.players[i]) {
        pName = this.roomData.players[i].name;
        if (i === window.multiplayerManager.playerIndex) pName += ' [YOU]';
        const meta = window.authController.getAvatarMeta(this.roomData.players[i].avatar);
        pAvatar = meta ? meta.icon : pAvatar;
      }

      this.players.push({
        id: i,
        name: pName,
        color: colors[i],
        score: 0,
        avatar: pAvatar
      });
    }
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="game-arena-layout">
        <div class="game-top-bar">
          <div class="players-score-row" id="carrom-scores-row"></div>
          <div class="turn-indicator-pill" id="carrom-turn-pill">PLAYER 1'S SHOT</div>
        </div>

        <div class="carrom-board-wrapper board-3d-effect">
          <canvas id="carrom-canvas" width="600" height="600"></canvas>
          
          <!-- Intuitive Striker Control Deck -->
          <div class="carrom-controls-panel">
            <div class="control-row">
              <label>📍 STRIKER POSITION:</label>
              <input type="range" id="striker-baseline-slider" min="150" max="450" value="300" step="1">
            </div>

            <div class="control-row">
              <label>⚡ SHOT POWER: <span id="power-display">14</span></label>
              <input type="range" id="shot-power-slider" min="6" max="22" value="14" step="1">
            </div>

            <div class="carrom-action-btns">
              <button class="cyber-btn primary-glow" id="btn-fire-striker">🚀 HIT STRIKER</button>
              <button class="cyber-btn sm secondary" id="btn-carrom-flip">🔄 Rotate View</button>
              <button class="cyber-btn sm secondary" id="btn-carrom-reset">🔄 Reset</button>
              <button class="cyber-btn sm secondary" id="btn-carrom-rules">📜 Rules</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Sliders
    const posSlider = document.getElementById('striker-baseline-slider');
    posSlider.addEventListener('input', (e) => {
      if (!this.isMoving) {
        this.strikerBaseX = parseFloat(e.target.value);
        this.positionStriker();
      }
    });

    const powerSlider = document.getElementById('shot-power-slider');
    const powerText = document.getElementById('power-display');
    powerSlider.addEventListener('input', (e) => {
      this.aimPower = parseFloat(e.target.value);
      if (powerText) powerText.textContent = this.aimPower;
    });

    // Buttons
    document.getElementById('btn-fire-striker').addEventListener('click', () => {
      this.fireCurrentAim();
    });

    document.getElementById('btn-carrom-flip').addEventListener('click', () => {
      this.rotationAngle = (this.rotationAngle + Math.PI / 2) % (Math.PI * 2);
      window.soundFX && window.soundFX.click();
    });

    document.getElementById('btn-carrom-reset').addEventListener('click', () => this.resetBoard());
    document.getElementById('btn-carrom-rules').addEventListener('click', () => {
      window.rulesModal.show('carrom');
    });

    this.updateScoreboard();
  }

  setupCanvas() {
    this.canvas = document.getElementById('carrom-canvas');
    this.ctx = this.canvas.getContext('2d');

    const getPos = (e) => {
      const b = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rawX = (clientX - b.left) * (this.canvas.width / b.width);
      const rawY = (clientY - b.top) * (this.canvas.height / b.height);

      // Invert rotation if board view is rotated
      if (this.rotationAngle !== 0) {
        const cos = Math.cos(-this.rotationAngle);
        const sin = Math.sin(-this.rotationAngle);
        const dx = rawX - 300;
        const dy = rawY - 300;
        return {
          x: 300 + (dx * cos - dy * sin),
          y: 300 + (dx * sin + dy * cos)
        };
      }

      return { x: rawX, y: rawY };
    };

    const handlePointerDown = (pos) => {
      if (this.isMoving) return;
      if (this.isAI && this.currentTurn === 1) return;
      if (this.isOnline && this.currentTurn !== window.multiplayerManager.playerIndex) {
        window.soundFX && window.soundFX.carromFoul();
        return;
      }

      // Point aim towards clicked point
      this.isAiming = true;
      this.updateAimAngle(pos);
    };

    const handlePointerMove = (pos) => {
      if (!this.isAiming) return;
      this.updateAimAngle(pos);
    };

    const handlePointerUp = () => {
      // Don't auto-fire on accidental click; user can drag to aim and hit button or double click
    };

    this.canvas.addEventListener('mousedown', (e) => handlePointerDown(getPos(e)));
    this.canvas.addEventListener('mousemove', (e) => handlePointerMove(getPos(e)));
    window.addEventListener('mouseup', handlePointerUp);

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handlePointerDown(getPos(e));
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      handlePointerMove(getPos(e));
    });
  }

  updateAimAngle(pos) {
    if (!this.striker) return;
    const dx = pos.x - this.striker.x;
    const dy = pos.y - this.striker.y;
    this.aimAngle = Math.atan2(dy, dx);
  }

  fireCurrentAim() {
    if (this.isMoving || !this.striker) return;
    if (this.isAI && this.currentTurn === 1) return;
    if (this.isOnline && this.currentTurn !== window.multiplayerManager.playerIndex) {
      window.soundFX && window.soundFX.carromFoul();
      return;
    }

    const vx = Math.cos(this.aimAngle) * this.aimPower;
    const vy = Math.sin(this.aimAngle) * this.aimPower;

    this.applyStrike({ x: this.striker.x, y: this.striker.y }, vx, vy, true);
  }

  resetBoard() {
    this.coins = [];
    const cx = 300;
    const cy = 300;

    // Queen (Red) in center
    this.coins.push({
      id: 'queen',
      type: 'queen',
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      radius: this.COIN_RADIUS,
      color: '#ff0055',
      points: 25,
      isPocketed: false
    });

    // Ring 1 (6 coins: alternating white & black)
    const r1 = 26;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const isWhite = i % 2 === 0;
      this.coins.push({
        id: `coin_${i}`,
        type: isWhite ? 'white' : 'black',
        x: cx + Math.cos(angle) * r1,
        y: cy + Math.sin(angle) * r1,
        vx: 0,
        vy: 0,
        radius: this.COIN_RADIUS,
        color: isWhite ? '#ffffff' : '#2a2d48',
        border: isWhite ? '#00f0ff' : '#8888aa',
        points: isWhite ? 10 : 5,
        isPocketed: false
      });
    }

    // Ring 2 (12 coins)
    const r2 = 52;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6 + 0.2;
      const isWhite = i % 2 === 1;
      this.coins.push({
        id: `coin_outer_${i}`,
        type: isWhite ? 'white' : 'black',
        x: cx + Math.cos(angle) * r2,
        y: cy + Math.sin(angle) * r2,
        vx: 0,
        vy: 0,
        radius: this.COIN_RADIUS,
        color: isWhite ? '#ffffff' : '#2a2d48',
        border: isWhite ? '#00f0ff' : '#8888aa',
        points: isWhite ? 10 : 5,
        isPocketed: false
      });
    }

    this.positionStriker();
    this.isMoving = false;
    this.isAiming = true;
    this.updateScoreboard();
  }

  positionStriker() {
    this.striker = {
      x: this.strikerBaseX,
      y: 490,
      vx: 0,
      vy: 0,
      radius: this.STRIKER_RADIUS,
      color: '#ffbd00',
      isPocketed: false
    };
  }

  applyStrike(pos, vx, vy, shouldBroadcast = true) {
    this.striker.x = pos.x;
    this.striker.y = pos.y;
    this.striker.vx = vx;
    this.striker.vy = vy;
    this.isMoving = true;

    window.soundFX && window.soundFX.carromStrike();

    // Watchdog: If anything gets stuck in micro-movement, force stop in 3.8s!
    clearTimeout(this.motionTimer);
    this.motionTimer = setTimeout(() => {
      if (this.isMoving) {
        this.forceStopAll();
      }
    }, 3800);

    if (shouldBroadcast && this.isOnline) {
      window.multiplayerManager.sendAction('carrom_strike', { strikerPos: pos, vx, vy });
    }
  }

  forceStopAll() {
    if (this.striker) { this.striker.vx = 0; this.striker.vy = 0; }
    this.coins.forEach(c => { c.vx = 0; c.vy = 0; });
    this.isMoving = false;
    this.positionStriker();
    this.currentTurn = (this.currentTurn + 1) % this.totalSeats;
    this.updateScoreboard();

    if (this.isAI && this.currentTurn === 1) {
      this.triggerAIMove();
    }
  }

  triggerAIMove() {
    setTimeout(() => {
      if (this.isMoving || this.currentTurn !== 1) return;

      const activeCoins = this.coins.filter(c => !c.isPocketed);
      if (activeCoins.length === 0) return;

      const target = activeCoins[Math.floor(Math.random() * activeCoins.length)];
      this.strikerBaseX = Math.max(160, Math.min(440, target.x + (Math.random() - 0.5) * 50));
      this.positionStriker();

      setTimeout(() => {
        const dx = target.x - this.striker.x;
        const dy = target.y - this.striker.y;
        this.aimAngle = Math.atan2(dy, dx);
        const power = 13 + Math.random() * 5;

        this.applyStrike(
          { x: this.striker.x, y: this.striker.y },
          Math.cos(this.aimAngle) * power,
          Math.sin(this.aimAngle) * power,
          false
        );
      }, 500);
    }, 800);
  }

  startLoop() {
    const loop = () => {
      this.updatePhysics();
      this.draw();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  updatePhysics() {
    let anyMoving = false;
    const allBodies = [this.striker, ...this.coins.filter(c => !c.isPocketed)];

    allBodies.forEach(b => {
      if (!b) return;
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= this.FRICTION;
      b.vy *= this.FRICTION;

      // Clean cutoff to prevent infinite micro-jitter
      if (Math.hypot(b.vx, b.vy) < 0.22) {
        b.vx = 0;
        b.vy = 0;
      } else {
        anyMoving = true;
      }

      // Wall bounce
      const minX = this.BOARD_PAD + b.radius;
      const maxX = this.V_WIDTH - this.BOARD_PAD - b.radius;
      const minY = this.BOARD_PAD + b.radius;
      const maxY = this.V_HEIGHT - this.BOARD_PAD - b.radius;

      if (b.x < minX) { b.x = minX; b.vx = -b.vx * 0.85; window.soundFX && window.soundFX.carromClack(); }
      if (b.x > maxX) { b.x = maxX; b.vx = -b.vx * 0.85; window.soundFX && window.soundFX.carromClack(); }
      if (b.y < minY) { b.y = minY; b.vy = -b.vy * 0.85; window.soundFX && window.soundFX.carromClack(); }
      if (b.y > maxY) { b.y = maxY; b.vy = -b.vy * 0.85; window.soundFX && window.soundFX.carromClack(); }

      // Pocket check
      this.pockets.forEach(p => {
        const dist = Math.hypot(b.x - p.x, b.y - p.y);
        if (dist < this.POCKET_RADIUS) {
          b.isPocketed = true;
          b.vx = 0;
          b.vy = 0;
          if (b === this.striker) {
            this.players[this.currentTurn].score = Math.max(0, this.players[this.currentTurn].score - 5);
            window.soundFX && window.soundFX.carromFoul();
          } else {
            this.players[this.currentTurn].score += b.points;
            window.soundFX && window.soundFX.carromPocket();
          }
          this.updateScoreboard();
        }
      });
    });

    // Body vs Body Elastic Collision
    for (let i = 0; i < allBodies.length; i++) {
      for (let j = i + 1; j < allBodies.length; j++) {
        const b1 = allBodies[i];
        const b2 = allBodies[j];
        if (!b1 || !b2 || b1.isPocketed || b2.isPocketed) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = b1.radius + b2.radius;

        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;

          const overlap = minDist - dist;
          b1.x -= nx * overlap * 0.5;
          b1.y -= ny * overlap * 0.5;
          b2.x += nx * overlap * 0.5;
          b2.y += ny * overlap * 0.5;

          const kx = b1.vx - b2.vx;
          const ky = b1.vy - b2.vy;
          const p = 2 * (nx * kx + ny * ky) / 2;

          b1.vx -= p * nx * 0.95;
          b1.vy -= p * ny * 0.95;
          b2.vx += p * nx * 0.95;
          b2.vy += p * ny * 0.95;

          window.soundFX && window.soundFX.carromClack();
        }
      }
    }

    // Turn transition when all bodies stop moving
    if (this.isMoving && !anyMoving) {
      clearTimeout(this.motionTimer);
      this.isMoving = false;
      this.positionStriker();
      this.currentTurn = (this.currentTurn + 1) % this.totalSeats;
      this.updateScoreboard();

      if (this.isAI && this.currentTurn === 1) {
        this.triggerAIMove();
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.V_WIDTH, this.V_HEIGHT);

    ctx.save();
    // Apply user perspective rotation
    if (this.rotationAngle !== 0) {
      ctx.translate(300, 300);
      ctx.rotate(this.rotationAngle);
      ctx.translate(-300, -300);
    }

    // Board Surface
    ctx.fillStyle = '#0e122b';
    ctx.fillRect(0, 0, this.V_WIDTH, this.V_HEIGHT);

    // Board Border
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#1d234a';
    ctx.strokeRect(10, 10, this.V_WIDTH - 20, this.V_HEIGHT - 20);

    // Inner Neon Line
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00f0ff44';
    ctx.strokeRect(this.BOARD_PAD, this.BOARD_PAD, this.V_WIDTH - this.BOARD_PAD * 2, this.V_HEIGHT - this.BOARD_PAD * 2);

    // Pockets
    this.pockets.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.POCKET_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#05070e';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ff0077aa';
      ctx.stroke();
    });

    // Center Circles
    ctx.beginPath();
    ctx.arc(300, 300, 50, 0, Math.PI * 2);
    ctx.strokeStyle = '#00f0ff88';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(300, 300, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#ff005533';
    ctx.fill();
    ctx.stroke();

    // Baseline guidelines (all 4 sides for realistic tournament board)
    ctx.strokeStyle = '#44558855';
    ctx.lineWidth = 2;
    ctx.strokeRect(150, 480, 300, 20); // Bottom baseline
    ctx.strokeRect(150, 100, 300, 20); // Top baseline
    ctx.strokeRect(100, 150, 20, 300); // Left baseline
    ctx.strokeRect(480, 150, 20, 300); // Right baseline

    // Draw Coins
    this.coins.forEach(c => {
      if (c.isPocketed) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fillStyle = c.color;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = c.border || '#ff0055';
      ctx.stroke();
      ctx.restore();
    });

    // Draw Striker
    if (this.striker && !this.striker.isPocketed) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.striker.x, this.striker.y, this.striker.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.striker.color;
      ctx.shadowColor = '#ffbd00';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();

      // Draw Laser Aim Trajectory Guide
      if (!this.isMoving) {
        const len = this.aimPower * 12;
        const targetX = this.striker.x + Math.cos(this.aimAngle) * len;
        const targetY = this.striker.y + Math.sin(this.aimAngle) * len;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([8, 4]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.moveTo(this.striker.x, this.striker.y);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.arc(targetX, targetY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffbd00';
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  updateScoreboard() {
    const scoresRow = document.getElementById('carrom-scores-row');
    if (!scoresRow) return;
    scoresRow.innerHTML = '';

    this.players.forEach(p => {
      const card = document.createElement('div');
      card.className = `player-badge-card ${this.currentTurn === p.id ? 'active' : ''}`;
      card.innerHTML = `
        <span class="badge-avatar">${p.avatar}</span>
        <div class="badge-text">
          <span class="badge-name">${p.name}</span>
          <span class="badge-score" style="color:${p.color}">${p.score} PTS</span>
        </div>
      `;
      scoresRow.appendChild(card);
    });

    const turnPill = document.getElementById('carrom-turn-pill');
    if (turnPill && this.players[this.currentTurn]) {
      const activeP = this.players[this.currentTurn];
      turnPill.textContent = `${activeP.name.toUpperCase()}'S SHOT`;
      turnPill.style.borderColor = activeP.color;
      turnPill.style.color = activeP.color;
    }
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    clearTimeout(this.motionTimer);
  }
}

window.CyberCarromGame = CyberCarromGame;
