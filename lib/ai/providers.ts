import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { DEFAULT_LOCAL_BASE_URL, type ProviderId } from "@/types";

/** Env-var fallback when the browser did not send a key. */
const ENV_KEY: Record<Exclude<ProviderId, "local">, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

export function resolveApiKey(provider: ProviderId, fromClient?: string): string {
  // The local OpenAI-compatible gateway needs no key.
  if (provider === "local") return (fromClient && fromClient.trim()) || "local";

  const envName = ENV_KEY[provider];
  const key = (fromClient && fromClient.trim()) || process.env[envName] || "";
  if (!key) {
    throw new Error(
      `Thiếu API key cho ${provider}. Hãy nhập trong phần Cài đặt hoặc đặt biến môi trường ${envName}.`,
    );
  }
  return key;
}

export interface ModelArgs {
  provider: ProviderId;
  modelId: string;
  apiKey: string;
  baseURL?: string;
}

/** Build a Vercel AI SDK language model for the chosen provider. */
export function getModel({ provider, modelId, apiKey, baseURL }: ModelArgs): LanguageModel {
  switch (provider) {
    case "local":
      return createOpenAICompatible({
        name: "local-gateway",
        baseURL: (baseURL && baseURL.trim()) || DEFAULT_LOCAL_BASE_URL,
        apiKey,
      })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId);
    default:
      throw new Error(`Provider không hỗ trợ: ${provider}`);
  }
}
