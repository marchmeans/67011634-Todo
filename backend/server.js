const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt'); 
const multer = require('multer'); 
const path = require('path');

const app = express();
const port = 5001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Debugging: Log every request to terminal
app.use((req, res, next) => {
    console.log(`${req.method} request to ${req.url}`);
    next();
});

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'CEiAdmin0',
    database: 'ceidb'
});

db.connect(err => {
    if (err) return console.error('Error:', err);
    console.log('Connected to MySQL (ceidb).');
});

// --- AUTH ROUTES ---

app.post('/api/register', upload.single('profile_image'), async (req, res) => {
    const { full_name, username, password } = req.body;
    const profile_image = req.file ? req.file.filename : null;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (full_name, username, password, profile_image) VALUES (?, ?, ?, ?)';
        db.query(sql, [full_name, username, hashedPassword, profile_image], (err) => {
            if (err) return res.status(400).send({ message: 'Error or username taken' });
            res.status(201).send({ success: true });
        });
    } catch (err) { res.status(500).send(err); }
});

app.post('/api/login', (req, res) => {
    const { username, password, captcha_answer, user_captcha_input } = req.body;
    if (parseInt(user_captcha_input) !== captcha_answer) return res.status(400).send({ message: 'Invalid CAPTCHA' });

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err || results.length === 0) return res.status(401).send({ message: 'Auth failed' });
        const match = await bcrypt.compare(password, results[0].password);
        if (!match) return res.status(401).send({ message: 'Wrong password' });
        res.send({ success: true, user: results[0] });
    });
});

// [A5] Google Login Synchronization
app.post('/api/google-login', (req, res) => {
    const { username, full_name, google_id } = req.body;

    // Check if the user already exists by their unique Google ID
    const checkSql = 'SELECT * FROM users WHERE google_id = ?';
    db.query(checkSql, [google_id], (err, results) => {
        if (err) return res.status(500).send(err);

        if (results.length > 0) {
            // User exists, return their info to log them in
            res.send({ success: true, user: results[0] });
        } else {
            // New Google user, add them to your MySQL users table
            const insertSql = 'INSERT INTO users (full_name, username, google_id) VALUES (?, ?, ?)';
            db.query(insertSql, [full_name, username, google_id], (err) => {
                if (err) return res.status(500).send(err);
                res.send({ success: true, user: { username, full_name } });
            });
        }
    });
});

// --- TODO ROUTES (Mapped to your table columns) ---

// 1. Fetch tasks for user
app.get('/api/todos/:username', (req, res) => {
    const sql = 'SELECT * FROM todo WHERE username = ? ORDER BY target_datetime DESC';
    db.query(sql, [req.params.username], (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});

// 2. Add task - Uses 'target_datetime' column
app.post('/api/todos', (req, res) => {
    const { username, task, deadline, status } = req.body; 
    const sql = 'INSERT INTO todo (username, task, target_datetime, status) VALUES (?, ?, ?, ?)';
    
    db.query(sql, [username, task, deadline, status || 'Todo'], (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).send(err);
        }
        res.status(201).send({ 
            id: result.insertId, 
            username, 
            task, 
            target_datetime: deadline, 
            status: status || 'Todo' 
        });
    });
});

// 3. Update Status
app.put('/api/todos/:id', (req, res) => {
    const sql = 'UPDATE todo SET status = ? WHERE id = ?';
    db.query(sql, [req.body.status, req.params.id], (err) => {
        if (err) return res.status(500).send(err);
        res.send({ success: true });
    });
});

// 4. Delete
app.delete('/api/todos/:id', (req, res) => {
    db.query('DELETE FROM todo WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).send(err);
        res.send({ success: true });
    });
});

app.listen(port, () => console.log(`Server at http://localhost:${port}`));