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

export default db;
