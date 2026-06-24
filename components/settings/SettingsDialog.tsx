"use client";

import { KeyRound, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/lib/settings-store";
import { PROVIDER_DEFAULTS, type ProviderId } from "@/types";
import { THEMES, CAPABILITIES, WRITING_STYLES } from "@/lib/themes";
import { cn } from "@/lib/utils";

const PROVIDER_IDS = Object.keys(PROVIDER_DEFAULTS) as ProviderId[];

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings();

  return (
    <Modal open={open} onClose={onClose} title="Cài đặt" className="max-w-xl">
      <div className="space-y-6">
        <section>
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4" /> Nhà cung cấp AI
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            API key chỉ lưu trong trình duyệt của bạn và được gửi qua máy chủ trung gian khi gọi AI.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            {PROVIDER_IDS.map((p) => (
              <button
                key={p}
                onClick={() => s.setActiveProvider(p)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm",
                  s.activeProvider === p ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-accent",
                )}
              >
                {s.activeProvider === p && <Check className="h-3.5 w-3.5 text-primary" />}
                {PROVIDER_DEFAULTS[p].label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {PROVIDER_IDS.map((p) => {
              const cfg = s.providers[p];
              const active = s.activeProvider === p;
              return (
                <div
                  key={p}
                  className={cn(
                    "rounded-xl border p-3",
                    active ? "border-primary/40 bg-primary/[0.03]" : "border-border",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{PROVIDER_DEFAULTS[p].label}</span>
                    {active && <span className="text-xs text-primary">Đang dùng</span>}
                  </div>
                  {p === "local" && (
                    <>
                      <label className="mb-1 block text-xs text-muted-foreground">Base URL</label>
                      <Input
                        value={cfg.baseURL ?? ""}
                        onChange={(e) => s.setProvider(p, { baseURL: e.target.value })}
                        placeholder="http://localhost:20128/v1"
                        className="mb-2"
                      />
                    </>
                  )}
                  <label className="mb-1 block text-xs text-muted-foreground">
                    {p === "local" ? "API Key (không bắt buộc)" : "API Key"}
                  </label>
                  <Input
                    type="password"
                    value={cfg.apiKey}
                    onChange={(e) => s.setProvider(p, { apiKey: e.target.value })}
                    placeholder={p === "local" ? "Để trống nếu gateway không yêu cầu" : `Khoá API ${PROVIDER_DEFAULTS[p].label}`}
                  />
                  <label className="mb-1 mt-2 block text-xs text-muted-foreground">Model</label>
                  <select
                    value={cfg.model}
                    onChange={(e) => s.setProvider(p, { model: e.target.value })}
                    className="h-9 w-full rounded-[var(--radius)] border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {PROVIDER_DEFAULTS[p].models.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    {!PROVIDER_DEFAULTS[p].models.includes(cfg.model) && (
                      <option value={cfg.model}>{cfg.model}</option>
                    )}
                  </select>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Mặc định khi tạo tài liệu</h3>
          <label className="mb-1 block text-xs text-muted-foreground">Theme mặc định</label>
          <div className="mb-3 flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => s.setDefaultTheme(t.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm",
                  s.defaultTheme === t.id ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-accent",
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
          <label className="mb-1 block text-xs text-muted-foreground">Phong cách viết mặc định</label>
          <div className="mb-3 flex flex-wrap gap-2">
            {WRITING_STYLES.map((st) => (
              <button
                key={st.id}
                onClick={() => s.setDefaultStyle(st.id)}
                title={st.description}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm",
                  s.defaultStyle === st.id ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-accent",
                )}
              >
                <span>{st.emoji}</span>
                {st.name}
              </button>
            ))}
          </div>
          <label className="mb-1 block text-xs text-muted-foreground">Năng lực bật sẵn</label>
          <div className="flex flex-wrap gap-2">
            {CAPABILITIES.map((c) => {
              const on = s.defaultCapabilities.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => s.toggleDefaultCapability(c.id)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm",
                    on ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-accent",
                  )}
                >
                  {on && <Check className="h-3.5 w-3.5 text-primary" />}
                  {c.name}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </Modal>
  );
}
