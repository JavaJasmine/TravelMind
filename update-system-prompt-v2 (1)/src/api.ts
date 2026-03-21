import { AppSettings } from "./types";

function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem("tm_settings");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { apiKey: "", model: "gpt-4o", provider: "openai", appName: "TravelMind", allowReg: true };
}

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export async function streamChat(
  messages: ChatMsg[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (e: string) => void
): Promise<() => void> {
  const s = getSettings();
  if (!s.apiKey) { onError("No API key set. Please go to Admin → API Settings to add your key."); return () => {}; }

  const ctrl = new AbortController();

  try {
    let url = "";
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: object;

    if (s.provider === "gemini") {
      // Gemini uses a different format
      url = `https://generativelanguage.googleapis.com/v1beta/models/${s.model}:streamGenerateContent?key=${s.apiKey}&alt=sse`;
      const sys = messages.find(m => m.role === "system")?.content ?? "";
      const rest = messages.filter(m => m.role !== "system");
      body = {
        systemInstruction: { parts: [{ text: sys }] },
        contents: rest.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
      };
    } else {
      if (s.provider === "openai")    url = "https://api.openai.com/v1/chat/completions";
      if (s.provider === "openrouter") url = "https://openrouter.ai/api/v1/chat/completions";
      if (s.provider === "deepseek")   url = "https://api.deepseek.com/chat/completions";
      headers["Authorization"] = `Bearer ${s.apiKey}`;
      if (s.provider === "openrouter") {
        headers["HTTP-Referer"] = "https://travelmind.app";
        headers["X-Title"] = "TravelMind";
      }
      body = { model: s.model, messages, stream: true, max_tokens: 4096, temperature: 0.7 };
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const txt = await res.text();
      let msg = `API error ${res.status}`;
      try { const j = JSON.parse(txt); msg = j.error?.message ?? msg; } catch {}
      if (res.status === 401) msg = "Invalid API key. Please check Admin settings.";
      if (res.status === 429) msg = "Rate limit exceeded. Please wait and try again.";
      if (res.status === 402) msg = "Insufficient credits on your API account.";
      onError(msg);
      return () => {};
    }

    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") { onDone(); return; }
            try {
              const j = JSON.parse(data);
              // OpenAI / OpenRouter / DeepSeek format
              const text = j.choices?.[0]?.delta?.content;
              if (text) { onChunk(text); continue; }
              // Gemini format
              const gtext = j.candidates?.[0]?.content?.parts?.[0]?.text;
              if (gtext) onChunk(gtext);
            } catch {}
          }
        }
        onDone();
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        onError("Stream interrupted. Please try again.");
      }
    })();

  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") return () => {};
    onError("Network error. Check your connection and API key.");
  }

  return () => ctrl.abort();
}
