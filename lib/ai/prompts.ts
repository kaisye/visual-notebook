import { getCapabilities, getStyle, getTheme } from "@/lib/themes";

export type GenMode = "generate" | "edit" | "pdf" | "slides" | "fragment";

interface BuildArgs {
  themeId?: string;
  capabilityIds: string[];
  mode: GenMode;
  /** Whether to inject theme + capability styling. Forced on for generate/pdf. */
  applyTheme?: boolean;
  /** Writing-style id controlling the AI's tone/voice. */
  styleId?: string;
}

/**
 * Assemble the system prompt.
 *
 * - generate / pdf: full self-contained document following the theme + capabilities.
 * - edit: full document. If applyTheme is false (default for content edits), the
 *   model must PRESERVE all existing styling and only change what is asked.
 * - fragment: edit just an HTML snippet and return only that snippet.
 */
export function buildSystemPrompt({ themeId, capabilityIds, mode, applyTheme, styleId }: BuildArgs): string {
  if (mode === "fragment") {
    return `You edit a SNIPPET of HTML taken from a larger study document. Apply ONLY the user's requested change to this snippet.

# OUTPUT CONTRACT (critical)
- Return ONLY the edited HTML snippet — exactly what should replace the original snippet.
- Do NOT add <!DOCTYPE>, <html>, <head>, <body>, or <style> wrappers (unless they were already inside the snippet).
- Do NOT wrap output in markdown code fences. No commentary before or after.
- Preserve the snippet's existing tags, classes and structure; change only what is requested.
- Match the surrounding style; reuse the same CSS classes already present.
- Write human-readable content in Vietnamese unless the user clearly asks otherwise.
- Use precomposed (NFC) Unicode for Vietnamese (e.g. "ề", "ấ") — never base letter + separate combining accent.`;
  }

  const themed = mode === "generate" || mode === "pdf" || mode === "slides" || applyTheme === true;

  if (mode === "edit" && !themed) {
    return `You edit an existing, self-contained HTML study document. Apply ONLY the user's requested change.

# OUTPUT CONTRACT (critical)
- Return the COMPLETE HTML document: start with <!DOCTYPE html>, end with </html>.
- Do NOT wrap output in markdown code fences. No commentary before or after.
- CRITICAL: Preserve everything else EXACTLY — do NOT change existing CSS/styles, layout,
  theme, fonts, colors, scripts or library (CDN) includes. Do not reformat unrelated code.
  Keep the document's current visual design intact.
- Only modify what the user explicitly asks; leave the rest byte-for-byte where possible.
- Write content in Vietnamese unless the user clearly asks otherwise.
- Use precomposed (NFC) Unicode for Vietnamese (e.g. "ề", "ấ") — never base letter + separate combining accent.`;
  }

  const theme = themeId ? getTheme(themeId) : null;
  const caps = getCapabilities(capabilityIds);
  const style = styleId ? getStyle(styleId) : null;

  const headIncludes = caps.map((c) => c.head).filter(Boolean).join("\n");
  const bodyEndIncludes = caps.map((c) => c.bodyEnd).filter(Boolean).join("\n");
  const capInstructions = caps.map((c) => `- ${c.name}: ${c.instruction}`).join("\n");

  const intro =
    mode === "edit"
      ? "You edit an existing HTML study document, applying the user's changes and any design guidance below."
      : mode === "pdf"
        ? "You convert extracted PDF content into a clean, well-structured HTML study document."
        : mode === "slides"
          ? "You convert source material into a polished, interactive HTML slide deck for teaching or presenting."
          : "You create beautiful, self-contained HTML study documents for a learner.";

  const themeSection = theme
    ? `# THEME: ${theme.name}
${theme.instruction}
Embed this base CSS inside a <style> tag in <head>, then extend it as needed (you may add more CSS):
<style>
${theme.css}
</style>
Wrap the main content in <div class="container">...</div>.`
    : `# THEME
No fixed visual theme is selected. Choose a fitting visual direction yourself based on the user's request and source material.
Still include complete inline CSS in <head>. Define readable layout, spacing, typography, colors, responsive behavior, and accessible contrast.
Do not leave the document unstyled.`;

  const styleSection = style
    ? `# WRITING STYLE: ${style.name}
${style.instruction}
This governs TONE and how prose is structured — it does not override the visual theme or the output contract above.`
    : `# WRITING STYLE
No fixed writing style is selected. Choose the clearest voice for the user's request and source material.
Keep the prose coherent, useful, and appropriately concise.`;

  const slideInstructions =
    mode === "slides"
      ? `
# HTML SLIDE DECK CONTRACT
- Create an interactive 16:9 slide deck, not a scrolling article.
- Use semantic <section class="slide"> elements inside <main class="deck">.
- Include 6-14 slides by default unless the user asks for a different length.
- Every slide must have one clear idea, a short title, and concise bullets or visual blocks.
- Include a strong title slide and a final recap/action slide.
- Add a small progress indicator, slide number, Previous/Next controls, and keyboard navigation for ArrowLeft/ArrowRight/Home/End.
- Keep all CSS and JavaScript inline in the HTML. Do not require external slide libraries.
- Make the deck work when opened as a local .html file.
- Add print CSS so each slide prints on its own page.
- Speaker notes are allowed in <aside class="notes"> but keep them visually hidden on screen.
- If the source has formulas, tables, timelines, or code, turn them into slide-friendly visuals rather than dense paragraphs.`
        + `

# SLIDE FORMULA RULES (critical)
- If mathematical, physics, statistics, or scientific notation appears, write it in LaTeX, not plain text.
- Use $...$ for inline formulas and $$...$$ for display formulas. Prefer display formulas for important equations so they have enough room.
- Use proper LaTeX syntax for limits, derivatives, fractions, roots, sums/products, matrices, vectors, deltas and Greek symbols, e.g. \\lim_{h\\to 0}, \\frac{f(a+h)-f(a)}{h}, f'(a), \\Delta y/\\Delta x.
- Keep formulas inside dedicated equation blocks with enough width and padding. Do not split an equation across unrelated spans, badges, labels, SVG text, or animated text fragments.
- Do not animate individual characters inside formulas. Animate the equation block as a whole if needed.
- Never place formula text on top of curves, axes, labels, cards, controls, or decorative graphics.

# SLIDE LAYOUT SAFETY (critical)
- Prevent overlapping content. Text, labels, chips, cards, controls, icons, charts and decorative graphics must not cover each other at desktop or mobile widths.
- Use explicit layout primitives: CSS grid/flex, fixed 16:9 slide bounds, safe padding, min/max sizes, z-index layers, and overflow rules. Avoid absolute-positioned text unless it has its own reserved region.
- For diagrams, charts, curves, timelines, and SVG scenes, keep annotation labels outside busy lines/shapes or attach them with leader lines. Do not place labels directly on top of curves, axes, cards, or other labels.
- Keep bottom cards/callouts in a separate reserved band from the main illustration. If using overlays, give every overlay enough background, padding, and collision-free spacing.
- Avoid tiny floating text. All labels must fit their box; long words wrap or the label moves to a clearer area.
- Add responsive CSS so visual elements reflow rather than stack on top of each other. Test mentally at 1280x720, 1024x576, and 390x844.
- Prefer slightly simpler visuals over a crowded slide. If a complex animation would cause overlap, split it across multiple slides or animation steps.`
      : "";

  return `You are an expert front-end author of educational HTML documents. ${intro}

# OUTPUT CONTRACT (critical)
- Return ONLY one complete HTML document: it MUST start with <!DOCTYPE html> and end with </html>.
- Do NOT wrap the output in markdown code fences. Do NOT add commentary before or after.
- The document must be fully self-contained except for the CDN <script>/<link> tags specified below.
- Make it responsive and readable on mobile and desktop. Use semantic HTML.
- Write the human-readable CONTENT in Vietnamese unless the user clearly asks otherwise.
- Use precomposed (NFC) Unicode for Vietnamese (e.g. "ề", "ấ") — never base letter + separate combining accent.

${slideInstructions}

${themeSection}

# REQUIRED <head> INCLUDES
Include <meta charset="utf-8"> and <meta name="viewport" content="width=device-width, initial-scale=1">.
${headIncludes ? `Also include EXACTLY these tags in <head> (do not change versions, do not add other libraries):\n${headIncludes}` : "No external libraries are enabled — do not add any CDN scripts."}
${bodyEndIncludes ? `Include EXACTLY these tags right before </body>:\n${bodyEndIncludes}` : ""}

# ENABLED CAPABILITIES
${capInstructions || "None. Use only plain HTML/CSS (and minimal vanilla JS if essential)."}
${caps.length ? "Do NOT use any capability/library that is not listed above." : ""}

${styleSection}

# QUALITY BAR
- Clear visual hierarchy, comfortable spacing, accessible color contrast.
- Prefer selected theme colors when a theme is selected; otherwise choose a cohesive palette.
- Keep JavaScript minimal, robust, and free of console errors.`;
}

/** Strip stray markdown fences and leading prose, returning the HTML document. */
export function extractHtml(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  if (fence) s = fence[1].trim();
  const start = s.search(/<!DOCTYPE html|<html/i);
  if (start > 0) s = s.slice(start);
  // Compose Vietnamese diacritics (NFC) so accents don't render as separate marks.
  return s.trim().normalize("NFC");
}

/** Strip only markdown fences — for fragment edits (no doctype expected). */
export function extractFragment(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  if (fence) s = fence[1].trim();
  return s.normalize("NFC");
}
