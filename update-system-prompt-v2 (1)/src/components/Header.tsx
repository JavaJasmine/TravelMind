interface Props {
  dark: boolean;
  toggleDark: () => void;
  onAdmin: () => void;
  user: { username: string; role: "admin" | "user" } | null;
  onLogout: () => void;
  onPlanTrip: () => void;
  streaming: boolean;
}

export default function Header({ dark, toggleDark, onAdmin, user, onLogout, onPlanTrip, streaming }: Props) {
  return (
    <header className={`flex items-center justify-between px-4 py-3 border-b ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm z-10`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">🌍</span>
        <div>
          <h1 className={`font-bold text-lg leading-tight ${dark ? "text-white" : "text-gray-900"}`}>TravelMind</h1>
          <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
            {streaming ? <span className="text-emerald-500 font-medium">✦ Generating plan...</span> : <span><span className="mr-1">AI Travel Copilot</span><span className={`italic ${dark ? "text-indigo-400" : "text-indigo-500"}`}>· "Don't just visit a place — live its story"</span></span>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onPlanTrip}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
        >
          🗺️ Plan a Trip
        </button>
        {user?.role === "admin" && (
          <button
            onClick={onAdmin}
            className={`p-2 rounded-lg text-sm transition-colors ${dark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
            title="Admin Panel"
          >
            ⚙️
          </button>
        )}
        <button
          onClick={toggleDark}
          className={`p-2 rounded-lg text-sm transition-colors ${dark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
          title="Toggle dark mode"
        >
          {dark ? "☀️" : "🌙"}
        </button>
        <div className={`flex items-center gap-2 pl-2 border-l ${dark ? "border-gray-700" : "border-gray-200"}`}>
          <span className={`text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>
            {user?.username}
          </span>
          <button
            onClick={onLogout}
            className={`text-xs px-2 py-1 rounded ${dark ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"} transition-colors`}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
