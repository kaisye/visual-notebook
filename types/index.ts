export type FileKind = "html" | "markdown" | "pdf" | "other";

/** Per-file metadata stored in the manifest, keyed by relative path. */
export interface FileMeta {
  id: string;
  title?: string;
  tags: string[]; // tag ids
  notes?: string;
  theme?: string; // theme id used when generated
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

/** A virtual collection ("smart folder") referencing files by relative path. */
export interface Collection {
  id: string;
  name: string;
  emoji?: string;
  paths: string[]; // relative paths
}

export interface Manifest {
  version: number;
  collections: Collection[];
  tags: Tag[];
  files: Record<string, FileMeta>; // key = relative path
}

export const MANIFEST_VERSION = 1;

export function emptyManifest(): Manifest {
  return { version: MANIFEST_VERSION, collections: [], tags: [], files: {} };
}

/** A node in the on-disk folder tree. */
export interface FsNode {
  name: string;
  path: string; // relative path from the root directory
  kind: "directory" | "file";
  fileKind?: FileKind;
  size?: number;
  children?: FsNode[];
}

export type ProviderId = "local" | "anthropic" | "openai" | "google";

export interface ProviderConfig {
  apiKey: string;
  model: string;
  /** Custom OpenAI-compatible base URL (used by the "local" provider). */
  baseURL?: string;
}

export interface Settings {
  activeProvider: ProviderId;
  providers: Record<ProviderId, ProviderConfig>;
  defaultTheme: string;
  defaultStyle: string;
  defaultCapabilities: string[];
}

export const DEFAULT_LOCAL_BASE_URL = "http://localhost:20128/v1";

export const PROVIDER_DEFAULTS: Record<
  ProviderId,
  { label: string; model: string; models: string[]; baseURL?: string; noKey?: boolean }
> = {
  local: {
    label: "Local Gateway (OpenAI-compatible)",
    model: "cx/gpt-5.5",
    models: [
      "cx/gpt-5.5",
      "cx/gpt-5.2",
      "cx/gpt-5.2-codex",
      "ag/gemini-3-flash",
      "ag/gemini-3.1-pro-high",
      "ag/claude-sonnet-4-6",
      "ag/claude-opus-4-6-thinking",
    ],
    baseURL: DEFAULT_LOCAL_BASE_URL,
    noKey: true,
  },
  anthropic: {
    label: "Claude (Anthropic)",
    model: "claude-sonnet-4-6",
    models: ["claude-sonnet-4-6", "claude-opus-4-8", "claude-haiku-4-5-20251001"],
  },
  openai: {
    label: "OpenAI",
    model: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1"],
  },
  google: {
    label: "Google Gemini",
    model: "gemini-2.0-flash",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  },
};

export function defaultSettings(): Settings {
  return {
    activeProvider: "local",
    providers: {
      local: {
        apiKey: "",
        model: PROVIDER_DEFAULTS.local.model,
        baseURL: DEFAULT_LOCAL_BASE_URL,
      },
      anthropic: { apiKey: "", model: PROVIDER_DEFAULTS.anthropic.model },
      openai: { apiKey: "", model: PROVIDER_DEFAULTS.openai.model },
      google: { apiKey: "", model: PROVIDER_DEFAULTS.google.model },
    },
    defaultTheme: "modern",
    defaultStyle: "balanced",
    defaultCapabilities: ["math", "charts"],
  };
}
