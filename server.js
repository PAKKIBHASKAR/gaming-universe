const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { initDB, query, isDbConnected, inMemoryStore } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'cyber_universe_secret_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------
// AUTH MIDDLEWARE
// ----------------------------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ----------------------------------------------------
// AUTH & USER ROUTES
// ----------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, avatar } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please provide codename, email, and password.' });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const chosenAvatar = avatar || 'cyber_samurai';

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Codename must be at least 3 characters long.' });
    }
    if (cleanPassword.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    if (isDbConnected()) {
      const [existing] = await query(
        'SELECT id, username, email FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1',
        [cleanUsername, cleanEmail]
      );
      if (existing && existing.length > 0) {
        if (existing[0].username.toLowerCase() === cleanUsername.toLowerCase()) {
          return res.status(409).json({ error: `Codename "${cleanUsername}" is already taken. Try another!` });
        }
        return res.status(409).json({ error: `Email "${cleanEmail}" is already registered. Please log in!` });
      }

      const passwordHash = await bcrypt.hash(cleanPassword, 10);
      const [result] = await query(
        'INSERT INTO users (username, email, password_hash, avatar, coins, xp, level) VALUES (?, ?, ?, ?, 1000, 0, 1)',
        [cleanUsername, cleanEmail, passwordHash, chosenAvatar]
      );

      const userId = result.insertId;

      // Seed initial game stats
      const games = ['chess', 'carrom', 'ludo', 'snakes'];
      for (const g of games) {
        await query(
          'INSERT IGNORE INTO user_stats (user_id, game_type, matches_played, wins, losses, score) VALUES (?, ?, 0, 0, 0, 0)',
          [userId, g]
        );
      }

      const token = jwt.sign({ id: userId, username: cleanUsername, email: cleanEmail }, JWT_SECRET, { expiresIn: '7d' });
      console.log(`✅ User registered in MySQL: ${cleanUsername} (${cleanEmail})`);
      return res.status(201).json({
        message: 'Account created successfully! Entering Gaming Universe...',
        token,
        user: { id: userId, username: cleanUsername, email: cleanEmail, avatar: chosenAvatar, coins: 1000, xp: 0, level: 1 }
      });
    } else {
      // In-memory fallback
      const exists = inMemoryStore.users.find(
        u => u.username.toLowerCase() === cleanUsername.toLowerCase() || u.email.toLowerCase() === cleanEmail
      );
      if (exists) {
        return res.status(409).json({ error: 'Codename or email already registered. Please log in!' });
      }

      const passwordHash = await bcrypt.hash(cleanPassword, 10);
      const newUser = {
        id: Date.now(),
        username: cleanUsername,
        email: cleanEmail,
        password_hash: passwordHash,
        avatar: chosenAvatar,
        coins: 1000,
        xp: 0,
        level: 1
      };
      inMemoryStore.users.push(newUser);
      const token = jwt.sign({ id: newUser.id, username: newUser.username, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
      console.log(`✅ User registered in offline memory: ${cleanUsername}`);
      return res.status(201).json({
        message: 'Account created successfully! Entering Gaming Universe...',
        token,
        user: { id: newUser.id, username: newUser.username, email: newUser.email, avatar: chosenAvatar, coins: 1000, xp: 0, level: 1 }
      });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identity, password } = req.body;
    if (!identity || !password) {
      return res.status(400).json({ error: 'Please enter your username/email and password.' });
    }

    const cleanIdentity = identity.trim();
    const cleanPassword = password.trim();

    let user = null;
    if (isDbConnected()) {
      const [rows] = await query(
        'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1',
        [cleanIdentity, cleanIdentity.toLowerCase()]
      );
      if (rows && rows.length > 0) user = rows[0];
    } else {
      user = inMemoryStore.users.find(
        u => u.username.toLowerCase() === cleanIdentity.toLowerCase() || u.email.toLowerCase() === cleanIdentity.toLowerCase()
      );
    }

    if (!user) {
      return res.status(404).json({
        error: `No account found for "${cleanIdentity}". Please click SIGN UP to create your account!`,
        userNotFound: true
      });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Incorrect password. Please verify and re-enter.'
      });
    }

    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    console.log(`⚡ Login successful: ${user.username}`);

    res.json({
      message: `Access Granted! Welcome back, ${user.username}!`,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        coins: user.coins,
        xp: user.xp,
        level: user.level
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login. Please try again.' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    if (isDbConnected()) {
      const [rows] = await query('SELECT id, username, email, avatar, coins, xp, level FROM users WHERE id = ?', [req.user.id]);
      if (rows && rows.length > 0) {
        const [stats] = await query('SELECT game_type, matches_played, wins, losses, score FROM user_stats WHERE user_id = ?', [req.user.id]);
        return res.json({ user: rows[0], stats });
      }
    }
    const user = inMemoryStore.users.find(u => u.id === req.user.id);
    if (user) {
      return res.json({ user, stats: [] });
    }
    res.status(404).json({ error: 'User not found' });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch profile' });
  }
});

