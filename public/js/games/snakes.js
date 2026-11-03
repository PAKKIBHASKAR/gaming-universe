// ==========================================
// GAME 4: CYBER SNAKES & LADDERS (CINEMATIC EDITION)
// Visual Realistic Snakes & Ladders, Animated Climbs & Ambush Bites
// ==========================================
class CyberSnakesGame {
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

    // Ladders (Start Tile -> End Tile)
    this.LADDERS = [
      { from: 4, to: 14, color: '#00ffaa' },
      { from: 9, to: 31, color: '#ffbd00' },
      { from: 20, to: 38, color: '#00f0ff' },
      { from: 28, to: 84, color: '#00ffaa' },
      { from: 40, to: 59, color: '#ffbd00' },
      { from: 51, to: 67, color: '#00f0ff' },
      { from: 63, to: 81, color: '#ffbd00' },
      { from: 71, to: 91, color: '#00ffaa' }
    ];

    // Snakes (Head Tile -> Tail Tile)
    this.SNAKES = [
      { from: 17, to: 7, color: '#ff0055' },
      { from: 54, to: 34, color: '#ff0077' },
      { from: 62, to: 19, color: '#ff0055' },
      { from: 64, to: 60, color: '#ff0033' },
      { from: 87, to: 24, color: '#ff0077' },
      { from: 93, to: 73, color: '#ff0055' },
      { from: 95, to: 75, color: '#ff0077' },
      { from: 99, to: 78, color: '#ff0033' }
    ];

    const colors = ['#00f0ff', '#ff0077', '#ffbd00', '#00ff66'];
    const defaultAvatars = ['⚔️', '🥷', '👨‍🚀', '⚡'];

