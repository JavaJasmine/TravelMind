import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { AppSettings, DEFAULT_SETTINGS } from "../types";

const K_TOKEN = "tm_token";

interface TokenPayload {
  token: string;
  user: { id: number; username: string; role: "admin" | "user" };
}

function loadToken(): TokenPayload | null {
  try {
    const raw = localStorage.getItem(K_TOKEN);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

interface AuthCtx {
  user: { id: number; username: string; role: "admin" | "user" } | null;
  settings: AppSettings;
  login: (u: string, p: string) => Promise<string | null>;
  register: (u: string, p: string) => Promise<string | null>;
  logout: () => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  refreshSettings: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function fetchHealth(): Promise<Partial<AppSettings>> {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) return {};
    const data = await res.json();
    return {
      apiKeyConfigured: Boolean(data.apiKeyConfigured),
      model: data.model ?? DEFAULT_SETTINGS.model,
      provider: data.provider ?? DEFAULT_SETTINGS.provider,
    };
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokenPayload, setTokenPayload] = useState<TokenPayload | null>(() => loadToken());
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const user = tokenPayload?.user ?? null;

  // ── Fetch server health / settings ──────────────────────────────────────────
  const refreshSettings = useCallback(async () => {
    const health = await fetchHealth();
    setSettings(prev => ({ ...prev, ...health }));
  }, []);

  // Load settings on mount and whenever the user changes
  useEffect(() => {
    refreshSettings();
  }, [refreshSettings, user?.id]);

  // Also re-read when another tab changes storage (e.g. after admin updates settings)
  useEffect(() => {
    const handler = () => refreshSettings();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refreshSettings]);

  // ── Auth actions ─────────────────────────────────────────────────────────────
  async function login(username: string, password: string): Promise<string | null> {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return data.error ?? "Login failed";
      const payload: TokenPayload = { token: data.token, user: data.user };
      localStorage.setItem(K_TOKEN, JSON.stringify(payload));
      setTokenPayload(payload);
      return null;
    } catch {
      return "Network error. Please try again.";
    }
  }

  async function register(username: string, password: string): Promise<string | null> {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return data.error ?? "Registration failed";
      const payload: TokenPayload = { token: data.token, user: data.user };
      localStorage.setItem(K_TOKEN, JSON.stringify(payload));
      setTokenPayload(payload);
      return null;
    } catch {
      return "Network error. Please try again.";
    }
  }

  function logout() {
    localStorage.removeItem(K_TOKEN);
    setTokenPayload(null);
    setSettings(DEFAULT_SETTINGS);
  }

  function updateSettings(s: Partial<AppSettings>) {
    setSettings(prev => ({ ...prev, ...s }));
  }

  return (
    <Ctx.Provider value={{ user, settings, login, register, logout, updateSettings, refreshSettings }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
