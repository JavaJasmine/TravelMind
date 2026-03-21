/**
 * TravelMind — Express Backend v2.0
 * ─────────────────────────────────
 * ✅ Auth (JWT, bcrypt)
 * ✅ SQLite database (WAL mode)
 * ✅ AI proxy — key never exposed to browser
 * ✅ Multi-provider: OpenAI, OpenRouter, DeepSeek, Gemini
 * ✅ Rate limiting
 * ✅ Activity logging
 * ✅ Serves React dist/
 *
 * Start: node server.js
 * Env:   PORT, JWT_SECRET
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── CONFIG ──────────────────────────────────────────────────────────────────
const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'travelmind_jwt_change_in_production_2024!';
const DB_PATH    = process.env.DB_PATH || path.join(__dirname, 'travelmind.db');

// ── DATABASE ─────────────────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user',
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login    DATETIME
  );

  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    username   TEXT,
    action     TEXT,
    detail     TEXT,
    ip         TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS chat_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    username   TEXT,
    message    TEXT,
    tokens_est INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );
`);

// ── SEED DEFAULTS ────────────────────────────────────────────────────────────
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  const hash = bcrypt.hashSync('admin123', 12);
  db.prepare(`INSERT INTO users (username, password_hash, role) VALUES ('admin', ?, 'admin')`).run(hash);
  console.log('✅ Default admin: username=admin  password=admin123');
  console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
}

const defaults = [
  ['api_key',            ''],
  ['ai_model',           'gpt-4o'],
  ['ai_provider',        'openai'],
  ['app_name',           'TravelMind'],
  ['allow_registration', 'true'],
  ['max_tokens',         '4096'],
  ['temperature',        '0.7'],
  ['system_prompt_extra',''],
];
const upsertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
for (const [k, v] of defaults) upsertSetting.run(k, v);

// ── HELPERS ──────────────────────────────────────────────────────────────────
const getSetting = (key) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
};

const setSetting = (key, value) => {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(key, String(value));
};

const signToken = (user) =>
  jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

const verifyToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

const logActivity = (userId, username, action, detail = '', ip = '') => {
  try {
    db.prepare(`INSERT INTO activity_log (user_id, username, action, detail, ip) VALUES (?, ?, ?, ?, ?)`)
      .run(userId ?? null, username ?? 'system', action, detail, ip);
  } catch { /* non-critical */ }
};

const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

// Simple in-memory rate limiter for /api/chat
const rateLimitMap = new Map();
const rateLimit = (windowMs, maxReq) => (req, res, next) => {
  const key = `${req.user?.id}_${getClientIp(req)}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count++;
  rateLimitMap.set(key, entry);
  if (entry.count > maxReq) {
    return res.status(429).json({ error: `Too many requests. Please wait ${Math.ceil(windowMs / 1000 / 60)} minute(s).` });
  }
  next();
};

// ── EXPRESS ──────────────────────────────────────────────────────────────────
const app = express();

// Trust proxy (for correct IP behind Nginx / Railway / Render)
app.set('trust proxy', 1);

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle CORS preflight
app.options('*', cors());

app.use(express.json({ limit: '20mb' }));

// ── AUTH ROUTES ───────────────────────────────────────────────────────────────

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid username or password' });

  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
  logActivity(user.id, user.username, 'login', '', getClientIp(req));

  res.json({ token: signToken(user), user: { id: user.id, username: user.username, role: user.role } });
});

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  if (getSetting('allow_registration') !== 'true')
    return res.status(403).json({ error: 'Registration is currently disabled by the administrator.' });

  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 3 || username.length > 30) return res.status(400).json({ error: 'Username must be 3–30 characters' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return res.status(400).json({ error: 'Username can only contain letters, numbers, . _ -' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'user')`).run(username.trim(), hash);
  const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  logActivity(newUser.id, newUser.username, 'register', '', getClientIp(req));

  res.status(201).json({ token: signToken(newUser), user: { id: newUser.id, username: newUser.username, role: newUser.role } });
});

