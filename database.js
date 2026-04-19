const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Create tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    )`);

    // Passwords table
    db.run(`CREATE TABLE IF NOT EXISTS passwords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        website TEXT NOT NULL,
        username TEXT NOT NULL,
        encoded_password TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
});

module.exports = db;
