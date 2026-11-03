// ==========================================
// SPOTIFY GAMING LOUNGE & PARALLEL MULTIPLAYER AUDIO
// Direct Spotify Web / App Integration, Embeds & Live Synced Playback
// ==========================================
class SpotifyMusicLounge {
  constructor() {
    this.isOpen = false;
    this.isPlaying = false;
    this.currentTrack = null;
    this.audioElement = null;

    // Curated high-octane gaming tracks & playlists
    this.curatedTracks = [
      {
        id: 'cyberpunk',
        title: 'Cyberpunk 2077: Night City Radio',
        artist: 'Marcin Przybyłowicz / Cyberpunk OST',
        genre: 'Synthwave / Industrial Cyber',
        icon: '🌃',
        embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX8tZskqjRpZu?utm_source=generator&theme=0',
        spotifyUri: 'spotify:playlist:37i9dQZF1DX8tZskqjRpZu'
      },
      {
        id: 'synthwave',
        title: 'Retro Synthwave Arcade Beats',
        artist: 'Arcade Rush & Neon Horizon',
        genre: 'Synthwave / Retro Electro',
        icon: '🕹️',
        embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXdLEN7aqioXM?utm_source=generator&theme=0',
        spotifyUri: 'spotify:playlist:37i9dQZF1DXdLEN7aqioXM'
      },
      {
        id: 'lofi',
        title: 'Lo-Fi Chill Gaming Session',
        artist: 'ChilledCow & Lofi Beats',
        genre: 'Lo-Fi Ambient / Mind Focus',
        icon: '☕',
        embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4t95P7g2X2a?utm_source=generator&theme=0',
        spotifyUri: 'spotify:playlist:37i9dQZF1DX4t95P7g2X2a'
      },
      {
        id: 'orchestral',
        title: 'Epic Boss Fight Orchestral',
        artist: 'Symphonic Battle Legends',
        genre: 'Tactical Orchestral OST',
        icon: '⚔️',
        embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWVcbzK5cBi9e?utm_source=generator&theme=0',
        spotifyUri: 'spotify:playlist:37i9dQZF1DWVcbzK5cBi9e'
      },
      {
        id: 'edm',
        title: 'High-BPM Electronic Drift',
        artist: 'Cyber Bass & Speedcore',
        genre: 'EDM / High Velocity',
        icon: '⚡',
        embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX0HV72l9mPPu?utm_source=generator&theme=0',
        spotifyUri: 'spotify:playlist:37i9dQZF1DX0HV72l9mPPu'
      }
    ];

    this.defaultTrack = this.curatedTracks[0];
    this.init();
  }

  init() {
    this.createAudioElement();
    this.bindDOM();
  }

  createAudioElement() {
    this.audioElement = new Audio();
    this.audioElement.loop = true;
    this.audioElement.volume = 0.5;
  }

