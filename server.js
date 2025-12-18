
// server.js
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

// MongoDB connection
await mongoose.connect(process.env.MONGO_URI);

// Schemas
const attemptSchema = new mongoose.Schema({
  user: String,
  ip: String,
  ua: String,
  success: Boolean,
  reason: String,
  enteredPassword: String,
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  username: String,
  passwordHash: String,
  roles: [String],
  failedCount: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
});

const Attempt = mongoose.model('Attempt', attemptSchema);
const User = mongoose.model('User', userSchema);

// Seed admin
const adminExists = await User.findOne({ username: 'admin' });
if (!adminExists) {
  const hash = await bcrypt.hash('admin9907', 12);
  await User.create({ username: 'admin', passwordHash: hash, roles: ['admin'] });
}

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(__dirname));

// Login route
app.post('/api/auth/login', async (req, res) => {
  const { user, password } = req.body;
  const ip = req.ip;
  const ua = req.headers['user-agent'] || '';

  const account = await User.findOne({ username: user });
  if (!account) {
    await Attempt.create({ user, ip, ua, success: false, reason: 'Unknown user', enteredPassword: password });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (account.lockUntil && account.lockUntil > new Date()) {
    await Attempt.create({ user, ip, ua, success: false, reason: 'Account locked', enteredPassword: password });
    return res.status(429).json({ error: 'Account temporarily locked' });
  }

  const ok = await bcrypt.compare(password, account.passwordHash);
  if (!ok) {
    account.failedCount += 1;
    if (account.failedCount >= 4) {
      account.lockUntil = new Date(Date.now() + 20 * 60 * 1000);
    }
    await account.save();
    await Attempt.create({ user, ip, ua, success: false, reason: 'Invalid password', enteredPassword: password });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Success
  account.failedCount = 0;
  account.lockUntil = null;
  await account.save();
  await Attempt.create({ user, ip, ua, success: true, reason: 'Login success' });

  const token = jwt.sign({ sub: account._id, username: account.username, roles: account.roles }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
});

// Admin routes
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.roles.includes('admin')) return res.status(403).json({ error: 'Forbidden' });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/api/admin/attempts', requireAdmin, async (req, res) => {
  const items = await Attempt.find().sort({ createdAt: -1 }).limit(50).lean();
  res.json({ items });
});

app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
  const totalAttempts = await Attempt.countDocuments();
  const successes = await Attempt.countDocuments({ success: true });
  const failures = await Attempt.countDocuments({ success: false });
  res.json({ totalAttempts, successes, failures });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
