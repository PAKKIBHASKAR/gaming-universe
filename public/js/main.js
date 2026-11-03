// ==========================================
// MAIN CONTROLLER & PORTAL ROUTER
// Manages Modes, Lobby, Arena Switching & Forfeits
// ==========================================
class GamingUniverseApp {
  constructor() {
    this.activeGame = null;
    this.activeGameInstance = null;
    this.init();
  }

  init() {
    window.authController.init();
    this.bindDOM();
    this.checkShareLinkParams();
  }

  bindDOM() {
    // Sound Toggle
    const soundBtn = document.getElementById('btn-sound-toggle');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const isEnabled = window.soundFX.toggleSound();
        soundBtn.textContent = isEnabled ? '🔊 SOUND: ON' : '🔇 SOUND: OFF';
      });
    }

    // Auth Open Buttons
    const btnOpenLogin = document.getElementById('btn-open-login');
    const btnOpenRegister = document.getElementById('btn-open-register');

    if (btnOpenLogin) {
      btnOpenLogin.addEventListener('click', () => {
        window.authController.openModal('login');
      });
    }
    if (btnOpenRegister) {
      btnOpenRegister.addEventListener('click', () => {
        window.authController.openModal('register');
      });
    }

    const closeAuthBtn = document.getElementById('btn-close-auth');
    if (closeAuthBtn) {
      closeAuthBtn.addEventListener('click', () => {
        window.authController.closeModal();
      });
    }

    // Auth Tabs
    const tabLogin = document.getElementById('tab-btn-login');
    const tabRegister = document.getElementById('tab-btn-register');

    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => window.authController.switchTab('login'));
      tabRegister.addEventListener('click', () => window.authController.switchTab('register'));
    }

    // Game Portal Cards Launch
    document.querySelectorAll('.btn-launch-game').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.game-cyber-card');
        const gameKey = card.dataset.game;
        this.openGameModeSelector(gameKey);
      });
    });

    // Back to Lobby Button (With Forfeit Confirmation for Active Multiplayer)
    const backBtn = document.getElementById('btn-back-to-lobby');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.handleExitArena();
      });
    }

    // Join room from manual input in lobby
    const joinBtn = document.getElementById('btn-manual-join-room');
    const roomInput = document.getElementById('manual-room-input');
    if (joinBtn && roomInput) {
      joinBtn.addEventListener('click', () => {
        const code = roomInput.value.trim().toUpperCase();
        if (!code) return alert('Please enter a valid 6-digit room code');
        window.multiplayerManager.joinRoom(code);
      });
    }
  }

  checkShareLinkParams() {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    const gameType = params.get('game');

    if (roomCode) {
      setTimeout(() => {
        const user = window.authController.getUser();
        if (user) {
          window.multiplayerManager.joinRoom(roomCode);
          window.multiplayerManager.showToast(`Joining Room ${roomCode} for ${gameType ? gameType.toUpperCase() : 'Match'}...`);
        } else {
          // Open Auth modal with invitation notice
          window.authController.openModal('login', roomCode);
        }
      }, 600);
    }
  }

  openGameModeSelector(gameKey) {
    const modal = document.getElementById('mode-selector-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    document.getElementById('mode-game-title').textContent = `${gameKey.toUpperCase()} - SELECT BATTLE PROTOCOL`;

    const optionsContainer = document.getElementById('mode-options-container');
    optionsContainer.innerHTML = '';

    const modes = [
      { id: 'ai', title: '🤖 Solo vs AI Computer', desc: 'Sharpen your instincts against our autonomous bot.', players: 1, isOnline: false },
      { id: 'local_2p', title: '👥 2 Players (Local / Pass & Play)', desc: 'Two warriors on the same screen or keyboard.', players: 2, isOnline: false }
    ];

    if (gameKey === 'carrom' || gameKey === 'ludo' || gameKey === 'snakes') {
      modes.push({ id: 'local_3p', title: '👨‍👧‍👦 3 Players (Local)', desc: 'Three commanders battling on the local matrix.', players: 3, isOnline: false });
      modes.push({ id: 'local_4p', title: '🔥 4 Players (Local Championship)', desc: 'Four-way royal galactic championship.', players: 4, isOnline: false });
    }

    // MULTIPLAYER MODES: 2P, 3P, 4P WITH LIVE SHARE LINK
    modes.push({
      id: 'online_2p',
      title: '🌐 Online 2-Player Room (Share Link)',
      desc: 'Create a private 2-player room. Share your link with a friend anywhere in the world!',
      players: 2,
      isOnline: true
    });

    if (gameKey === 'carrom' || gameKey === 'ludo' || gameKey === 'snakes') {
      modes.push({
        id: 'online_3p',
        title: '🌐 Online 3-Player Room (Share Link)',
        desc: 'Create a 3-player private room. Invite two friends via your custom room link!',
        players: 3,
        isOnline: true
      });
      modes.push({
        id: 'online_4p',
        title: '🌐 Online 4-Player Room (Share Link)',
        desc: 'Create a full 4-player multiplayer arena. Invite up to three friends via share link!',
        players: 4,
        isOnline: true
      });
    }

    modes.forEach(m => {
      const btn = document.createElement('div');
      btn.className = 'mode-option-card';
      btn.innerHTML = `
        <div class="mode-header">
          <span class="mode-title">${m.title}</span>
          ${m.isOnline ? '<span class="online-pill">LIVE MULTIPLAYER</span>' : '<span class="local-pill">OFFLINE / LOCAL</span>'}
        </div>
        <p class="mode-desc">${m.desc}</p>
      `;

      btn.addEventListener('click', () => {
        modal.classList.add('hidden');

        window.rulesModal.show(gameKey, () => {
          if (m.isOnline) {
            window.multiplayerManager.createRoom(gameKey, m.players);
          } else {
            this.launchGame(gameKey, m.id.startsWith('local') ? 'local' : 'ai', {
              playerCount: m.players
            });
          }
        });
      });

      optionsContainer.appendChild(btn);
    });

    document.getElementById('btn-close-mode-modal').onclick = () => {
      modal.classList.add('hidden');
    };
  }

  launchGame(gameKey, mode, options = {}) {
    this.activeGame = gameKey;

    // Switch Views
    document.getElementById('lobby-view').classList.add('hidden');
    document.getElementById('arena-view').classList.remove('hidden');
    document.getElementById('active-game-title').textContent = `${gameKey.toUpperCase()} ARENA`;

    // Clear chat for every new game!
    if (window.multiplayerManager) {
      window.multiplayerManager.clearChat();
    }

    const arenaContainer = 'active-game-stage';

    if (gameKey === 'chess') {
      this.activeGameInstance = new window.CyberChessGame(arenaContainer, {
        mode: mode === 'multiplayer' ? 'multiplayer' : (options.playerCount === 1 ? 'ai' : '2p'),
        roomData: options
      });
    } else if (gameKey === 'carrom') {
      this.activeGameInstance = new window.CyberCarromGame(arenaContainer, {
        playerCount: (options.roomData && options.roomData.maxPlayers) || options.playerCount || 2,
        mode,
        roomData: options
      });
    } else if (gameKey === 'ludo') {
      this.activeGameInstance = new window.CyberLudoGame(arenaContainer, {
        playerCount: (options.roomData && options.roomData.maxPlayers) || options.playerCount || 4,
        mode,
        roomData: options
      });
    } else if (gameKey === 'snakes') {
      this.activeGameInstance = new window.CyberSnakesGame(arenaContainer, {
        playerCount: (options.roomData && options.roomData.maxPlayers) || options.playerCount || 2,
        mode,
        roomData: options
      });
    }

    window.activeGameInstance = this.activeGameInstance;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  handleExitArena() {
    // If active multiplayer match is running, exiting triggers a forfeit!
    if (this.activeGameInstance && this.activeGameInstance.isOnline && window.multiplayerManager.currentRoom) {
      const confirmExit = confirm(
        '⚠️ FORFEIT WARNING!\n\nExiting this live match will result in a resignation loss for you, and your opponent will win the match.\n\nAre you sure you want to resign and exit?'
      );
      if (!confirmExit) return;

      // Notify room of forfeit
      window.multiplayerManager.socket.emit('player_forfeit', {
        roomCode: window.multiplayerManager.currentRoom.code
      });

      window.authController.recordOutcome(this.activeGame, false, 0);
    }

    this.returnToLobby();
  }

  returnToLobby() {
    if (this.activeGameInstance && typeof this.activeGameInstance.destroy === 'function') {
      this.activeGameInstance.destroy();
    }
    this.activeGameInstance = null;
    window.activeGameInstance = null;

    document.getElementById('arena-view').classList.add('hidden');
    document.getElementById('lobby-view').classList.remove('hidden');
    window.soundFX && window.soundFX.click();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.mainApp = new GamingUniverseApp();
});
