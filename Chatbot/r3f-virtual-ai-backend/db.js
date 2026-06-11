// db.js
import sqlite3 from "sqlite3";
import { open } from "sqlite";

export const initDb = async () => {
  const db = await open({
    filename: process.env.DB_PATH || "./data.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS conversations (
      conversation_id TEXT PRIMARY KEY,
      prolific_pid TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      facial_expression TEXT,
      animation TEXT,
      audio_mp3_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id)
        REFERENCES conversations(conversation_id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversation_state (
      conversation_id TEXT PRIMARY KEY,
      dish_type TEXT,
      total_time TEXT,
      complexity TEXT,
      task_phase INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id)
        REFERENCES conversations(conversation_id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recipe_recommendations (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      assistant_message_id TEXT,
      rank INTEGER,
      recipe_title TEXT,
      total_time TEXT,
      dish_type TEXT,
      complexity TEXT,
      distance REAL,
      raw_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id)
        REFERENCES conversations(conversation_id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS survey_responses (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      phase INTEGER NOT NULL,
      responses TEXT NOT NULL,
      timing TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id)
        REFERENCES conversations(conversation_id)
        ON DELETE CASCADE
    );
  `);
  
  // Add timing column to survey_responses if it doesn't exist yet
  try {
    await db.run(`ALTER TABLE survey_responses ADD COLUMN timing TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // Add prolific_pid column to conversations if it doesn't exist yet
  try {
    await db.run(`ALTER TABLE conversations ADD COLUMN prolific_pid TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // Add task_phase column if it doesn't exist yet (migration for existing DBs)
  try {
    await db.run(`ALTER TABLE conversation_state ADD COLUMN task_phase INTEGER DEFAULT 1`);
  } catch {
    // Column already exists — ignore
  }

  // Drop cuisine column if it still exists from a previous schema version
  try {
    await db.run(`ALTER TABLE conversation_state DROP COLUMN cuisine`);
  } catch {
    // Column doesn't exist or SQLite version too old — ignore
  }

  return db;
};