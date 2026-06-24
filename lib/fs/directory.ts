"use client";

import { get, set, del } from "idb-keyval";
import type { FsNode } from "@/types";
import { fileKindFromName } from "@/lib/utils";

const HANDLE_KEY = "vn-root-dir-handle"; // legacy single-handle key
const HANDLES_KEY = "vn-root-dir-handles"; // multi-root list of handles

/** Folders we never descend into when scanning. */
const IGNORED_DIRS = new Set([
  ".visualnotebook",
  ".git",
  "node_modules",
  ".next",
  ".vscode",
  "$RECYCLE.BIN",
]);

export function isFsAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/** Prompt the user to pick a folder. Persistence is handled by the caller. */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  return window.showDirectoryPicker({ mode: "readwrite" });
}

/**
 * Retrieve the previously chosen workspace folders (in order). Falls back to the
 * legacy single-handle key so existing single-root setups keep working.
 */
export async function getStoredDirectories(): Promise<FileSystemDirectoryHandle[]> {
  const list = (await get(HANDLES_KEY)) as FileSystemDirectoryHandle[] | undefined;
  if (list && list.length) return list;
  const legacy = (await get(HANDLE_KEY)) as FileSystemDirectoryHandle | undefined;
  return legacy ? [legacy] : [];
}

/** Remember the current ordered list of workspace folders for next time. */
export async function setStoredDirectories(
  handles: FileSystemDirectoryHandle[],
): Promise<void> {
  await set(HANDLES_KEY, handles);
}

/** Forget all stored workspace folders (both new and legacy keys). */
export async function forgetDirectories(): Promise<void> {
  await del(HANDLES_KEY);
  await del(HANDLE_KEY);
}

/**
 * Ensure read/write permission for a handle. `interactive` allows a permission
 * prompt (must be called from a user gesture); otherwise we only query silently.
 */
export async function ensurePermission(
  handle: FileSystemHandle,
  interactive: boolean,
): Promise<boolean> {
  const opts = { mode: "readwrite" as const };
  const query = (await handle.queryPermission?.(opts)) ?? "granted";
  if (query === "granted") return true;
  if (!interactive) return false;
  const req = (await handle.requestPermission?.(opts)) ?? "denied";
  return req === "granted";
}

/** Recursively scan the folder into a sorted FsNode tree (directories first). */
export async function scanTree(
  dir: FileSystemDirectoryHandle,
  basePath = "",
): Promise<FsNode[]> {
  const nodes: FsNode[] = [];

  for await (const entry of dir.values()) {
    if (entry.kind === "directory") {
      if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      const path = basePath ? `${basePath}/${entry.name}` : entry.name;
      const children = await scanTree(entry as FileSystemDirectoryHandle, path);
      nodes.push({ name: entry.name, path, kind: "directory", children });
    } else {
      const path = basePath ? `${basePath}/${entry.name}` : entry.name;
      const kind = fileKindFromName(entry.name);
      nodes.push({ name: entry.name, path, kind: "file", fileKind: kind });
    }
  }

  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name, "vi");
  });
  return nodes;
}

/** Flatten a tree into the list of file nodes only. */
export function flattenFiles(nodes: FsNode[]): FsNode[] {
  const out: FsNode[] = [];
  const walk = (list: FsNode[]) => {
    for (const n of list) {
      if (n.kind === "file") out.push(n);
      else if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}
