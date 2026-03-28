# 🌍 TravelMind — AI Travel Copilot & Historical Guide

A full-stack, hostable AI travel planning application with user authentication, admin panel, and secure API key management.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Build the frontend
npm run build

# 3. Start the server
node server.js
```

Open → **http://localhost:3000**

Default admin login: `admin` / `admin123`  
⚠️ **Change the password immediately after first login!**

---

## 🏗️ Architecture

```
travelmind/
├── server.js          ← Express backend (auth + AI proxy + DB)
├── travelmind.db      ← SQLite database (auto-created on first run)
├── dist/              ← Built React frontend (served by Express)
├── src/
│   ├── App.tsx        ← Main app with auth routing
│   ├── api.ts         ← Frontend API client (calls /api/chat)
│   ├── context/
│   │   └── AuthContext.tsx  ← JWT auth context
│   ├── pages/
│   │   ├── LoginPage.tsx    ← Login + Register
│   │   └── AdminPage.tsx    ← Admin panel
│   └── components/    ← Chat UI components
└── .env.example       ← Environment variable template
```

---

## 🔐 Security Model

- **API keys are NEVER exposed to the browser** — stored in SQLite on the server
- All AI requests are **proxied through `/api/chat`** — authenticated with JWT
- Passwords are **bcrypt-hashed** (12 rounds)
- JWT tokens expire after **7 days**

---

## ⚙️ Admin Panel

Log in as admin → click the **🛡️ Admin** button in the header.

**Dashboard** — User stats, activity log, API key status  
**API & Settings** — Set API key, choose AI model, toggle registration  
**Users** — Create/delete users, toggle admin roles  
**My Account** — Change your admin password  

### Supported AI Providers

| Model | Provider | API Key Format |
|-------|----------|----------------|
| `gpt-4o` | OpenAI | `sk-...` |
| `gpt-4o-mini` | OpenAI | `sk-...` |
| `openrouter/hunter-alpha` | OpenRouter | `sk-or-...` |
| `deepseek-chat` | DeepSeek | `sk-...` |

---

## 🌐 Hosting Guide

### Option A: VPS (Ubuntu/Debian)

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone + setup
git clone <your-repo> travelmind
cd travelmind
npm install
npm run build

# Set environment variables
cp .env.example .env
nano .env  # Set PORT and JWT_SECRET

# Run with PM2 (process manager)
npm install -g pm2
pm2 start server.js --name travelmind
pm2 save
pm2 startup
```

### Option B: Railway / Render / Fly.io

1. Push to GitHub
2. Connect repo to Railway/Render
3. Set environment variables: `PORT`, `JWT_SECRET`
4. Build command: `npm run build`
5. Start command: `node server.js`

### Option C: Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "server.js"]
```

### Nginx Reverse Proxy (optional)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        # Important for SSE streaming:
        proxy_buffering off;
        proxy_cache off;
    }
}
```

---

## 📋 API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/login` | None | Login |
| POST | `/api/auth/register` | None | Register |
| GET | `/api/auth/me` | JWT | Get current user |
| POST | `/api/auth/change-password` | JWT | Change password |
| POST | `/api/chat` | JWT | AI chat (proxied) |
| GET | `/api/admin/settings` | Admin | Get settings |
| POST | `/api/admin/settings` | Admin | Update settings |
| GET | `/api/admin/users` | Admin | List users |
| POST | `/api/admin/users` | Admin | Create user |
| DELETE | `/api/admin/users/:id` | Admin | Delete user |
| PATCH | `/api/admin/users/:id` | Admin | Update user role |
| GET | `/api/admin/stats` | Admin | Dashboard stats |

---

## 🗄️ Database Schema

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',  -- 'user' or 'admin'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Settings table (key-value store)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Keys: api_key, ai_model, app_name, allow_registration

-- Activity log
CREATE TABLE sessions_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT,
  ip TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 👨‍💻 Contribution

- Improved documentation and UI
- Enhanced system understanding and features
