import express from 'express';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

// MongoDB
await mongoose.connect(process.env.MONGO_URI);
mongoose.set('strictQuery', true);

// Models
const attemptSchema = new mongoose.Schema({
  user: String,
  ip: String,
  ua: String,
  success: Boolean,
  reason: String,
  enteredPassword: String
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, index: true },
  passwordHash: String,
  roles: { type: [String], default: ['user'] },
  isBlocked: { type: Boolean, default: false },
  failedCount: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null }
}, { timestamps: true });

const Attempt = mongoose.model('Attempt', attemptSchema);
const User = mongoose.model('User', userSchema);

// Seed admin
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin9907';
const admin = await User.findOne({ username: ADMIN_USER });
if (!admin) {
  const hash = await bcrypt.hash(ADMIN_PASS, 12);
  await User.create({ username: ADMIN_USER, passwordHash: hash, roles: ['admin'] });
}

// App
const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(__dirname));

// Auth helpers
function signToken(user) {
  return jwt.sign({ sub: user._id, username: user.username, roles: user.roles }, process.env.JWT_SECRET, { expiresIn: '2h' });
}
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
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Brute-force thresholds
const MAX_FAILS = 4;
const ACCOUNT_LOCK_MS = 20 * 60 * 1000;

// Routes: login
app.post('/api/auth/login', async (req, res) => {
  const { user, password } = req.body;
  const ip = req.ip;
  const ua = req.headers['user-agent'] || '';

  const account = await User.findOne({ username: user });
  if (!account) {
    await Attempt.create({ user, ip, ua, success: false, reason: 'Unknown user', enteredPassword: password });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (account.isBlocked) {
    await Attempt.create({ user, ip, ua, success: false, reason: 'User blocked', enteredPassword: password });
    return res.status(403).json({ error: 'Account blocked' });
  }

  if (account.lockUntil && account.lockUntil > new Date()) {
    await Attempt.create({ user, ip, ua, success: false, reason: 'Account locked', enteredPassword: password });
    return res.status(429).json({ error: 'Account temporarily locked' });
  }

  const ok = await bcrypt.compare(password, account.passwordHash);
  if (!ok) {
    account.failedCount += 1;
    let reason = 'Invalid password';
    if (account.failedCount >= MAX_FAILS) {
      account.lockUntil = new Date(Date.now() + ACCOUNT_LOCK_MS);
      reason = 'Invalid password (lock applied)';
    }
    await account.save();
    await Attempt.create({ user, ip, ua, success: false, reason, enteredPassword: password });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  account.failedCount = 0;
  account.lockUntil = null;
  await account.save();
  await Attempt.create({ user, ip, ua, success: true, reason: 'Login success' });

  const token = signToken(account);
  res.json({ token });
});

// Admin: attempts
app.get('/api/admin/attempts', requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
  const items = await Attempt.find().sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ items });
});

// Admin: analytics
app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
  const totalAttempts = await Attempt.countDocuments();
  const successes = await Attempt.countDocuments({ success: true });
  const failures = await Attempt.countDocuments({ success: false });
  res.json({ totalAttempts, successes, failures });
});

// Admin: block/unblock
app.post('/api/admin/users/block', requireAdmin, async (req, res) => {
  const { username, block } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.isBlocked = !!block;
  await user.save();
  res.json({ username: user.username, isBlocked: user.isBlocked });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
