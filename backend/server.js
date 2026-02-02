require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 5001;

/* ===================== MIDDLEWARE ===================== */
app.use(cors());
app.use(express.json());

/* ===================== UPLOAD SETUP ===================== */
const uploadDir = './uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

/* ===================== DATABASE ===================== */
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('Database error:', err);
        return;
    }
    console.log('Connected to MySQL');
});

/* ===================== RECAPTCHA ===================== */
async function verifyCaptcha(token) {
    if (!token) {
        console.log('❌ No captcha token received');
        return false;
    }

    console.log('📝 Token received:', token.substring(0, 50) + '...');
    console.log('🔑 Secret key exists:', !!process.env.RECAPTCHA_SECRET);

    try {
        const params = new URLSearchParams();
        params.append('secret', process.env.RECAPTCHA_SECRET);
        params.append('response', token);

        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            params
        );

        console.log('🟡 Google captcha response:', response.data);

        return response.data.success;
    } catch (err) {
        console.error('Captcha verification error:', err);
        return false;
    }
}


/* ===================== AUTH ROUTES ===================== */

// REGISTER
app.post('/api/register', upload.single('profile_image'), async (req, res) => {
    const { full_name, username, password, captchaToken } = req.body;

    const captchaValid = await verifyCaptcha(captchaToken);
    if (!captchaValid) {
        return res.status(400).json({ message: 'Captcha failed' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const profile_image = req.file ? req.file.filename : null;

        const sql = `
            INSERT INTO users (full_name, username, password, profile_image)
            VALUES (?, ?, ?, ?)
        `;

        db.query(sql, [full_name, username, hashedPassword, profile_image], err => {
            if (err) {
                return res.status(400).json({ message: 'Username already exists' });
            }
            res.status(201).json({ success: true });
        });
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    const { username, password, captchaToken } = req.body;

    const captchaValid = await verifyCaptcha(captchaToken);
    if (!captchaValid) {
        return res.status(400).json({ message: 'Captcha failed' });
    }

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, results[0].password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ username: results[0].username }, process.env.JWT_SECRET || 'your-secret-key');
        res.json({ success: true, token, user: results[0] });
    });
});

// GOOGLE LOGIN
app.post('/api/google-login', (req, res) => {
    const { username, full_name, profile_image } = req.body;

    db.query(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Server error' });

            if (results.length > 0) {
                const token = jwt.sign({ username: results[0].username }, process.env.JWT_SECRET || 'your-secret-key');
                return res.json({ success: true, token, user: results[0] });
            }

            const sql = `
                INSERT INTO users (full_name, username, profile_image)
                VALUES (?, ?, ?)
            `;

            db.query(sql, [full_name, username, profile_image], (err, result) => {
                if (err) return res.status(500).json({ message: 'Insert failed' });
                const token = jwt.sign({ username }, process.env.JWT_SECRET || 'your-secret-key');
                res.json({
                    success: true,
                    token,
                    user: { id: result.insertId, full_name, username, profile_image }
                });
            });
        }
    );
});

/* ===================== PROFILE IMAGE ===================== */
app.put('/api/users/profile-image/:username', upload.single('profile_image'), (req, res) => {
    const profile_image = req.file?.filename;

    if (!profile_image) {
        return res.status(400).json({ message: 'No image uploaded' });
    }

    db.query(
        'UPDATE users SET profile_image = ? WHERE username = ?',
        [profile_image, req.params.username],
        err => {
            if (err) return res.status(500).json({ message: 'Update failed' });
            res.json({ success: true, profile_image });
        }
    );
});

/* ===================== TODO ROUTES ===================== */

// GET TODOS
app.get('/api/todos/:username', (req, res) => {
    db.query(
        'SELECT * FROM todo WHERE username = ? ORDER BY target_datetime DESC',
        [req.params.username],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Error' });
            res.json(results);
        }
    );
});

// ADD TODO
app.post('/api/todos', (req, res) => {
    const { username, task, deadline, status } = req.body;

    db.query(
        'INSERT INTO todo (username, task, target_datetime, status) VALUES (?, ?, ?, ?)',
        [username, task, deadline, status || 'Todo'],
        (err, result) => {
            if (err) return res.status(500).json({ message: 'Insert failed' });
            res.status(201).json({
                id: result.insertId,
                username,
                task,
                target_datetime: deadline,
                status: status || 'Todo'
            });
        }
    );
});

// UPDATE TODO
app.put('/api/todos/:id', (req, res) => {
    db.query(
        'UPDATE todo SET status = ? WHERE id = ?',
        [req.body.status, req.params.id],
        err => {
            if (err) return res.status(500).json({ message: 'Update failed' });
            res.json({ success: true });
        }
    );
});

// DELETE TODO
app.delete('/api/todos/:id', (req, res) => {
    db.query(
        'DELETE FROM todo WHERE id = ?',
        [req.params.id],
        err => {
            if (err) return res.status(500).json({ message: 'Delete failed' });
            res.json({ success: true });
        }
    );
});

/* ===================== START SERVER ===================== */
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    
});
