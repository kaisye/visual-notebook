import { streamText, type ModelMessage, type UserContent } from "ai";
import { getModel, resolveApiKey } from "@/lib/ai/providers";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import type { ProviderId } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Body {
  provider: ProviderId;
  model: string;
  apiKey?: string;
  baseURL?: string;
  themeId?: string;
  styleId?: string;
  capabilityIds: string[];
  sourceKind: "pdf" | "html" | "markdown" | "url" | "text";
  sourceName: string;
  sourceText?: string;
  images?: string[];
  sourceUrl?: string;
  prompt?: string;
}

function googleDocsExportUrl(url: URL): string | null {
  const match = url.pathname.match(/\/document\/d\/([^/]+)/);
  if (url.hostname === "docs.google.com" && match?.[1]) {
    return `https://docs.google.com/document/d/${match[1]}/export?format=txt`;
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchSourceFromUrl(rawUrl: string): Promise<{ name: string; text: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Link tai lieu khong hop le");
  }
  if (url.protocol !== "https:") {
    throw new Error("Chi ho tro link HTTPS public");
  }

  const fetchUrl = googleDocsExportUrl(url) ?? url.toString();
  const res = await fetch(fetchUrl, {
    headers: {
      accept: "text/html, text/plain, text/markdown, application/xhtml+xml;q=0.8, */*;q=0.5",
      "user-agent": "VisualNotebook/1.0",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    throw new Error(`Khong doc duoc link (${res.status})`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const raw = (await res.text()).slice(0, 250000);
  const text = contentType.includes("html") ? stripHtml(raw) : raw.trim();
  if (!text) throw new Error("Link khong co noi dung text de chuyen thanh slide");
  return { name: url.hostname + url.pathname, text };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Yeu cau khong hop le" }, { status: 400 });
  }

  const {
    provider,
    model,
    apiKey,
    baseURL,
    themeId,
    styleId,
    capabilityIds,
    sourceKind,
    sourceName,
    sourceUrl,
    prompt,
  } = body;

  let sourceText = body.sourceText?.trim() ?? "";
  let resolvedSourceName = sourceName;
  if (sourceUrl?.trim()) {
    try {
      const fetched = await fetchSourceFromUrl(sourceUrl.trim());
      sourceText = fetched.text;
      resolvedSourceName = fetched.name;
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 });
    }
  }
  if (!sourceText && !(body.images?.length)) {
    return Response.json({ error: "Chua co noi dung nguon de tao slide" }, { status: 400 });
  }

  let key: string;
  try {
    key = resolveApiKey(provider, apiKey);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  const system = buildSystemPrompt({ themeId, styleId, capabilityIds, mode: "slides" });
  const content: UserContent = [
    {
      type: "text",
      text:
        `Source kind: ${sourceKind}\n` +
        `Source name: ${resolvedSourceName || "untitled"}\n\n` +
        `User conversion request:\n${prompt?.trim() || "(none; create the most useful learner-facing deck)"}\n\n` +
        `Source content:\n${sourceText || "(no extracted text; use images if provided)"}`,
    },
    ...(body.images ?? []).map((img) => {
      const m = img.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
      return m
        ? { type: "image" as const, image: m[2], mediaType: m[1] }
        : { type: "image" as const, image: img };
    }),
  ];
  const messages: ModelMessage[] = [{ role: "user", content }];

  try {
    const result = streamText({
      model: getModel({ provider, modelId: model, apiKey: key, baseURL }),
      system,
      messages,
      maxOutputTokens: provider === "google" ? 9000 : 18000,
      temperature: provider === "local" ? undefined : 0.35,
    });
    return result.toTextStreamResponse();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
