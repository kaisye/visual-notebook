"use client";

import { useState } from "react";
import { Star, Plus, Check } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PropertiesPanel({ path }: { path: string }) {
  const manifest = useWorkspace((s) => s.manifest);
  const updateFileMeta = useWorkspace((s) => s.updateFileMeta);
  const toggleFavorite = useWorkspace((s) => s.toggleFavorite);
  const toggleFileTag = useWorkspace((s) => s.toggleFileTag);
  const createTag = useWorkspace((s) => s.createTag);

  const meta = manifest.files[path];
  const [title, setTitle] = useState(meta?.title ?? "");
  const [notes, setNotes] = useState(meta?.notes ?? "");
  const [newTag, setNewTag] = useState("");

  async function addTag() {
    const name = newTag.trim();
    if (!name) return;
    const existing = manifest.tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    const tag = existing ?? (await createTag(name));
    await toggleFileTag(path, tag.id);
    setNewTag("");
  }

  return (
    <div className="flex w-64 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-card p-4 text-sm">
      <div>
        <Label>Tiêu đề</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => updateFileMeta(path, { title })}
          placeholder="Tiêu đề hiển thị"
        />
      </div>

      <button
        onClick={() => toggleFavorite(path)}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent",
          meta?.favorite && "text-yellow-600",
        )}
      >
        <Star className="h-4 w-4" fill={meta?.favorite ? "currentColor" : "none"} />
        {meta?.favorite ? "Đang yêu thích" : "Đánh dấu yêu thích"}
      </button>

      <div>
        <Label>Nhãn</Label>
        <div className="flex flex-wrap gap-1.5">
          {manifest.tags.map((t) => {
            const on = meta?.tags.includes(t.id);
            return (
              <button key={t.id} onClick={() => toggleFileTag(path, t.id)} className="transition-opacity">
                <span className={cn("transition", !on && "opacity-40 grayscale")}>
                  <Badge color={t.color}>
                    {on && <Check className="h-3 w-3" />}
                    {t.name}
                  </Badge>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-1">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            placeholder="Nhãn mới…"
            className="h-8"
          />
          <button onClick={addTag} className="rounded-md border border-border px-2 hover:bg-accent" title="Thêm nhãn">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <Label>Ghi chú</Label>
        <Textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => updateFileMeta(path, { notes })}
          placeholder="Ghi chú của bạn…"
        />
      </div>

      <div className="mt-auto space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <p className="break-all">📁 {path}</p>
        {meta?.theme && <p>🎨 Theme: {meta.theme}</p>}
        {meta?.updatedAt && (
          <p>🕒 {new Date(meta.updatedAt).toLocaleString("vi-VN")}</p>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>;
}
