// ==========================================
// GAME 4: CYBER SNAKES & LADDERS (2P / 3P / 4P)
// High-tech 100-cell board with portal climbs & glitch snakes
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

    // Board Portals (Ladders: Start -> End)
    this.LADDERS = {
      4: 14,
      9: 31,
      20: 38,
      28: 84,
      40: 59,
      51: 67,
      63: 81,
      71: 91
    };

    // Board Glitches (Snakes: Head -> Tail)
    this.SNAKES = {
      17: 7,
      54: 34,
      62: 19,
      64: 60,
      87: 24,
      93: 73,
      95: 75,
      99: 78
    };

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
      <div class="game-arena-layout">
        <div class="game-top-bar">
          <div class="players-score-row" id="snakes-players-row"></div>
          <div class="turn-indicator-pill" id="snakes-turn-pill">PLAYER 1'S ROLL</div>
        </div>

        <div class="snakes-board-wrapper board-3d-effect">
          <div class="snakes-grid" id="snakes-grid"></div>
        </div>

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
    this.updateStatus();
    this.renderTokens();
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

        let specialTag = '';
        if (this.LADDERS[cellNum]) specialTag = `<span class="ladder-tag">🪜 ➔ ${this.LADDERS[cellNum]}</span>`;
        if (this.SNAKES[cellNum]) specialTag = `<span class="snake-tag">🐍 ➔ ${this.SNAKES[cellNum]}</span>`;
        if (cellNum === 100) specialTag = '<span class="finish-tag">🏆 GOAL</span>';

        cell.innerHTML = `
          <span class="cell-num">${cellNum}</span>
          ${specialTag}
          <div class="cell-tokens-slot" id="slot-cell-${cellNum}"></div>
        `;
        grid.appendChild(cell);
      }
    }
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
          token.style.boxShadow = `0 0 10px ${p.color}`;
          token.innerHTML = p.avatar;
          token.title = p.name;
          slot.appendChild(token);
        }
      }
    });
  }

  handleDiceClick() {
    if (this.isRolling) return;
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

    // Check Ladder
    if (this.LADDERS[player.pos]) {
      setTimeout(() => {
        player.pos = this.LADDERS[player.pos];
        window.soundFX && window.soundFX.ladderClimb();
        this.renderTokens();
        this.checkWinOrPass();
      }, 500);
    }
    // Check Snake
    else if (this.SNAKES[player.pos]) {
      setTimeout(() => {
        player.pos = this.SNAKES[player.pos];
        window.soundFX && window.soundFX.snakeBite();
        this.renderTokens();
        this.checkWinOrPass();
      }, 500);
    } else {
      this.checkWinOrPass();
    }
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

    // AI Turn
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
