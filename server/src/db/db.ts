import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "../../database.db");

// Initialize database connection
const db = new Database(DB_PATH);

// Enable foreign keys constraints
db.pragma("foreign_keys = ON");

console.log("Database connection initialized successfully.");

// Ensure comments table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES lab_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

export default db;
