const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'bhaskar-bhaskar.h.aivencloud.com',
  port: parseInt(process.env.DB_PORT || '24223', 10),
  user: process.env.DB_USER || 'bhaskar',
  password: process.env.DB_PASSWORD || '',
  database: process.env.APP_DB_NAME || 'gaming_universe',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
};

let pool = null;
let isConnected = false;

// In-memory fallback if database is not yet initialized or reachable
const inMemoryStore = {
  users: [],
  stats: [],
  history: []
};

async function initDB() {
  if (!DB_CONFIG.password) {
    console.warn('⚠️ No DB_PASSWORD found in environment variables. Running in local resilient store mode.');
    return;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔌 Attempting connection to Aiven MySQL (attempt ${attempt}/3)...`);
      const rootConnection = await mysql.createConnection({
        host: DB_CONFIG.host,
        port: DB_CONFIG.port,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        ssl: DB_CONFIG.ssl,
        connectTimeout: 10000
      });

      console.log('⚡ Connected to Aiven MySQL Server successfully.');

      // Auto-create database if not exists
      await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\`;`);
      await rootConnection.end();

      // Establish connection pool
      pool = mysql.createPool(DB_CONFIG);

      // Verify and auto-create tables
      await pool.query(`
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
      `);

      await pool.query(`
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
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS match_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          room_code VARCHAR(50) DEFAULT 'LOCAL_SOLO',
          game_type VARCHAR(30) NOT NULL,
          winner_username VARCHAR(50) NOT NULL,
          players_info TEXT,
          duration_seconds INT DEFAULT 0,
          played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      isConnected = true;
      console.log(`🎮 Gaming Universe database [${DB_CONFIG.database}] is ONLINE & READY!`);
      return;
    } catch (error) {
      console.error(`⚠️ Database connection attempt ${attempt} failed:`, error.message);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  console.log('ℹ️ Running in resilient fallback mode (in-memory persistence active).');
  isConnected = false;
}

async function query(sql, params) {
  if (isConnected && pool) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      console.error('Database query error:', err.message);
      throw err;
    }
  }
  return [[], []];
}

module.exports = {
  initDB,
  query,
  getPool: () => pool,
  isDbConnected: () => isConnected,
  inMemoryStore
};