    this.players = [];
    for (let i = 0; i < this.playerCount; i++) {
      let pName = `Player ${i + 1}`;
      let pAvatar = defaultAvatars[i];

      if (this.mode === 'ai') {
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
        avatar: pAvatar,
        pos: 0
      });
    }

    this.currentTurn = 0;
    this.isRolling = false;
    this.diceValue = 1;
    this.isAnimatingCinematic = false;

    this.init();
  }

  init() {
    this.render();

    if (this.isOnline) {
      window.multiplayerManager.clearActionListeners();
      window.multiplayerManager.onAction((data) => {
        if (data.actionType === 'snakes_roll') {
          this.executeRoll(data.payload.value, false);
        }
      });
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="game-arena-layout" id="snakes-arena-wrapper">
        <div class="game-top-bar">
          <div class="players-score-row" id="snakes-players-row"></div>
          <div class="turn-indicator-pill" id="snakes-turn-pill">PLAYER 1'S ROLL</div>
        </div>

        <!-- Board Wrapper with Visual Overlay for Realistic Snakes and Ladders -->
        <div class="snakes-board-wrapper board-3d-effect">
          <div class="snakes-grid-container" id="snakes-board-frame">
            <div class="snakes-grid" id="snakes-grid"></div>
            <!-- Dynamic SVG Graphic Layer for Realistic Snakes & 3D Ladders -->
            <svg id="snakes-svg-overlay" class="snakes-svg-overlay"></svg>
          </div>
        </div>

        <!-- Cinematic Action Banner -->
        <div id="snakes-cinematic-banner" class="cinematic-banner hidden"></div>

        <div class="ludo-controls-bar">
          <div class="dice-box-neon" id="snakes-dice-box">
            <span class="dice-face" id="snakes-dice-val">🎲</span>
            <span class="dice-prompt">CLICK TO ROLL</span>
          </div>
          <button class="cyber-btn sm" id="btn-snakes-rules">📜 View Rules</button>
        </div>
      </div>
    `;

    document.getElementById('snakes-dice-box').addEventListener('click', () => this.handleDiceClick());
    document.getElementById('btn-snakes-rules').addEventListener('click', () => {
      window.rulesModal.show('snakes');
    });

    this.buildGrid();
    setTimeout(() => {
      this.drawVisualSnakesAndLadders();
      this.renderTokens();
    }, 150);

    window.addEventListener('resize', () => this.drawVisualSnakesAndLadders());
    this.updateStatus();
  }

  buildGrid() {
    const grid = document.getElementById('snakes-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let row = 9; row >= 0; row--) {
      const isEvenRow = (9 - row) % 2 === 1;
      for (let col = 0; col < 10; col++) {
        const cellNum = isEvenRow ? (row * 10 + (10 - col)) : (row * 10 + col + 1);
        const cell = document.createElement('div');
        cell.className = `snakes-cell ${(row + col) % 2 === 0 ? 'cell-alt' : ''}`;
        cell.id = `snakes-cell-${cellNum}`;
        cell.dataset.cellNum = cellNum;

        let badge = '';
        if (cellNum === 100) badge = '<span class="finish-tag">🏆 100</span>';

        cell.innerHTML = `
          <span class="cell-num">${cellNum}</span>
          ${badge}
          <div class="cell-tokens-slot" id="slot-cell-${cellNum}"></div>
        `;
        grid.appendChild(cell);
      }
    }
  }

  // Calculates exact center coordinates (in pixels) of any tile on the board
  getCellCenter(cellNum) {
    const cell = document.getElementById(`snakes-cell-${cellNum}`);
    const frame = document.getElementById('snakes-board-frame');
    if (!cell || !frame) return { x: 0, y: 0 };

    const cRect = cell.getBoundingClientRect();
    const fRect = frame.getBoundingClientRect();

    return {
      x: cRect.left - fRect.left + cRect.width / 2,
      y: cRect.top - fRect.top + cRect.height / 2
    };
  }

  drawVisualSnakesAndLadders() {
    const svg = document.getElementById('snakes-svg-overlay');
    const frame = document.getElementById('snakes-board-frame');
    if (!svg || !frame) return;

    svg.setAttribute('width', frame.offsetWidth);
    svg.setAttribute('height', frame.offsetHeight);
    svg.innerHTML = '';

    // Draw Visual Realistic 3D Ladders
    this.LADDERS.forEach(ladder => {
      const start = this.getCellCenter(ladder.from);
      const end = this.getCellCenter(ladder.to);

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) return;

      const nx = -dy / dist * 7;
      const ny = dx / dist * 7;

      // Left rail
      const rail1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      rail1.setAttribute('x1', start.x + nx);
      rail1.setAttribute('y1', start.y + ny);
      rail1.setAttribute('x2', end.x + nx);
      rail1.setAttribute('y2', end.y + ny);
      rail1.setAttribute('stroke', ladder.color);
      rail1.setAttribute('stroke-width', '3');
      rail1.setAttribute('filter', 'drop-shadow(0 0 5px ' + ladder.color + ')');
      svg.appendChild(rail1);

      // Right rail
      const rail2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      rail2.setAttribute('x1', start.x - nx);
      rail2.setAttribute('y1', start.y - ny);
      rail2.setAttribute('x2', end.x - nx);
      rail2.setAttribute('y2', end.y - ny);
      rail2.setAttribute('stroke', ladder.color);
      rail2.setAttribute('stroke-width', '3');
      rail2.setAttribute('filter', 'drop-shadow(0 0 5px ' + ladder.color + ')');
      svg.appendChild(rail2);

      // Cross rungs
      const rungs = Math.floor(dist / 16);
      for (let i = 1; i <= rungs; i++) {
        const t = i / (rungs + 1);
        const rx = start.x + dx * t;
        const ry = start.y + dy * t;

        const rung = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        rung.setAttribute('x1', rx + nx);
        rung.setAttribute('y1', ry + ny);
        rung.setAttribute('x2', rx - nx);
        rung.setAttribute('y2', ry - ny);
        rung.setAttribute('stroke', '#ffffff');
        rung.setAttribute('stroke-width', '2');
        svg.appendChild(rung);
      }
    });

    // Draw Visual Realistic Cyber Snakes (Curved Body + Cobra Head with Eyes)
    this.SNAKES.forEach(snake => {
      const head = this.getCellCenter(snake.from);
      const tail = this.getCellCenter(snake.to);

      const midX = (head.x + tail.x) / 2 + (Math.random() > 0.5 ? 40 : -40);
      const midY = (head.y + tail.y) / 2;

      // S-curve snake body
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M ${head.x} ${head.y} Q ${midX} ${midY} ${tail.x} ${tail.y}`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', snake.color);
      path.setAttribute('stroke-width', '7');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('filter', 'drop-shadow(0 0 8px ' + snake.color + ')');
      svg.appendChild(path);

      // Inner snake texture pattern line
      const innerLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      innerLine.setAttribute('d', d);
      innerLine.setAttribute('fill', 'none');
      innerLine.setAttribute('stroke', '#fff');
      innerLine.setAttribute('stroke-width', '2');
      innerLine.setAttribute('stroke-dasharray', '3,4');
      svg.appendChild(innerLine);

      // Snake Cobra Head
      const headCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      headCircle.setAttribute('cx', head.x);
      headCircle.setAttribute('cy', head.y);
      headCircle.setAttribute('r', '8');
      headCircle.setAttribute('fill', '#ff0033');
      headCircle.setAttribute('stroke', '#ffffff');
      headCircle.setAttribute('stroke-width', '2');
      svg.appendChild(headCircle);

      // Snake Glowing Eyes
      const eye1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      eye1.setAttribute('cx', head.x - 3);
      eye1.setAttribute('cy', head.y - 2);
      eye1.setAttribute('r', '1.5');
      eye1.setAttribute('fill', '#ffff00');
      svg.appendChild(eye1);

      const eye2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      eye2.setAttribute('cx', head.x + 3);
      eye2.setAttribute('cy', head.y - 2);
      eye2.setAttribute('r', '1.5');
      eye2.setAttribute('fill', '#ffff00');
      svg.appendChild(eye2);
    });
  }

  renderTokens() {
    document.querySelectorAll('.cell-tokens-slot').forEach(s => s.innerHTML = '');

    this.players.forEach(p => {
      if (p.pos > 0) {
        const slot = document.getElementById(`slot-cell-${p.pos}`);
        if (slot) {
          const token = document.createElement('div');
          token.className = 'snakes-token';
          token.style.borderColor = p.color;
          token.style.boxShadow = `0 0 12px ${p.color}`;
          token.innerHTML = p.avatar;
          token.title = p.name;
          slot.appendChild(token);
        }
      }
    });
  }

  handleDiceClick() {
    if (this.isRolling || this.isAnimatingCinematic) return;
    if (this.isOnline && this.currentTurn !== window.multiplayerManager.playerIndex) {
      window.soundFX && window.soundFX.carromFoul();
      return;
    }

    const rollVal = Math.floor(Math.random() * 6) + 1;
    this.executeRoll(rollVal, true);
  }

  executeRoll(val, shouldBroadcast = true) {
    this.isRolling = true;
    window.soundFX && window.soundFX.diceRoll();

    const diceBox = document.getElementById('snakes-dice-box');
    const diceValEl = document.getElementById('snakes-dice-val');
    if (diceBox) diceBox.classList.add('rolling');

    setTimeout(() => {
      this.isRolling = false;
      this.diceValue = val;
      if (diceBox) diceBox.classList.remove('rolling');

      const diceIcons = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
      if (diceValEl) diceValEl.textContent = `${diceIcons[val - 1]} (${val})`;

      if (shouldBroadcast && this.isOnline) {
        window.multiplayerManager.sendAction('snakes_roll', { value: val });
      }

      this.moveActivePlayer(val);
    }, 500);
  }

  moveActivePlayer(steps) {
    const player = this.players[this.currentTurn];
    let target = player.pos + steps;

    if (target > 100) {
      const excess = target - 100;
      target = 100 - excess;
    }

    player.pos = target;
    this.renderTokens();
    window.soundFX && window.soundFX.tokenStep();

    // Check Ladder Boost
    const ladderFound = this.LADDERS.find(l => l.from === player.pos);
    const snakeFound = this.SNAKES.find(s => s.from === player.pos);

    if (ladderFound) {
      this.isAnimatingCinematic = true;
      this.showCinematicBanner(`🪜 HYPER LADDER! ${player.name} climbs to Tile ${ladderFound.to}!`, 'ladder');

      setTimeout(() => {
        player.pos = ladderFound.to;
        window.soundFX && window.soundFX.ladderClimb();
        this.renderTokens();
        setTimeout(() => {
          this.isAnimatingCinematic = false;
          this.checkWinOrPass();
        }, 800);
      }, 700);
    }
    // Check Snake Bite Ambush
    else if (snakeFound) {
      this.isAnimatingCinematic = true;
      this.showCinematicBanner(`🐍 SNAKE AMBUSH! ${player.name} bitten down to Tile ${snakeFound.to}!`, 'snake');

      // Trigger screen shake
      const wrapper = document.getElementById('snakes-arena-wrapper');
      if (wrapper) wrapper.classList.add('cinematic-shake');

      setTimeout(() => {
        if (wrapper) wrapper.classList.remove('cinematic-shake');
        player.pos = snakeFound.to;
        window.soundFX && window.soundFX.snakeBite();
        this.renderTokens();
        setTimeout(() => {
          this.isAnimatingCinematic = false;
          this.checkWinOrPass();
        }, 800);
      }, 700);
    } else {
      this.checkWinOrPass();
    }
  }

  showCinematicBanner(text, type) {
    const banner = document.getElementById('snakes-cinematic-banner');
    if (!banner) return;
    banner.textContent = text;
    banner.className = `cinematic-banner ${type} visible`;
    setTimeout(() => {
      banner.className = 'cinematic-banner hidden';
    }, 2400);
  }

  checkWinOrPass() {
    const player = this.players[this.currentTurn];
    if (player.pos === 100) {
      window.soundFX && window.soundFX.victory();
      alert(`🎉 VICTORY! ${player.name} conquered the Snakes & Ladders Grid!`);
      window.authController.recordOutcome('snakes', true, 250);
      return;
    }

    if (this.diceValue !== 6) {
      this.currentTurn = (this.currentTurn + 1) % this.players.length;
    }

    this.updateStatus();

    // AI Turn simulation
    if (this.mode === 'ai' && this.currentTurn === 1) {
      setTimeout(() => {
        const rollVal = Math.floor(Math.random() * 6) + 1;
        this.executeRoll(rollVal, false);
      }, 900);
    }
  }

  updateStatus() {
    const pill = document.getElementById('snakes-turn-pill');
    const activeP = this.players[this.currentTurn];
    if (pill && activeP) {
      pill.textContent = `${activeP.name.toUpperCase()}'S TURN`;
      pill.style.borderColor = activeP.color;
      pill.style.color = activeP.color;
    }

    const row = document.getElementById('snakes-players-row');
    if (row) {
      row.innerHTML = '';
      this.players.forEach((p, idx) => {
        const card = document.createElement('div');
        card.className = `player-badge-card ${idx === this.currentTurn ? 'active' : ''}`;
        card.innerHTML = `
          <span class="badge-avatar">${p.avatar}</span>
          <div class="badge-text">
            <span class="badge-name">${p.name}</span>
            <span class="badge-score" style="color:${p.color}">TILE: ${p.pos}/100</span>
          </div>
        `;
        row.appendChild(card);
      });
    }
  }
}

window.CyberSnakesGame = CyberSnakesGame;
