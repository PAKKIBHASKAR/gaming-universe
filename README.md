# 🌌 CYBERVERSE - Dynamic Gaming Universe

A futuristic, high-end Gaming Universe web application featuring **Chess**, **Carrom**, **Ludo**, and **Snakes & Ladders** with autonomous AI bots, local pass-and-play, and real-time multiplayer with shareable room links.

---

## 🎮 Features & Highlights

- **Dynamic Cyberpunk UI**:
  - Cosmic 3D warp particle starfield background.
  - Glowing glassmorphism interface with neon cyber accents.
  - Real-time synthesized Web Audio sound effects (moves, captures, dice rolls, strikes, climbs, victory).
- **Authentication & Profiles**:
  - Sign Up & Login with encrypted passwords (bcrypt + JWT).
  - Cyber Avatars (Cyber Samurai, Neon Ninja, Astro Titan, Matrix Phantom, Valkyrie, etc.).
  - Leveling system, XP progression, and coin rewards.
  - Quick Guest play option for immediate access.
- **Rules Protocol Screen**:
  - Dedicated rules modal displayed **before every game** explaining objectives, pieces, and winning conditions.
- **4 Realtime Interactive Games**:
  1. **Cyber Chess**:
     - 8x8 glowing neon chessboard.
     - Move generation, highlight dots, and checkmate/capture detection.
     - Play vs **Quantum Minimax AI** or **2 Players (Local & Online)**.
  2. **Quantum Carrom**:
     - 2D Canvas physics engine with elastic collisions, friction, and pocket suction.
     - Drag-to-aim laser trajectory and power gauge.
     - White coins (10 pts), Black coins (5 pts), and Red Queen (25 pts).
     - Play vs **AI Bot** or **2P / 3P / 4P**.
  3. **Cyber Ludo**:
     - 15x15 standard track layout with safety stars and home triangles.
     - 3D/neon animated dice roller with roll sound effects.
     - Token deployment on 6, extra turns, and opponent captures.
     - Modes: **2P, 3P, or 4P** (AI or Live Multiplayer).
  4. **Snakes & Ladders**:
     - 100-cell neon grid with animated teleport ladders and glitch snakes.
     - Step-by-step token movement with slide animations.
     - Modes: **2P, 3P, or 4P** (AI or Live Multiplayer).
- **Multiplayer Share Link System**:
  - Create a private room and get a shareable URL (`?room=XYZ123&game=chess`).
  - Friends open the link and instantly join the match with avatars and usernames.
  - In-game live chat for match banter and strategy.

---

## 🗄️ Database Setup (Aiven Cloud MySQL & DB Manager)

You can manage your database directly through your tool at:
**[persistent-db-manager.onrender.com](https://persistent-db-manager.onrender.com)**

### Recommended Database Name:
`gaming_universe`

### SQL Schema to Run in persistent-db-manager:
```sql
-- 1. Create and select the database
CREATE DATABASE IF NOT EXISTS gaming_universe;
USE gaming_universe;

-- 2. Users table (accounts, passwords, avatars, levels)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar VARCHAR(50) DEFAULT 'cyber_samurai',
  coins INT DEFAULT 1000,
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. User Stats table (wins, losses, high scores)
CREATE TABLE IF NOT EXISTS user_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  game_type ENUM('chess', 'carrom', 'ludo', 'snakes') NOT NULL,
  matches_played INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  score INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_game (user_id, game_type),
  CONSTRAINT fk_user_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Match History table
CREATE TABLE IF NOT EXISTS match_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_code VARCHAR(50) DEFAULT 'LOCAL_SOLO',
  game_type VARCHAR(30) NOT NULL,
  winner_username VARCHAR(50) NOT NULL,
  players_info TEXT,
  duration_seconds INT DEFAULT 0,
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 🚀 Step-by-Step GitHub & Render Deployment Guide

### STEP 1: Initialize Git and Push to GitHub
1. Open your browser and go to [GitHub](https://github.com/new).
2. Create a new repository called `gaming-universe` (Public or Private).
3. In your VS Code terminal (or PowerShell inside the project directory):
   ```bash
   cd "C:\Users\Pakki Bhaskar\.gemini\antigravity\scratch\gaming-universe"
   git init
   git add .
   git commit -m "Initial commit: Gaming Universe with Chess, Carrom, Ludo, Snakes & Ladders"
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/gaming-universe.git
   git push -u origin main
   ```

### STEP 2: Open / Clone in VS Code
- Open VS Code.
- Press `Ctrl + K, Ctrl + O` (or File -> Open Folder).
- Select: `C:\Users\Pakki Bhaskar\.gemini\antigravity\scratch\gaming-universe`.
- Run locally anytime with:
  ```bash
  npm start
  ```
  Visit: `http://localhost:5000`

### STEP 3: Create Web Service on Render
1. Go to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your `gaming-universe` repository.
4. Configure settings:
   - **Name**: `cyberverse-gaming` (or any name you prefer)
   - **Region**: Oregon (US West) or Frankfurt (close to your database)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`

### STEP 4: Add Aiven Environment Variables in Render
In the Render service creation page (or in **Settings -> Environment**), add these Environment Variables:

| Key | Value |
|---|---|
| `PORT` | `10000` (Render default) |
| `DB_HOST` | `bhaskar-bhaskar.h.aivencloud.com` |
| `DB_PORT` | `24223` |
| `DB_USER` | `bhaskar` |
| `DB_PASSWORD` | `<YOUR_AIVEN_PASSWORD>` (paste from Aiven console) |
| `DB_SSL` | `true` |
| `APP_DB_NAME` | `gaming_universe` |
| `JWT_SECRET` | `cyber_gaming_universe_secret_key_2026` |

5. Click **Deploy Web Service**!
6. Once deployed, Render will provide a live URL like `https://cyberverse-gaming.onrender.com`.

---

## 🔄 Making Future Updates
Whenever you want to modify anything (e.g. new rules, tweak UI, add sound):
1. Give the prompt here in our chat; I will update your local files directly!
2. In VS Code terminal:
   ```bash
   git add .
   git commit -m "Update game features"
   git push
   ```
3. Render will automatically detect the push and redeploy your live site within 1-2 minutes!
