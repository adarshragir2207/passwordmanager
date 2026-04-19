const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'interview-secret-key-1234',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// --- Simple Encoding (Base64) ---
// For a beginner project, we use Base64 to show we aren't storing plain text.
// In a real app, you would use AES encryption!
function encodeBase64(text) {
    return Buffer.from(text).toString('base64');
}

function decodeBase64(text) {
    return Buffer.from(text, 'base64').toString('utf8');
}

// Ensure user is logged in middleware
function requireLogin(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    } else {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

// --- API ROUTES ---

// 1. Check Login Status (Used by frontend to check if logged in)
app.get('/status', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ loggedIn: true, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// 2. Register
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
        // Hash the master password using bcrypt for secure storage
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ message: 'User registered successfully!' });
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(400).json({ error: 'Invalid username or password' });

        // Check if the provided password matches the hashed password in database
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid username or password' });

        // Create a simple session
        req.session.userId = user.id;
        req.session.username = user.username;
        res.json({ message: 'Logged in successfully!' });
    });
});

// 4. Logout
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
});

// 5. Get Passwords (Decoded)
app.get('/get-passwords', requireLogin, (req, res) => {
    db.all(`SELECT id, website, username, encoded_password FROM passwords WHERE user_id = ?`, [req.session.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        // Decode the passwords back to plain text before sending to the frontend
        const decodedPasswords = rows.map(row => {
            return {
                id: row.id,
                website: row.website,
                username: row.username,
                password: decodeBase64(row.encoded_password)
            };
        });

        res.json(decodedPasswords);
    });
});

// 6. Add Password (Encoded)
app.post('/add-password', requireLogin, (req, res) => {
    const { website, username, password } = req.body;
    if (!website || !username || !password) return res.status(400).json({ error: 'Missing fields' });

    // Encode the password before saving it to the database
    const encodedData = encodeBase64(password);

    db.run(`INSERT INTO passwords (user_id, website, username, encoded_password) VALUES (?, ?, ?, ?)`, 
    [req.session.userId, website, username, encodedData], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Password saved!', id: this.lastID });
    });
});

// 7. Delete Password (Extra helper route)
app.delete('/delete-password/:id', requireLogin, (req, res) => {
    db.run(`DELETE FROM passwords WHERE id = ? AND user_id = ?`, [req.params.id, req.session.userId], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Password deleted' });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