// GET /api/auth/me
app.get('/api/auth/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id, username, role, created_at, last_login FROM users WHERE id = ? AND is_active = 1').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', verifyToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash))
    return res.status(401).json({ error: 'Current password is incorrect' });

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 12), req.user.id);
  logActivity(req.user.id, user.username, 'change_password', '', getClientIp(req));
  res.json({ success: true });
});

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────────

// GET /api/admin/stats
app.get('/api/admin/stats', verifyToken, requireAdmin, (req, res) => {
  const totalUsers   = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  const activeUsers  = db.prepare("SELECT COUNT(*) as c FROM users WHERE is_active = 1").get().c;
  const totalAdmins  = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='admin'").get().c;
  const totalChats   = db.prepare("SELECT COUNT(*) as c FROM chat_log").get().c;
  const recentActivity = db.prepare(`
    SELECT username, action, detail, created_at FROM activity_log
    ORDER BY created_at DESC LIMIT 20
  `).all();
  const apiKeySet = Boolean(getSetting('api_key'));
  const model     = getSetting('ai_model');
  const provider  = getSetting('ai_provider');

  res.json({ totalUsers, activeUsers, totalAdmins, totalChats, recentActivity, apiKeySet, model, provider });
});

// GET /api/admin/settings
app.get('/api/admin/settings', verifyToken, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT key, value, updated_at FROM settings ORDER BY key').all();
  const masked = rows.map(r => {
    if (r.key === 'api_key' && r.value.length > 8) {
      return { ...r, value: '••••••••' + r.value.slice(-6), _masked: true };
    }
    return r;
  });
  res.json({ settings: masked });
});

// POST /api/admin/settings
app.post('/api/admin/settings', verifyToken, requireAdmin, (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object')
    return res.status(400).json({ error: 'Settings object required' });

  const allowed = ['api_key', 'ai_model', 'ai_provider', 'app_name', 'allow_registration', 'max_tokens', 'temperature', 'system_prompt_extra'];
  for (const [key, value] of Object.entries(settings)) {
    if (!allowed.includes(key)) continue;
    if (key === 'api_key' && String(value).startsWith('••')) continue; // don't overwrite with masked
    setSetting(key, String(value));
  }

  logActivity(req.user.id, req.user.username, 'update_settings', JSON.stringify(Object.keys(settings)), getClientIp(req));
  res.json({ success: true });
});

// GET /api/admin/users
app.get('/api/admin/users', verifyToken, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, role, is_active, created_at, last_login FROM users ORDER BY created_at DESC
  `).all();
  res.json({ users });
});

// POST /api/admin/users — create
app.post('/api/admin/users', verifyToken, requireAdmin, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`)
    .run(username.trim(), hash, role === 'admin' ? 'admin' : 'user');

  logActivity(req.user.id, req.user.username, 'create_user', username, getClientIp(req));
  res.status(201).json({ id: result.lastInsertRowid, success: true });
});

// DELETE /api/admin/users/:id
app.delete('/api/admin/users/:id', verifyToken, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  const u = db.prepare('SELECT username FROM users WHERE id = ?').get(id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  logActivity(req.user.id, req.user.username, 'delete_user', u.username, getClientIp(req));
  res.json({ success: true });
});

// PATCH /api/admin/users/:id — update role / password / status
app.patch('/api/admin/users/:id', verifyToken, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { role, password, is_active } = req.body;

  if (role !== undefined) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role === 'admin' ? 'admin' : 'user', id);
  }
  if (password !== undefined) {
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 12), id);
  }
  if (is_active !== undefined) {
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, id);
  }

  const u = db.prepare('SELECT username FROM users WHERE id = ?').get(id);
  logActivity(req.user.id, req.user.username, 'update_user', u?.username ?? id, getClientIp(req));
  res.json({ success: true });
});

