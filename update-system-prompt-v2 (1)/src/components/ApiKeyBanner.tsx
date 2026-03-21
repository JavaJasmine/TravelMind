import { AppSettings } from "./types";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

function getSettings(): AppSettings {
  return {
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
    model: "qwen/qwen3-next-80b-a3b-instruct",
    provider: "openrouter",
    appName: "TravelMind",
    allowReg: true
  };
}

export async function streamChat(
  messages: ChatMsg[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (e: string) => void
): Promise<() => void> {

  const s = getSettings();

  if (!s.apiKey) {
    onError("API key missing. Check environment variables.");
    return () => {};
  }

  const ctrl = new AbortController();

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${s.apiKey}`,
        "HTTP-Referer": "https://travelmind.app",
        "X-Title": "TravelMind"
      },
      body: JSON.stringify({
        model: s.model,
        messages,
        stream: true,
        max_tokens: 4096,
        temperature: 0.7
      }),
      signal: ctrl.signal
    });

    if (!res.ok) {
      const txt = await res.text();
      let msg = `Error ${res.status}`;

      try {
        const j = JSON.parse(txt);
        msg = j.error?.message || msg;
      } catch {}

      onError(msg);
      return () => {};
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;

            const data = line.replace("data:", "").trim();

            if (data === "[DONE]") {
              onDone();
              return;
            }

            try {
              const json = JSON.parse(data);
              const text = json.choices?.[0]?.delta?.content;
              if (text) onChunk(text);
            } catch {}
          }
        }

        onDone();
      } catch {
        onError("Streaming error");
      }
    })();

  } catch {
    onError("Network error");
  }

  return () => ctrl.abort();
}
