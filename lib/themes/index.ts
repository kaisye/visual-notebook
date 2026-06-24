/**
 * Theme & capability registry.
 *
 * A generated document is a single self-contained HTML file. The AI is asked to
 * follow a chosen THEME (visual identity + base CSS) and may use a set of enabled
 * CAPABILITIES (charting / math / diagrams / physics / code) whose CDN includes
 * and usage instructions are injected into the system prompt.
 */

export interface Theme {
  id: string;
  name: string;
  description: string;
  /** Swatch colors for the theme picker. */
  preview: { bg: string; fg: string; accent: string };
  /** A short, vivid description of the visual style for the model. */
  instruction: string;
  /** Base CSS the model should build on (design tokens + sensible defaults). */
  css: string;
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  /** Tags injected into <head>. */
  head?: string;
  /** Tags injected before </body>. */
  bodyEnd?: string;
  /** Usage guidance appended to the system prompt when enabled. */
  instruction: string;
}

/**
 * A writing style controls the AI's TONE/VOICE and how content is structured —
 * independent of the visual THEME. Injected into the system prompt as guidance.
 */
export interface WritingStyle {
  id: string;
  name: string;
  description: string;
  /** Emoji shown in the picker. */
  emoji: string;
  /** Voice/structure guidance appended to the system prompt. */
  instruction: string;
}