// GET /api/admin/logs
app.get('/api/admin/logs', verifyToken, requireAdmin, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const logs = db.prepare(`
    SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM activity_log').get().c;
  res.json({ logs, total });
});

// GET /api/admin/chat-logs
app.get('/api/admin/chat-logs', verifyToken, requireAdmin, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const logs = db.prepare(`
    SELECT * FROM chat_log ORDER BY created_at DESC LIMIT ?
  `).all(limit);
  res.json({ logs });
});

// ── AI PROXY ─────────────────────────────────────────────────────────────────
// The API key is NEVER sent to the browser. All AI calls go through here.

app.post('/api/chat', verifyToken, rateLimit(60_000, 30), async (req, res) => {
  const apiKey  = getSetting('api_key');
  const model   = getSetting('ai_model') || 'gpt-4o';
  const provider = getSetting('ai_provider') || 'openai';
  const maxTok  = parseInt(getSetting('max_tokens') || '4096');
  const temp    = parseFloat(getSetting('temperature') || '0.7');

  if (!apiKey) {
    return res.status(503).json({
      error: 'No API key configured. Ask your administrator to set the API key in the Admin Panel → API & Settings.',
    });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages))
    return res.status(400).json({ error: 'messages array required' });

  // Log the user message (non-blocking)
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  if (lastUserMsg) {
    try {
      db.prepare(`INSERT INTO chat_log (user_id, username, message, tokens_est) VALUES (?, ?, ?, ?)`)
        .run(req.user.id, req.user.username, lastUserMsg.content.slice(0, 500), Math.ceil(lastUserMsg.content.length / 4));
    } catch { /* non-critical */ }
  }

  // Build request based on provider
  let url, headers, body;

  if (provider === 'gemini' || model.startsWith('gemini')) {
    // Google Gemini
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    headers = { 'Content-Type': 'application/json' };

    const sysMsg = messages.find(m => m.role === 'system');
    const chatMsgs = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    body = {
      contents: chatMsgs,
      generationConfig: { temperature: temp, maxOutputTokens: maxTok },
      ...(sysMsg ? { systemInstruction: { parts: [{ text: sysMsg.content }] } } : {}),
    };
  } else if (provider === 'openrouter' || model.startsWith('openrouter/') || model.includes('/')) {
    // OpenRouter
    url = 'https://openrouter.ai/api/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://travelmind.app',
      'X-Title': 'TravelMind AI Travel Copilot',
    };
    body = { model, messages, stream: true, temperature: temp, max_tokens: maxTok };
  } else if (provider === 'deepseek' || model.startsWith('deepseek')) {
    // DeepSeek
    url = 'https://api.deepseek.com/chat/completions';
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    body = { model, messages, stream: true, temperature: temp, max_tokens: maxTok };
  } else {
    // OpenAI (default)
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    body = { model, messages, stream: true, temperature: temp, max_tokens: maxTok };
  }

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      let errText = upstream.statusText;
      try {
        const j = await upstream.json();
        errText = j?.error?.message ?? j?.error ?? errText;
      } catch { /* ignore */ }

      const statusMap = {
        401: 'Invalid API key. Please check your key in Admin → API & Settings.',
        403: 'API key does not have permission for this model.',
        402: 'API credits exhausted. Please top up your balance.',
        429: 'Rate limit reached. Please try again in a moment.',
        503: 'AI provider is temporarily unavailable. Try again shortly.',
      };
      return res.status(upstream.status).json({ error: statusMap[upstream.status] || errText });
    }

    // Stream SSE response through to client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    } finally {
      res.end();
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error connecting to AI provider.' });
    }
  }
});

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    uptime: Math.round(process.uptime()),
    apiKeyConfigured: Boolean(getSetting('api_key')),
    model: getSetting('ai_model'),
    provider: getSetting('ai_provider'),
  });
});

// ── 404 FOR UNKNOWN API ROUTES (must be before static / catch-all) ────────────
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return;
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── SERVE REACT ───────────────────────────────────────────────────────────────
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath, { maxAge: '0', etag: false }));

// SPA fallback — only for non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  const indexFile = path.join(distPath, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      res.status(500).send('Server error: could not load app. Make sure to run `npm run build` first.');
    }
  });
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  🌍  TravelMind Server v2.0');
  console.log(`  ➜   http://localhost:${PORT}`);
  console.log('');
  console.log('  Admin: username=admin  password=admin123');
  console.log('  ⚠️   Change the admin password immediately!');
  console.log('');
});
