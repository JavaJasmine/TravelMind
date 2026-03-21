import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { AppSettings } from "../types";

interface Props { dark: boolean; toggleDark: () => void; onBack: () => void; }

type Tab = "dashboard" | "api" | "users" | "account";

interface ServerUser {
  id: number; username: string; role: "admin" | "user";
  is_active: number; created_at: string; last_login: string | null;
}

// Helper to get the stored JWT token
function getToken(): string {
  try {
    const raw = localStorage.getItem("tm_token");
    if (raw) return JSON.parse(raw)?.token ?? "";
  } catch {}
  return "";
}

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export default function AdminPage({ dark, toggleDark, onBack }: Props) {
  const { user, settings, updateSettings, refreshSettings, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");

  const bg   = dark ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900";
  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const inp  = `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 ${dark ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-300 text-gray-900"}`;

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: "dashboard", label: "Dashboard",    emoji: "📊" },
    { id: "api",       label: "API Settings", emoji: "🔑" },
    { id: "users",     label: "Users",        emoji: "👥" },
    { id: "account",   label: "My Account",   emoji: "👤" },
  ];

  return (
    <div className={`min-h-screen flex flex-col ${bg}`}>
      {/* Top bar */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className={`text-sm px-3 py-1.5 rounded-lg transition ${dark ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}>
            ← Back to Chat
          </button>
          <span className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}>⚙️ Admin Panel</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleDark} className={`p-2 rounded-lg text-sm ${dark ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}>{dark ? "☀️" : "🌙"}</button>
          <button onClick={() => { logout(); }} className={`text-xs px-3 py-1.5 rounded-lg border ${dark ? "border-gray-700 text-gray-400 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>Logout</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`w-52 shrink-0 border-r p-4 space-y-1 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-3 px-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>Navigation</p>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-emerald-500 text-white"
                  : dark ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{t.emoji}</span>{t.label}
            </button>
          ))}
          <div className={`pt-4 mt-4 border-t ${dark ? "border-gray-800" : "border-gray-200"}`}>
            <p className={`text-xs px-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>Logged in as</p>
            <p className={`text-sm font-semibold px-2 mt-0.5 ${dark ? "text-gray-200" : "text-gray-800"}`}>{user?.username}</p>
            <span className="ml-2 text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">Admin</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "dashboard" && <DashboardTab dark={dark} card={card} settings={settings} />}
          {tab === "api"       && <ApiTab dark={dark} card={card} inp={inp} settings={settings} updateSettings={updateSettings} refreshSettings={refreshSettings} />}
          {tab === "users"     && <UsersTab dark={dark} card={card} inp={inp} currentUserId={user?.id ?? 0} />}
          {tab === "account"   && <AccountTab dark={dark} card={card} inp={inp} currentUser={user} />}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardTab({ dark, card, settings }: { dark: boolean; card: string; settings: AppSettings }) {
  const [stats, setStats] = useState<{ totalUsers: number; activeUsers: number; totalAdmins: number; totalChats: number } | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/stats")
      .then(d => setStats({ totalUsers: d.totalUsers, activeUsers: d.activeUsers, totalAdmins: d.totalAdmins, totalChats: d.totalChats }))
      .catch(() => {});
  }, []);

  const statCards = [
    { label: "Total Users",  value: stats?.totalUsers  ?? "…", emoji: "👥" },
    { label: "Active Users", value: stats?.activeUsers ?? "…", emoji: "✅" },
    { label: "Admin Users",  value: stats?.totalAdmins ?? "…", emoji: "🛡️" },
    { label: "API Key",      value: settings.apiKeyConfigured ? "Configured ✓" : "Not set ✗", emoji: "🔑" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Dashboard</h2>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>Overview of your TravelMind instance</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${card}`}>
            <p className="text-2xl mb-1">{s.emoji}</p>
            <p className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>{s.value}</p>
            <p className={`text-xs mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>{s.label}</p>
          </div>
        ))}
      </div>
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-semibold mb-3">🤖 AI Configuration</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className={dark ? "text-gray-400" : "text-gray-500"}>Provider:</span> <strong>{settings.provider}</strong></div>
          <div><span className={dark ? "text-gray-400" : "text-gray-500"}>Model:</span> <strong>{settings.model}</strong></div>
          <div><span className={dark ? "text-gray-400" : "text-gray-500"}>Registration:</span> <strong>{settings.allowReg ? "Open" : "Closed"}</strong></div>
          <div><span className={dark ? "text-gray-400" : "text-gray-500"}>App Name:</span> <strong>{settings.appName}</strong></div>
        </div>
      </div>
    </div>
  );
}

// ─── API Settings ─────────────────────────────────────────────────────────────
function ApiTab({ dark, card, inp, settings, updateSettings, refreshSettings }: {
  dark: boolean; card: string; inp: string;
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  refreshSettings: () => Promise<void>;
}) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel]   = useState(settings.model);
  const [provider, setProvider] = useState<AppSettings["provider"]>(settings.provider);
  const [allowReg, setAllowReg] = useState(settings.allowReg);
  const [appName, setAppName]   = useState(settings.appName);
  const [showKey, setShowKey]   = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const providers: { id: AppSettings["provider"]; name: string; emoji: string; models: string[] }[] = [
    { id: "openai",     name: "OpenAI",     emoji: "🟢", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] },
    { id: "openrouter", name: "OpenRouter", emoji: "🔀", models: ["openrouter/auto", "openrouter/hunter-alpha", "anthropic/claude-3.5-sonnet", "google/gemini-pro-1.5"] },
    { id: "deepseek",   name: "DeepSeek",   emoji: "🔵", models: ["deepseek-chat", "deepseek-reasoner"] },
    { id: "gemini",     name: "Gemini",     emoji: "🔷", models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"] },
  ];

  const label = `block text-xs font-semibold mb-1.5 ${dark ? "text-gray-400" : "text-gray-600"}`;

  const save = async () => {
    setError(null);
    try {
      const payload: Record<string, string> = { ai_model: model, ai_provider: provider, app_name: appName, allow_registration: String(allowReg) };
      if (apiKey) payload.api_key = apiKey;
      await adminFetch("/api/admin/settings", { method: "POST", body: JSON.stringify({ settings: payload }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await refreshSettings();
      // Update local settings state too
      updateSettings({ model, provider, appName, allowReg });
      setApiKey(""); // clear after save for security
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold mb-1">API & AI Settings</h2>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>Configure your AI provider and model. Settings are saved to the server.</p>
      </div>

      {/* Current key status */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${card}`}>
        <span className="text-2xl">{settings.apiKeyConfigured ? "✅" : "⚠️"}</span>
        <div>
          <p className="font-semibold text-sm">{settings.apiKeyConfigured ? "API key is configured on the server" : "No API key configured"}</p>
          <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>{settings.apiKeyConfigured ? "All users can use Travel AI." : "Enter and save an API key below."}</p>
        </div>
      </div>

      {/* Provider */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-semibold mb-4">🤖 AI Provider</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {providers.map(pv => (
            <button
              key={pv.id}
              onClick={() => { setProvider(pv.id); setModel(pv.models[0]); }}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                provider === pv.id
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                  : dark ? "border-gray-700 text-gray-300 hover:border-gray-600" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <span>{pv.emoji}</span>{pv.name}
              {provider === pv.id && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className={label}>🔑 API Key {settings.apiKeyConfigured ? "(leave blank to keep existing)" : "(required)"}</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={settings.apiKeyConfigured ? "Paste new key to replace existing…" : "Paste your API key here…"}
                className={inp}
              />
              <button type="button" onClick={() => setShowKey(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            {apiKey && <p className="text-xs text-emerald-500 mt-1">✓ New API key ready to save</p>}
          </div>

          <div>
            <label className={label}>🧠 Model</label>
            <select className={inp} value={model} onChange={e => setModel(e.target.value)}>
              {(providers.find(p => p.id === provider)?.models ?? []).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* App Settings */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-semibold mb-4">⚙️ App Settings</h3>
        <div className="space-y-4">
          <div>
            <label className={label}>App Name</label>
            <input className={inp} value={appName} onChange={e => setAppName(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Allow User Registration</p>
              <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>Allow new users to create accounts</p>
            </div>
            <button
              onClick={() => setAllowReg(r => !r)}
              className={`relative w-12 h-6 rounded-full transition-colors ${allowReg ? "bg-emerald-500" : dark ? "bg-gray-700" : "bg-gray-300"}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${allowReg ? "translate-x-7" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        onClick={save}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-colors shadow ${saved ? "bg-green-500 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"}`}
      >
        {saved ? "✓ Settings Saved!" : "Save Settings"}
      </button>
    </div>
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────
function UsersTab({ dark, card, inp, currentUserId }: { dark: boolean; card: string; inp: string; currentUserId: number }) {
  const [users, setUsers] = useState<ServerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newU, setNewU]   = useState({ username: "", password: "", role: "user" as "admin" | "user" });
  const [err, setErr]     = useState<string | null>(null);
  const [resetId, setResetId] = useState<number | null>(null);
  const [newPw, setNewPw] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    adminFetch("/api/admin/users").then(d => setUsers(d.users)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addUser = async () => {
    setErr(null);
    try {
      await adminFetch("/api/admin/users", { method: "POST", body: JSON.stringify({ username: newU.username.trim(), password: newU.password, role: newU.role }) });
      setNewU({ username: "", password: "", role: "user" });
      refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to create user"); }
  };

  const label = `block text-xs font-semibold mb-1 ${dark ? "text-gray-400" : "text-gray-600"}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold mb-1">User Management</h2>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>{users.length} user{users.length !== 1 ? "s" : ""} total</p>
      </div>

      {/* Add user */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-semibold mb-4">➕ Add New User</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Username</label>
            <input className={inp} placeholder="username" value={newU.username} onChange={e => setNewU(n => ({ ...n, username: e.target.value }))} />
          </div>
          <div>
            <label className={label}>Password</label>
            <input className={inp} type="password" placeholder="password" value={newU.password} onChange={e => setNewU(n => ({ ...n, password: e.target.value }))} />
          </div>
          <div>
            <label className={label}>Role</label>
            <select className={inp} value={newU.role} onChange={e => setNewU(n => ({ ...n, role: e.target.value as "admin" | "user" }))}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={addUser} className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors">
              Add User
            </button>
          </div>
        </div>
        {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
      </div>

      {/* User list */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        {loading ? (
          <p className="p-4 text-sm text-gray-400">Loading users…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-xs font-semibold uppercase tracking-wider border-b ${dark ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.username}{u.id === currentUserId && <span className="ml-1 text-xs text-emerald-500">(you)</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"}`}>
                      {u.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => { setResetId(u.id); setNewPw(""); }}
                        className={`text-xs px-2 py-1 rounded ${dark ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
                      >
                        Reset PW
                      </button>
                      {u.id !== currentUserId && (
                        <>
                          <button
                            onClick={() => adminFetch(`/api/admin/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !u.is_active }) }).then(refresh)}
                            className={`text-xs px-2 py-1 rounded ${u.is_active ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"}`}
                          >
                            {u.is_active ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete user "${u.username}"?`)) adminFetch(`/api/admin/users/${u.id}`, { method: "DELETE" }).then(refresh); }}
                            className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reset password modal */}
      {resetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className={`rounded-2xl p-6 w-80 shadow-2xl ${dark ? "bg-gray-900" : "bg-white"}`}>
            <h3 className="font-bold mb-4">🔒 Reset Password</h3>
            <input
              className={inp} type="password" placeholder="New password (min 6 chars)"
              value={newPw} onChange={e => setNewPw(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setResetId(null)} className={`flex-1 py-2 rounded-lg text-sm border ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>Cancel</button>
              <button
                onClick={async () => {
                  if (newPw.length < 6) { alert("Password must be at least 6 characters."); return; }
                  try {
                    await adminFetch(`/api/admin/users/${resetId}`, { method: "PATCH", body: JSON.stringify({ password: newPw }) });
                    setResetId(null);
                    alert("Password reset successfully!");
                  } catch (e) { alert(e instanceof Error ? e.message : "Failed to reset password"); }
                }}
                className="flex-1 py-2 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Account ──────────────────────────────────────────────────────────────────
function AccountTab({ dark, card, inp, currentUser }: {
  dark: boolean; card: string; inp: string;
  currentUser: { id: number; username: string; role: string } | null;
}) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg]     = useState<{ type: "success" | "error"; text: string } | null>(null);

  const change = async () => {
    if (!oldPw || !newPw) { setMsg({ type: "error", text: "Please fill in both fields." }); return; }
    if (newPw.length < 6) { setMsg({ type: "error", text: "New password must be at least 6 chars." }); return; }
    try {
      await adminFetch("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: oldPw, newPassword: newPw }) });
      setMsg({ type: "success", text: "Password changed successfully!" });
      setOldPw(""); setNewPw("");
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Failed to change password" }); }
  };

  const label = `block text-xs font-semibold mb-1.5 ${dark ? "text-gray-400" : "text-gray-600"}`;

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h2 className="text-xl font-bold mb-1">My Account</h2>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>Manage your profile</p>
      </div>
      <div className={`rounded-xl border p-5 ${card}`}>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-2xl font-bold">
            {currentUser?.username?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div>
            <p className="font-bold text-lg">{currentUser?.username}</p>
            <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">{currentUser?.role}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className={label}>Current Password</label>
            <input type="password" className={inp} value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="Enter current password" />
          </div>
          <div>
            <label className={label}>New Password</label>
            <input type="password" className={inp} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Enter new password (min 6 chars)" />
          </div>
          {msg && (
            <div className={`text-sm px-3 py-2 rounded-lg ${msg.type === "success" ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"}`}>
              {msg.text}
            </div>
          )}
          <button onClick={change} className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-colors">
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
}
