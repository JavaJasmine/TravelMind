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
    onError("API key missing. Please check Vercel environment variables.");
    return () => {};
  }

  const ctrl = new AbortController();

  try {
    const url = "https://openrouter.ai/api/v1/chat/completions";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${s.apiKey}`,
      "HTTP-Referer": "https://travelmind.app",
      "X-Title": "TravelMind"
    };

    const body = {
      model: s.model,
      messages,
      stream: true,
      max_tokens: 4096,
      temperature: 0.7
    };

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const txt = await res.text();
      let msg = `API error ${res.status}`;

      try {
        const j = JSON.parse(txt);
        msg = j.error?.message ?? msg;
      } catch {}

      if (res.status === 401) msg = "Invalid API key.";
      if (res.status === 429) msg = "Rate limit exceeded.";
      if (res.status === 402) msg = "No credits left.";

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

            if (data === "[DONE]") {
              onDone();
              return;
            }

            try {
              const j = JSON.parse(data);
              const text = j.choices?.[0]?.delta?.content;
              if (text) onChunk(text);
            } catch {}
          }
        }

        onDone();
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        onError("Stream interrupted.");
      }
    })();

  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") return () => {};
    onError("Network error.");
  }

  return () => ctrl.abort();
}