export const THEMES: Theme[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Sạch sẽ, sáng, nhiều khoảng trắng, tập trung nội dung.",
    preview: { bg: "#ffffff", fg: "#1f2328", accent: "#111827" },
    instruction:
      "Clean, light, generous whitespace. Neutral grays, a single near-black accent. " +
      "System sans-serif, comfortable line-height, no shadows or gradients. Content-first.",
    css: `:root{--bg:#ffffff;--fg:#1f2328;--muted:#6b7280;--line:#e5e7eb;--accent:#111827;--radius:10px}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.7 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.container{max-width:760px;margin:0 auto;padding:48px 24px}
h1,h2,h3{line-height:1.25;font-weight:700}
h1{font-size:2rem;margin:0 0 .5em}h2{font-size:1.4rem;margin:1.6em 0 .4em}
a{color:var(--accent)}
hr{border:none;border-top:1px solid var(--line);margin:2em 0}
code{background:#f3f4f6;padding:.15em .4em;border-radius:6px;font-size:.9em}
.card{border:1px solid var(--line);border-radius:var(--radius);padding:20px}`,
  },
  {
    id: "editorial-tech",
    name: "Editorial Tech",
    description: "Trang trắng, headline navy cực đậm, accent teal — hợp tài liệu kỹ thuật cao cấp.",
    preview: { bg: "#ffffff", fg: "#0f172a", accent: "#159a8c" },
    instruction:
      "Premium technical handbook/editorial style on a white canvas. Use oversized extra-bold navy headlines, " +
      "teal accent words, wide letter-spaced uppercase eyebrow labels, generous margins, and compact metric/stat rows. " +
      "It should feel like a polished self-authored advanced engineering guide, not a marketing landing page.",
    css: `:root{--bg:#ffffff;--fg:#0f172a;--muted:#667085;--line:#e6eaf0;--accent:#159a8c;--accent2:#0f766e;--radius:10px}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.72 Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.container{max-width:1120px;margin:0 auto;padding:68px 40px}
.eyebrow{margin:0 0 30px;color:var(--accent2);font:700 .78rem/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.42em;text-transform:uppercase}
h1{max-width:980px;margin:0 0 24px;font-size:clamp(3rem,7vw,5.8rem);line-height:.98;font-weight:900;letter-spacing:-.045em;color:var(--fg)}
h1 .accent,.accent{color:var(--accent)}
h2{margin:2.2em 0 .55em;font-size:clamp(1.7rem,3.2vw,2.55rem);line-height:1.08;font-weight:850;letter-spacing:-.03em}
h3{margin:1.5em 0 .35em;font-size:1.15rem;line-height:1.2;font-weight:850}
.lead{max-width:800px;margin:0 0 44px;color:var(--muted);font-size:clamp(1.2rem,2vw,1.55rem);line-height:1.62}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px;margin:44px 0 22px}
.stat strong{display:block;color:var(--fg);font-size:1rem;line-height:1.25;font-weight:850}.stat span{display:block;margin-top:8px;color:#8491a5;font-size:.95rem}
.card{border:1px solid var(--line);border-radius:var(--radius);padding:24px;background:#fff}
.callout{border-left:4px solid var(--accent);padding:18px 22px;background:#f4fbfa;border-radius:0 var(--radius) var(--radius) 0}
a{color:var(--accent2);text-decoration-thickness:2px;text-underline-offset:3px}
code{background:#f3f7f8;color:#0b5560;border:1px solid #dcebed;border-radius:6px;padding:.12em .38em;font-size:.9em}
pre{overflow:auto;border:1px solid var(--line);border-radius:var(--radius);padding:18px;background:#f8fafc}
@media(max-width:760px){.container{padding:44px 22px}h1{font-size:2.9rem}.eyebrow{letter-spacing:.22em}.stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}}`,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Hiện đại, gradient mềm, bo góc, đổ bóng nhẹ.",
    preview: { bg: "#f8fafc", fg: "#0f172a", accent: "#6366f1" },
    instruction:
      "Modern and friendly. Soft gradient backgrounds, rounded cards with subtle shadows, " +
      "an indigo→violet accent, balanced spacing. Inter/system sans. Tasteful, not flashy.",
    css: `:root{--bg:#f8fafc;--fg:#0f172a;--muted:#64748b;--line:#e2e8f0;--accent:#6366f1;--accent2:#8b5cf6;--radius:16px}
*{box-sizing:border-box}
body{margin:0;color:var(--fg);font:16px/1.7 system-ui,Segoe UI,Roboto,sans-serif;
background:radial-gradient(1200px 600px at 100% -10%,#eef2ff,transparent),var(--bg)}
.container{max-width:820px;margin:0 auto;padding:56px 24px}
h1{font-size:2.2rem;font-weight:800;letter-spacing:-.02em;margin:0 0 .4em;
background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
h2{font-size:1.5rem;font-weight:700;margin:1.6em 0 .4em}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.card{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:24px;box-shadow:0 4px 20px -8px rgba(2,6,23,.12)}
.badge{display:inline-block;background:#eef2ff;color:var(--accent);border-radius:999px;padding:.2em .8em;font-size:.8rem;font-weight:600}`,
  },
  {
    id: "tech",
    name: "Tech (Dark)",
    description: "Nền tối, accent neon, mono — phong cách kỹ thuật.",
    preview: { bg: "#0b0f17", fg: "#e5e7eb", accent: "#22d3ee" },
    instruction:
      "Dark, technical dashboard vibe. Near-black background, cyan/emerald neon accents, " +
      "monospace for labels and code, crisp 1px borders, subtle glow on key elements.",
    css: `:root{--bg:#0b0f17;--fg:#e5e7eb;--muted:#94a3b8;--line:#1e293b;--accent:#22d3ee;--accent2:#34d399;--radius:12px}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.7 ui-sans-serif,system-ui,sans-serif}
.container{max-width:880px;margin:0 auto;padding:56px 24px}
h1,h2,h3{font-weight:700;letter-spacing:-.01em}
h1{font-size:2rem;margin:0 0 .4em}
.mono,code,kbd{font-family:ui-monospace,"Cascadia Code",Consolas,monospace}
.accent{color:var(--accent)}
a{color:var(--accent)}
.card{background:#0f172a;border:1px solid var(--line);border-radius:var(--radius);padding:22px;
box-shadow:0 0 0 1px rgba(34,211,238,.04),0 0 40px -20px rgba(34,211,238,.4)}
code{background:#0f172a;border:1px solid var(--line);padding:.15em .4em;border-radius:6px}`,
  },
  {
    id: "academic",
    name: "Academic",
    description: "Kiểu giấy, serif, hợp định lý/chứng minh & ghi chú học thuật.",
    preview: { bg: "#fbf9f4", fg: "#1c1917", accent: "#7c2d12" },
    instruction:
      "Scholarly paper look. Warm off-white paper, serif body (Georgia), restrained brown accent. " +
      "Use boxed theorem/definition/proof blocks with labels. Optimized for math and dense reading.",
    css: `:root{--bg:#fbf9f4;--fg:#1c1917;--muted:#78716c;--line:#e7e2d6;--accent:#7c2d12;--radius:8px}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.75 Georgia,"Times New Roman",serif}
.container{max-width:720px;margin:0 auto;padding:56px 28px}
h1,h2,h3{font-family:Georgia,serif;font-weight:700}
h1{font-size:2rem;text-align:center;margin:0 0 .2em}
.subtitle{text-align:center;color:var(--muted);margin-bottom:2em}
a{color:var(--accent)}
.theorem,.definition,.proof,.note{border-left:3px solid var(--accent);background:#fff;
border:1px solid var(--line);border-left-width:3px;border-radius:var(--radius);padding:14px 18px;margin:1.2em 0}
.theorem::before{content:"Định lý";font-weight:700;color:var(--accent);display:block;margin-bottom:.3em}
.definition::before{content:"Định nghĩa";font-weight:700;color:var(--accent);display:block;margin-bottom:.3em}
.proof::before{content:"Chứng minh";font-style:italic;color:var(--muted);display:block;margin-bottom:.3em}`,
  },
  {
    id: "playful",
    name: "Playful",
    description: "Màu tươi, vui mắt — hợp tóm tắt, flashcard, ghi chú nhanh.",
    preview: { bg: "#fff7ed", fg: "#431407", accent: "#f97316" },
    instruction:
      "Energetic and colorful. Warm cream background, bold rounded cards in candy colors " +
      "(orange, pink, teal), big friendly headings, playful but readable. Great for summaries and flashcards.",
    css: `:root{--bg:#fff7ed;--fg:#3b1f0b;--muted:#9a6b4a;--line:#fed7aa;--accent:#f97316;--radius:20px}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.7 "Segoe UI",system-ui,sans-serif}
.container{max-width:840px;margin:0 auto;padding:48px 24px}
h1{font-size:2.4rem;font-weight:900;color:var(--accent);margin:0 0 .3em}
h2{font-size:1.5rem;font-weight:800}
.card{background:#fff;border:2px solid var(--line);border-radius:var(--radius);padding:22px;box-shadow:0 6px 0 var(--line)}
.pill{display:inline-block;background:var(--accent);color:#fff;border-radius:999px;padding:.25em .9em;font-weight:700}`,
  },
];

