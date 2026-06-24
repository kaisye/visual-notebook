"use client";

import { FileCode2, FileText, File as FileIcon, Star, MoreVertical, Trash2, FolderPlus, ExternalLink, NotebookText, Pencil } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import type { FsNode } from "@/types";
import { getTheme } from "@/lib/themes";
import { Badge } from "@/components/ui/badge";
import { Menu, MenuItem } from "@/components/ui/menu";
import { useDialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FILE_DRAG_TYPE } from "@/lib/dnd";

const KIND_ICON = {
  html: FileCode2,
  markdown: NotebookText,
  pdf: FileText,
  other: FileIcon,
};

export function FileCard({ node, list }: { node: FsNode; list?: boolean }) {
  const manifest = useWorkspace((s) => s.manifest);
  const openFile = useWorkspace((s) => s.openFile);
  const toggleFavorite = useWorkspace((s) => s.toggleFavorite);
  const deleteFile = useWorkspace((s) => s.deleteFile);
  const renameFile = useWorkspace((s) => s.renameFile);
  const collections = manifest.collections;
  const toggleInCollection = useWorkspace((s) => s.toggleInCollection);
  const dialog = useDialog();

  const meta = manifest.files[node.path];
  const title = meta?.title?.trim() || node.name.replace(/\.[^.]+$/, "");
  const Icon = KIND_ICON[node.fileKind ?? "other"];
  const tags = (meta?.tags ?? [])
    .map((id) => manifest.tags.find((t) => t.id === id))
    .filter(Boolean);
  const theme = getTheme(meta?.theme);

  async function onDelete() {
    const ok = await dialog.confirm({
      title: "Xoá tài liệu",
      description: `Xoá "${node.name}" khỏi ổ đĩa? Hành động này không thể hoàn tác.`,
      confirmText: "Xoá",
      danger: true,
    });
    if (ok) await deleteFile(node.path);
  }

  async function onRename() {
    const newName = await dialog.prompt({
      title: "Đổi tên file",
      description: "Đổi tên file trên ổ đĩa (giữ nguyên phần mở rộng nếu bỏ trống).",
      defaultValue: node.name,
      placeholder: "ten-file.html",
      confirmText: "Đổi tên",
    });
    if (newName?.trim() && newName.trim() !== node.name) {
      try {
        await renameFile(node.path, newName.trim());
      } catch (e) {
        await dialog.alert({
          title: "Không thể đổi tên",
          description: (e as Error).message,
          danger: true,
        });
      }
    }
  }

  function onDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(FILE_DRAG_TYPE, node.path);
    e.dataTransfer.setData("text/plain", node.path);
  }

  const kebab = (
    <Menu
      trigger={
        <button className="rounded-md p-1 text-muted-foreground hover:bg-accent" title="Tuỳ chọn">
          <MoreVertical className="h-4 w-4" />
        </button>
      }
    >
      {(close) => (
        <>
          <MenuItem icon={<ExternalLink className="h-4 w-4" />} onClick={() => { openFile(node.path); close(); }}>
            Mở
          </MenuItem>
          <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={() => { onRename(); close(); }}>
            Đổi tên
          </MenuItem>
          {collections.length > 0 && (
            <div className="my-1 border-t border-border" />
          )}
          {collections.map((c) => {
            const inside = c.paths.includes(node.path);
            return (
              <MenuItem
                key={c.id}
                icon={<FolderPlus className="h-4 w-4" />}
                onClick={() => { toggleInCollection(c.id, node.path); close(); }}
              >
                {inside ? "Bỏ khỏi" : "Thêm vào"} “{c.name}”
              </MenuItem>
            );
          })}
          <div className="my-1 border-t border-border" />
          <MenuItem icon={<Trash2 className="h-4 w-4" />} danger onClick={() => { onDelete(); close(); }}>
            Xoá file
          </MenuItem>
        </>
      )}
    </Menu>
  );

  if (list) {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onClick={() => openFile(node.path)}
        className="group flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 hover:border-border hover:bg-accent/50"
      >
        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
        <div className="hidden items-center gap-1 sm:flex">
          {tags.map((t) => t && <Badge key={t.id} color={t.color}>{t.name}</Badge>)}
        </div>
        <span className="hidden w-40 truncate text-xs text-muted-foreground md:block">{node.path}</span>
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(node.path); }}
          className={cn("shrink-0", meta?.favorite ? "text-yellow-500" : "text-muted-foreground opacity-0 group-hover:opacity-100")}
        >
          <Star className="h-4 w-4" fill={meta?.favorite ? "currentColor" : "none"} />
        </button>
        {kebab}
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={() => openFile(node.path)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div
        className="relative flex h-28 items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${theme.preview.bg}, color-mix(in srgb, ${theme.preview.accent} 22%, ${theme.preview.bg}))`,
        }}
      >
        <Icon className="h-9 w-9" style={{ color: theme.preview.accent }} />
        <span
          className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
          style={{ background: theme.preview.accent, color: "#fff" }}
        >
          {node.fileKind}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(node.path); }}
          className={cn(
            "absolute right-2 top-2 rounded-md bg-black/10 p-1 backdrop-blur",
            meta?.favorite ? "text-yellow-400" : "text-white/80 opacity-0 group-hover:opacity-100",
          )}
        >
          <Star className="h-4 w-4" fill={meta?.favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-1">
          <span className="line-clamp-2 text-sm font-medium leading-snug">{title}</span>
          {kebab}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => t && <Badge key={t.id} color={t.color}>{t.name}</Badge>)}
          </div>
        )}
      </div>
    </div>
  );
}
