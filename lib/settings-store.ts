"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  defaultSettings,
  type ProviderConfig,
  type ProviderId,
  type Settings,
} from "@/types";

interface SettingsState extends Settings {
  setActiveProvider: (p: ProviderId) => void;
  setProvider: (p: ProviderId, cfg: Partial<ProviderConfig>) => void;
  setDefaultTheme: (id: string) => void;
  setDefaultStyle: (id: string) => void;
  toggleDefaultCapability: (id: string) => void;
  hasActiveKey: () => boolean;
}

/**
 * AI provider config + generation defaults, persisted to localStorage. API keys
 * live only in the browser and are sent per-request to our serverless proxy.
 */
export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings(),
      setActiveProvider: (p) => set({ activeProvider: p }),
      setProvider: (p, cfg) =>
        set((s) => ({
          providers: { ...s.providers, [p]: { ...s.providers[p], ...cfg } },
        })),
      setDefaultTheme: (id) => set({ defaultTheme: id }),
      setDefaultStyle: (id) => set({ defaultStyle: id }),
      toggleDefaultCapability: (id) =>
        set((s) => ({
          defaultCapabilities: s.defaultCapabilities.includes(id)
            ? s.defaultCapabilities.filter((c) => c !== id)
            : [...s.defaultCapabilities, id],
        })),
      hasActiveKey: () => {
        const s = get();
        // The local OpenAI-compatible gateway needs no API key.
        if (s.activeProvider === "local") return true;
        return Boolean(s.providers[s.activeProvider]?.apiKey?.trim());
      },
    }),
    {
      name: "vn-settings",
      // Deep-merge persisted state so newly added providers (e.g. "local")
      // always exist even for users with older saved settings.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        return {
          ...current,
          ...p,
          providers: { ...current.providers, ...(p.providers ?? {}) },
        };
      },
    },
  ),
);
