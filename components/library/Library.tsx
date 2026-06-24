"use client";

import { useMemo } from "react";
import { FileQuestion, Sparkles, FolderPlus } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import type { FsNode } from "@/types";
import { FileCard } from "./FileCard";
import { Button } from "@/components/ui/button";
import { useDialog } from "@/components/ui/dialog";

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function Library() {
  const files = useWorkspace((s) => s.files);
  const manifest = useWorkspace((s) => s.manifest);
  const selection = useWorkspace((s) => s.selection);
  const search = useWorkspace((s) => s.search);
  const view = useWorkspace((s) => s.view);
  const roots = useWorkspace((s) => s.roots);
  const setAgentOpen = useWorkspace((s) => s.setAgentOpen);
  const createFolder = useWorkspace((s) => s.createFolder);
  const dialog = useDialog();

  const currentDir = selection.type === "folder" ? selection.path : "";
  const currentDirLabel =
    currentDir === ""
      ? roots[0]?.name ?? "Gốc"
      : roots.find((r) => `@${r.id}` === currentDir)?.name ??
        currentDir.split("/").pop() ??
        currentDir;

  async function newFolder() {
    const name = await dialog.prompt({
      title: "Tạo thư mục mới",
      description: `Trong "${currentDirLabel}"`,
      placeholder: "Tên thư mục",
      confirmText: "Tạo",
    });
    if (name?.trim()) {
      try {
        await createFolder(currentDir, name.trim());
      } catch (e) {
        await dialog.alert({
          title: "Không thể tạo thư mục",
          description: (e as Error).message,
          danger: true,
        });
      }
    }
  }

  const { title, list } = useMemo(() => {
    let result: FsNode[] = files;
    let label = "Tất cả tài liệu";

    if (selection.type === "favorites") {
      result = files.filter((f) => manifest.files[f.path]?.favorite);
      label = "Yêu thích";
    } else if (selection.type === "folder") {
      const p = selection.path;
      if (p === "") {
        // Primary root: its files are the un-namespaced ones.
        result = files.filter((f) => !f.path.startsWith("@"));
        label = roots[0]?.name ?? "Gốc";
      } else {
        result = files.filter((f) => f.path === p || f.path.startsWith(p + "/"));
        const root = roots.find((r) => `@${r.id}` === p);
        label = root ? root.name : p.split("/").pop()!;
      }
    } else if (selection.type === "collection") {
      const col = manifest.collections.find((c) => c.id === selection.id);
      const set = new Set(col?.paths ?? []);
      result = files.filter((f) => set.has(f.path));
      label = col?.name ?? "Bộ sưu tập";
    } else if (selection.type === "tag") {
      const tag = manifest.tags.find((t) => t.id === selection.id);
      result = files.filter((f) => manifest.files[f.path]?.tags.includes(selection.id));
      label = `#${tag?.name ?? ""}`;
    }

    if (search.trim()) {
      const q = normalize(search.trim());
      result = result.filter((f) => {
        const meta = manifest.files[f.path];
        const hay = normalize(`${meta?.title ?? ""} ${f.name} ${f.path}`);
        return hay.includes(q);
      });
    }

    return { title: label, list: result };
  }, [files, manifest, selection, search, roots]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">{list.length} tài liệu</span>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={newFolder}>
          <FolderPlus className="h-4 w-4" /> Thư mục mới
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {list.length === 0 ? (
          <EmptyState onCreate={() => setAgentOpen(true)} hasFiles={files.length > 0} />
        ) : view === "grid" ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {list.map((f) => (
              <FileCard key={f.path} node={f} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {list.map((f) => (
              <FileCard key={f.path} node={f} list />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreate, hasFiles }: { onCreate: () => void; hasFiles: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <FileQuestion className="h-10 w-10" />
      <p className="text-sm">
        {hasFiles ? "Không có tài liệu nào khớp." : "Thư mục này chưa có tài liệu HTML/Markdown/PDF."}
      </p>
      <Button variant="primary" size="sm" onClick={onCreate}>
        <Sparkles className="h-4 w-4" /> Tạo tài liệu bằng AI
      </Button>
    </div>
  );
}
