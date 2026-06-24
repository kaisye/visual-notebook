"use client";

import { Check } from "lucide-react";
import { THEMES, CAPABILITIES, WRITING_STYLES } from "@/lib/themes";
import { cn } from "@/lib/utils";

export function ThemePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {THEMES.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(active ? "" : t.id)}
            title={active ? "Bấm lần nữa để không dùng theme" : t.description}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-2 rounded-lg border p-2 text-left text-xs",
              active ? "border-primary ring-1 ring-primary" : "border-border hover:bg-accent",
            )}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
              style={{ background: t.preview.bg, color: t.preview.accent, border: `1px solid ${t.preview.accent}33` }}
            >
              Aa
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{t.name}</span>
            </span>
            {active && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}

export function StylePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {WRITING_STYLES.map((st) => {
        const active = value === st.id;
        return (
          <button
            key={st.id}
            onClick={() => onChange(active ? "" : st.id)}
            title={active ? "Bấm lần nữa để không dùng phong cách viết" : st.description}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-2 rounded-lg border p-2 text-left text-xs",
              active ? "border-primary ring-1 ring-primary" : "border-border hover:bg-accent",
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-base">
              {st.emoji}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{st.name}</span>
            </span>
            {active && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}

export function CapabilityChips({
  value,
  onToggle,
}: {
  value: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CAPABILITIES.map((c) => {
        const on = value.includes(c.id);
        return (
          <button
            key={c.id}
            onClick={() => onToggle(c.id)}
            title={c.description}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
              on ? "border-primary bg-primary/10 font-medium text-primary" : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {on && <Check className="h-3 w-3" />}
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
