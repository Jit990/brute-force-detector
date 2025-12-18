// server.js
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';
import rateLimitMiddleware from './middleware/rateLimit.js';

dotenv.config();

// Connect to MongoDB
await connectDB();

const app = express();

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimitMiddleware);

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static front‑end files (index.html, style.css, script.js)
app.use(express.static(__dirname));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
