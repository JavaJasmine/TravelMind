import { useState, useEffect } from 'react';

interface Props {
  apiKey: string;
  onApiKey: (key: string) => void;
  darkMode: boolean;
}

export default function ApiKeyBanner({ apiKey, onApiKey, darkMode: _ }: Props) {
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  // Pre-fill from stored key on mount
  useEffect(() => {
    if (apiKey) {
      setInput(apiKey);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      alert('Please enter an OpenRouter API key.');
      return;
    }
    onApiKey(trimmed);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditing(false);
      setInput(apiKey || '');
    }
  };

  const hasSavedKey = Boolean(apiKey);

  return (
    <div
      className={`border-b px-4 py-2.5 transition-colors ${
        hasSavedKey
          ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50'
          : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50'
      }`}
    >
      <div className="max-w-4xl mx-auto flex items-center gap-3 flex-wrap">
        {/* Icon + label */}
        <span className="text-base flex-shrink-0">{hasSavedKey ? '✅' : '🔑'}</span>
        <span
          className={`text-xs font-semibold flex-shrink-0 ${
            hasSavedKey ? 'text-green-700 dark:text-green-400' : 'text-amber-800 dark:text-amber-400'
          }`}
        >
          {hasSavedKey
            ? 'OpenRouter API Key saved — Hunter Alpha active 🚀'
            : 'OpenRouter API Key required to use TravelMind'}
        </span>

        {/* Input field */}
        <input
          type="password"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setEditing(true);
          }}
          onFocus={() => setEditing(true)}
          onKeyDown={handleKeyDown}
          placeholder="Paste your OpenRouter API key here (sk-or-...)..."
          className={`flex-1 min-w-[220px] text-xs px-3 py-1.5 border rounded-lg outline-none font-mono transition-colors
            bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            ${
              hasSavedKey && !editing
                ? 'border-green-300 dark:border-green-700 focus:ring-2 focus:ring-green-400'
                : 'border-amber-300 dark:border-amber-700 focus:ring-2 focus:ring-amber-400'
            }`}
        />

        {/* Save button */}
        <button
          onClick={handleSave}
          className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 text-white'
          }`}
        >
          {saved ? '✓ Saved!' : 'Save Key'}
        </button>

        {/* Helper link */}
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex-shrink-0"
        >
          Get OpenRouter key →
        </a>
      </div>

      {/* Sub-hint */}
      {!hasSavedKey && (
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 max-w-4xl mx-auto pl-7">
          Using <strong>Hunter Alpha</strong> — 1T param frontier model · 1M context · free on OpenRouter ·{' '}
          <a
            href="https://openrouter.ai/openrouter/hunter-alpha"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            model info →
          </a>
        </p>
      )}
    </div>
  );
}
