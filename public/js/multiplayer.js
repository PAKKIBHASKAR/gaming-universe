// ==========================================
// REAL-TIME MULTIPLAYER & SHARE LINK ENGINE
// ==========================================
class MultiplayerManager {
  constructor() {
    this.socket = null;
    this.currentRoom = null;
    this.playerIndex = 0;
    this.isHost = false;
    this.actionListeners = [];
    this.initSocket();
    this.bindDOM();
  }

  initSocket() {
    try {
      this.socket = io();

      this.socket.on('connect', () => {
        console.log('⚡ Connected to Multiplayer Relay Gateway');
      });

      this.socket.on('room_created', (data) => {
        this.currentRoom = data.room;
        this.playerIndex = data.playerIndex;
        this.isHost = true;
        this.renderRoomModal();
        this.showToast('Room created! Share link with your friends.');
      });

      this.socket.on('joined_successfully', (data) => {
        this.currentRoom = data.room;
        this.playerIndex = data.playerIndex;
        this.isHost = false;
        this.renderRoomModal();
        this.showToast(`Joined room: ${data.roomCode}`);
      });

      this.socket.on('player_joined', (data) => {
        this.currentRoom = data.room;
        this.renderRoomModal();
        this.showToast(`🚀 ${data.newPlayer.name} entered the room!`);
        window.soundFX && window.soundFX.click();
      });

      this.socket.on('player_left', (data) => {
        if (this.currentRoom) {
          this.currentRoom.players = data.remainingPlayers;
          this.renderRoomModal();
          this.showToast('A player left the room.');
        }
      });

      this.socket.on('game_action_received', (data) => {
        this.actionListeners.forEach(listener => listener(data));
      });

      this.socket.on('join_error', (data) => {
        alert(data.message || 'Could not join room');
      });

      this.socket.on('new_chat_message', (msg) => {
        this.appendChatMessage(msg);
      });

      this.socket.on('game_restarted', () => {
        this.showToast('Match was restarted by Host.');
        if (window.activeGameInstance && typeof window.activeGameInstance.restartGame === 'function') {
          window.activeGameInstance.restartGame(false);
        }
      });
    } catch (e) {
      console.warn('Socket.IO initialization error:', e);
    }
  }

