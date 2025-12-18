const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev')); // Logging requests
app.use(express.json());
app.use(express.static(path.join(__dirname, './'))); // Serve static files (HTML, CSS, JS)

// Mock Backend for Login (Can be extended for real database auth)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    console.log(`[LOGIN ATTEMPT] User: ${username} | IP: ${clientIP}`);

    // In a real app, you'd check a database here
    if (username === "admin" && password === "admin123") {
        return res.status(200).json({
            success: true,
            message: "Authentication successful.",
            token: "JWT_MOCK_TOKEN_93842"
        });
    } else {
        return res.status(401).json({
            success: false,
            message: "Invalid credentials."
        });
    }
});

// Logs endpoint (simulated)
app.get('/api/logs', (req, res) => {
    res.json({
        status: "active",
        monitoring: true,
        uptime: process.uptime()
    });
});

app.listen(PORT, () => {
    console.log(`
    =============================================
    🚀 CYBER-SENTINEL BACKEND ONLINE
    📡 Server running on http://localhost:${PORT}
    🛠  Mode: Development / Advanced Simulation
    =============================================
    `);
});