app.post('/api/auth/update-avatar', authenticateToken, async (req, res) => {
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ error: 'Avatar identifier required' });
  try {
    if (isDbConnected()) {
      await query('UPDATE users SET avatar = ? WHERE id = ?', [avatar, req.user.id]);
    }
    res.json({ success: true, avatar });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

app.post('/api/game/record-result', authenticateToken, async (req, res) => {
  try {
    const { gameType, isWin, scoreGain, coinsEarned } = req.body;
    const earnedCoins = parseInt(coinsEarned || 50, 10);
    const xpGain = isWin ? 100 : 25;

    if (isDbConnected()) {
      await query(
        'UPDATE users SET coins = coins + ?, xp = xp + ?, level = FLOOR(1 + (xp + ?) / 300) WHERE id = ?',
        [earnedCoins, xpGain, xpGain, req.user.id]
      );

      const winInc = isWin ? 1 : 0;
      const lossInc = isWin ? 0 : 1;
      await query(
        `INSERT INTO user_stats (user_id, game_type, matches_played, wins, losses, score)
         VALUES (?, ?, 1, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           matches_played = matches_played + 1,
           wins = wins + ?,
           losses = losses + ?,
           score = score + ?`,
        [req.user.id, gameType, winInc, lossInc, scoreGain || 0, winInc, lossInc, scoreGain || 0]
      );
    }

    res.json({ success: true, earnedCoins, xpGain });
  } catch (err) {
    console.error('Error saving game record:', err);
    res.status(500).json({ error: 'Failed to record match stats' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    if (isDbConnected()) {
      const [topUsers] = await query(
        `SELECT u.username, u.avatar, u.level, u.coins, 
                COALESCE(SUM(s.wins), 0) AS total_wins,
                COALESCE(SUM(s.matches_played), 0) AS total_matches
         FROM users u
         LEFT JOIN user_stats s ON u.id = s.user_id
         GROUP BY u.id
         ORDER BY total_wins DESC, u.level DESC, u.coins DESC
         LIMIT 10`
      );
      return res.json({ leaderboard: topUsers });
    }
    res.json({
      leaderboard: [
        { username: 'CyberMaster_X', avatar: 'cyber_samurai', level: 12, coins: 4500, total_wins: 34, total_matches: 40 },
        { username: 'NeonPhantom', avatar: 'neon_ninja', level: 9, coins: 3100, total_wins: 26, total_matches: 32 },
        { username: 'QuantumValkyrie', avatar: 'space_marine', level: 7, coins: 2200, total_wins: 19, total_matches: 25 }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ----------------------------------------------------
// MULTIPLAYER SOCKET.IO ENGINE (2P / 3P / 4P)
// ----------------------------------------------------
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

io.on('connection', (socket) => {
  // Create room (2P, 3P, or 4P)
  socket.on('create_room', ({ gameType, playerName, avatar, maxPlayers }) => {
    const roomCode = generateRoomCode();
    const capacity = parseInt(maxPlayers || 2, 10);

    const room = {
      code: roomCode,
      gameType,
      maxPlayers: capacity,
      hostId: socket.id,
      started: false,
      players: [
        {
          id: socket.id,
          name: playerName || 'Player 1',
          avatar: avatar || 'cyber_samurai',
          index: 0,
          isHost: true
        }
      ],
      gameState: {},
      currentTurn: 0
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.currentRoom = roomCode;

    socket.emit('room_created', {
      roomCode,
      room,
      playerIndex: 0
    });
    console.log(`🎮 Room created: ${roomCode} for [${gameType}] (${capacity} players) by ${playerName}`);
  });

  // Join room
  socket.on('join_room', ({ roomCode, playerName, avatar }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms.get(code);

    if (!room) {
      return socket.emit('join_error', { message: `Room ${code} does not exist.` });
    }

    if (room.started) {
      return socket.emit('join_error', { message: `Match in room ${code} has already started.` });
    }

    if (room.players.length >= room.maxPlayers) {
      return socket.emit('join_error', { message: `Room ${code} is full (${room.maxPlayers} players maximum).` });
    }

    const playerIndex = room.players.length;
    const newPlayer = {
      id: socket.id,
      name: playerName || `Player ${playerIndex + 1}`,
      avatar: avatar || 'cyber_samurai',
      index: playerIndex,
      isHost: false
    };

    room.players.push(newPlayer);
    socket.join(code);
    socket.currentRoom = code;

    socket.emit('joined_successfully', {
      roomCode: code,
      room,
      playerIndex
    });

    // Notify ALL players in room
    io.to(code).emit('player_joined', {
      room,
      newPlayer
    });

    console.log(`👥 Player ${playerName} joined room ${code} (${room.players.length}/${room.maxPlayers})`);
  });

  // Update Player Profile in Room
  socket.on('update_player_profile', ({ roomCode, name, avatar }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      if (name) player.name = name.trim();
      if (avatar) player.avatar = avatar;
      io.to(roomCode).emit('player_updated', { room, player });
    }
  });

  // HOST STARTS THE MATCH FOR ALL PLAYERS
  socket.on('start_match', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    if (socket.id !== room.hostId) {
      return socket.emit('join_error', { message: 'Only the room Host can launch the match.' });
    }

    if (room.players.length < 2) {
      return socket.emit('join_error', { message: 'At least 2 players are required to start.' });
    }

    room.started = true;
    console.log(`🚀 Host launched match for all players in room: ${roomCode}`);
    io.to(roomCode).emit('match_started', {
      room,
      gameType: room.gameType
    });
  });

  // Relay game actions (board moves, dice rolls, striker shots)
  socket.on('game_action', ({ roomCode, actionType, payload }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    // Relay to other players in room
    socket.to(roomCode).emit('game_action_received', {
      senderId: socket.id,
      actionType,
      payload
    });
  });

  // In-game live chat (works both in room and during active match)
  socket.on('send_chat', ({ roomCode, senderName, avatar, text }) => {
    if (!roomCode || !text) return;
    io.to(roomCode).emit('new_chat_message', {
      sender: senderName,
      avatar,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // Restart / Reset game
  socket.on('request_restart', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room) {
      io.to(roomCode).emit('game_restarted', { message: 'Host restarted the match' });
    }
  });

  // Handle player disconnect
  socket.on('disconnect', () => {
    const code = socket.currentRoom;
    if (code && rooms.has(code)) {
      const room = rooms.get(code);
      room.players = room.players.filter(p => p.id !== socket.id);

      if (room.players.length === 0) {
        rooms.delete(code);
        console.log(`🗑️ Room ${code} destroyed (all players left)`);
      } else {
        io.to(code).emit('player_left', {
          leavingPlayerId: socket.id,
          remainingPlayers: room.players
        });
      }
    }
  });
});

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
async function start() {
  await initDB();
  server.listen(PORT, () => {
    console.log(`
  ======================================================
  🚀 GAMING UNIVERSE CYBER-PORTAL IS LIVE
  🌐 Local URL:  http://localhost:${PORT}
  🕹️ Games:      Chess, Carrom, Ludo, Snakes & Ladders
  🎲 Modes:      Single Player AI & 2P/3P/4P Multiplayer
  💾 Database:   Aiven Cloud MySQL (${isDbConnected() ? 'ONLINE' : 'FALLBACK'})
  ======================================================
    `);
  });
}

start();
