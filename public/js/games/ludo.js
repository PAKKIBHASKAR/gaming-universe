// ==========================================
// GAME 3: CYBER LUDO (2P / 3P / 4P)
// High-Fidelity 3D Cyberpunk Board, Step-by-Step Animated Hops
// Safe Zone Stars, Token Captures, Bonus Rolls on 6 & Kills
// ==========================================
class CyberLudoGame {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.mode = options.mode || 'local'; // 'local', 'ai', 'multiplayer'
    this.roomData = options.roomData || null;
    this.isOnline = this.mode === 'multiplayer';

    if (this.isOnline && this.roomData && this.roomData.maxPlayers) {
      this.playerCount = this.roomData.maxPlayers;
    } else {
      this.playerCount = options.playerCount || 4;
    }

    this.isAI = !this.isOnline && options.playerCount === 1;

    // Standard 4 Colors configuration
    this.PLAYER_CONFIG = [
      { id: 0, key: 'red', name: 'Red Nova', color: '#ff0055', startIdx: 0, avatar: '⚔️' },
      { id: 1, key: 'green', name: 'Green Matrix', color: '#00ff66', startIdx: 13, avatar: '🥷' },
      { id: 2, key: 'yellow', name: 'Yellow Solar', color: '#ffbd00', startIdx: 26, avatar: '👨‍🚀' },
      { id: 3, key: 'blue', name: 'Blue Cyber', color: '#00f0ff', startIdx: 39, avatar: '⚡' }
    ];

    if (this.playerCount === 2) {
      // Opposite corners for 2P (Red vs Yellow)
      this.activePlayers = [this.PLAYER_CONFIG[0], this.PLAYER_CONFIG[2]];
    } else if (this.playerCount === 3) {
      this.activePlayers = [this.PLAYER_CONFIG[0], this.PLAYER_CONFIG[1], this.PLAYER_CONFIG[2]];
    } else {
      this.activePlayers = [...this.PLAYER_CONFIG];
    }

    // Multiplayer room identity mapping
    this.mySeatIndex = 0;
    if (this.isOnline && window.multiplayerManager) {
      this.mySeatIndex = window.multiplayerManager.playerIndex || 0;
      if (this.roomData && this.roomData.players) {
        this.activePlayers.forEach((p, idx) => {
          const roomP = this.roomData.players[idx];
          if (roomP) {
            p.name = roomP.name;
            if (idx === this.mySeatIndex) p.name += ' [YOU]';
            const meta = window.authController.getAvatarMeta(roomP.avatar);
            p.avatar = meta ? meta.icon : p.avatar;
          }
        });
      }
    }

    this.currentTurnIdx = 0;
    this.diceValue = 1;
    this.isRolling = false;
    this.hasRolled = false;
    this.isAnimatingMove = false;

    // Standard 52-cell Outer Path Coordinates (15x15 grid)
    this.PATH_COORDS = [
      { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 6, c: 3 }, { r: 6, c: 4 }, { r: 6, c: 5 },
      { r: 5, c: 6 }, { r: 4, c: 6 }, { r: 3, c: 6 }, { r: 2, c: 6 }, { r: 1, c: 6 }, { r: 0, c: 6 },
      { r: 0, c: 7 }, { r: 0, c: 8 },
      { r: 1, c: 8 }, { r: 2, c: 8 }, { r: 3, c: 8 }, { r: 4, c: 8 }, { r: 5, c: 8 },
      { r: 6, c: 9 }, { r: 6, c: 10 }, { r: 6, c: 11 }, { r: 6, c: 12 }, { r: 6, c: 13 }, { r: 6, c: 14 },
      { r: 7, c: 14 }, { r: 8, c: 14 },
      { r: 8, c: 13 }, { r: 8, c: 12 }, { r: 8, c: 11 }, { r: 8, c: 10 }, { r: 8, c: 9 },
      { r: 9, c: 8 }, { r: 10, c: 8 }, { r: 11, c: 8 }, { r: 12, c: 8 }, { r: 13, c: 8 }, { r: 14, c: 8 },
      { r: 14, c: 7 }, { r: 14, c: 6 },
      { r: 13, c: 6 }, { r: 12, c: 6 }, { r: 11, c: 6 }, { r: 10, c: 6 }, { r: 9, c: 6 },
      { r: 8, c: 5 }, { r: 8, c: 4 }, { r: 8, c: 3 }, { r: 8, c: 2 }, { r: 8, c: 1 }, { r: 8, c: 0 },
      { r: 7, c: 0 }, { r: 6, c: 0 }
    ];