  bindDOM() {
    // Copy Share Link button
    const copyBtn = document.getElementById('btn-copy-room-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (!this.currentRoom) return;
        const link = this.getShareableLink();
        navigator.clipboard.writeText(link).then(() => {
          this.showToast('🔗 Link copied to clipboard! Send to friends.');
          window.soundFX && window.soundFX.click();
        }).catch(() => {
          prompt('Copy this game room link:', link);
        });
      });
    }

    // Launch multiplayer game button in room modal
    const startMultiplayerBtn = document.getElementById('btn-room-start-game');
    if (startMultiplayerBtn) {
      startMultiplayerBtn.addEventListener('click', () => {
        if (!this.currentRoom) return;
        if (this.currentRoom.players.length < 2) {
          alert('Wait for at least 1 more player to join via the link or room code!');
          return;
        }
        document.getElementById('multiplayer-room-modal').classList.add('hidden');
        window.mainApp.launchGame(this.currentRoom.gameType, 'multiplayer', this.currentRoom);
      });
    }

    // Close room modal
    const closeRoomBtn = document.getElementById('btn-close-room-modal');
    if (closeRoomBtn) {
      closeRoomBtn.addEventListener('click', () => {
        document.getElementById('multiplayer-room-modal').classList.add('hidden');
      });
    }

    // In-room chat send
    const chatInput = document.getElementById('room-chat-input');
    const chatSendBtn = document.getElementById('btn-send-room-chat');
    if (chatSendBtn && chatInput) {
      const sendMsg = () => {
        const text = chatInput.value.trim();
        if (!text || !this.currentRoom) return;
        const user = window.authController.getUser();
        this.socket.emit('send_chat', {
          roomCode: this.currentRoom.code,
          senderName: user.username,
          avatar: user.avatar,
          text
        });
        chatInput.value = '';
      };
      chatSendBtn.addEventListener('click', sendMsg);
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMsg();
      });
    }
  }

  createRoom(gameType, maxPlayers = 2) {
    const user = window.authController.getUser();
    this.socket.emit('create_room', {
      gameType,
      playerName: user.username,
      avatar: user.avatar,
      maxPlayers
    });
  }

  joinRoom(roomCode) {
    const user = window.authController.getUser();
    this.socket.emit('join_room', {
      roomCode,
      playerName: user.username,
      avatar: user.avatar
    });
  }

  sendAction(actionType, payload) {
    if (!this.currentRoom || !this.socket) return;
    this.socket.emit('game_action', {
      roomCode: this.currentRoom.code,
      actionType,
      payload
    });
  }

  onAction(callback) {
    this.actionListeners.push(callback);
  }

  clearActionListeners() {
    this.actionListeners = [];
  }

  getShareableLink() {
    if (!this.currentRoom) return window.location.href;
    const base = window.location.origin + window.location.pathname;
    return `${base}?room=${this.currentRoom.code}&game=${this.currentRoom.gameType}`;
  }

  renderRoomModal() {
    const modal = document.getElementById('multiplayer-room-modal');
    if (!modal || !this.currentRoom) return;

    modal.classList.remove('hidden');

    document.getElementById('room-display-code').textContent = this.currentRoom.code;
    document.getElementById('room-game-title').textContent = this.currentRoom.gameType.toUpperCase();
    document.getElementById('room-player-count').textContent = `${this.currentRoom.players.length} / ${this.currentRoom.maxPlayers}`;

    // Render player slots
    const slotsContainer = document.getElementById('room-player-slots');
    slotsContainer.innerHTML = '';

    for (let i = 0; i < this.currentRoom.maxPlayers; i++) {
      const player = this.currentRoom.players[i];
      const slotEl = document.createElement('div');
      slotEl.className = `player-slot-card ${player ? 'occupied' : 'empty'}`;

      if (player) {
        const meta = window.authController.getAvatarMeta(player.avatar);
        slotEl.innerHTML = `
          <div class="slot-avatar" style="border-color:${meta.color}">${meta.icon}</div>
          <div class="slot-info">
            <span class="slot-name">${player.name} ${player.isHost ? '👑' : ''}</span>
            <span class="slot-status">READY ${player.id === this.socket.id ? '(YOU)' : ''}</span>
          </div>
        `;
      } else {
        slotEl.innerHTML = `
          <div class="slot-avatar empty">⏳</div>
          <div class="slot-info">
            <span class="slot-name">Waiting for Player...</span>
            <span class="slot-status">Send link to invite</span>
          </div>
        `;
      }
      slotsContainer.appendChild(slotEl);
    }

    const startBtn = document.getElementById('btn-room-start-game');
    if (startBtn) {
      if (this.isHost) {
        startBtn.style.display = 'inline-flex';
        startBtn.textContent = '🚀 START MATCH';
      } else {
        startBtn.style.display = 'inline-flex';
        startBtn.textContent = '⏳ WAITING FOR HOST TO START';
        startBtn.disabled = true;
      }
    }
  }

  appendChatMessage(msg) {
    const container = document.getElementById('room-chat-messages');
    if (!container) return;

    const meta = window.authController.getAvatarMeta(msg.avatar);
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-item';
    msgEl.innerHTML = `
      <span class="chat-time">${msg.timestamp}</span>
      <span class="chat-sender" style="color: ${meta.color}">${meta.icon} ${msg.sender}:</span>
      <span class="chat-text">${this.escapeHTML(msg.text)}</span>
    `;
    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
    window.soundFX && window.soundFX.click();
  }

  escapeHTML(str) {
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
  }

  showToast(text) {
    const toast = document.getElementById('cyber-toast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.remove('hidden');
    toast.classList.add('visible');
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3200);
  }
}

window.multiplayerManager = new MultiplayerManager();
