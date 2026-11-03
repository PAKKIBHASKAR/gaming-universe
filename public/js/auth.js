// ==========================================
// AUTHENTICATION & PROFILE CONTROLLER
// ==========================================
const AVATARS = [
  { id: 'cyber_samurai', name: 'Cyber Samurai', icon: '⚔️', color: '#00f0ff' },
  { id: 'neon_ninja', name: 'Neon Ninja', icon: '🥷', color: '#b026ff' },
  { id: 'space_marine', name: 'Astro Titan', icon: '👨‍🚀', color: '#ffbd00' },
  { id: 'matrix_hacker', name: 'Matrix Phantom', icon: '👾', color: '#00ff66' },
  { id: 'valkyrie', name: 'Valkyrie Prime', icon: '⚡', color: '#ff007f' },
  { id: 'astro_cat', name: 'Cyber Mech', icon: '🤖', color: '#00e5ff' },
  { id: 'phoenix', name: 'Solar Phoenix', icon: '🔥', color: '#ff4d00' },
  { id: 'cosmic_wizard', name: 'Cosmic Seer', icon: '🔮', color: '#9d4edd' }
];

let currentUser = null;
let authToken = localStorage.getItem('gaming_token') || null;

function getAvatarMeta(avatarId) {
  return AVATARS.find(a => a.id === avatarId) || AVATARS[0];
}

function initAuth() {
  renderAvatarSelectors();

  // Try recovering session from token or cached user
  const cachedUser = localStorage.getItem('gaming_user');
  if (cachedUser && authToken) {
    try {
      currentUser = JSON.parse(cachedUser);
      updateUserUI();
      fetchFreshProfile();
    } catch (e) {
      currentUser = null;
    }
  }

  // Setup form event listeners
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  const guestBtn = document.getElementById('guest-login-btn');
  if (guestBtn) {
    guestBtn.addEventListener('click', handleGuestLogin);
  }

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

function renderAvatarSelectors() {
  const containers = document.querySelectorAll('.avatar-picker-grid');
  containers.forEach(container => {
    container.innerHTML = '';
    AVATARS.forEach((av, idx) => {
      const el = document.createElement('div');
      el.className = `avatar-option ${idx === 0 ? 'selected' : ''}`;
      el.dataset.avatarId = av.id;
      el.innerHTML = `
        <span class="avatar-icon">${av.icon}</span>
        <span class="avatar-name">${av.name}</span>
      `;
      el.addEventListener('click', () => {
        container.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        window.soundFX && window.soundFX.click();
      });
      container.appendChild(el);
    });
  });
}

function getSelectedAvatar(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return 'cyber_samurai';
  const selected = container.querySelector('.avatar-option.selected');
  return selected ? selected.dataset.avatarId : 'cyber_samurai';
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const avatar = getSelectedAvatar('reg-avatar-picker');
  const msgEl = document.getElementById('reg-msg');

  if (!username || !email || !password) {
    showAuthMsg(msgEl, 'Please fill in all fields', 'error');
    return;
  }

  try {
    showAuthMsg(msgEl, 'Creating your Cyber identity...', 'info');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, avatar })
    });
    const data = await res.json();

    if (!res.ok) {
      showAuthMsg(msgEl, data.error || 'Registration failed', 'error');
      return;
    }

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('gaming_token', authToken);
    localStorage.setItem('gaming_user', JSON.stringify(currentUser));

    showAuthMsg(msgEl, 'Welcome to the Universe! Entering portal...', 'success');
    window.soundFX && window.soundFX.victory();

    setTimeout(() => {
      closeAuthModal();
      updateUserUI();
    }, 1000);
  } catch (err) {
    showAuthMsg(msgEl, 'Network error. Try again.', 'error');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const identity = document.getElementById('login-identity').value.trim();
  const password = document.getElementById('login-password').value;
  const msgEl = document.getElementById('login-msg');

  if (!identity || !password) {
    showAuthMsg(msgEl, 'Please enter username and password', 'error');
    return;
  }

  try {
    showAuthMsg(msgEl, 'Verifying credentials...', 'info');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showAuthMsg(msgEl, data.error || 'Invalid credentials', 'error');
      return;
    }

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('gaming_token', authToken);
    localStorage.setItem('gaming_user', JSON.stringify(currentUser));

    showAuthMsg(msgEl, `Access Granted! Welcome back, ${currentUser.username}`, 'success');
    window.soundFX && window.soundFX.victory();

    setTimeout(() => {
      closeAuthModal();
      updateUserUI();
    }, 900);
  } catch (err) {
    showAuthMsg(msgEl, 'Login request failed. Server offline?', 'error');
  }
}

