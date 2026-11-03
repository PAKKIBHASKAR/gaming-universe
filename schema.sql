-- ========================================================
-- GAMING UNIVERSE - DATABASE INITIALIZATION SCRIPT
-- RUN THIS IN YOUR PERSISTENT-DB-MANAGER SQL TERMINAL
-- https://persistent-db-manager.onrender.com
-- ========================================================

-- 1. Create the Database
CREATE DATABASE IF NOT EXISTS gaming_universe;

-- 2. Select the Database
USE gaming_universe;

-- 3. Users Table (Authentication, Profiles & Avatars)
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

-- 4. User Stats Table (Wins, Losses, High Scores per Game)
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

-- 5. Match History Table (Recent Games & Winner Logs)
CREATE TABLE IF NOT EXISTS match_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_code VARCHAR(50) DEFAULT 'LOCAL_SOLO',
  game_type VARCHAR(30) NOT NULL,
  winner_username VARCHAR(50) NOT NULL,
  players_info TEXT,
  duration_seconds INT DEFAULT 0,
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Check tables created
SHOW TABLES;
