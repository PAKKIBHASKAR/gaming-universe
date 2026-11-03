// ==========================================
// MAIN CONTROLLER & PORTAL ROUTER
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
    const openAuthBtn = document.getElementById('btn-open-auth');
    if (openAuthBtn) {
      openAuthBtn.addEventListener('click', () => {
        window.authController.openModal();
      });
    }

    const closeAuthBtn = document.getElementById('btn-close-auth');
    if (closeAuthBtn) {
      closeAuthBtn.addEventListener('click', () => {
        window.authController.closeModal();
      });
    }

    // Auth Tabs (Login vs Register)
    const tabLogin = document.getElementById('tab-btn-login');
    const tabRegister = document.getElementById('tab-btn-register');
    const panelLogin = document.getElementById('panel-login');
    const panelRegister = document.getElementById('panel-register');

    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        panelLogin.classList.remove('hidden');
        panelRegister.classList.add('hidden');
      });

      tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        panelRegister.classList.remove('hidden');
        panelLogin.classList.add('hidden');
      });
    }

    // Game Portal Cards Launch
    document.querySelectorAll('.btn-launch-game').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.game-cyber-card');
        const gameKey = card.dataset.game;
        this.openGameModeSelector(gameKey);
      });
    });

    // Back to Lobby Button
    const backBtn = document.getElementById('btn-back-to-lobby');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.returnToLobby();
      });
    }

    // Join room from manual input in lobby
    const joinBtn = document.getElementById('btn-manual-join-room');
    const roomInput = document.getElementById('manual-room-input');
    if (joinBtn && roomInput) {
      joinBtn.addEventListener('click', () => {
        const code = roomInput.value.trim();
        if (!code) return alert('Please enter a room code');
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
        window.multiplayerManager.joinRoom(roomCode);
        window.multiplayerManager.showToast(`Found invite link for ${gameType ? gameType.toUpperCase() : 'Match'}! Joining room ${roomCode}...`);
      }, 700);
    }
  }

  openGameModeSelector(gameKey) {
    const modal = document.getElementById('mode-selector-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    document.getElementById('mode-game-title').textContent = gameKey.toUpperCase();

    const optionsContainer = document.getElementById('mode-options-container');
    optionsContainer.innerHTML = '';

    const modes = [
      { id: 'ai', title: '🤖 Solo vs AI Computer', desc: 'Practice your skills against our autonomous bot.', players: 1 },
      { id: 'local_2p', title: '👥 2 Players (Local / Pass & Play)', desc: 'Two players on the same device or screen.', players: 2 }
    ];

    if (gameKey === 'carrom' || gameKey === 'ludo' || gameKey === 'snakes') {
      modes.push({ id: 'local_3p', title: '👨‍👧‍👦 3 Players (Local)', desc: 'Three warriors on the battlefield.', players: 3 });
      modes.push({ id: 'local_4p', title: '🔥 4 Players (Local Championship)', desc: 'Full four-player royal rumble.', players: 4 });
    }

    modes.push({
      id: 'online_room',
      title: '🌐 Online Room (Share Link with Friends)',
      desc: 'Create a private cyber room, get a shareable link, and invite friends across the web!',
      isOnline: true
    });

    modes.forEach(m => {
      const btn = document.createElement('div');
      btn.className = 'mode-option-card';
      btn.innerHTML = `
        <div class="mode-header">
          <span class="mode-title">${m.title}</span>
          ${m.isOnline ? '<span class="online-pill">LIVE MULTIPLAYER</span>' : ''}
        </div>
        <p class="mode-desc">${m.desc}</p>
      `;

      btn.addEventListener('click', () => {
        modal.classList.add('hidden');

        // Show rules before playing!
        window.rulesModal.show(gameKey, () => {
          if (m.isOnline) {
            window.multiplayerManager.createRoom(gameKey, m.players || 2);
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

    const arenaContainer = 'active-game-stage';

    if (gameKey === 'chess') {
      this.activeGameInstance = new window.CyberChessGame(arenaContainer, {
        mode: mode === 'multiplayer' ? 'multiplayer' : (options.playerCount === 1 ? 'ai' : '2p'),
        roomData: options
      });
    } else if (gameKey === 'carrom') {
      this.activeGameInstance = new window.CyberCarromGame(arenaContainer, {
        playerCount: options.playerCount || 2,
        mode,
        roomData: options
      });
    } else if (gameKey === 'ludo') {
      this.activeGameInstance = new window.CyberLudoGame(arenaContainer, {
        playerCount: options.playerCount || 4,
        mode,
        roomData: options
      });
    } else if (gameKey === 'snakes') {
      this.activeGameInstance = new window.CyberSnakesGame(arenaContainer, {
        playerCount: options.playerCount || 2,
        mode,
        roomData: options
      });
    }

    window.activeGameInstance = this.activeGameInstance;
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
