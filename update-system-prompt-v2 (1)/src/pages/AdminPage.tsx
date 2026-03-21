import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { StoredUser, AppSettings } from "../types";

interface Props { dark: boolean; toggleDark: () => void; onBack: () => void; }

type Tab = "dashboard" | "api" | "users" | "account";

export default function AdminPage({ dark, toggleDark, onBack }: Props) {
  const { user, settings, updateSettings, getAllUsers, createUser, deleteUser, toggleActive, resetPassword, logout } = useAuth();
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
          {tab === "dashboard" && <DashboardTab dark={dark} card={card} getAllUsers={getAllUsers} settings={settings} />}
          {tab === "api"       && <ApiTab dark={dark} card={card} inp={inp} settings={settings} updateSettings={updateSettings} />}
          {tab === "users"     && <UsersTab dark={dark} card={card} inp={inp} getAllUsers={getAllUsers} createUser={createUser} deleteUser={deleteUser} toggleActive={toggleActive} resetPassword={resetPassword} currentUserId={user?.id ?? 0} />}
          {tab === "account"   && <AccountTab dark={dark} card={card} inp={inp} currentUser={user} resetPassword={resetPassword} />}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardTab({ dark, card, getAllUsers, settings }: { dark: boolean; card: string; getAllUsers: () => StoredUser[]; settings: AppSettings }) {
  const users = getAllUsers();
  const stats = [
    { label: "Total Users", value: users.length, emoji: "👥" },
    { label: "Active Users", value: users.filter(u => u.active).length, emoji: "✅" },
    { label: "Admin Users", value: users.filter(u => u.role === "admin").length, emoji: "🛡️" },
    { label: "API Key", value: settings.apiKey ? "Configured ✓" : "Not set ✗", emoji: "🔑" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Dashboard</h2>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>Overview of your TravelMind instance</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
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
function ApiTab({ dark, card, inp, settings, updateSettings }: { dark: boolean; card: string; inp: string; settings: AppSettings; updateSettings: (s: Partial<AppSettings>) => void }) {
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const save = () => {
    updateSettings(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const providers: { id: AppSettings["provider"]; name: string; emoji: string; models: string[] }[] = [
    { id: "openai",      name: "OpenAI",      emoji: "🟢", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] },
    { id: "openrouter",  name: "OpenRouter",  emoji: "🔀", models: ["openrouter/auto", "openrouter/hunter-alpha", "anthropic/claude-3.5-sonnet", "google/gemini-pro-1.5"] },
    { id: "deepseek",    name: "DeepSeek",    emoji: "🔵", models: ["deepseek-chat", "deepseek-reasoner"] },
    { id: "gemini",      name: "Gemini",      emoji: "🔷", models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"] },
  ];

  const label = `block text-xs font-semibold mb-1.5 ${dark ? "text-gray-400" : "text-gray-600"}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold mb-1">API & AI Settings</h2>
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>Configure your AI provider and model</p>
      </div>

      {/* Provider */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-semibold mb-4">🤖 AI Provider</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {providers.map(pv => (
            <button
              key={pv.id}
              onClick={() => {
                const defaultModel = pv.models[0];
                setLocal(l => ({ ...l, provider: pv.id, model: defaultModel }));
              }}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                local.provider === pv.id
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                  : dark ? "border-gray-700 text-gray-300 hover:border-gray-600" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <span>{pv.emoji}</span>{pv.name}
              {local.provider === pv.id && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className={label}>🔑 API Key</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={local.apiKey}
                onChange={e => setLocal(l => ({ ...l, apiKey: e.target.value }))}
                placeholder="Paste your API key here..."
                className={inp}
              />
              <button
                type="button"
                onClick={() => setShowKey(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            {local.apiKey && <p className="text-xs text-emerald-500 mt-1">✓ API key entered</p>}
          </div>

          <div>
            <label className={label}>🧠 Model</label>
            <select className={inp} value={local.model} onChange={e => setLocal(l => ({ ...l, model: e.target.value }))}>
              {(providers.find(p => p.id === local.provider)?.models ?? []).map(m => (
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
            <input className={inp} value={local.appName} onChange={e => setLocal(l => ({ ...l, appName: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Allow User Registration</p>
              <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>Allow new users to create accounts</p>
            </div>
            <button
              onClick={() => setLocal(l => ({ ...l, allowReg: !l.allowReg }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${local.allowReg ? "bg-emerald-500" : dark ? "bg-gray-700" : "bg-gray-300"}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${local.allowReg ? "translate-x-7" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
      </div>

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
function UsersTab({ dark, card, inp, getAllUsers, createUser, deleteUser, toggleActive, resetPassword, currentUserId }: {
  dark: boolean; card: string; inp: string;
  getAllUsers: () => StoredUser[];
  createUser: (u: string, p: string, r: "admin" | "user") => string | null;
  deleteUser: (id: number) => void;
  toggleActive: (id: number) => void;
  resetPassword: (id: number, pw: string) => void;
  currentUserId: number;
}) {
  const [users, setUsers] = useState<StoredUser[]>(() => getAllUsers());
  const [newU, setNewU]   = useState({ username: "", password: "", role: "user" as "admin" | "user" });
  const [err, setErr]     = useState<string | null>(null);
  const [resetId, setResetId] = useState<number | null>(null);
  const [newPw, setNewPw] = useState("");

  const refresh = () => setUsers(getAllUsers());

  const addUser = () => {
    setErr(null);
    const e = createUser(newU.username.trim(), newU.password, newU.role);
    if (e) { setErr(e); return; }
    setNewU({ username: "", password: "", role: "user" });
    refresh();
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
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.active ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"}`}>
                    {u.active ? "Active" : "Disabled"}
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
                          onClick={() => { toggleActive(u.id); refresh(); }}
                          className={`text-xs px-2 py-1 rounded ${u.active ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"}`}
                        >
                          {u.active ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete user "${u.username}"?`)) { deleteUser(u.id); refresh(); } }}
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
      </div>

      {/* Reset password modal */}
      {resetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className={`rounded-2xl p-6 w-80 shadow-2xl ${dark ? "bg-gray-900" : "bg-white"}`}>
            <h3 className="font-bold mb-4">🔒 Reset Password</h3>
            <input
              className={inp}
              type="password"
              placeholder="New password (min 6 chars)"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setResetId(null)} className={`flex-1 py-2 rounded-lg text-sm border ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>Cancel</button>
              <button
                onClick={() => {
                  if (newPw.length < 6) { alert("Password must be at least 6 characters."); return; }
                  resetPassword(resetId, newPw);
                  setResetId(null);
                  alert("Password reset successfully!");
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
function AccountTab({ dark, card, inp, currentUser, resetPassword }: {
  dark: boolean; card: string; inp: string;
  currentUser: { id: number; username: string; role: string } | null;
  resetPassword: (id: number, pw: string) => void;
}) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg]     = useState<{ type: "success" | "error"; text: string } | null>(null);

  const change = () => {
    if (!oldPw || !newPw) { setMsg({ type: "error", text: "Please fill in both fields." }); return; }
    if (newPw.length < 6) { setMsg({ type: "error", text: "New password must be at least 6 chars." }); return; }
    if (currentUser) resetPassword(currentUser.id, newPw);
    setMsg({ type: "success", text: "Password changed successfully!" });
    setOldPw(""); setNewPw("");
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
