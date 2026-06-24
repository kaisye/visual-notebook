"use client";

import { useState } from "react";
import {
  ChevronRight, Folder, FolderOpen, Files, Star, Hash, Plus,
  Layers, Trash2, FolderTree, FolderPlus, X,
} from "lucide-react";
import { useWorkspace, type SidebarSelection, type WorkspaceRoot } from "@/lib/store";
import type { FsNode } from "@/types";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/dialog";
import { FILE_DRAG_TYPE } from "@/lib/dnd";

function hasFileDrag(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes(FILE_DRAG_TYPE);
}

export function Sidebar() {
  const roots = useWorkspace((s) => s.roots);
  const selection = useWorkspace((s) => s.selection);
  const setSelection = useWorkspace((s) => s.setSelection);
  const manifest = useWorkspace((s) => s.manifest);
  const createCollection = useWorkspace((s) => s.createCollection);
  const deleteCollection = useWorkspace((s) => s.deleteCollection);
  const createTag = useWorkspace((s) => s.createTag);
  const deleteTag = useWorkspace((s) => s.deleteTag);
  const createFolder = useWorkspace((s) => s.createFolder);
  const moveFile = useWorkspace((s) => s.moveFile);
  const addRoot = useWorkspace((s) => s.addRoot);
  const removeRoot = useWorkspace((s) => s.removeRoot);
  const dialog = useDialog();

  async function removeRootWithConfirm(id: string, name: string) {
    const ok = await dialog.confirm({
      title: "Gỡ thư mục khỏi workspace",
      description: `Gỡ "${name}" khỏi workspace? File trên ổ đĩa không bị xoá.`,
      confirmText: "Gỡ",
      danger: true,
    });
    if (ok) await removeRoot(id);
  }

  async function newFolder(parentPath: string, label: string) {
    const name = await dialog.prompt({
      title: "Tạo thư mục mới",
      description: `Trong "${label}"`,
      placeholder: "Tên thư mục",
      confirmText: "Tạo",
    });
    if (name?.trim()) {
      try {
        await createFolder(parentPath, name.trim());
      } catch (e) {
        await dialog.alert({
          title: "Không thể tạo thư mục",
          description: (e as Error).message,
          danger: true,
        });
      }
    }
  }

  async function addCollection() {
    const name = await dialog.prompt({
      title: "Bộ sưu tập mới",
      placeholder: "Tên bộ sưu tập",
      confirmText: "Tạo",
    });
    if (name?.trim()) await createCollection(name.trim());
  }
  async function addTag() {
    const name = await dialog.prompt({
      title: "Nhãn mới",
      placeholder: "Tên nhãn",
      confirmText: "Tạo",
    });
    if (name?.trim()) await createTag(name.trim());
  }

  async function moveFileTo(filePath: string, targetPath: string) {
    try {
      await moveFile(filePath, targetPath);
    } catch (e) {
      await dialog.alert({
        title: "KhÃ´ng thá»ƒ di chuyá»ƒn file",
        description: (e as Error).message,
        danger: true,
      });
    }
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar text-sidebar-foreground">
      <nav className="flex flex-col gap-0.5 p-2">
        <Item
          icon={<Files className="h-4 w-4" />}
          label="Tất cả tài liệu"
          active={selection.type === "all"}
          onClick={() => setSelection({ type: "all" })}
        />
        <Item
          icon={<Star className="h-4 w-4" />}
          label="Yêu thích"
          active={selection.type === "favorites"}
          onClick={() => setSelection({ type: "favorites" })}
        />
      </nav>

      <Section
        icon={<FolderTree className="h-3.5 w-3.5" />}
        label="Thư mục"
        action={<AddBtn onClick={addRoot} title="Thêm thư mục vào workspace" />}
      >
        {roots.length === 0 && <Empty>Chưa có thư mục</Empty>}
        {roots.map((r, i) => (
          <RootNode
            key={r.id}
            root={r}
            rootPath={i === 0 ? "" : `@${r.id}`}
            primary={i === 0}
            selection={selection}
            onSelect={setSelection}
            onNewFolder={newFolder}
            onDropFile={moveFileTo}
            onRemove={() => removeRootWithConfirm(r.id, r.name)}
          />
        ))}
      </Section>

      <Section
        icon={<Layers className="h-3.5 w-3.5" />}
        label="Bộ sưu tập"
        action={<AddBtn onClick={addCollection} />}
      >
        {manifest.collections.length === 0 && <Empty>Chưa có bộ sưu tập</Empty>}
        {manifest.collections.map((c) => (
          <RowWithDelete
            key={c.id}
            active={selection.type === "collection" && selection.id === c.id}
            onClick={() => setSelection({ type: "collection", id: c.id })}
            onDelete={() => deleteCollection(c.id)}
            icon={<Layers className="h-4 w-4" />}
            label={`${c.name}`}
            count={c.paths.length}
          />
        ))}
      </Section>

      <Section
        icon={<Hash className="h-3.5 w-3.5" />}
        label="Nhãn"
        action={<AddBtn onClick={addTag} />}
      >
        {manifest.tags.length === 0 && <Empty>Chưa có nhãn</Empty>}
        {manifest.tags.map((t) => (
          <RowWithDelete
            key={t.id}
            active={selection.type === "tag" && selection.id === t.id}
            onClick={() => setSelection({ type: "tag", id: t.id })}
            onDelete={() => deleteTag(t.id)}
            icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />}
            label={t.name}
          />
        ))}
      </Section>
    </aside>
  );
}

