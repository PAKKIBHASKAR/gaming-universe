// ==========================================
// REAL-TIME MULTIPLAYER & SHARE LINK ENGINE
// Supports 2P, 3P, 4P, Live Chat, Forfeits & Sync
// ==========================================
class MultiplayerManager {
  constructor() {
    this.socket = null;
    this.currentRoom = null;
    this.playerIndex = 0;
    this.isHost = false;
    this.actionListeners = [];
    this.unreadChatCount = 0;
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
        this.showToast('Room created! Share the link or code with friends.');
        this.clearChat();
      });

      this.socket.on('joined_successfully', (data) => {
        this.currentRoom = data.room;
        this.playerIndex = data.playerIndex;
        this.isHost = false;
        this.renderRoomModal();
        this.showToast(`Joined room: ${data.roomCode}`);
        this.clearChat();
      });

      this.socket.on('player_joined', (data) => {
        this.currentRoom = data.room;
        this.renderRoomModal();
        this.showToast(`🚀 ${data.newPlayer.name} entered the room!`);
        window.soundFX && window.soundFX.click();
      });

      this.socket.on('player_updated', (data) => {
        this.currentRoom = data.room;
        this.renderRoomModal();
      });

      this.socket.on('player_left', (data) => {
        if (this.currentRoom) {
          this.currentRoom.players = data.remainingPlayers;
          this.renderRoomModal();
          this.showToast('A player left the waiting room.');
        }
      });

      // HOST LAUNCHES MATCH - SYNCHRONIZED FOR ALL PLAYERS
      this.socket.on('match_started', (data) => {
        this.currentRoom = data.room;
        const modal = document.getElementById('multiplayer-room-modal');
        if (modal) modal.classList.add('hidden');

        this.clearChat();
        this.showToast('🚀 Match launched by Host! Entering Arena...');
        window.soundFX && window.soundFX.victory();

        window.mainApp.launchGame(data.gameType, 'multiplayer', data.room);
      });

      // PLAYER FORFEIT / RESIGN NOTIFICATION
      this.socket.on('match_forfeited', (data) => {
        const myUser = window.authController.getUser();
        const amIForfeiter = myUser && data.forfeitingPlayerName === myUser.username;

        if (amIForfeiter) {
          alert(`🏳️ You have resigned from the match.`);
        } else {
          window.soundFX && window.soundFX.victory();
          alert(`🏆 VICTORY BY FORFEIT!\n\n${data.forfeitingPlayerName} has exited the match.\n${data.winnerName} WINS THE BATTLE!`);
          if (this.currentRoom) {
            window.authController.recordOutcome(this.currentRoom.gameType, true, 250);
          }
        }

        setTimeout(() => {
          window.mainApp.returnToLobby();
        }, 1000);
      });

      // Relay game moves/rolls/shots
      this.socket.on('game_action_received', (data) => {
        this.actionListeners.forEach(listener => listener(data));
      });

      this.socket.on('join_error', (data) => {
        alert(data.message || 'Could not join room');
      });

      // Live chat broadcast received
      this.socket.on('new_chat_message', (msg) => {
        this.appendChatMessage(msg);
      });

      // Spotify / Audio Lounge Real-Time Parallel Music Sync
      this.socket.on('music_synced', (data) => {
        if (window.musicLounge) {
          window.musicLounge.handleRemoteSync(data);
        }
      });

      this.socket.on('game_restarted', () => {
        this.showToast('Match was restarted by Host.');
        this.clearChat();
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

    // Launch multiplayer game button in room modal (Host triggers for ALL players)
    const startMultiplayerBtn = document.getElementById('btn-room-start-game');
    if (startMultiplayerBtn) {
      startMultiplayerBtn.addEventListener('click', () => {
        if (!this.currentRoom) return;
        if (this.currentRoom.players.length < 2) {
          alert('Wait for at least 1 more player to join before starting!');
          return;
        }
        this.socket.emit('start_match', { roomCode: this.currentRoom.code });
      });
    }

    // Close room modal
    const closeRoomBtn = document.getElementById('btn-close-room-modal');
    if (closeRoomBtn) {
      closeRoomBtn.addEventListener('click', () => {
        document.getElementById('multiplayer-room-modal').classList.add('hidden');
      });
    }

    // Room modal chat
    this.setupChatInput('room-chat-input', 'btn-send-room-chat');

    // In-Arena live HUD chat
    this.setupChatInput('arena-chat-input', 'btn-send-arena-chat');

    // In-Arena chat drawer toggle
    const toggleChatBtn = document.getElementById('btn-toggle-arena-chat');
    const arenaChatDrawer = document.getElementById('arena-chat-drawer');
    if (toggleChatBtn && arenaChatDrawer) {
      toggleChatBtn.addEventListener('click', () => {
        arenaChatDrawer.classList.toggle('collapsed');
        this.unreadChatCount = 0;
        this.updateChatBadge();
        window.soundFX && window.soundFX.click();
      });
    }

    // Guest Name change inside room
    const roomNameInput = document.getElementById('room-player-name-edit');
    if (roomNameInput) {
      roomNameInput.addEventListener('change', () => {
        const newName = roomNameInput.value.trim();
        if (newName) this.updateMyProfile(newName, null);
      });
    }
  }

  setupChatInput(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input || !btn) return;

    const sendMsg = () => {
      const text = input.value.trim();
      if (!text || !this.currentRoom) return;
      const user = window.authController.getUser() || { username: 'Player', avatar: 'cyber_samurai' };
      this.socket.emit('send_chat', {
        roomCode: this.currentRoom.code,
        senderName: user.username,
        avatar: user.avatar,
        text
      });
      input.value = '';
    };

    btn.addEventListener('click', sendMsg);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMsg();
    });
  }

  updateMyProfile(name, avatar) {
    if (!this.currentRoom || !this.socket) return;
    const user = window.authController.getUser() || { username: 'Player', avatar: 'cyber_samurai' };
    const finalName = name || user.username;
    const finalAvatar = avatar || user.avatar;
    this.socket.emit('update_player_profile', {
      roomCode: this.currentRoom.code,
      name: finalName,
      avatar: finalAvatar
    });
  }

  createRoom(gameType, maxPlayers = 2) {
    const user = window.authController.getUser() || { username: 'Player 1', avatar: 'cyber_samurai' };
    this.socket.emit('create_room', {
      gameType,
      playerName: user.username,
      avatar: user.avatar,
      maxPlayers: parseInt(maxPlayers, 10)
    });
  }

  joinRoom(roomCode) {
    const user = window.authController.getUser();
    if (!user) {
      // Must login or pick guest name first!
      window.authController.openModal('login', roomCode);
      return;
    }

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

  syncMusic(musicData) {
    if (!this.currentRoom || !this.socket) return;
    this.socket.emit('sync_music', {
      roomCode: this.currentRoom.code,
      musicData
    });
  }

  onAction(callback) {
    this.actionListeners.push(callback);
  }

  clearActionListeners() {
    this.actionListeners = [];
  }

  clearChat() {
    const roomChat = document.getElementById('room-chat-messages');
    const arenaChat = document.getElementById('arena-chat-messages');
    const cleanNotice = '<div class="chat-item notice">⚡ Tactical comms online. Channel cleared for battle.</div>';
    if (roomChat) roomChat.innerHTML = cleanNotice;
    if (arenaChat) arenaChat.innerHTML = cleanNotice;
    this.unreadChatCount = 0;
    this.updateChatBadge();
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
    document.getElementById('room-game-title').textContent = `${this.currentRoom.gameType.toUpperCase()} (${this.currentRoom.maxPlayers}P)`;
    document.getElementById('room-player-count').textContent = `${this.currentRoom.players.length} / ${this.currentRoom.maxPlayers}`;

    // Account link check: if logged in with real account, show verified badge, no need to re-type!
    const user = window.authController.getUser();
    const isGuest = !user || user.isGuest;
    const accountNotice = document.getElementById('room-account-status');
    const guestEditBar = document.getElementById('room-guest-edit-bar');

    if (accountNotice && guestEditBar) {
      if (!isGuest) {
        accountNotice.classList.remove('hidden');
        document.getElementById('room-verified-username').textContent = user.username;
        guestEditBar.classList.add('hidden');
      } else {
        accountNotice.classList.add('hidden');
        guestEditBar.classList.remove('hidden');
        const editNameInput = document.getElementById('room-player-name-edit');
        if (editNameInput && user) editNameInput.value = user.username;
      }
    }

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
            <span class="slot-status" style="color:${player.id === this.socket.id ? '#00f0ff' : '#00ff66'}">
              ${player.id === this.socket.id ? 'READY (YOU)' : 'READY'}
            </span>
          </div>
        `;
      } else {
        slotEl.innerHTML = `
          <div class="slot-avatar empty">⏳</div>
          <div class="slot-info">
            <span class="slot-name">Waiting for Player ${i + 1}...</span>
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
        startBtn.textContent = '🚀 START MATCH FOR ALL';
        startBtn.disabled = this.currentRoom.players.length < 2;
      } else {
        startBtn.style.display = 'inline-flex';
        startBtn.textContent = '⏳ WAITING FOR HOST TO START';
        startBtn.disabled = true;
      }
    }
  }

  appendChatMessage(msg) {
    const containers = [
      document.getElementById('room-chat-messages'),
      document.getElementById('arena-chat-messages')
    ];

    const meta = window.authController.getAvatarMeta(msg.avatar);

    containers.forEach(container => {
      if (!container) return;
      const msgEl = document.createElement('div');
      msgEl.className = 'chat-item';
      msgEl.innerHTML = `
        <span class="chat-time">${msg.timestamp}</span>
        <span class="chat-sender" style="color: ${meta.color}">${meta.icon} ${msg.sender}:</span>
        <span class="chat-text">${this.escapeHTML(msg.text)}</span>
      `;
      container.appendChild(msgEl);
      container.scrollTop = container.scrollHeight;
    });

    window.soundFX && window.soundFX.chatMessage();

    const arenaChatDrawer = document.getElementById('arena-chat-drawer');
    if (arenaChatDrawer && arenaChatDrawer.classList.contains('collapsed')) {
      this.unreadChatCount++;
      this.updateChatBadge();
    }
  }

  updateChatBadge() {
    const badge = document.getElementById('arena-chat-unread-badge');
    if (!badge) return;
    if (this.unreadChatCount > 0) {
      badge.textContent = this.unreadChatCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
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
