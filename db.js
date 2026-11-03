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
  try {
    // 1. Try connecting first without selecting a database (in case gaming_universe is not yet created)
    const rootConnection = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      ssl: DB_CONFIG.ssl
    });

    console.log('⚡ Connected to Aiven MySQL Server successfully.');

    // Auto-create database if not exists
    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\`;`);
    await rootConnection.end();

    // 2. Now establish connection pool with the database
    pool = mysql.createPool(DB_CONFIG);

    // Auto-create required tables if not exist
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
    console.log(`🎮 Gaming Universe database [${DB_CONFIG.database}] is fully verified and ready!`);
  } catch (error) {
    console.error('⚠️ Database connection warning:', error.message);
    console.log('ℹ️ Running in resilient mode. Database operations will use fallback memory if Aiven is unreachable.');
    isConnected = false;
  }
}

async function query(sql, params) {
  if (isConnected && pool) {
    return await pool.query(sql, params);
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