export const CAPABILITIES: Capability[] = [
  {
    id: "math",
    name: "Toán / Định lý",
    description: "Render công thức LaTeX bằng KaTeX.",
    head: `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"
 onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\\\(',right:'\\\\)',display:false},{left:'\\\\[',right:'\\\\]',display:true}]})"></script>`,
    instruction:
      "Math is enabled (KaTeX auto-render is already wired up). Write LaTeX inline with $...$ and " +
      "display math with $$...$$. Do NOT add your own KaTeX scripts. For theorems/proofs use semantic blocks.",
  },
  {
    id: "charts",
    name: "Biểu đồ",
    description: "Vẽ biểu đồ tương tác bằng Chart.js.",
    head: `<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>`,
    instruction:
      "Charts are enabled (Chart.js v4 is loaded globally as `Chart`). Create charts on <canvas> " +
      "elements with inline <script>. Use the theme accent colors. Make them responsive.",
  },
  {
    id: "diagrams",
    name: "Sơ đồ",
    description: "Sơ đồ luồng/quan hệ bằng Mermaid.",
    bodyEnd: `<script type="module">import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";mermaid.initialize({startOnLoad:true});</script>`,
    instruction:
      "Diagrams are enabled (Mermaid v11 auto-initializes). Put diagram source inside " +
      '<pre class="mermaid">...</pre> using flowchart/sequence/class syntax. Do not add your own mermaid script.',
  },
  {
    id: "physics",
    name: "Mô phỏng / Vật lý",
    description: "Mô phỏng tương tác bằng p5.js + matter.js.",
    head: `<script src="https://cdn.jsdelivr.net/npm/p5@1.9.4/lib/p5.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js"></script>`,
    instruction:
      "Interactive simulations are enabled (p5.js as `p5`/global mode and Matter.js as `Matter`). " +
      "Build small interactive canvases (e.g. projectile motion, pendulum, collisions) with sliders/buttons. " +
      "Keep simulations performant and clearly labeled.",
  },
  {
    id: "code",
    name: "Code highlight",
    description: "Tô màu cú pháp code bằng highlight.js.",
    head: `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.10.0/styles/github.min.css">
<script src="https://cdn.jsdelivr.net/npm/highlight.js@11.10.0/lib/common.min.js"></script>
<script>window.addEventListener('DOMContentLoaded',()=>window.hljs&&hljs.highlightAll());</script>`,
    instruction:
      "Code highlighting is enabled (highlight.js auto-runs). Put code in <pre><code class=\"language-xxx\">...</code></pre>.",
  },
];

