"use client";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineMarkdown(value: string): string {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  );
  return html;
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let paragraph: string[] = [];
  let blockquote: string[] = [];

  const closeParagraph = () => {
    if (!paragraph.length) return;
    out.push(`<p>${paragraph.map(inlineMarkdown).join("<br>")}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) return;
    out.push(`</${listType}>`);
    listType = null;
  };

  const closeBlockquote = () => {
    if (!blockquote.length) return;
    out.push(`<blockquote>${blockquote.map((line) => `<p>${inlineMarkdown(line)}</p>`).join("")}</blockquote>`);
    blockquote = [];
  };

  for (const line of lines) {
    const codeFence = line.match(/^```/);
    if (codeFence) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        closeParagraph();
        closeList();
        closeBlockquote();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      closeParagraph();
      closeList();
      closeBlockquote();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeParagraph();
      closeList();
      closeBlockquote();
      const level = heading[1].length;
      out.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      closeParagraph();
      closeList();
      blockquote.push(quote[1]);
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      closeParagraph();
      closeBlockquote();
      const nextType = unordered ? "ul" : "ol";
      if (listType !== nextType) {
        closeList();
        out.push(`<${nextType}>`);
        listType = nextType;
      }
      out.push(`<li>${inlineMarkdown((unordered ?? ordered)![1])}</li>`);
      continue;
    }

    closeList();
    closeBlockquote();
    paragraph.push(line);
  }

  if (inCode) out.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  closeParagraph();
  closeList();
  closeBlockquote();

  return out.join("\n");
}

export function markdownDocument(markdown: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root {
  color-scheme: light;
  --bg: #fbfbfd;
  --fg: #1f2937;
  --muted: #6b7280;
  --border: #e5e7eb;
  --accent: #2563eb;
  --code-bg: #f3f4f6;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font: 16px/1.7 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
main {
  max-width: 860px;
  margin: 0 auto;
  padding: 40px 24px 72px;
}
h1, h2, h3, h4, h5, h6 {
  line-height: 1.25;
  margin: 1.6em 0 0.55em;
}
h1 {
  margin-top: 0;
  font-size: 2.25rem;
  letter-spacing: 0;
}
h2 {
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.25rem;
}
p, ul, ol, blockquote, pre {
  margin: 0 0 1rem;
}
ul, ol {
  padding-left: 1.5rem;
}
blockquote {
  border-left: 4px solid var(--accent);
  color: var(--muted);
  padding: 0.25rem 0 0.25rem 1rem;
}
a {
  color: var(--accent);
}
code {
  background: var(--code-bg);
  border-radius: 4px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 0.92em;
  padding: 0.12em 0.3em;
}
pre {
  overflow-x: auto;
  background: #111827;
  border-radius: 8px;
  color: #f9fafb;
  padding: 1rem;
}
pre code {
  background: transparent;
  color: inherit;
  padding: 0;
}
hr {
  border: 0;
  border-top: 1px solid var(--border);
  margin: 2rem 0;
}
</style>
</head>
<body>
<main>
${markdownToHtml(markdown)}
</main>
</body>
</html>`;
}
