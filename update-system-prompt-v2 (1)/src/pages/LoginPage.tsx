import { useState } from "react";
import { useAuth } from "../context/AuthContext";

interface Props { dark: boolean; }

export default function LoginPage({ dark }: Props) {
  const { login, register, settings } = useAuth();
  const [tab, setTab]       = useState<"login" | "register">("login");
  const [username, setUser] = useState("");
  const [password, setPass] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoad]  = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    setLoad(true); setError(null);
    try {
      const err = tab === "login" ? login(username.trim(), password) : register(username.trim(), password);
      if (err) setError(err);
    } finally { setLoad(false); }
  };

  const bg = dark ? "bg-gray-950" : "bg-gradient-to-br from-emerald-50 via-white to-teal-50";
  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${bg}`}>
      <div className={`w-full max-w-md rounded-2xl border shadow-xl p-8 ${card}`}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌍</div>
          <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>TravelMind</h1>
          <p className={`text-sm mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>AI Travel Copilot & Historical Guide</p>
          <p className={`text-xs mt-2 italic font-medium ${dark ? "text-indigo-400" : "text-indigo-600"}`}>"Don't just visit a place — live its story"</p>
        </div>

        {/* Tabs */}
        <div className={`flex rounded-xl p-1 mb-6 ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
          {(["login", "register"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? "bg-emerald-500 text-white shadow"
                  : dark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-gray-400" : "text-gray-600"}`}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUser(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400 transition ${
                dark ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500" : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400"
              }`}
            />
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-gray-400" : "text-gray-600"}`}>Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPass(e.target.value)}
                placeholder="Enter your password"
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                className={`w-full rounded-xl border px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-emerald-400 transition ${
                  dark ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500" : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {tab === "register" && !settings.allowReg && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              ⚠️ Registration is currently disabled. Contact the admin.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (tab === "register" && !settings.allowReg)}
            className="w-full py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white transition-colors shadow"
          >
            {loading ? "Please wait..." : tab === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </form>



        <p className={`text-center text-xs mt-6 ${dark ? "text-gray-600" : "text-gray-400"}`}>
          🌍 TravelMind — AI-powered travel planning
        </p>
      </div>
    </div>
  );
}
