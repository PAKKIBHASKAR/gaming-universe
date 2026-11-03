// ==========================================
// GAME 2: CYBER CARROM ARENA (PHYSICS ENGINE)
// Realistic Board Rotation for Multiplayer (Like Chess)
// Convenient Slingshot Drag-and-Release & Target Aim
// Accurate Carrom Rules: Pockets, Queen Cover & Re-turns
// ==========================================
class CyberCarromGame {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.mode = options.mode || 'local'; // 'local', 'ai', 'multiplayer'
    this.roomData = options.roomData || null;
    this.isOnline = this.mode === 'multiplayer';

    if (this.isOnline && this.roomData && this.roomData.maxPlayers) {
      this.playerCount = this.roomData.maxPlayers;
    } else {
      this.playerCount = options.playerCount || 2;
    }

    this.isAI = !this.isOnline && this.playerCount === 1;
    this.totalSeats = this.isAI ? 2 : this.playerCount;

    // Determine perspective rotation:
    // If online and I am Player 2 (seat 1 in 2P match), flip 180 degrees (Math.PI)
    // so Player 2 plays from the bottom baseline just like Chess!
    this.mySeatIndex = 0;
    if (this.isOnline && window.multiplayerManager) {
      this.mySeatIndex = window.multiplayerManager.playerIndex || 0;
    }

    this.rotationAngle = 0;
    if (this.isOnline && this.mySeatIndex === 1 && this.totalSeats === 2) {
      this.rotationAngle = Math.PI; // 180° flip for Player 2
    }

    this.canvas = null;
    this.ctx = null;
    this.animId = null;

    // Board geometry (600x600 virtual units)
    this.V_WIDTH = 600;
    this.V_HEIGHT = 600;
    this.BOARD_PAD = 36;
    this.POCKET_RADIUS = 26;
    this.COIN_RADIUS = 13;
    this.STRIKER_RADIUS = 18;
    this.FRICTION = 0.982;

    this.pockets = [
      { x: this.BOARD_PAD + 14, y: this.BOARD_PAD + 14 },
      { x: this.V_WIDTH - this.BOARD_PAD - 14, y: this.BOARD_PAD + 14 },
      { x: this.BOARD_PAD + 14, y: this.V_HEIGHT - this.BOARD_PAD - 14 },
      { x: this.V_WIDTH - this.BOARD_PAD - 14, y: this.V_HEIGHT - this.BOARD_PAD - 14 }
    ];

    this.coins = [];
    this.striker = null;
    this.players = [];
    this.currentTurn = 0;

    // Striker placement on baseline (160 to 440)
    this.strikerBaseX = 300;

    // Slingshot / Aiming state
    this.isDraggingStriker = false;
    this.isSlingshotting = false;
    this.dragStart = null;
    this.dragCurrent = null;
    this.aimAngle = -Math.PI / 2; // Default towards center
    this.aimPower = 15;           // 5 to 24
    this.isMoving = false;
    this.motionTimer = null;

