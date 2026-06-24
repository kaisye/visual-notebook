"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import {
  type Collection,
  type FileMeta,
  type FsNode,
  type Manifest,
  type Tag,
  emptyManifest,
} from "@/types";
import {
  ensurePermission,
  flattenFiles,
  forgetDirectories,
  getStoredDirectories,
  isFsAccessSupported,
  pickDirectory,
  scanTree,
  setStoredDirectories,
} from "@/lib/fs/directory";
import { readManifest, writeManifest } from "@/lib/fs/manifest";
import {
  deleteEntry,
  ensureDir,
  getFile,
  moveEntry,
  pathExists,
  readTextFile,
  slugify,
  uniqueHtmlPath,
  writeTextFile,
} from "@/lib/fs/file-ops";
import { baseName } from "@/lib/utils";

export type ConnStatus =
  | "idle"
  | "unsupported"
  | "connecting"
  | "needs-permission"
  | "connected"
  | "error";

export type SidebarSelection =
  | { type: "all" }
  | { type: "favorites" }
  | { type: "folder"; path: string }
  | { type: "collection"; id: string }
  | { type: "tag"; id: string };

export interface EditorFragmentSelection {
  path: string;
  from: number;
  to: number;
  text: string;
  html: string;
}

/** One top-level folder in the workspace. `roots[0]` is the primary root. */
export interface WorkspaceRoot {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  tree: FsNode[];
}

const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

interface WorkspaceState {
  status: ConnStatus;
  error?: string;
  roots: WorkspaceRoot[];
  root: FileSystemDirectoryHandle | null; // primary handle (derived, for status/display)
  rootName: string; // primary name (derived, for display)
  files: FsNode[]; // flattened file list across all roots (namespaced paths)
  manifest: Manifest;
  selection: SidebarSelection;
  openPath: string | null;
  reloadToken: number;
  search: string;
  view: "grid" | "list";
  agentOpen: boolean;
  editorSelection: EditorFragmentSelection | null;

  init: () => Promise<void>;
  connect: () => Promise<void>;
  reconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  disconnect: () => Promise<void>;
  addRoot: () => Promise<void>;
  removeRoot: (id: string) => Promise<void>;

  readText: (path: string) => Promise<string>;
  getFileObj: (path: string) => Promise<File>;

  setSelection: (s: SidebarSelection) => void;
  setSearch: (q: string) => void;
  setView: (v: "grid" | "list") => void;
  setAgentOpen: (b: boolean) => void;
  setEditorSelection: (selection: EditorFragmentSelection | null) => void;
  openFile: (path: string | null) => void;
  reloadOpen: () => void;

  metaFor: (path: string) => FileMeta;
  updateFileMeta: (path: string, patch: Partial<FileMeta>) => Promise<void>;
  toggleFavorite: (path: string) => Promise<void>;

  createTag: (name: string) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  toggleFileTag: (path: string, tagId: string) => Promise<void>;

  createCollection: (name: string) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<void>;
  toggleInCollection: (id: string, path: string) => Promise<void>;

