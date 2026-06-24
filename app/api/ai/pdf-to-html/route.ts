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
  text: string;
  images: string[]; // data URLs
  fileName: string;
  prompt?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  const { provider, model, apiKey, baseURL, themeId, styleId, capabilityIds, text, images, fileName, prompt } = body;

  let key: string;
  try {
    key = resolveApiKey(provider, apiKey);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  const system = buildSystemPrompt({ themeId, styleId, capabilityIds, mode: "pdf" });

  const content: UserContent = [
    {
      type: "text",
      text:
        `Tên tài liệu gốc: ${fileName}\n\n` +
        `Nội dung văn bản đã trích từ PDF:\n\n${text || "(không trích được văn bản)"}\n\n` +
        (images.length
          ? "Dưới đây là ảnh chụp các trang để bạn tham khảo bố cục, bảng biểu và hình ảnh:"
          : ""),
    },
    ...images.map((img) => {
      const m = img.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
      return m
        ? { type: "image" as const, image: m[2], mediaType: m[1] }
        : { type: "image" as const, image: img };
    }),
    {
      type: "text",
      text:
        "Hãy dựng lại thành MỘT tài liệu HTML hoàn chỉnh, đẹp và dễ đọc theo hướng dẫn thiết kế đã chỉ định. " +
        "Giữ cấu trúc tiêu đề/mục, công thức toán (dùng LaTeX nếu bật Math), bảng và danh sách. " +
        "Diễn giải lại mạch lạc thay vì sao chép thô; bỏ phần header/footer/đánh số trang vô nghĩa.",
    },
    ...(prompt?.trim()
      ? [{ type: "text" as const, text: `Yeu cau bo sung cua nguoi dung:\n${prompt.trim()}` }]
      : []),
  ];

  const messages: ModelMessage[] = [{ role: "user", content }];

  try {
    const result = streamText({
      model: getModel({ provider, modelId: model, apiKey: key, baseURL }),
      system,
      messages,
      maxOutputTokens: provider === "google" ? 8000 : 16000,
      temperature: provider === "local" ? undefined : 0.4,
    });
    return result.toTextStreamResponse();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