  bindDOM() {
    const toggleBtn = document.getElementById('btn-spotify-toggle');
    const closeBtn = document.getElementById('btn-close-spotify-drawer');
    const drawer = document.getElementById('spotify-drawer');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleDrawer();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeDrawer();
      });
    }

    // Direct link to Open Spotify Web / App
    const openSpotifyBtn = document.getElementById('btn-open-spotify-app');
    if (openSpotifyBtn) {
      openSpotifyBtn.addEventListener('click', () => {
        window.open('https://open.spotify.com', '_blank');
        if (window.soundFX) window.soundFX.click();
      });
    }

    // Custom Spotify Link / URI Input
    const loadCustomBtn = document.getElementById('btn-load-custom-spotify');
    const customInput = document.getElementById('input-spotify-url');
    if (loadCustomBtn && customInput) {
      loadCustomBtn.addEventListener('click', () => {
        this.loadCustomUrl(customInput.value.trim());
      });
      customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.loadCustomUrl(customInput.value.trim());
        }
      });
    }

    // Render Curated Track Cards
    this.renderCuratedList();

    // Volume Slider
    const volSlider = document.getElementById('music-volume-slider');
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (this.audioElement) this.audioElement.volume = val;
      });
    }
  }

  toggleDrawer() {
    this.isOpen = !this.isOpen;
    const drawer = document.getElementById('spotify-drawer');
    if (drawer) {
      if (this.isOpen) {
        drawer.classList.remove('hidden');
        drawer.classList.add('visible');
        if (!this.currentTrack) {
          this.loadTrack(this.defaultTrack, false);
        }
      } else {
        drawer.classList.remove('visible');
        setTimeout(() => drawer.classList.add('hidden'), 300);
      }
    }
    if (window.soundFX) window.soundFX.click();
  }

  closeDrawer() {
    this.isOpen = false;
    const drawer = document.getElementById('spotify-drawer');
    if (drawer) {
      drawer.classList.remove('visible');
      setTimeout(() => drawer.classList.add('hidden'), 300);
    }
  }

  renderCuratedList() {
    const listContainer = document.getElementById('curated-tracks-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    this.curatedTracks.forEach(track => {
      const card = document.createElement('div');
      card.className = `spotify-track-card ${this.currentTrack && this.currentTrack.id === track.id ? 'active' : ''}`;
      card.dataset.trackId = track.id;
      card.innerHTML = `
        <span class="track-icon">${track.icon}</span>
        <div class="track-meta">
          <span class="track-title">${track.title}</span>
          <span class="track-artist">${track.artist} • <span class="genre-pill">${track.genre}</span></span>
        </div>
        <button class="track-play-btn">▶ PLAY</button>
      `;

      card.addEventListener('click', () => {
        this.loadTrack(track, true);
      });

      listContainer.appendChild(card);
    });
  }

  loadTrack(trackData, broadcast = true) {
    this.currentTrack = trackData;
    this.isPlaying = true;

    // Update active highlight in curated list
    document.querySelectorAll('.spotify-track-card').forEach(c => {
      if (c.dataset.trackId === trackData.id) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });

    // Update Player Iframe
    const iframe = document.getElementById('spotify-embed-iframe');
    if (iframe) {
      iframe.src = trackData.embedUrl;
    }

    // Update Now Playing Pill
    const titleEl = document.getElementById('current-song-title');
    const artistEl = document.getElementById('current-song-artist');
    if (titleEl) titleEl.textContent = trackData.title;
    if (artistEl) artistEl.textContent = trackData.artist || 'Spotify Audio';

    // Animate equalizer in top navbar
    this.setEqualizerActive(true);

    // Synchronize to other player in room if multiplayer match is active!
    if (broadcast && window.multiplayerManager && window.multiplayerManager.currentRoom) {
      const myUser = window.authController.getUser();
      const senderName = myUser ? myUser.username : 'Teammate';

      window.multiplayerManager.syncMusic({
        trackId: trackData.id,
        title: trackData.title,
        artist: trackData.artist,
        embedUrl: trackData.embedUrl,
        senderName
      });

      window.multiplayerManager.showToast(`🎧 Broadcasting "${trackData.title}" to room...`);
    }
  }

  loadCustomUrl(inputUrl) {
    if (!inputUrl) return;

    let embedUrl = '';
    let title = 'Custom Spotify Track';

    // Parse Spotify URL patterns
    if (inputUrl.includes('open.spotify.com')) {
      // Example: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=xyz
      // Embed URL: https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT?utm_source=generator&theme=0
      const cleanUrl = inputUrl.split('?')[0];
      const parts = cleanUrl.split('open.spotify.com/')[1];
      if (parts) {
        embedUrl = `https://open.spotify.com/embed/${parts}?utm_source=generator&theme=0`;
        title = `Spotify: ${parts.replace('/', ' ')}`;
      }
    } else if (inputUrl.startsWith('spotify:')) {
      // Example: spotify:track:4cOdK2wGLETKBW3PvgPWqT
      const parts = inputUrl.replace('spotify:', '').replace(/:/g, '/');
      embedUrl = `https://open.spotify.com/embed/${parts}?utm_source=generator&theme=0`;
      title = `Spotify: ${parts.replace('/', ' ')}`;
    } else {
      // Fallback: search on open.spotify.com
      embedUrl = `https://open.spotify.com/embed/search/${encodeURIComponent(inputUrl)}?utm_source=generator&theme=0`;
      title = `Search: ${inputUrl}`;
    }

    if (embedUrl) {
      const customTrack = {
        id: 'custom_' + Date.now(),
        title,
        artist: 'User Shared Audio',
        embedUrl,
        icon: '🎵'
      };
      this.loadTrack(customTrack, true);
      const inputEl = document.getElementById('input-spotify-url');
      if (inputEl) inputEl.value = '';
    }
  }

  // RECEIVE SYNCED MUSIC FROM PLAYER 1 / OPPONENT IN MULTIPLAYER ROOM
  handleRemoteSync(data) {
    if (!data || !data.embedUrl) return;

    console.log(`🎶 Received remote music sync from ${data.senderName}:`, data.title);

    this.currentTrack = {
      id: data.trackId || 'remote_' + Date.now(),
      title: data.title,
      artist: data.artist,
      embedUrl: data.embedUrl,
      icon: '🎵'
    };

    // Load track without re-broadcasting in a loop
    this.loadTrack(this.currentTrack, false);

    // Show exciting parallel sync toast
    if (window.multiplayerManager) {
      window.multiplayerManager.showToast(`🎵 ${data.senderName} synced song: ${data.title}`);
    }

    // Pulse equalizer
    this.setEqualizerActive(true);
    if (window.soundFX) window.soundFX.chatMessage();
  }

  setEqualizerActive(active) {
    const eqBars = document.querySelectorAll('.equalizer-bars .bar');
    eqBars.forEach(bar => {
      if (active) {
        bar.classList.add('animating');
      } else {
        bar.classList.remove('animating');
      }
    });

    const statusBadge = document.getElementById('music-sync-status-badge');
    if (statusBadge) {
      if (window.multiplayerManager && window.multiplayerManager.currentRoom) {
        statusBadge.innerHTML = `🟢 MULTIPLAYER SYNC: Room ${window.multiplayerManager.currentRoom.code}`;
        statusBadge.style.color = '#00ff66';
      } else {
        statusBadge.innerHTML = `⚪ LOCAL PLAYBACK: Join a room to sync in parallel`;
        statusBadge.style.color = '#8899aa';
      }
    }
  }
}

// Global Music Lounge Instance
window.musicLounge = new SpotifyMusicLounge();
