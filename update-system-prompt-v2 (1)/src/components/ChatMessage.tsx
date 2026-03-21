import { Message } from "../types";

interface Props {
  message: Message;
  isStreaming: boolean;
  dark: boolean;
}

function escape(s: string) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function renderMarkdown(raw: string): string {
  const lines = raw.split("\n");
  const out: string[] = [];
  let inCode = false, codeLines: string[] = [];
  let inTable = false, tableLines: string[] = [];

  const flushTable = () => {
    if (!tableLines.length) return;
    let html = '<div class="overflow-x-auto my-3"><table class="min-w-full text-sm border-collapse">';
    tableLines.forEach((row, i) => {
      if (/^[\s|:-]+$/.test(row)) return;
      const cells = row.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      const tag = i === 0 ? "th" : "td";
      const cls = i === 0
        ? `class="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 font-semibold text-left"`
        : `class="border border-gray-300 dark:border-gray-600 px-3 py-1.5"`;
      html += `<tr>${cells.map(c => `<${tag} ${cls}>${inline(c.trim())}</${tag}>`).join("")}</tr>`;
    });
    html += "</table></div>";
    out.push(html);
    tableLines = [];
    inTable = false;
  };

  const inline = (s: string) => {
    return escape(s)
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs font-mono">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-emerald-600 dark:text-emerald-400 underline">$1</a>');
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      if (!inCode) {
        inCode = true; codeLines = [];
      } else {
        out.push(`<pre class="bg-gray-800 text-gray-100 rounded-lg p-3 my-3 overflow-x-auto text-xs font-mono whitespace-pre">${escape(codeLines.join("\n"))}</pre>`);
        inCode = false; codeLines = [];
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    // Table
    if (line.includes("|")) {
      if (!inTable) inTable = true;
      tableLines.push(line);
      continue;
    } else if (inTable) { flushTable(); }

    // Headings
    const h4 = line.match(/^####\s+(.*)/); if (h4) { out.push(`<h4 class="text-sm font-bold mt-4 mb-1">${inline(h4[1])}</h4>`); continue; }
    const h3 = line.match(/^###\s+(.*)/);  if (h3) { out.push(`<h3 class="text-base font-bold mt-5 mb-1.5">${inline(h3[1])}</h3>`); continue; }
    const h2 = line.match(/^##\s+(.*)/);   if (h2) { out.push(`<h2 class="text-lg font-bold mt-6 mb-2">${inline(h2[1])}</h2>`); continue; }
    const h1 = line.match(/^#\s+(.*)/);    if (h1) { out.push(`<h1 class="text-xl font-bold mt-6 mb-2">${inline(h1[1])}</h1>`); continue; }

    // Blockquote
    if (line.startsWith("> ")) { out.push(`<blockquote class="border-l-4 border-emerald-400 pl-3 my-2 italic text-gray-600 dark:text-gray-400">${inline(line.slice(2))}</blockquote>`); continue; }

    // HR
    if (/^[-*_]{3,}$/.test(line.trim())) { out.push('<hr class="my-4 border-gray-200 dark:border-gray-700" />'); continue; }

    // Lists
    const ul = line.match(/^(\s*)[*\-+]\s+(.*)/);
    if (ul) { out.push(`<li class="ml-4 list-disc mb-0.5">${inline(ul[2])}</li>`); continue; }
    const ol = line.match(/^(\s*)\d+\.\s+(.*)/);
    if (ol) { out.push(`<li class="ml-4 list-decimal mb-0.5">${inline(ol[2])}</li>`); continue; }

    // Empty line
    if (!line.trim()) { out.push('<div class="h-2"></div>'); continue; }

    // Paragraph
    out.push(`<p class="mb-1 leading-relaxed">${inline(line)}</p>`);
  }

  if (inTable) flushTable();
  if (inCode) out.push(`<pre class="bg-gray-800 text-gray-100 rounded-lg p-3 my-3 text-xs font-mono">${escape(codeLines.join("\n"))}</pre>`);

  return out.join("\n");
}

export default function ChatMessage({ message, isStreaming }: Props) {
  const isAI = message.role === "assistant";
  const time = new Date(message.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (!isAI) {
    return (
      <div className="flex justify-end fade-up">
        <div className="max-w-[80%] bg-emerald-500 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          <p className="text-xs text-emerald-100 mt-1 text-right">{time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 fade-up">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm shrink-0 mt-0.5 shadow">
        🌍
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
          {message.content ? (
            <div
              className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
            />
          ) : (
            <div className="flex gap-1 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 dot1 inline-block" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 dot2 inline-block" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 dot3 inline-block" />
            </div>
          )}
          {isStreaming && message.content && (
            <span className="inline-block w-0.5 h-4 bg-emerald-500 ml-0.5 blink align-middle" />
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1 ml-1">{time}</p>
      </div>
    </div>
  );
}
