// ==========================================
// GAME 1: CYBER CHESS ENGINE & BOARD
// Supports Single Player vs AI & 2 Players (Local / Online Room)
// ==========================================
class CyberChessGame {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.mode = options.mode || 'ai'; // 'ai' or '2p' or 'multiplayer'
    this.roomData = options.roomData || null;
    this.isOnline = this.mode === 'multiplayer';
    this.myColor = 'w'; // 'w' or 'b'

    if (this.isOnline && this.roomData) {
      this.myColor = window.multiplayerManager.playerIndex === 0 ? 'w' : 'b';
    }

    this.PIECES = {
      w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
      b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
    };

    this.PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

    this.board = [];
    this.turn = 'w';
    this.selectedSquare = null;
    this.validMoves = [];
    this.moveHistory = [];
    this.capturedW = [];
    this.capturedB = [];
    this.isGameOver = false;

    this.init();
  }

  init() {
    this.setupInitialBoard();
    this.render();
    this.updateStatus();

    if (this.isOnline) {
      window.multiplayerManager.clearActionListeners();
      window.multiplayerManager.onAction((data) => {
        if (data.actionType === 'chess_move') {
          this.executeMove(data.payload.from, data.payload.to, false);
        }
      });
    }
  }

  setupInitialBoard() {
    this.board = [
      ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
      ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
      ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
    ];
    this.turn = 'w';
    this.isGameOver = false;
    this.capturedW = [];
    this.capturedB = [];
    this.moveHistory = [];
  }

  render() {
    let p1Name = 'Player 1 (White)';
    let p1Avatar = '⚔️';
    let p2Name = this.mode === 'ai' ? 'Quantum Bot (Black)' : 'Player 2 (Black)';
    let p2Avatar = this.mode === 'ai' ? '🤖' : '🥷';

    if (this.isOnline && this.roomData && this.roomData.players) {
      if (this.roomData.players[0]) {
        p1Name = `${this.roomData.players[0].name} (White)${this.myColor === 'w' ? ' [YOU]' : ''}`;
        p1Avatar = window.authController.getAvatarMeta(this.roomData.players[0].avatar).icon;
      }
      if (this.roomData.players[1]) {
        p2Name = `${this.roomData.players[1].name} (Black)${this.myColor === 'b' ? ' [YOU]' : ''}`;
        p2Avatar = window.authController.getAvatarMeta(this.roomData.players[1].avatar).icon;
      }
    }

    this.container.innerHTML = `
      <div class="game-arena-layout">
        <div class="game-top-bar">
          <div class="player-badge-card ${this.turn === 'b' ? 'active' : ''}" id="chess-black-card">
            <span class="badge-avatar">${p2Avatar}</span>
            <div class="badge-text">
              <span class="badge-name">${p2Name}</span>
              <div class="captured-tray" id="chess-captured-w"></div>
            </div>
          </div>
          <div class="turn-indicator-pill" id="chess-turn-pill">WHITE'S TURN</div>
          <div class="player-badge-card ${this.turn === 'w' ? 'active' : ''}" id="chess-white-card">
            <span class="badge-avatar">${p1Avatar}</span>
            <div class="badge-text">
              <span class="badge-name">${p1Name}</span>
              <div class="captured-tray" id="chess-captured-b"></div>
            </div>
          </div>
        </div>

        <div class="chess-board-wrapper board-3d-effect">
          <div class="chess-grid" id="chess-grid"></div>
        </div>

        <div class="game-actions-bar">
          <button class="cyber-btn sm" id="btn-chess-restart">🔄 Reset Board</button>
          <button class="cyber-btn sm secondary" id="btn-chess-rules">📜 View Rules</button>
        </div>
      </div>
    `;

    document.getElementById('btn-chess-restart').addEventListener('click', () => this.restartGame(true));
    document.getElementById('btn-chess-rules').addEventListener('click', () => {
      window.rulesModal.show('chess');
    });

    this.drawBoardGrid();
  }

  drawBoardGrid() {
    const grid = document.getElementById('chess-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const square = document.createElement('div');
        const isLight = (r + c) % 2 === 0;
        square.className = `chess-cell ${isLight ? 'light' : 'dark'}`;
        square.dataset.row = r;
        square.dataset.col = c;

        const piece = this.board[r][c];
        if (piece) {
          const color = piece[0];
          const type = piece[1];
          const pieceSpan = document.createElement('span');
          pieceSpan.className = `chess-piece ${color === 'w' ? 'white-piece' : 'black-piece'}`;
          pieceSpan.innerHTML = this.PIECES[color][type];
          square.appendChild(pieceSpan);
        }

        if (this.selectedSquare && this.selectedSquare.r === r && this.selectedSquare.c === c) {
          square.classList.add('selected');
        }

        const isMove = this.validMoves.some(m => m.r === r && m.c === c);
        if (isMove) {
          const dot = document.createElement('div');
          dot.className = piece ? 'capture-ring' : 'move-dot';
          square.appendChild(dot);
        }

        square.addEventListener('click', () => this.handleSquareClick(r, c));
        grid.appendChild(square);
      }
    }
  }

  handleSquareClick(r, c) {
    if (this.isGameOver) return;

    // In online mode, you can only move your own color
    if (this.isOnline && this.turn !== this.myColor) {
      window.soundFX && window.soundFX.carromFoul();
      return;
    }

    // In AI mode, user moves White
    if (this.mode === 'ai' && this.turn !== 'w') {
      return;
    }

    const clickedPiece = this.board[r][c];

    // If already selected a piece, check if click is a valid move
    if (this.selectedSquare) {
      const isTargetMove = this.validMoves.find(m => m.r === r && m.c === c);
      if (isTargetMove) {
        this.executeMove(this.selectedSquare, { r, c }, true);
        return;
      }
    }

    // Otherwise select a piece of the current turn color
    if (clickedPiece && clickedPiece[0] === this.turn) {
      this.selectedSquare = { r, c };
      this.validMoves = this.calculateValidMoves(r, c, clickedPiece);
      window.soundFX && window.soundFX.click();
      this.drawBoardGrid();
    } else {
      this.selectedSquare = null;
      this.validMoves = [];
      this.drawBoardGrid();
    }
  }

  calculateValidMoves(r, c, piece) {
    const color = piece[0];
    const type = piece[1];
    const moves = [];

    const addMove = (nr, nc) => {
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) return false;
      const target = this.board[nr][nc];
      if (!target) {
        moves.push({ r: nr, c: nc });
        return true;
      }
      if (target[0] !== color) {
        moves.push({ r: nr, c: nc });
      }
      return false; // hit piece, stop ray
    };

    if (type === 'p') {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      // Forward 1
      if (r + dir >= 0 && r + dir <= 7 && !this.board[r + dir][c]) {
        moves.push({ r: r + dir, c });
        // Forward 2
        if (r === startRow && !this.board[r + 2 * dir][c]) {
          moves.push({ r: r + 2 * dir, c });
        }
      }
      // Captures
      [-1, 1].forEach(dc => {
        const nr = r + dir;
        const nc = c + dc;
        if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
          const target = this.board[nr][nc];
          if (target && target[0] !== color) moves.push({ r: nr, c: nc });
        }
      });
    } else if (type === 'n') {
      const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      knightOffsets.forEach(([dr, dc]) => addMove(r + dr, c + dc));
    } else if (type === 'b') {
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => {
        for (let i = 1; i < 8; i++) if (!addMove(r + dr * i, c + dc * i)) break;
      });
    } else if (type === 'r') {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
        for (let i = 1; i < 8; i++) if (!addMove(r + dr * i, c + dc * i)) break;
      });
    } else if (type === 'q') {
      [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
        for (let i = 1; i < 8; i++) if (!addMove(r + dr * i, c + dc * i)) break;
      });
    } else if (type === 'k') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) addMove(r + dr, c + dc);
        }
      }
    }

    return moves;
  }

  executeMove(from, to, shouldBroadcast = true) {
    const piece = this.board[from.r][from.c];
    const target = this.board[to.r][to.c];

    if (target) {
      if (target[0] === 'w') this.capturedW.push(this.PIECES.w[target[1]]);
      else this.capturedB.push(this.PIECES.b[target[1]]);
      window.soundFX && window.soundFX.chessCapture();
    } else {
      window.soundFX && window.soundFX.chessMove();
    }

    // Move piece
    this.board[to.r][to.c] = piece;
    this.board[from.r][from.c] = '';

    // Pawn Promotion
    if (piece[1] === 'p') {
      if ((piece[0] === 'w' && to.r === 0) || (piece[0] === 'b' && to.r === 7)) {
        this.board[to.r][to.c] = piece[0] + 'q';
      }
    }

    this.selectedSquare = null;
    this.validMoves = [];
    this.turn = this.turn === 'w' ? 'b' : 'w';

    if (shouldBroadcast && this.isOnline) {
      window.multiplayerManager.sendAction('chess_move', { from, to });
    }

    this.checkGameConditions();
    this.drawBoardGrid();
    this.updateStatus();

    // AI Turn
    if (!this.isGameOver && this.mode === 'ai' && this.turn === 'b') {
      setTimeout(() => this.makeAIMove(), 500);
    }
  }

  makeAIMove() {
    const bestMove = this.findBestMove();
    if (bestMove) {
      this.executeMove(bestMove.from, bestMove.to, false);
    } else {
      this.isGameOver = true;
      window.soundFX && window.soundFX.victory();
      alert('Checkmate! White is victorious in the cyber grid!');
      window.authController.recordOutcome('chess', true, 200);
    }
  }

  findBestMove() {
    let allMoves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece[0] === 'b') {
          const moves = this.calculateValidMoves(r, c, piece);
          moves.forEach(m => allMoves.push({ from: { r, c }, to: m, piece }));
        }
      }
    }

    if (allMoves.length === 0) return null;

    allMoves.sort((a, b) => {
      const targetA = this.board[a.to.r][a.to.c];
      const targetB = this.board[b.to.r][b.to.c];
      const valA = targetA ? this.PIECE_VALUES[targetA[1]] : 0;
      const valB = targetB ? this.PIECE_VALUES[targetB[1]] : 0;
      return valB - valA;
    });

    return allMoves[0];
  }

  checkGameConditions() {
    let whiteKing = false;
    let blackKing = false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] === 'wk') whiteKing = true;
        if (this.board[r][c] === 'bk') blackKing = true;
      }
    }

    if (!whiteKing) {
      this.isGameOver = true;
      window.soundFX && window.soundFX.victory();
      alert('Game Over! Black has conquered the Cyber Chess Matrix!');
      window.authController.recordOutcome('chess', false, 50);
    } else if (!blackKing) {
      this.isGameOver = true;
      window.soundFX && window.soundFX.victory();
      alert('Victory! White has conquered the Cyber Chess Matrix!');
      window.authController.recordOutcome('chess', true, 250);
    }
  }

  updateStatus() {
    const pill = document.getElementById('chess-turn-pill');
    if (pill) {
      pill.textContent = this.turn === 'w' ? "WHITE'S TURN" : "BLACK'S TURN";
      pill.style.borderColor = this.turn === 'w' ? '#00f0ff' : '#ff0077';
      pill.style.color = this.turn === 'w' ? '#00f0ff' : '#ff0077';
    }

    const cardW = document.getElementById('chess-white-card');
    const cardB = document.getElementById('chess-black-card');
    if (cardW) cardW.classList.toggle('active', this.turn === 'w');
    if (cardB) cardB.classList.toggle('active', this.turn === 'b');

    const trayW = document.getElementById('chess-captured-w');
    const trayB = document.getElementById('chess-captured-b');
    if (trayW) trayW.textContent = this.capturedW.join(' ');
    if (trayB) trayB.textContent = this.capturedB.join(' ');
  }

  restartGame(notifyRoom = false) {
    this.setupInitialBoard();
    this.drawBoardGrid();
    this.updateStatus();
    if (notifyRoom && this.isOnline && this.roomData) {
      window.multiplayerManager.socket.emit('request_restart', { roomCode: this.roomData.code });
    }
    window.soundFX && window.soundFX.click();
  }
}

window.CyberChessGame = CyberChessGame;
