const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' directory

// In-memory storage for demo (use database in production)
let loginAttempts = {};
let logs = [];
let totalAttempts = 0;
let failedAttempts = 0;
let detectedThreats = 0;

// Constants
const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 5000; // 5 seconds
const CORRECT_USER = 'admin';
const CORRECT_PASS = 'secure123';

// Helper functions
const generateIP = () => {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
};

const getTime = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
};

const addLog = (user, status, type = 'info', ip) => {
    const logEntry = {
        time: getTime(),
        ip: ip || generateIP(),
        user: user || 'UNKNOWN',
        status: status,
        type: type
    };
    logs.push(logEntry);
    console.log(`[${logEntry.time}] IP: ${logEntry.ip} | USER: ${logEntry.user} | STATUS: ${logEntry.status}`);
};

// API Routes
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || generateIP();

    if (!username || !password) {
        addLog(username, 'MISSING CREDENTIALS', 'error', clientIP);
        return res.status(400).json({ success: false, message: 'CREDENTIALS REQUIRED' });
    }

    totalAttempts++;

    // Check if IP is locked
    if (loginAttempts[clientIP] && loginAttempts[clientIP].locked) {
        addLog(username, 'ACCOUNT LOCKED - BRUTE FORCE DETECTED', 'error', clientIP);
        return res.status(429).json({ success: false, message: 'BRUTE FORCE DETECTED. TERMINAL LOCKED.' });
    }

    if (username === CORRECT_USER && password === CORRECT_PASS) {
        // Success
        addLog(username, 'ACCESS GRANTED', 'success', clientIP);
        // Reset attempts on success
        if (loginAttempts[clientIP]) {
            loginAttempts[clientIP].attempts = 0;
            loginAttempts[clientIP].locked = false;
        }
        return res.json({ success: true, message: 'ACCESS GRANTED' });
    } else {
        // Fail
        if (!loginAttempts[clientIP]) {
            loginAttempts[clientIP] = { attempts: 0, locked: false };
        }
        loginAttempts[clientIP].attempts++;

        failedAttempts++;
        addLog(username, `AUTH FAILED (Attempt ${loginAttempts[clientIP].attempts})`, 'info', clientIP);

        if (loginAttempts[clientIP].attempts >= MAX_ATTEMPTS) {
            loginAttempts[clientIP].locked = true;
            detectedThreats++;
            addLog(username, 'BRUTE FORCE DETECTED - LOCKED', 'error', clientIP);

            // Unlock after LOCKOUT_TIME
            setTimeout(() => {
                if (loginAttempts[clientIP]) {
                    loginAttempts[clientIP].locked = false;
                    loginAttempts[clientIP].attempts = 0;
                    addLog('SYSTEM', 'TERMINAL UNLOCKED', 'info', clientIP);
                }
            }, LOCKOUT_TIME);

            return res.status(429).json({ success: false, message: 'BRUTE FORCE DETECTED. TERMINAL LOCKED.' });
        } else {
            return res.status(401).json({ success: false, message: 'INVALID CREDENTIALS' });
        }
    }
});

app.get('/api/logs', (req, res) => {
    res.json(logs.slice(-50)); // Last 50 logs
});

app.get('/api/stats', (req, res) => {
    res.json({
        totalAttempts,
        failedAttempts,
        detectedThreats
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    addLog('SYSTEM', 'SERVER STARTED', 'info');
});
