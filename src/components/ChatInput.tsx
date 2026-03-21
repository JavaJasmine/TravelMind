import { useState, useRef, KeyboardEvent } from "react";

interface Props {
  onSend: (text: string) => void;
  streaming: boolean;
  dark: boolean;
  onStop: () => void;
}

export default function ChatInput({ onSend, streaming, dark, onStop }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    if (!text.trim() || streaming) return;
    onSend(text.trim());
    setText("");
    if (ref.current) { ref.current.style.height = "auto"; }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const onInput = () => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = Math.min(ref.current.scrollHeight, 160) + "px";
    }
  };

  return (
    <div className={`border-t px-4 py-3 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
      <div className="max-w-3xl mx-auto flex gap-2 items-end">
        <div className={`flex-1 flex items-end rounded-xl border ${dark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-300"} px-3 py-2`}>
          <textarea
            ref={ref}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKey}
            onInput={onInput}
            rows={1}
            placeholder="Ask me to plan your trip, or describe your dream destination..."
            className={`flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed max-h-40 ${dark ? "text-gray-100 placeholder-gray-500" : "text-gray-900 placeholder-gray-400"}`}
          />
        </div>
        {streaming ? (
          <button
            onClick={onStop}
            className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            ⏹ Stop
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium transition-colors"
          >
            Send ↑
          </button>
        )}
      </div>
      <p className={`text-center text-xs mt-1.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
