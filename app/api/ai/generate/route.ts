import { streamText, type ModelMessage } from "ai";
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
  mode: "generate" | "edit" | "fragment";
  applyTheme?: boolean;
  prompt: string;
  currentHtml?: string; // full doc for "edit", or the selected snippet for "fragment"
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  const { provider, model, apiKey, baseURL, themeId, styleId, capabilityIds, mode, applyTheme, prompt, currentHtml } = body;
  if (!prompt?.trim()) {
    return Response.json({ error: "Thiếu nội dung yêu cầu" }, { status: 400 });
  }

  let key: string;
  try {
    key = resolveApiKey(provider, apiKey);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  const system = buildSystemPrompt({ themeId, styleId, capabilityIds, mode, applyTheme });

  let messages: ModelMessage[];
  if (mode === "fragment" && currentHtml) {
    messages = [
      {
        role: "user",
        content:
          `Đoạn HTML cần sửa (trích từ một tài liệu lớn hơn):\n\n${currentHtml}\n\n` +
          `Yêu cầu: ${prompt}\n\n` +
          `Chỉ trả về đúng đoạn HTML đã chỉnh sửa để thay thế đoạn trên.`,
      },
    ];
  } else if (mode === "edit" && currentHtml) {
    messages = [
      {
        role: "user",
        content:
          `Đây là file HTML hiện tại:\n\n${currentHtml}\n\n` +
          `Yêu cầu chỉnh sửa: ${prompt}\n\n` +
          `Trả về TOÀN BỘ file HTML đã chỉnh sửa (giữ nguyên những phần không liên quan).`,
      },
    ];
  } else {
    messages = [{ role: "user", content: prompt }];
  }

  try {
    const result = streamText({
      model: getModel({ provider, modelId: model, apiKey: key, baseURL }),
      system,
      messages,
      maxOutputTokens: provider === "google" ? 8000 : 16000,
      temperature: provider === "local" ? undefined : 0.6,
    });
    return result.toTextStreamResponse();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
