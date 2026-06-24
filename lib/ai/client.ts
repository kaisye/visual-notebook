"use client";

import type { ProviderId } from "@/types";

export interface GenerateArgs {
  provider: ProviderId;
  model: string;
  apiKey?: string;
  baseURL?: string;
  themeId?: string;
  styleId?: string;
  capabilityIds: string[];
  mode: "generate" | "edit" | "fragment";
  applyTheme?: boolean;
  prompt: string;
  currentHtml?: string;
}

/** POST to the streaming generate route, invoking `onChunk` with accumulated text. */
export async function streamGenerate(
  args: GenerateArgs,
  onChunk: (full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
    signal,
  });

  if (!res.ok || !res.body) {
    let msg = "Lỗi gọi AI";
    try {
      const j = await res.json();
      msg = j.error ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onChunk(full);
  }
  return full;
}

/** POST extracted PDF content (text + page images) to convert into HTML. */
export async function convertPdf(
  body: {
    provider: ProviderId;
    model: string;
    apiKey?: string;
    baseURL?: string;
    themeId?: string;
    styleId?: string;
    capabilityIds: string[];
    text: string;
    images: string[]; // data URLs
    fileName: string;
    prompt?: string;
  },
  onChunk: (full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch("/api/ai/pdf-to-html", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    let msg = "Lỗi chuyển PDF";
    try {
      const j = await res.json();
      msg = j.error ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onChunk(full);
  }
  return full;
}

/** Convert an extracted source or public URL into an interactive HTML slide deck. */
export async function convertToSlides(
  body: {
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
  },
  onChunk: (full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch("/api/ai/slides", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    let msg = "Lỗi tạo slide";
    try {
      const j = await res.json();
      msg = j.error ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onChunk(full);
  }
  return full;
}