    // Safe zone cell indices (Star badges)
    this.SAFE_CELLS = [0, 8, 13, 21, 26, 34, 39, 47];

    // Initialize 4 tokens per active player
    this.tokens = {};
    this.activePlayers.forEach(p => {
      this.tokens[p.key] = [
        { id: 0, state: 'base', stepsFromStart: -1 },
        { id: 1, state: 'base', stepsFromStart: -1 },
        { id: 2, state: 'base', stepsFromStart: -1 },
        { id: 3, state: 'base', stepsFromStart: -1 }
      ];
    });

    this.init();
  }

  init() {
    this.render();

    if (this.isOnline) {
      window.multiplayerManager.clearActionListeners();
      window.multiplayerManager.onAction((data) => {
        if (data.actionType === 'ludo_roll') {
          this.executeRoll(data.payload.value, false);
        } else if (data.actionType === 'ludo_move') {
          this.moveToken(data.payload.playerKey, data.payload.tokenId, false);
        }
      });
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="game-arena-layout">
        <div class="game-top-bar">
          <div class="players-score-row" id="ludo-players-row"></div>
          <div class="turn-indicator-pill" id="ludo-turn-pill">RED'S TURN</div>
        </div>

        <div class="ludo-board-wrapper board-3d-effect">
          <div class="ludo-board-grid" id="ludo-board"></div>
        </div>

        <div class="ludo-controls-bar">
          <div class="dice-box-neon" id="ludo-dice-box" title="Click to roll dice">
            <span class="dice-face" id="ludo-dice-val">🎲</span>
            <span class="dice-prompt" id="ludo-dice-prompt">CLICK TO ROLL</span>
          </div>
          <div class="ludo-action-btns">
            <button class="cyber-btn sm secondary" id="btn-ludo-rules">📜 Rules</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('ludo-dice-box').addEventListener('click', () => this.handleDiceClick());
    document.getElementById('btn-ludo-rules').addEventListener('click', () => {
      window.rulesModal.show('ludo');
    });

    this.renderBoardCells();
    this.updateStatus();
  }

  renderBoardCells() {
    const boardEl = document.getElementById('ludo-board');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const cell = document.createElement('div');
        cell.className = 'ludo-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;

        // Base Quadrants (6x6 corners)
        if (r < 6 && c < 6) {
          cell.classList.add('ludo-base', 'red-base');
        } else if (r < 6 && c > 8) {
          cell.classList.add('ludo-base', 'green-base');
        } else if (r > 8 && c > 8) {
          cell.classList.add('ludo-base', 'yellow-base');
        } else if (r > 8 && c < 6) {
          cell.classList.add('ludo-base', 'blue-base');
        } else if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
          cell.classList.add('ludo-center-home');
          if (r === 7 && c === 7) cell.innerHTML = '👑';
        }

        // Colored Home Runways
        if (r === 7 && c >= 1 && c <= 6) cell.classList.add('red-track');
        if (c === 7 && r >= 1 && r <= 6) cell.classList.add('green-track');
        if (r === 7 && c >= 8 && c <= 13) cell.classList.add('yellow-track');
        if (c === 7 && r >= 8 && r <= 13) cell.classList.add('blue-track');

        // Safe Zone Stars
        const pathIdx = this.PATH_COORDS.findIndex(p => p.r === r && p.c === c);
        if (pathIdx !== -1 && this.SAFE_CELLS.includes(pathIdx)) {
          cell.classList.add('safe-cell');
          const starBadge = document.createElement('span');
          starBadge.className = 'safe-star-badge';
          starBadge.textContent = '⭐';
          cell.appendChild(starBadge);
        }

        boardEl.appendChild(cell);
      }
    }

    this.renderTokensOnBoard();
  }

  renderTokensOnBoard() {
    document.querySelectorAll('.ludo-token').forEach(t => t.remove());

    const activeP = this.activePlayers[this.currentTurnIdx];

    this.activePlayers.forEach(p => {
      this.tokens[p.key].forEach(token => {
        const tokenEl = document.createElement('div');
        tokenEl.className = `ludo-token ${p.key}-token`;
        tokenEl.style.backgroundColor = p.color;
        tokenEl.innerHTML = p.avatar;

        const isCurrentTurn = p.key === activeP.key;
        let canMove = this.hasRolled && !this.isRolling && !this.isAnimatingMove && isCurrentTurn && this.canTokenMove(token);

        if (this.isOnline && this.currentTurnIdx !== this.mySeatIndex) {
          canMove = false;
        }

        if (canMove) {
          tokenEl.classList.add('selectable');
          tokenEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.moveToken(p.key, token.id, true);
          });
        }

        const cellPos = this.getTokenScreenCoord(p.key, token);
        if (cellPos) {
          const targetCell = document.querySelector(`.ludo-cell[data-r="${cellPos.r}"][data-c="${cellPos.c}"]`);
          if (targetCell) targetCell.appendChild(tokenEl);
        }
      });
    });
  }

  getTokenScreenCoord(playerKey, token) {
    if (token.state === 'base') {
      const offsets = [
        { dr: 2, dc: 2 }, { dr: 2, dc: 3 }, { dr: 3, dc: 2 }, { dr: 3, dc: 3 }
      ];
      const baseRoots = {
        red: { r: 0, c: 0 },
        green: { r: 0, c: 9 },
        yellow: { r: 9, c: 9 },
        blue: { r: 9, c: 0 }
      };
      const root = baseRoots[playerKey];
      const off = offsets[token.id];
      return { r: root.r + off.dr, c: root.c + off.dc };
    }

    if (token.state === 'home') {
      return { r: 7, c: 7 };
    }

    if (token.state === 'home-stretch') {
      const stretchIdx = token.stepsFromStart - 50; // 1 to 5
      if (playerKey === 'red') return { r: 7, c: stretchIdx };
      if (playerKey === 'green') return { r: stretchIdx, c: 7 };
      if (playerKey === 'yellow') return { r: 7, c: 14 - stretchIdx };
      if (playerKey === 'blue') return { r: 14 - stretchIdx, c: 7 };
    }

    // Outer track
    const pConfig = this.PLAYER_CONFIG.find(x => x.key === playerKey);
    const pathIdx = (pConfig.startIdx + token.stepsFromStart) % this.PATH_COORDS.length;
    return this.PATH_COORDS[pathIdx];
  }

  canTokenMove(token) {
    if (token.state === 'home') return false;
    if (token.state === 'base') return this.diceValue === 6;
    return token.stepsFromStart + this.diceValue <= 56;
  }

  handleDiceClick() {
    if (this.hasRolled || this.isRolling || this.isAnimatingMove) return;

    if (this.isOnline && this.currentTurnIdx !== this.mySeatIndex) {
      if (window.soundFX) window.soundFX.carromFoul();
      return;
    }

    const rollVal = Math.floor(Math.random() * 6) + 1;
    this.executeRoll(rollVal, true);
  }

  executeRoll(val, shouldBroadcast = true) {
    this.isRolling = true;
    if (window.soundFX) window.soundFX.diceRoll();

    const diceBox = document.getElementById('ludo-dice-box');
    const diceValEl = document.getElementById('ludo-dice-val');
    const promptEl = document.getElementById('ludo-dice-prompt');
    if (diceBox) diceBox.classList.add('rolling');
    if (promptEl) promptEl.textContent = 'ROLLING...';

    setTimeout(() => {
      this.isRolling = false;
      this.hasRolled = true;
      this.diceValue = val;
      if (diceBox) diceBox.classList.remove('rolling');

      const diceIcons = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
      if (diceValEl) diceValEl.textContent = `${diceIcons[val - 1]} (${val})`;

      if (shouldBroadcast && this.isOnline) {
        window.multiplayerManager.sendAction('ludo_roll', { value: val });
      }

      const activeP = this.activePlayers[this.currentTurnIdx];
      const moveable = this.tokens[activeP.key].filter(t => this.canTokenMove(t));

      if (promptEl) {
        if (moveable.length === 0) {
          promptEl.textContent = 'NO VALID MOVES';
        } else {
          promptEl.textContent = val === 6 ? 'ROLL 6! PICK A TOKEN' : 'SELECT A TOKEN';
        }
      }

      this.renderTokensOnBoard();

      if (moveable.length === 0) {
        // No moves possible -> pass turn
        setTimeout(() => this.nextTurn(), 1000);
      } else if (moveable.length === 1 && (this.isAI && this.currentTurnIdx !== 0)) {
        // AI single move
        setTimeout(() => this.moveToken(activeP.key, moveable[0].id, shouldBroadcast), 400);
      }
    }, 500);
  }

  // STEP-BY-STEP ANIMATED TOKEN MOVEMENT
  moveToken(playerKey, tokenId, shouldBroadcast = true) {
    const token = this.tokens[playerKey].find(t => t.id === tokenId);
    if (!token || !this.canTokenMove(token)) return;

    this.isAnimatingMove = true;

    if (shouldBroadcast && this.isOnline) {
      window.multiplayerManager.sendAction('ludo_move', { playerKey, tokenId });
    }

    if (token.state === 'base') {
      // Exit base to track step 0
      token.state = 'track';
      token.stepsFromStart = 0;
      if (window.soundFX) window.soundFX.tokenUnlock();
      this.renderTokensOnBoard();
      this.isAnimatingMove = false;

      // Bonus roll for rolling a 6!
      this.grantBonusRoll('Rolled a 6! Extra roll awarded!');
      return;
    }

    // Step-by-step hop animation
    const targetSteps = token.stepsFromStart + this.diceValue;
    const stepInterval = setInterval(() => {
      if (token.stepsFromStart < targetSteps) {
        token.stepsFromStart++;

        if (token.stepsFromStart >= 56) {
          token.state = 'home';
        } else if (token.stepsFromStart > 50) {
          token.state = 'home-stretch';
        } else {
          token.state = 'track';
        }

        if (window.soundFX) window.soundFX.tokenStep();
        this.renderTokensOnBoard();
      } else {
        clearInterval(stepInterval);
        this.isAnimatingMove = false;
        this.onTokenReachedDestination(playerKey, token);
      }
    }, 120);
  }

  onTokenReachedDestination(playerKey, token) {
    let earnedBonus = false;

    if (token.state === 'home') {
      if (window.soundFX) window.soundFX.victory();
      this.checkWinCondition(playerKey);
      earnedBonus = true; // Bonus roll for getting home!
    } else if (token.state === 'track') {
      // Check capture of opponent token
      const pConfig = this.PLAYER_CONFIG.find(x => x.key === playerKey);
      const myCellIdx = (pConfig.startIdx + token.stepsFromStart) % this.PATH_COORDS.length;
      const isSafe = this.SAFE_CELLS.includes(myCellIdx);

      if (!isSafe) {
        this.activePlayers.forEach(p => {
          if (p.key !== playerKey) {
            const oppConfig = this.PLAYER_CONFIG.find(x => x.key === p.key);
            this.tokens[p.key].forEach(other => {
              if (other.state === 'track') {
                const oppCellIdx = (oppConfig.startIdx + other.stepsFromStart) % this.PATH_COORDS.length;
                if (oppCellIdx === myCellIdx) {
                  // Capture! Send other token to base
                  other.state = 'base';
                  other.stepsFromStart = -1;
                  if (window.soundFX) window.soundFX.tokenCapture();
                  earnedBonus = true; // Bonus roll for capturing!
                }
              }
            });
          }
        });
      }
    }

    this.renderTokensOnBoard();

    // Check if player gets a bonus roll (rolling a 6, capturing a token, or reaching home)
    if (this.diceValue === 6 || earnedBonus) {
      this.grantBonusRoll(this.diceValue === 6 ? 'Rolled a 6! Roll again!' : 'Token Capture! Bonus roll!');
    } else {
      this.nextTurn();
    }
  }

  grantBonusRoll(reason) {
    this.hasRolled = false;
    const promptEl = document.getElementById('ludo-dice-prompt');
    if (promptEl) promptEl.textContent = reason;
    this.updateStatus();
    this.renderTokensOnBoard();

    if (this.isAI && this.currentTurnIdx !== 0) {
      setTimeout(() => {
        const rollVal = Math.floor(Math.random() * 6) + 1;
        this.executeRoll(rollVal, false);
      }, 700);
    }
  }

  checkWinCondition(playerKey) {
    const allHome = this.tokens[playerKey].every(t => t.state === 'home');
    if (allHome) {
      const p = this.activePlayers.find(x => x.key === playerKey);
      alert(`🎉 CHAMPION!\n\n${p.name} HAS GUIDED ALL 4 TOKENS HOME!`);
      if (window.soundFX) window.soundFX.victory();
      if (this.currentTurnIdx === this.mySeatIndex) {
        window.authController.recordOutcome('ludo', true, 300);
      }
    }
  }

  nextTurn() {
    this.hasRolled = false;
    this.currentTurnIdx = (this.currentTurnIdx + 1) % this.activePlayers.length;
    this.updateStatus();
    this.renderTokensOnBoard();

    const promptEl = document.getElementById('ludo-dice-prompt');
    if (promptEl) promptEl.textContent = 'CLICK TO ROLL';

    const activeP = this.activePlayers[this.currentTurnIdx];
    if (this.isAI && this.currentTurnIdx !== 0) {
      setTimeout(() => {
        const rollVal = Math.floor(Math.random() * 6) + 1;
        this.executeRoll(rollVal, false);
      }, 800);
    }
  }

  updateStatus() {
    const pill = document.getElementById('ludo-turn-pill');
    const activeP = this.activePlayers[this.currentTurnIdx];
    if (pill && activeP) {
      pill.textContent = `${activeP.name.toUpperCase()}'S TURN`;
      pill.style.borderColor = activeP.color;
      pill.style.color = activeP.color;
    }

    const row = document.getElementById('ludo-players-row');
    if (row) {
      row.innerHTML = '';
      this.activePlayers.forEach((p, idx) => {
        const card = document.createElement('div');
        card.className = `player-badge-card ${idx === this.currentTurnIdx ? 'active' : ''}`;
        const finishedCount = this.tokens[p.key].filter(t => t.state === 'home').length;
        card.innerHTML = `
          <span class="badge-avatar">${p.avatar}</span>
          <div class="badge-text">
            <span class="badge-name">${p.name}</span>
            <span class="badge-score" style="color:${p.color}">${finishedCount}/4 IN HOME</span>
          </div>
        `;
        row.appendChild(card);
      });
    }
  }

  destroy() {
    // Cleanup if any
  }
}

window.CyberLudoGame = CyberLudoGame;
