import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

/**
 * Read a raw value from .env file without dotenv variable interpolation
 * This is needed for passwords containing $ characters
 */
function getRawEnvValue(key) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return null;

    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;

      const eqIndex = trimmed.indexOf('=');
      const lineKey = trimmed.substring(0, eqIndex);

      if (lineKey === key) {
        let value = trimmed.substring(eqIndex + 1);
        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        // Convert escaped \$ to $
        value = value.replace(/\\\$/g, '$');
        return value;
      }
    }
    return null;
  } catch (error) {
    console.error('Error reading raw env value:', error.message);
    return null;
  }
}

/**
 * Initialize the SQLite database
 */
export async function initDatabase() {
  try {
    const dbPath = process.env.DB_PATH || './data/ospf-visualizer.db';
    const dbDir = path.dirname(dbPath);

    // Create data directory if it doesn't exist
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Open database connection
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON;');

    // Create users table with login tracking and password change enforcement
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT,
        full_name TEXT,
        role TEXT DEFAULT 'user',
        is_active INTEGER DEFAULT 1,
        login_count INTEGER DEFAULT 0,
        login_count_since_pwd_change INTEGER DEFAULT 0,
        password_changed_at DATETIME,
        must_change_password INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      );
    `);

    // Migration: Add new columns if they don't exist (for existing databases)
    try {
      await db.exec('ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0');
    } catch (e) { /* Column exists */ }
    try {
      await db.exec('ALTER TABLE users ADD COLUMN login_count_since_pwd_change INTEGER DEFAULT 0');
    } catch (e) { /* Column exists */ }
    try {
      await db.exec('ALTER TABLE users ADD COLUMN password_changed_at DATETIME');
    } catch (e) { /* Column exists */ }
    try {
      await db.exec('ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0');
    } catch (e) { /* Column exists */ }
    try {
      await db.exec('ALTER TABLE users ADD COLUMN password_salt TEXT');
    } catch (e) { /* Column exists */ }

    // Create index on email for faster lookups
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // Create index on username for faster lookups
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);

    // Create sessions table for token management (optional - for token blacklisting)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create audit log table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Create user_settings table for storing user preferences (migrated from localStorage)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, setting_key)
      );
    `);

    // Create index on user_settings for faster lookups
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_settings_user_key ON user_settings(user_id, setting_key);
    `);

    // Create failure_scenarios table for storing network failure test scenarios
    await db.exec(`
      CREATE TABLE IF NOT EXISTS failure_scenarios (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        failed_nodes TEXT NOT NULL,
        failed_edges TEXT NOT NULL,
        mode TEXT NOT NULL CHECK(mode IN ('single', 'multi', 'cascade')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create index on failure_scenarios for user lookups
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_failure_scenarios_user ON failure_scenarios(user_id);
    `);

    // Create custom_links table for user-added topology links
    await db.exec(`
      CREATE TABLE IF NOT EXISTS custom_links (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        from_node TEXT NOT NULL,
        to_node TEXT NOT NULL,
        forward_cost INTEGER NOT NULL,
        reverse_cost INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create index on custom_links for user lookups
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_custom_links_user ON custom_links(user_id);
    `);

    console.log('✅ Database initialized successfully');

    // Create admin user if configured and doesn't exist
    await createAdminUser();

    return db;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

/**
 * Create admin user from environment variables if it doesn't exist
 */
async function createAdminUser() {
  const adminUsername = process.env.APP_ADMIN_USERNAME;
  // Read password directly from .env to handle $ characters correctly
  const adminPassword = getRawEnvValue('APP_ADMIN_PASSWORD') || process.env.APP_ADMIN_PASSWORD;
  const adminEmail = process.env.APP_ADMIN_EMAIL || 'admin@netviz.local';

  if (!adminUsername || !adminPassword) {
    console.log('ℹ️  No admin credentials configured (APP_ADMIN_USERNAME/APP_ADMIN_PASSWORD)');
    return;
  }

  console.log(`ℹ️  Admin password length: ${adminPassword.length} chars`);

  try {
    // Check if admin user already exists
    const existingUser = await db.get(
      'SELECT id, username FROM users WHERE username = ? OR email = ?',
      [adminUsername, adminEmail]
    );

    if (existingUser) {
      console.log(`✅ Admin user "${adminUsername}" already exists (ID: ${existingUser.id})`);
      return;
    }

    // Hash the password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Create admin user
    const result = await db.run(
      `INSERT INTO users (username, email, password_hash, full_name, role, is_active)
       VALUES (?, ?, ?, ?, 'admin', 1)`,
      [adminUsername, adminEmail, passwordHash, 'System Administrator']
    );

    console.log(`✅ Admin user "${adminUsername}" created successfully (ID: ${result.lastID})`);

    // Log the admin creation in audit log
    await db.run(
      'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)',
      [result.lastID, 'ADMIN_CREATED', 'Admin user created on server startup']
    );
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
}

/**
 * Get database instance
 */
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
    console.log('Database connection closed');
  }
}

export default { initDatabase, getDatabase, closeDatabase };