  saveHtml: (path: string, content: string) => Promise<void>;
  createHtml: (title: string, content: string, themeId?: string) => Promise<string>;
  installDemoFiles: () => Promise<string[]>;
  createFolder: (parentPath: string, name: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (path: string, newName: string) => Promise<void>;
  moveFile: (path: string, targetFolderPath: string) => Promise<void>;

  targetDir: () => string;
}

function newMeta(): FileMeta {
  const now = new Date().toISOString();
  return { id: nanoid(8), tags: [], createdAt: now, updatedAt: now };
}

export const useWorkspace = create<WorkspaceState>((set, get) => {
  /** Mutate the manifest immutably, save it to the primary root, update state. */
  async function mutate(fn: (m: Manifest) => Manifest) {
    const next = fn(structuredClone(get().manifest));
    set({ manifest: next });
    const primary = get().roots[0];
    if (primary) await writeManifest(primary.handle, next);
  }

  /** Split a virtual workspace path into its owning root + path relative to it. */
  function resolvePath(path: string): { root: WorkspaceRoot; rel: string } {
    const roots = get().roots;
    if (path.startsWith("@")) {
      const slash = path.indexOf("/");
      const id = path.slice(1, slash === -1 ? undefined : slash);
      const root = roots.find((r) => r.id === id);
      if (!root) throw new Error(`Không tìm thấy thư mục "${id}" trong workspace`);
      return { root, rel: slash === -1 ? "" : path.slice(slash + 1) };
    }
    const root = roots[0];
    if (!root) throw new Error("Chưa kết nối thư mục");
    return { root, rel: path };
  }

  /** Re-prefix a root-relative path back into a virtual workspace path. */
  function toVirtual(root: WorkspaceRoot, rel: string): string {
    if (root.id === get().roots[0]?.id) return rel;
    return rel ? `@${root.id}/${rel}` : `@${root.id}`;
  }

  /** Build root entries from handles, scanning each tree (primary unprefixed). */
  async function buildRoots(
    handles: FileSystemDirectoryHandle[],
  ): Promise<WorkspaceRoot[]> {
    const used = new Set<string>();
    const roots: WorkspaceRoot[] = [];
    for (let i = 0; i < handles.length; i++) {
      const handle = handles[i];
      let id = slugify(handle.name);
      let n = 1;
      while (used.has(id)) id = `${slugify(handle.name)}-${n++}`;
      used.add(id);
      const tree = await scanTree(handle, i === 0 ? "" : `@${id}`);
      roots.push({ id, name: handle.name, handle, tree });
    }
    return roots;
  }

  /** Push a new roots list into state, deriving primary/files. */
  function applyRoots(roots: WorkspaceRoot[], extra?: Partial<WorkspaceState>) {
    set({
      roots,
      root: roots[0]?.handle ?? null,
      rootName: roots[0]?.name ?? "",
      files: roots.flatMap((r) => flattenFiles(r.tree)),
      ...extra,
    });
  }

  /** Load a fresh ordered set of folders, reading the manifest from the primary. */
  async function loadHandles(handles: FileSystemDirectoryHandle[]) {
    const roots = await buildRoots(handles);
    const manifest = await readManifest(roots[0].handle);
    applyRoots(roots, { manifest, status: "connected", error: undefined });
    await setStoredDirectories(handles);
  }

  return {
    status: "idle",
    roots: [],
    root: null,
    rootName: "",
    files: [],
    manifest: emptyManifest(),
    selection: { type: "all" },
    openPath: null,
    reloadToken: 0,
    search: "",
    view: "grid",
    agentOpen: false,
    editorSelection: null,

    async init() {
      if (!isFsAccessSupported()) {
        set({ status: "unsupported" });
        return;
      }
      const handles = await getStoredDirectories();
      if (!handles.length) {
        set({ status: "idle" });
        return;
      }
      const granted = await Promise.all(handles.map((h) => ensurePermission(h, false)));
      if (granted.every(Boolean)) {
        await loadHandles(handles);
      } else {
        // Need a user gesture to (re)grant permission; reconnect() handles it.
        set({ rootName: handles[0]?.name ?? "", status: "needs-permission" });
      }
    },

    async connect() {
      if (!isFsAccessSupported()) {
        set({ status: "unsupported" });
        return;
      }
      set({ status: "connecting" });
      try {
        const handle = await pickDirectory();
        await loadHandles([handle]);
      } catch (e) {
        // User cancelled the picker or permission denied.
        const msg = e instanceof Error ? e.message : String(e);
        set({ status: get().roots.length ? "connected" : "idle", error: msg.includes("abort") ? undefined : msg });
      }
    },

    async reconnect() {
      const handles = await getStoredDirectories();
      if (!handles.length) return get().connect();
      const granted = await Promise.all(handles.map((h) => ensurePermission(h, true)));
      if (granted.every(Boolean)) await loadHandles(handles);
      else set({ status: "needs-permission", error: "Quyền truy cập bị từ chối" });
    },

    async refresh() {
      const roots = get().roots;
      if (!roots.length) return;
      const rescanned = await Promise.all(
        roots.map(async (r, i) => ({
          ...r,
          tree: await scanTree(r.handle, i === 0 ? "" : `@${r.id}`),
        })),
      );
      const manifest = await readManifest(rescanned[0].handle);
      applyRoots(rescanned, { manifest });
    },

    async disconnect() {
      await forgetDirectories();
      set({
        roots: [],
        root: null,
        rootName: "",
        files: [],
        manifest: emptyManifest(),
        status: "idle",
        openPath: null,
        selection: { type: "all" },
        editorSelection: null,
      });
    },

    async addRoot() {
      if (!isFsAccessSupported()) {
        set({ status: "unsupported" });
        return;
      }
      if (!get().roots.length) return get().connect();
      try {
        const handle = await pickDirectory();
        const ok = await ensurePermission(handle, true);
        if (!ok) {
          set({ error: "Quyền truy cập bị từ chối" });
          return;
        }
        const existing = get().roots;
        for (const r of existing) {
          if (await r.handle.isSameEntry?.(handle)) return; // already in workspace
        }
        const ids = new Set(existing.map((r) => r.id));
        let id = slugify(handle.name);
        let n = 1;
        while (ids.has(id)) id = `${slugify(handle.name)}-${n++}`;
        const tree = await scanTree(handle, `@${id}`);
        const roots = [...existing, { id, name: handle.name, handle, tree }];
        applyRoots(roots, { error: undefined });
        await setStoredDirectories(roots.map((r) => r.handle));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("abort")) set({ error: msg });
      }
    },

    async removeRoot(id) {
      const roots = get().roots;
      // The primary root is only removable via "Ngắt kết nối" (disconnect).
      if (roots.length <= 1 || roots[0].id === id) return;
      const next = roots.filter((r) => r.id !== id);
      const selfPath = `@${id}`;
      const prefix = `${selfPath}/`;
      await mutate((m) => {
        for (const key of Object.keys(m.files)) {
          if (key === selfPath || key.startsWith(prefix)) delete m.files[key];
        }
        for (const c of m.collections) {
          c.paths = c.paths.filter((p) => p !== selfPath && !p.startsWith(prefix));
        }
        return m;
      });
      applyRoots(next);
      await setStoredDirectories(next.map((r) => r.handle));
      const sel = get().selection;
      if (sel.type === "folder" && (sel.path === selfPath || sel.path.startsWith(prefix))) {
        set({ selection: { type: "all" } });
      }
      const open = get().openPath;
      if (open && (open === selfPath || open.startsWith(prefix))) set({ openPath: null });
    },

    async readText(path) {
      const { root, rel } = resolvePath(path);
      return readTextFile(root.handle, rel);
    },

    async getFileObj(path) {
      const { root, rel } = resolvePath(path);
      return getFile(root.handle, rel);
    },

    setSelection: (selection) => set({ selection, openPath: null, editorSelection: null }),
    setSearch: (search) => set({ search }),
    setView: (view) => set({ view }),
    setAgentOpen: (agentOpen) => set({ agentOpen }),
    setEditorSelection: (editorSelection) => set({ editorSelection }),
    openFile: (openPath) => set({ openPath, editorSelection: null }),
    reloadOpen: () => set((s) => ({ reloadToken: s.reloadToken + 1, editorSelection: null })),

    metaFor: (path) => get().manifest.files[path] ?? newMeta(),

    async updateFileMeta(path, patch) {
      await mutate((m) => {
        const existing = m.files[path] ?? newMeta();
        m.files[path] = {
          ...existing,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        return m;
      });
    },

    async toggleFavorite(path) {
      const cur = get().manifest.files[path]?.favorite ?? false;
      await get().updateFileMeta(path, { favorite: !cur });
    },

    async createTag(name) {
      const tag: Tag = {
        id: nanoid(6),
        name: name.trim(),
        color: TAG_COLORS[get().manifest.tags.length % TAG_COLORS.length],
      };
      await mutate((m) => {
        m.tags.push(tag);
        return m;
      });
      return tag;
    },

    async deleteTag(id) {
      await mutate((m) => {
        m.tags = m.tags.filter((t) => t.id !== id);
        for (const key of Object.keys(m.files)) {
          m.files[key].tags = m.files[key].tags.filter((t) => t !== id);
        }
        return m;
      });
    },

    async toggleFileTag(path, tagId) {
      await mutate((m) => {
        const meta = m.files[path] ?? newMeta();
        meta.tags = meta.tags.includes(tagId)
          ? meta.tags.filter((t) => t !== tagId)
          : [...meta.tags, tagId];
        meta.updatedAt = new Date().toISOString();
        m.files[path] = meta;
        return m;
      });
    },

    async createCollection(name) {
      const col: Collection = { id: nanoid(6), name: name.trim(), paths: [] };
      await mutate((m) => {
        m.collections.push(col);
        return m;
      });
      return col;
    },

    async deleteCollection(id) {
      await mutate((m) => {
        m.collections = m.collections.filter((c) => c.id !== id);
        return m;
      });
    },

    async toggleInCollection(id, path) {
      await mutate((m) => {
        const col = m.collections.find((c) => c.id === id);
        if (!col) return m;
        col.paths = col.paths.includes(path)
          ? col.paths.filter((p) => p !== path)
          : [...col.paths, path];
        return m;
      });
    },

    async saveHtml(path, content) {
      const { root, rel } = resolvePath(path);
      await writeTextFile(root.handle, rel, content.normalize("NFC"));
      await get().updateFileMeta(path, {});
    },

    targetDir() {
      const sel = get().selection;
      return sel.type === "folder" ? sel.path : "";
    },

    async createHtml(title, content, themeId) {
      if (!get().roots.length) throw new Error("Chưa kết nối thư mục");
      const { root, rel } = resolvePath(get().targetDir());
      const relPath = await uniqueHtmlPath(root.handle, rel, title || "tai-lieu");
      await writeTextFile(root.handle, relPath, content.normalize("NFC"));
      const virtual = toVirtual(root, relPath);
      await mutate((m) => {
        m.files[virtual] = { ...newMeta(), title, theme: themeId };
        return m;
      });
      await get().refresh();
      set({ openPath: virtual });
      return virtual;
    },

    async installDemoFiles() {
      if (!get().roots.length) throw new Error("Chưa kết nối thư mục");
      const root = get().roots[0];
      const demoDir = "docs";
      await ensureDir(root.handle, demoDir);

      const demos = [
        { title: "FastAPI Production Handbook", file: "fastapi-production.html", theme: "editorial-tech" },
        { title: "Đạo hàm trực quan", file: "calculus-derivative.html", theme: "tech" },
        { title: "GitHub Team Workflow", file: "git-workflow.html", theme: "playful" },
      ];
      const created: string[] = [];
      const entries: Array<{ path: string; title: string; theme: string }> = [];

      for (const demo of demos) {
        const res = await fetch(`/demos/${demo.file}`);
        if (!res.ok) throw new Error(`Không tải được file demo: ${demo.file}`);
        const content = await res.text();
        const relPath = await uniqueHtmlPath(root.handle, demoDir, demo.title);
        await writeTextFile(root.handle, relPath, content.normalize("NFC"));
        const virtual = toVirtual(root, relPath);
        created.push(virtual);
        entries.push({ path: virtual, title: demo.title, theme: demo.theme });
      }

      await mutate((m) => {
        for (const entry of entries) {
          m.files[entry.path] = { ...newMeta(), title: entry.title, theme: entry.theme };
        }
        return m;
      });
      await get().refresh();
      set({
        selection: { type: "folder", path: demoDir },
        openPath: created[0] ?? null,
      });
      return created;
    },

    async createFolder(parentPath, name) {
      if (!get().roots.length) throw new Error("Chưa kết nối thư mục");
      const clean = name.trim().replace(/[\\/:*?"<>|]/g, "").trim();
      if (!clean) throw new Error("Tên thư mục không hợp lệ");
      const { root, rel } = resolvePath(parentPath);
      const relFull = rel ? `${rel}/${clean}` : clean;
      await ensureDir(root.handle, relFull);
      await get().refresh();
      set({ selection: { type: "folder", path: toVirtual(root, relFull) } });
    },

    async deleteFile(path) {
      if (!get().roots.length) return;
      const { root, rel } = resolvePath(path);
      await deleteEntry(root.handle, rel);
      await mutate((m) => {
        delete m.files[path];
        for (const c of m.collections) c.paths = c.paths.filter((p) => p !== path);
        return m;
      });
      if (get().openPath === path) set({ openPath: null });
      await get().refresh();
    },

    async renameFile(path, newName) {
      const { root, rel } = resolvePath(path);
      const slash = rel.lastIndexOf("/");
      const parent = slash === -1 ? "" : rel.slice(0, slash);
      const oldName = slash === -1 ? rel : rel.slice(slash + 1);

      let clean = newName.trim().replace(/[\\/:*?"<>|]/g, "").trim();
      if (!clean) throw new Error("Tên file không hợp lệ");
      // Keep the original extension if the user didn't type one.
      const dot = oldName.lastIndexOf(".");
      const oldExt = dot > 0 ? oldName.slice(dot) : "";
      if (oldExt && !/\.[^.]+$/.test(clean)) clean += oldExt;
      if (clean === oldName) return;

      const newRel = parent ? `${parent}/${clean}` : clean;
      if (await pathExists(root.handle, newRel)) {
        throw new Error(`Đã tồn tại "${clean}" trong thư mục này`);
      }
      await moveEntry(root.handle, rel, root.handle, newRel);

      const newPath = toVirtual(root, newRel);
      await mutate((m) => {
        const renamedTitle = baseName(clean);
        if (m.files[path]) {
          m.files[newPath] = {
            ...m.files[path],
            title: renamedTitle,
            updatedAt: new Date().toISOString(),
          };
          delete m.files[path];
        } else {
          m.files[newPath] = { ...newMeta(), title: renamedTitle };
        }
        for (const c of m.collections) {
          c.paths = c.paths.map((p) => (p === path ? newPath : p));
        }
        return m;
      });
      if (get().openPath === path) set({ openPath: newPath });
      await get().refresh();
    },

    async moveFile(path, targetFolderPath) {
      const { root: srcRoot, rel: srcRel } = resolvePath(path);
      const { root: dstRoot, rel: dstRel } = resolvePath(targetFolderPath);
      const slash = srcRel.lastIndexOf("/");
      const fileName = slash === -1 ? srcRel : srcRel.slice(slash + 1);
      const dstPath = dstRel ? `${dstRel}/${fileName}` : fileName;
      const newPath = toVirtual(dstRoot, dstPath);

      if (newPath === path) return;
      if (await pathExists(dstRoot.handle, dstPath)) {
        throw new Error(`ÄÃ£ tá»“n táº¡i "${fileName}" trong thÆ° má»¥c Ä‘Ã­ch`);
      }

      await moveEntry(srcRoot.handle, srcRel, dstRoot.handle, dstPath);
      await mutate((m) => {
        if (m.files[path]) {
          m.files[newPath] = { ...m.files[path], updatedAt: new Date().toISOString() };
          delete m.files[path];
        }
        for (const c of m.collections) {
          c.paths = c.paths.map((p) => (p === path ? newPath : p));
        }
        return m;
      });
      if (get().openPath === path) set({ openPath: newPath });
      await get().refresh();
    },
  };
});

/** Display title for a file path, using manifest title if present. */
export function fileTitle(manifest: Manifest, node: FsNode): string {
  return manifest.files[node.path]?.title?.trim() || baseName(node.name);
}