function RootNode({
  root, rootPath, primary, selection, onSelect, onNewFolder, onDropFile, onRemove,
}: {
  root: WorkspaceRoot;
  rootPath: string;
  primary: boolean;
  selection: SidebarSelection;
  onSelect: (s: SidebarSelection) => void;
  onNewFolder: (parentPath: string, label: string) => void;
  onDropFile: (filePath: string, targetFolderPath: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const childDirs = root.tree.filter((c) => c.kind === "directory");
  const active = selection.type === "folder" && selection.path === rootPath;

  return (
    <div>
      <div
        className={cn(
          "group flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-sm hover:bg-accent",
          active && "bg-accent font-medium",
          dragOver && "bg-accent ring-2 ring-primary/40",
        )}
        style={{ paddingLeft: 6 }}
        onClick={() => onSelect({ type: "folder", path: rootPath })}
        onDragOver={(e) => {
          if (!hasFileDrag(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setDragOver(false);
        }}
        onDrop={(e) => {
          if (!hasFileDrag(e)) return;
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          const filePath = e.dataTransfer.getData(FILE_DRAG_TYPE);
          if (filePath) onDropFile(filePath, rootPath);
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className={cn("shrink-0 text-muted-foreground", childDirs.length === 0 && "invisible")}
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
        </button>
        {open && childDirs.length > 0 ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-primary" />
        )}
        <span className="min-w-0 flex-1 truncate font-medium">{root.name}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onNewFolder(rootPath, root.name); setOpen(true); }}
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:bg-background hover:text-foreground group-hover:opacity-100"
          title="Tạo thư mục con"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
        {!primary && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:bg-background hover:text-danger group-hover:opacity-100"
            title="Gỡ khỏi workspace"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open &&
        childDirs.map((c) => (
          <TreeNode
            key={c.path}
            node={c}
            depth={1}
            selection={selection}
            onSelect={onSelect}
            onNewFolder={onNewFolder}
            onDropFile={onDropFile}
          />
        ))}
    </div>
  );
}

function TreeNode({
  node, depth, selection, onSelect, onNewFolder, onDropFile,
}: {
  node: FsNode;
  depth: number;
  selection: SidebarSelection;
  onSelect: (s: SidebarSelection) => void;
  onNewFolder: (parentPath: string, label: string) => void;
  onDropFile: (filePath: string, targetFolderPath: string) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const [dragOver, setDragOver] = useState(false);
  const childDirs = (node.children ?? []).filter((c) => c.kind === "directory");
  const active = selection.type === "folder" && selection.path === node.path;

  return (
    <div>
      <div
        className={cn(
          "group flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-sm hover:bg-accent",
          active && "bg-accent font-medium",
          dragOver && "bg-accent ring-2 ring-primary/40",
        )}
        style={{ paddingLeft: depth * 12 + 6 }}
        onClick={() => onSelect({ type: "folder", path: node.path })}
        onDragOver={(e) => {
          if (!hasFileDrag(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOver(true);
          if (childDirs.length > 0) setOpen(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setDragOver(false);
        }}
        onDrop={(e) => {
          if (!hasFileDrag(e)) return;
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          const filePath = e.dataTransfer.getData(FILE_DRAG_TYPE);
          if (filePath) onDropFile(filePath, node.path);
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className={cn("shrink-0 text-muted-foreground", childDirs.length === 0 && "invisible")}
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
        </button>
        {open && childDirs.length > 0 ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onNewFolder(node.path, node.name); setOpen(true); }}
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:bg-background hover:text-foreground group-hover:opacity-100"
          title="Tạo thư mục con"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
      </div>
      {open &&
        childDirs.map((c) => (
          <TreeNode
            key={c.path}
            node={c}
            depth={depth + 1}
            selection={selection}
            onSelect={onSelect}
            onNewFolder={onNewFolder}
            onDropFile={onDropFile}
          />
        ))}
    </div>
  );
}

function Item({
  icon, label, active, onClick, depth = 0,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  depth?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{ paddingLeft: depth ? depth * 12 + 6 : undefined }}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
        active && "bg-accent font-medium",
      )}
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function RowWithDelete({
  icon, label, count, active, onClick, onDelete,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
        active && "bg-accent font-medium",
      )}
    >
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
          {icon}
        </span>
        <span className="truncate">{label}</span>
        {typeof count === "number" && (
          <span className="ml-auto text-xs text-muted-foreground">{count}</span>
        )}
      </button>
      <button
        onClick={onDelete}
        className="shrink-0 text-muted-foreground opacity-0 hover:text-danger group-hover:opacity-100"
        title="Xoá"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Section({
  icon, label, action, children,
}: {
  icon: React.ReactNode;
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="px-2 py-1">
      <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function AddBtn({ onClick, title = "Thêm" }: { onClick: () => void; title?: string }) {
  return (
    <button onClick={onClick} className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground" title={title}>
      <Plus className="h-3.5 w-3.5" />
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-2 py-1 text-xs text-muted-foreground">{children}</p>;
}