function handleGuestLogin() {
  const chosenAvatar = getSelectedAvatar('reg-avatar-picker');
  const guestNum = Math.floor(1000 + Math.random() * 9000);
  currentUser = {
    id: 'guest_' + guestNum,
    username: `CyberGuest_${guestNum}`,
    email: `guest${guestNum}@universe.local`,
    avatar: chosenAvatar,
    coins: 1000,
    xp: 0,
    level: 1,
    isGuest: true
  };
  localStorage.setItem('gaming_user', JSON.stringify(currentUser));
  window.soundFX && window.soundFX.click();
  closeAuthModal();
  updateUserUI();
}

function handleLogout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('gaming_token');
  localStorage.removeItem('gaming_user');
  updateUserUI();
  window.soundFX && window.soundFX.click();
  openAuthModal();
}

async function fetchFreshProfile() {
  if (!authToken) return;
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      currentUser = { ...currentUser, ...data.user };
      localStorage.setItem('gaming_user', JSON.stringify(currentUser));
      updateUserUI();
    }
  } catch (err) {
    console.warn('Could not refresh profile:', err);
  }
}

async function recordGameOutcome(gameType, isWin, score = 100) {
  if (!currentUser) return;
  const coinsReward = isWin ? 100 : 25;
  currentUser.coins = (currentUser.coins || 1000) + coinsReward;
  currentUser.xp = (currentUser.xp || 0) + (isWin ? 75 : 20);
  currentUser.level = Math.floor(1 + currentUser.xp / 300);
  localStorage.setItem('gaming_user', JSON.stringify(currentUser));
  updateUserUI();

  if (authToken && !currentUser.isGuest) {
    try {
      await fetch('/api/game/record-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ gameType, isWin, scoreGain: score, coinsEarned: coinsReward })
      });
    } catch (e) {
      console.warn('Could not save game result online', e);
    }
  }
}

function updateUserUI() {
  const profileSection = document.getElementById('user-profile-bar');
  const authPromptBtn = document.getElementById('btn-open-auth');

  if (currentUser) {
    if (profileSection) profileSection.classList.remove('hidden');
    if (authPromptBtn) authPromptBtn.classList.add('hidden');

    const nameEl = document.getElementById('profile-name');
    const avatarEl = document.getElementById('profile-avatar');
    const coinsEl = document.getElementById('profile-coins');
    const levelEl = document.getElementById('profile-level');

    const meta = getAvatarMeta(currentUser.avatar);
    if (nameEl) nameEl.textContent = currentUser.username;
    if (avatarEl) {
      avatarEl.innerHTML = meta.icon;
      avatarEl.title = meta.name;
    }
    if (coinsEl) coinsEl.textContent = (currentUser.coins || 1000).toLocaleString();
    if (levelEl) levelEl.textContent = `LVL ${currentUser.level || 1}`;
  } else {
    if (profileSection) profileSection.classList.add('hidden');
    if (authPromptBtn) authPromptBtn.classList.remove('hidden');
  }
}

function showAuthMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = `auth-status-msg ${type}`;
}

function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
}

window.authController = {
  init: initAuth,
  getUser: () => currentUser || { username: 'CyberGamer', avatar: 'cyber_samurai', coins: 1000, level: 1 },
  openModal: openAuthModal,
  closeModal: closeAuthModal,
  recordOutcome: recordGameOutcome,
  getAvatarMeta
};
