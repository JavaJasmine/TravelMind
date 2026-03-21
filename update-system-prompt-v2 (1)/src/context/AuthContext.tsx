import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { StoredUser, AppSettings, DEFAULT_SETTINGS } from "../types";

const K_USERS    = "tm_users";
const K_SETTINGS = "tm_settings";
const K_TOKEN    = "tm_token";

function load<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); if (r) return JSON.parse(r); } catch {}
  return fallback;
}
function save(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

const SEED_ADMIN: StoredUser = {
  id: 1, username: "admin", password: "admin123",
  role: "admin", active: true, createdAt: new Date().toISOString(),
};

function seedUsers(): StoredUser[] {
  const existing = load<StoredUser[]>(K_USERS, []);
  if (existing.length === 0) {
    save(K_USERS, [SEED_ADMIN]);
    return [SEED_ADMIN];
  }
  return existing;
}

interface AuthCtx {
  user: { id: number; username: string; role: "admin" | "user" } | null;
  settings: AppSettings;
  login: (u: string, p: string) => string | null;
  register: (u: string, p: string) => string | null;
  logout: () => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  getAllUsers: () => StoredUser[];
  createUser: (u: string, p: string, role: "admin" | "user") => string | null;
  deleteUser: (id: number) => void;
  toggleActive: (id: number) => void;
  resetPassword: (id: number, pw: string) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers]       = useState<StoredUser[]>(() => seedUsers());
  const [settings, setSettings] = useState<AppSettings>(() => load<AppSettings>(K_SETTINGS, DEFAULT_SETTINGS));
  const [user, setUser]         = useState<AuthCtx["user"]>(() => {
    const tok = load<{ id: number; username: string; role: "admin" | "user" } | null>(K_TOKEN, null);
    if (!tok) return null;
    const all = load<StoredUser[]>(K_USERS, []);
    const found = all.find(u => u.id === tok.id && u.active);
    return found ? { id: found.id, username: found.username, role: found.role } : null;
  });

  // keep users in sync
  const persistUsers = (u: StoredUser[]) => { setUsers(u); save(K_USERS, u); };
  const persistSettings = (s: AppSettings) => { setSettings(s); save(K_SETTINGS, s); };

  // if settings changed externally (e.g. admin panel), re-read
  useEffect(() => {
    const handler = () => {
      setSettings(load<AppSettings>(K_SETTINGS, DEFAULT_SETTINGS));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  function login(username: string, password: string): string | null {
    const found = users.find(u => u.username === username && u.password === password);
    if (!found) return "Invalid username or password.";
    if (!found.active) return "Account is disabled. Contact admin.";
    const tok = { id: found.id, username: found.username, role: found.role };
    save(K_TOKEN, tok);
    setUser(tok);
    return null;
  }

  function register(username: string, password: string): string | null {
    if (!settings.allowReg) return "Registration is currently disabled.";
    if (username.length < 3) return "Username must be at least 3 characters.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (users.find(u => u.username === username)) return "Username already taken.";
    const nu: StoredUser = {
      id: Date.now(), username, password, role: "user",
      active: true, createdAt: new Date().toISOString(),
    };
    persistUsers([...users, nu]);
    const tok = { id: nu.id, username: nu.username, role: nu.role };
    save(K_TOKEN, tok);
    setUser(tok);
    return null;
  }

  function logout() { localStorage.removeItem(K_TOKEN); setUser(null); }

  function updateSettings(s: Partial<AppSettings>) {
    const next = { ...settings, ...s };
    persistSettings(next);
  }

  function getAllUsers() { return load<StoredUser[]>(K_USERS, []); }

  function createUser(username: string, password: string, role: "admin" | "user"): string | null {
    const all = load<StoredUser[]>(K_USERS, []);
    if (all.find(u => u.username === username)) return "Username already taken.";
    const nu: StoredUser = { id: Date.now(), username, password, role, active: true, createdAt: new Date().toISOString() };
    persistUsers([...all, nu]);
    return null;
  }

  function deleteUser(id: number) {
    persistUsers(load<StoredUser[]>(K_USERS, []).filter(u => u.id !== id));
  }

  function toggleActive(id: number) {
    persistUsers(load<StoredUser[]>(K_USERS, []).map(u => u.id === id ? { ...u, active: !u.active } : u));
  }

  function resetPassword(id: number, pw: string) {
    persistUsers(load<StoredUser[]>(K_USERS, []).map(u => u.id === id ? { ...u, password: pw } : u));
  }

  return (
    <Ctx.Provider value={{ user, settings, login, register, logout, updateSettings, getAllUsers, createUser, deleteUser, toggleActive, resetPassword }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
