const K_TOKEN = "tm_token";

function getToken(): string {
  try {
    const raw = localStorage.getItem(K_TOKEN);
    if (raw) return JSON.parse(raw)?.token ?? "";
  } catch {}
  return "";
}

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

/**
 * Stream a chat response through the server's /api/chat proxy endpoint.
 * The server handles provider routing and keeps the API key secret.
 */
export async function streamChat(
  messages: ChatMsg[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (e: string) => void
): Promise<() => void> {
  const token = getToken();
  if (!token) {
    onError("Not authenticated. Please log in again.");
    return () => {};
  }

  const ctrl = new AbortController();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      let msg = `API error ${res.status}`;
      try {
        const j = await res.json();
        msg = j.error ?? msg;
      } catch {}
      if (res.status === 401) msg = "Session expired. Please log in again.";
      if (res.status === 429) msg = "Rate limit exceeded. Please wait and try again.";
      if (res.status === 503) msg = "No API key configured on the server. Please ask your administrator to set the API key in the Admin Panel.";
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
    onError("Network error. Check your connection.");
  }

  return () => ctrl.abort();
}
