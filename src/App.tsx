import { useState, useRef, useEffect, useCallback } from "react";
import { Message, TripProfile } from "./types";
import { buildMessages, buildPromptFromProfile, WELCOME_MESSAGE } from "./promptEngine";
import { streamChat } from "./api";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Header from "./components/Header";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import TripPlannerForm from "./components/TripPlannerForm";
import SuggestedPrompts from "./components/SuggestedPrompts";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";

let _n = 0;
const uid = () => `m${++_n}_${Date.now()}`;
const DARK_KEY = "tm_dark";

function welcome(): Message {
  return { id: "welcome", role: "assistant", content: WELCOME_MESSAGE, ts: Date.now() };
}

// ─── Chat App ────────────────────────────────────────────────────────────────
function ChatApp({ dark, toggleDark, onAdmin }: { dark: boolean; toggleDark: () => void; onAdmin: () => void }) {
  const { user, logout, settings } = useAuth();
  const [msgs, setMsgs]         = useState<Message[]>([welcome()]);
  const [streaming, setStream]  = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [profile, setProfile]   = useState<TripProfile>({});
  const [error, setError]       = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stopRef   = useRef<(() => void) | null>(null);
  const msgsRef   = useRef<Message[]>([welcome()]);

  useEffect(() => { msgsRef.current = msgs; }, [msgs]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = useCallback(async (text: string) => {
    if (streaming || !text.trim()) return;
    setError(null);


    const userMsg: Message = { id: uid(), role: "user", content: text, ts: Date.now() };
    const aiId = uid();
    const aiMsg: Message = { id: aiId, role: "assistant", content: "", ts: Date.now() };
    setMsgs(prev => [...prev, userMsg, aiMsg]);
    setStream(true);
    setActiveId(aiId);

    const history = [
      ...msgsRef.current.filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: text },
    ];

    const stop = await streamChat(
      buildMessages(history),
      (chunk: string) => {
        setMsgs(prev => prev.map(m => m.id === aiId ? { ...m, content: m.content + chunk } : m));
      },
      () => { setStream(false); setActiveId(null); },
      (err: string) => { setError(err); setStream(false); setActiveId(null); setMsgs(prev => prev.filter(m => m.id !== aiId)); }
    );
    stopRef.current = stop;
  }, [streaming, user]);

  const handleProfile = (p: TripProfile) => {
    setProfile(p);
    setShowForm(false);
    send(buildPromptFromProfile(p));
  };

  const hasOnlyWelcome = msgs.length === 1 && msgs[0].id === "welcome";

  return (
    <div className={`flex flex-col h-screen ${dark ? "dark" : ""}`}>
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Header dark={dark} toggleDark={toggleDark} onAdmin={onAdmin} user={user} onLogout={logout} onPlanTrip={() => setShowForm(true)} streaming={streaming} />

        {/* No API key warning */}
        {!settings.apiKeyConfigured && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <span>⚠️</span>
            <span>
              {user?.role === "admin"
                ? <><strong>No API key configured.</strong> <button onClick={onAdmin} className="underline font-medium">Go to Admin Panel →</button></>
                : "Travel AI is not yet configured. Please contact your administrator."}
            </span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {msgs.map(m => (
              <ChatMessage key={m.id} message={m} isStreaming={m.id === activeId} dark={dark} />
            ))}
            {hasOnlyWelcome && (
              <SuggestedPrompts onSelect={send} dark={dark} />
            )}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                <span>❌</span>
                <div className="flex-1">{error}</div>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <ChatInput onSend={send} streaming={streaming} dark={dark} onStop={() => stopRef.current?.()} />

        {showForm && (
          <TripPlannerForm
            profile={profile}
            onChange={setProfile}
            onSubmit={handleProfile}
            onClose={() => setShowForm(false)}
            dark={dark}
          />
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(() => {
    try {
      const s = localStorage.getItem(DARK_KEY);
      if (s !== null) return s === "true";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch { return false; }
  });
  const [page, setPage] = useState<"chat" | "admin">("chat");

  const toggleDark = () => setDark(d => {
    const next = !d;
    try { localStorage.setItem(DARK_KEY, String(next)); } catch {}
    return next;
  });

  return (
    <AuthProvider>
      <Inner dark={dark} toggleDark={toggleDark} page={page} setPage={setPage} />
    </AuthProvider>
  );
}

function Inner({ dark, toggleDark, page, setPage }: {
  dark: boolean; toggleDark: () => void;
  page: "chat" | "admin"; setPage: (p: "chat" | "admin") => void;
}) {
  const { user } = useAuth();

  if (!user) return <LoginPage dark={dark} />;
  if (page === "admin" && user.role === "admin") {
    return <AdminPage dark={dark} toggleDark={toggleDark} onBack={() => setPage("chat")} />;
  }
  return (
    <ChatApp
      dark={dark}
      toggleDark={toggleDark}
      onAdmin={() => user.role === "admin" && setPage("admin")}
    />
  );
}