    // Queen rules tracking
    this.queenCoverPending = false;
    this.queenPocketedBy = null;
    this.pocketedThisTurn = 0;

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
        } else if (data.actionType === 'carrom_reposition') {
          this.strikerBaseX = data.payload.x;
          this.positionStriker();
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
        if (i === this.mySeatIndex) pName += ' [YOU]';
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
          <div class="turn-indicator-pill" id="carrom-turn-pill">PLAYER 1'S TURN</div>
        </div>

        <div class="carrom-board-wrapper board-3d-effect">
          <canvas id="carrom-canvas" width="600" height="600"></canvas>

          <!-- Interactive Striker Control Deck -->
          <div class="carrom-controls-panel">
            <div class="carrom-tip-banner">
              💡 <b>HOW TO STRIKE:</b> Drag striker sideways to place. Pull back to aim & release, or click anywhere on board and press <b>HIT STRIKER</b>!
            </div>

            <div class="control-row">
              <label>📍 BASELINE POSITION:</label>
              <input type="range" id="striker-baseline-slider" min="160" max="440" value="300" step="1">
            </div>

            <div class="control-row">
              <label>⚡ SHOT POWER: <span id="power-display">15</span></label>
              <input type="range" id="shot-power-slider" min="6" max="24" value="15" step="1">
            </div>

            <div class="carrom-action-btns">
              <button class="cyber-btn primary-glow" id="btn-fire-striker">🚀 HIT STRIKER</button>
              <button class="cyber-btn sm secondary" id="btn-carrom-flip">🔄 Rotate Board</button>
              <button class="cyber-btn sm secondary" id="btn-carrom-reset">🔄 Re-Rack Coins</button>
              <button class="cyber-btn sm secondary" id="btn-carrom-rules">📜 Rules</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Baseline slider
    const posSlider = document.getElementById('striker-baseline-slider');
    posSlider.addEventListener('input', (e) => {
      if (!this.isMoving && this.isMyTurn()) {
        this.strikerBaseX = parseFloat(e.target.value);
        this.positionStriker();
        if (this.isOnline) {
          window.multiplayerManager.sendAction('carrom_reposition', { x: this.strikerBaseX });
        }
      }
    });

    // Power slider
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
      this.rotationAngle = (this.rotationAngle + Math.PI) % (Math.PI * 2);
      if (window.soundFX) window.soundFX.click();
    });

    document.getElementById('btn-carrom-reset').addEventListener('click', () => this.resetBoard());
    document.getElementById('btn-carrom-rules').addEventListener('click', () => {
      window.rulesModal.show('carrom');
    });

    this.updateScoreboard();
  }

  isMyTurn() {
    if (this.isAI) return this.currentTurn === 0;
    if (this.isOnline) return this.currentTurn === this.mySeatIndex;
    return true; // Local 2P/3P/4P
  }

  // Get active player's baseline in world coordinates
  getActiveBaseline() {
    if (this.totalSeats === 2) {
      // Seat 0 = bottom (y = 490), Seat 1 = top (y = 110)
      return this.currentTurn === 0 ? { y: 490, dirY: -1 } : { y: 110, dirY: 1 };
    }
    // 3P or 4P
    if (this.currentTurn === 0) return { y: 490, dirY: -1 };
    if (this.currentTurn === 1) return { y: 110, dirY: 1 };
    if (this.currentTurn === 2) return { x: 110, dirX: 1 };
    return { x: 490, dirX: -1 };
  }

  setupCanvas() {
    this.canvas = document.getElementById('carrom-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Convert screen / mouse coordinates to world coordinates considering perspective rotation
    const toWorldCoords = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const rawX = (clientX - rect.left) * (this.V_WIDTH / rect.width);
      const rawY = (clientY - rect.top) * (this.V_HEIGHT / rect.height);

      if (this.rotationAngle !== 0) {
        const dx = rawX - 300;
        const dy = rawY - 300;
        const cos = Math.cos(-this.rotationAngle);
        const sin = Math.sin(-this.rotationAngle);
        return {
          x: 300 + (dx * cos - dy * sin),
          y: 300 + (dx * sin + dy * cos)
        };
      }
      return { x: rawX, y: rawY };
    };

    const onPointerDown = (e) => {
      if (this.isMoving || !this.isMyTurn() || !this.striker) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const worldPos = toWorldCoords(clientX, clientY);

      const distToStriker = Math.hypot(worldPos.x - this.striker.x, worldPos.y - this.striker.y);

      // 1. If clicking near striker (within 55px): start slingshot pull!
      if (distToStriker < 55) {
        this.isSlingshotting = true;
        this.dragStart = { x: this.striker.x, y: this.striker.y };
        this.dragCurrent = { x: worldPos.x, y: worldPos.y };
        return;
      }

      // 2. If clicking along active baseline: reposition striker!
      const base = this.getActiveBaseline();
      if (base.y && Math.abs(worldPos.y - base.y) < 35 && worldPos.x >= 150 && worldPos.x <= 450) {
        this.isDraggingStriker = true;
        this.strikerBaseX = Math.max(160, Math.min(440, worldPos.x));
        this.positionStriker();
        const slider = document.getElementById('striker-baseline-slider');
        if (slider) slider.value = this.strikerBaseX;
        if (this.isOnline) {
          window.multiplayerManager.sendAction('carrom_reposition', { x: this.strikerBaseX });
        }
        return;
      }

      // 3. If clicking out in the board: set aim target towards clicked coin / point!
      this.aimAtWorldPoint(worldPos);
    };

    const onPointerMove = (e) => {
      if (this.isMoving || !this.isMyTurn() || !this.striker) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const worldPos = toWorldCoords(clientX, clientY);

      if (this.isSlingshotting) {
        this.dragCurrent = { x: worldPos.x, y: worldPos.y };
        // Invert pull vector: pulling away builds forward aim & power
        const pullDx = this.striker.x - worldPos.x;
        const pullDy = this.striker.y - worldPos.y;
        const pullDist = Math.hypot(pullDx, pullDy);

        if (pullDist > 10) {
          this.aimAngle = Math.atan2(pullDy, pullDx);
          // Calculate power from pull distance (clamped between 6 and 24)
          this.aimPower = Math.max(6, Math.min(24, Math.round(pullDist * 0.16)));
          const powerSlider = document.getElementById('shot-power-slider');
          const powerText = document.getElementById('power-display');
          if (powerSlider) powerSlider.value = this.aimPower;
          if (powerText) powerText.textContent = this.aimPower;
        }
      } else if (this.isDraggingStriker) {
        this.strikerBaseX = Math.max(160, Math.min(440, worldPos.x));
        this.positionStriker();
        const slider = document.getElementById('striker-baseline-slider');
        if (slider) slider.value = this.strikerBaseX;
      }
    };

    const onPointerUp = () => {
      if (this.isSlingshotting) {
        this.isSlingshotting = false;
        // Release slingshot fires the striker if power is significant!
        if (this.aimPower >= 6) {
          this.fireCurrentAim();
        }
      }
      if (this.isDraggingStriker) {
        this.isDraggingStriker = false;
        if (this.isOnline) {
          window.multiplayerManager.sendAction('carrom_reposition', { x: this.strikerBaseX });
        }
      }
    };

    this.canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onPointerDown(e);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.isSlingshotting || this.isDraggingStriker) {
        e.preventDefault();
      }
      onPointerMove(e);
    }, { passive: false });

    window.addEventListener('touchend', onPointerUp);
  }

  aimAtWorldPoint(worldPos) {
    if (!this.striker) return;
    const dx = worldPos.x - this.striker.x;
    const dy = worldPos.y - this.striker.y;
    this.aimAngle = Math.atan2(dy, dx);
    if (window.soundFX) window.soundFX.click();
  }

  fireCurrentAim() {
    if (this.isMoving || !this.striker || !this.isMyTurn()) return;

    const vx = Math.cos(this.aimAngle) * this.aimPower;
    const vy = Math.sin(this.aimAngle) * this.aimPower;

    this.applyStrike({ x: this.striker.x, y: this.striker.y }, vx, vy, true);
  }

  positionStriker() {
    const base = this.getActiveBaseline();
    const sy = base.y !== undefined ? base.y : 490;
    const sx = base.x !== undefined ? base.x : this.strikerBaseX;

    this.striker = {
      x: sx,
      y: sy,
      vx: 0,
      vy: 0,
      radius: this.STRIKER_RADIUS,
      color: '#ffbd00',
      isPocketed: false
    };

    // Point aim towards center initially
    const dx = 300 - this.striker.x;
    const dy = 300 - this.striker.y;
    this.aimAngle = Math.atan2(dy, dx);
  }

  resetBoard() {
    this.coins = [];
    const cx = 300;
    const cy = 300;

    // Queen (Red 25 pts) in exact center
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

    // Ring 1 (6 alternating coins)
    const r1 = 26;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const isWhite = i % 2 === 0;
      this.coins.push({
        id: `coin_r1_${i}`,
        type: isWhite ? 'white' : 'black',
        x: cx + Math.cos(angle) * r1,
        y: cy + Math.sin(angle) * r1,
        vx: 0,
        vy: 0,
        radius: this.COIN_RADIUS,
        color: isWhite ? '#ffffff' : '#2a2d48',
        border: isWhite ? '#00f0ff' : '#6b7294',
        points: isWhite ? 10 : 5,
        isPocketed: false
      });
    }

    // Ring 2 (12 alternating coins)
    const r2 = 52;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6 + 0.2;
      const isWhite = i % 2 === 1;
      this.coins.push({
        id: `coin_r2_${i}`,
        type: isWhite ? 'white' : 'black',
        x: cx + Math.cos(angle) * r2,
        y: cy + Math.sin(angle) * r2,
        vx: 0,
        vy: 0,
        radius: this.COIN_RADIUS,
        color: isWhite ? '#ffffff' : '#2a2d48',
        border: isWhite ? '#00f0ff' : '#6b7294',
        points: isWhite ? 10 : 5,
        isPocketed: false
      });
    }

    this.positionStriker();
    this.isMoving = false;
    this.isSlingshotting = false;
    this.pocketedThisTurn = 0;
    this.updateScoreboard();
  }

  applyStrike(pos, vx, vy, shouldBroadcast = true) {
    if (!this.striker) return;
    this.striker.x = pos.x;
    this.striker.y = pos.y;
    this.striker.vx = vx;
    this.striker.vy = vy;
    this.isMoving = true;
    this.pocketedThisTurn = 0;

    if (window.soundFX) window.soundFX.carromStrike();

    // Auto-stop watchdog if micro-movement lingers
    clearTimeout(this.motionTimer);
    this.motionTimer = setTimeout(() => {
      if (this.isMoving) this.finishTurn();
    }, 3600);

    if (shouldBroadcast && this.isOnline) {
      window.multiplayerManager.sendAction('carrom_strike', { strikerPos: pos, vx, vy });
    }
  }

  finishTurn() {
    clearTimeout(this.motionTimer);
    if (this.striker) { this.striker.vx = 0; this.striker.vy = 0; }
    this.coins.forEach(c => { c.vx = 0; c.vy = 0; });
    this.isMoving = false;

    // Check Queen rules: if Queen was pocketed, player must pocket a cover coin!
    if (this.queenPocketedBy === this.currentTurn) {
      if (this.pocketedThisTurn === 0) {
        // Uncovered Queen returns to center!
        const queen = this.coins.find(c => c.id === 'queen');
        if (queen) {
          queen.isPocketed = false;
          queen.x = 300;
          queen.y = 300;
          queen.vx = 0;
          queen.vy = 0;
          this.players[this.currentTurn].score = Math.max(0, this.players[this.currentTurn].score - 25);
          if (window.soundFX) window.soundFX.carromFoul();
        }
      }
      this.queenPocketedBy = null;
    }

    // Official Carrom rule: If a valid coin was pocketed, the player gets another turn!
    // Otherwise, turn passes to next player.
    if (this.pocketedThisTurn === 0) {
      this.currentTurn = (this.currentTurn + 1) % this.totalSeats;
    }

    this.positionStriker();
    this.updateScoreboard();
    this.checkWinner();

    if (this.isAI && this.currentTurn === 1) {
      this.triggerAIMove();
    }
  }

  triggerAIMove() {
    setTimeout(() => {
      if (this.isMoving || this.currentTurn !== 1) return;

      const activeCoins = this.coins.filter(c => !c.isPocketed);
      if (activeCoins.length === 0) return;

      // AI targets queen or nearest coin
      const queen = activeCoins.find(c => c.type === 'queen');
      const target = queen || activeCoins[Math.floor(Math.random() * activeCoins.length)];

      this.strikerBaseX = Math.max(160, Math.min(440, target.x + (Math.random() - 0.5) * 40));
      this.positionStriker();

      setTimeout(() => {
        const dx = target.x - this.striker.x;
        const dy = target.y - this.striker.y;
        this.aimAngle = Math.atan2(dy, dx);
        const power = 13 + Math.random() * 6;

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

      // Speed threshold
      if (Math.hypot(b.vx, b.vy) < 0.2) {
        b.vx = 0;
        b.vy = 0;
      } else {
        anyMoving = true;
      }

      // Walls bounce
      const minX = this.BOARD_PAD + b.radius;
      const maxX = this.V_WIDTH - this.BOARD_PAD - b.radius;
      const minY = this.BOARD_PAD + b.radius;
      const maxY = this.V_HEIGHT - this.BOARD_PAD - b.radius;

      if (b.x < minX) { b.x = minX; b.vx = -b.vx * 0.86; if (window.soundFX) window.soundFX.carromClack(); }
      if (b.x > maxX) { b.x = maxX; b.vx = -b.vx * 0.86; if (window.soundFX) window.soundFX.carromClack(); }
      if (b.y < minY) { b.y = minY; b.vy = -b.vy * 0.86; if (window.soundFX) window.soundFX.carromClack(); }
      if (b.y > maxY) { b.y = maxY; b.vy = -b.vy * 0.86; if (window.soundFX) window.soundFX.carromClack(); }

      // Pockets suction & capture
      this.pockets.forEach(p => {
        const dist = Math.hypot(b.x - p.x, b.y - p.y);
        if (dist < this.POCKET_RADIUS) {
          b.isPocketed = true;
          b.vx = 0;
          b.vy = 0;

          if (b === this.striker) {
            // Foul: -5 pts
            this.players[this.currentTurn].score = Math.max(0, this.players[this.currentTurn].score - 5);
            if (window.soundFX) window.soundFX.carromFoul();
          } else {
            this.pocketedThisTurn++;
            this.players[this.currentTurn].score += b.points;
            if (b.type === 'queen') {
              this.queenPocketedBy = this.currentTurn;
            }
            if (window.soundFX) window.soundFX.carromPocket();
          }
          this.updateScoreboard();
        }
      });
    });

    // Elastic Disc-on-Disc Collisions
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

          // Push apart overlap
          const overlap = minDist - dist;
          b1.x -= nx * overlap * 0.5;
          b1.y -= ny * overlap * 0.5;
          b2.x += nx * overlap * 0.5;
          b2.y += ny * overlap * 0.5;

          // Normal relative velocity
          const kx = b1.vx - b2.vx;
          const ky = b1.vy - b2.vy;
          const p = 2 * (nx * kx + ny * ky) / 2;

          b1.vx -= p * nx * 0.94;
          b1.vy -= p * ny * 0.94;
          b2.vx += p * nx * 0.94;
          b2.vy += p * ny * 0.94;

          if (window.soundFX && Math.abs(p) > 0.5) {
            window.soundFX.carromClack();
          }
        }
      }
    }

    if (this.isMoving && !anyMoving) {
      this.finishTurn();
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.V_WIDTH, this.V_HEIGHT);

    ctx.save();
    // Perspective rotation (Player 2 view flips 180° around center)
    if (this.rotationAngle !== 0) {
      ctx.translate(300, 300);
      ctx.rotate(this.rotationAngle);
      ctx.translate(-300, -300);
    }

    // Wooden/Metallic Tournament Board Surface
    ctx.fillStyle = '#0a0d24';
    ctx.fillRect(0, 0, this.V_WIDTH, this.V_HEIGHT);

    // Thick Beveled Cyber Border
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#181e42';
    ctx.strokeRect(10, 10, this.V_WIDTH - 20, this.V_HEIGHT - 20);

    // Inner Neon Boundary
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00f0ff33';
    ctx.strokeRect(this.BOARD_PAD, this.BOARD_PAD, this.V_WIDTH - this.BOARD_PAD * 2, this.V_HEIGHT - this.BOARD_PAD * 2);

    // Corner Pockets with Neon Rings
    this.pockets.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.POCKET_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#03050c';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ff0077aa';
      ctx.stroke();
    });

    // Center Floral Concentric Rings
    ctx.beginPath();
    ctx.arc(300, 300, 52, 0, Math.PI * 2);
    ctx.strokeStyle = '#00f0ff55';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(300, 300, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#ff005522';
    ctx.fill();
    ctx.strokeStyle = '#ff005588';
    ctx.stroke();

    // Tournament Baselines (All 4 Sides)
    const drawBaseline = (x1, y1, x2, y2, isActive) => {
      ctx.save();
      ctx.strokeStyle = isActive ? '#00f0ff88' : '#33446655';
      ctx.lineWidth = isActive ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Red end circles on baselines
      [ { x: x1, y: y1 }, { x: x2, y: y2 } ].forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 11, 0, Math.PI * 2);
        ctx.fillStyle = '#ff005533';
        ctx.fill();
        ctx.strokeStyle = '#ff0055';
        ctx.stroke();
      });
      ctx.restore();
    };

    const isBottomTurn = this.currentTurn === 0;
    const isTopTurn = this.currentTurn === 1;

    drawBaseline(160, 490, 440, 490, isBottomTurn); // Bottom baseline
    drawBaseline(160, 110, 440, 110, isTopTurn);   // Top baseline
    drawBaseline(110, 160, 110, 440, false);       // Left
    drawBaseline(490, 160, 490, 440, false);       // Right

    // Draw Coins
    this.coins.forEach(c => {
      if (c.isPocketed) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fillStyle = c.color;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = c.border || '#ff0055';
      ctx.stroke();

      // Metallic center accent on coins
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = c.type === 'queen' ? '#ffffff' : (c.type === 'white' ? '#00f0ff' : '#444466');
      ctx.fill();
      ctx.restore();
    });

    // Draw Striker & Aim Guide
    if (this.striker && !this.striker.isPocketed) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.striker.x, this.striker.y, this.striker.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.striker.color;
      ctx.shadowColor = '#ffbd00';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Center disc ring
      ctx.beginPath();
      ctx.arc(this.striker.x, this.striker.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Draw Laser Aim Arrow when waiting for shot
      if (!this.isMoving && this.isMyTurn()) {
        const len = this.aimPower * 11;
        const targetX = this.striker.x + Math.cos(this.aimAngle) * len;
        const targetY = this.striker.y + Math.sin(this.aimAngle) * len;

        // Glowing trajectory line
        ctx.beginPath();
        ctx.setLineDash([7, 4]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.moveTo(this.striker.x, this.striker.y);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        // Arrow head / target reticle
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.arc(targetX, targetY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffbd00';
        ctx.fill();

        // Elastic Slingshot pull band visualization
        if (this.isSlingshotting && this.dragCurrent) {
          ctx.beginPath();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#ff0055';
          ctx.shadowColor = '#ff0055';
          ctx.shadowBlur = 8;
          ctx.moveTo(this.striker.x, this.striker.y);
          ctx.lineTo(this.dragCurrent.x, this.dragCurrent.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(this.dragCurrent.x, this.dragCurrent.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#ff0055';
          ctx.fill();
        }
      }
      ctx.restore();
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

  checkWinner() {
    const remaining = this.coins.filter(c => !c.isPocketed);
    if (remaining.length === 0) {
      let maxScore = -1;
      let winner = this.players[0];
      this.players.forEach(p => {
        if (p.score > maxScore) {
          maxScore = p.score;
          winner = p;
        }
      });

      alert(`🏆 GAME OVER!\n\n${winner.name} WINS with ${winner.score} POINTS!`);
      if (window.soundFX) window.soundFX.victory();
      if (this.currentTurn === this.mySeatIndex) {
        window.authController.recordOutcome('carrom', true, 250);
      }
    }
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    clearTimeout(this.motionTimer);
  }
}

window.CyberCarromGame = CyberCarromGame;