export const WRITING_STYLES: WritingStyle[] = [
  {
    id: "balanced",
    name: "Cân bằng",
    description: "Giải thích rõ ràng, cân đối giữa đoạn văn và gạch đầu dòng.",
    emoji: "⚖️",
    instruction:
      "Clear, balanced explanatory prose. Mix short paragraphs with bullet points and the " +
      "occasional table. Friendly, helpful teacher tone. This is the sensible default.",
  },
  {
    id: "concise",
    name: "Súc tích",
    description: "Ngắn gọn, nhiều gạch đầu dòng — hợp ôn thi cấp tốc.",
    emoji: "✂️",
    instruction:
      "Terse, exam-cram style. Strongly prefer bullet points, short phrases, key-term lists and " +
      "compact tables over long paragraphs. Cut all filler; keep only the essentials.",
  },
  {
    id: "simple",
    name: "Dễ hiểu",
    description: "Ngôn ngữ đơn giản, ví dụ đời thường — hợp người mới.",
    emoji: "💡",
    instruction:
      "Beginner-friendly. Explain ideas in plain language with everyday analogies and concrete " +
      "examples. Define any jargon the first time it appears. Warm, encouraging tone.",
  },
  {
    id: "academic",
    name: "Học thuật",
    description: "Trang trọng, chính xác, lập luận chặt chẽ.",
    emoji: "🎓",
    instruction:
      "Formal academic register. Precise terminology, well-structured arguments, explicit " +
      "definitions and (where relevant) theorem/proof framing. Objective and rigorous.",
  },
  {
    id: "storytelling",
    name: "Kể chuyện",
    description: "Dẫn dắt bằng câu chuyện/tình huống thực tế, cuốn hút.",
    emoji: "📖",
    instruction:
      "Engaging narrative style. Motivate each concept with a short story, scenario or real-world " +
      "hook before explaining it. Stay accurate and educational — narrative serves understanding.",
  },
];

export function getTheme(id: string | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function getCapabilities(ids: string[]): Capability[] {
  return CAPABILITIES.filter((c) => ids.includes(c.id));
}

export function getStyle(id: string | undefined): WritingStyle {
  return WRITING_STYLES.find((s) => s.id === id) ?? WRITING_STYLES[0];
}
