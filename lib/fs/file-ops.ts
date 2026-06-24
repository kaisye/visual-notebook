"use client";

/** Path-based helpers over a root FileSystemDirectoryHandle. */

function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/** Resolve the directory handle that contains `path` (creating dirs if asked). */
async function resolveParent(
  root: FileSystemDirectoryHandle,
  path: string,
  create: boolean,
): Promise<{ dir: FileSystemDirectoryHandle; name: string }> {
  const parts = splitPath(path);
  const name = parts.pop();
  if (!name) throw new Error(`Invalid path: ${path}`);
  let dir = root;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create });
  }
  return { dir, name };
}

/** Create (or get) a nested directory, making each missing segment. */
export async function ensureDir(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemDirectoryHandle> {
  let dir = root;
  for (const part of splitPath(path)) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
  return dir;
}

export async function getFileHandle(
  root: FileSystemDirectoryHandle,
  path: string,
  create = false,
): Promise<FileSystemFileHandle> {
  const { dir, name } = await resolveParent(root, path, create);
  return dir.getFileHandle(name, { create });
}

export async function readTextFile(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<string> {
  const handle = await getFileHandle(root, path);
  const file = await handle.getFile();
  return file.text();
}

export async function getFile(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<File> {
  const handle = await getFileHandle(root, path);
  return handle.getFile();
}

export async function writeTextFile(
  root: FileSystemDirectoryHandle,
  path: string,
  content: string,
): Promise<void> {
  const handle = await getFileHandle(root, path, true);
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function deleteEntry(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<void> {
  const { dir, name } = await resolveParent(root, path, false);
  await dir.removeEntry(name, { recursive: true });
}

/**
 * Move/rename a file from `srcRoot:srcPath` to `dstRoot:dstPath`. Within the same
 * root it tries the native `move()` (rename or relocate) and falls back to
 * copy-bytes + delete; across roots it always copies + deletes. Works for binary
 * files (e.g. PDFs) too.
 */
export async function moveEntry(
  srcRoot: FileSystemDirectoryHandle,
  srcPath: string,
  dstRoot: FileSystemDirectoryHandle,
  dstPath: string,
): Promise<void> {
  const { dir: fromDir, name: fromName } = await resolveParent(srcRoot, srcPath, false);
  const handle = await fromDir.getFileHandle(fromName);
  const { dir: toDir, name: toName } = await resolveParent(dstRoot, dstPath, true);

  const movable = handle as FileSystemFileHandle & {
    move?: (dest: FileSystemDirectoryHandle, name?: string) => Promise<void>;
  };
  if (srcRoot === dstRoot && typeof movable.move === "function") {
    try {
      await movable.move(toDir, toName);
      return;
    } catch {
      // Some engines reject move() (e.g. same-dir rename); fall back to copy.
    }
  }

  const file = await handle.getFile();
  const dest = await toDir.getFileHandle(toName, { create: true });
  const writable = await dest.createWritable();
  await writable.write(await file.arrayBuffer());
  await writable.close();
  await fromDir.removeEntry(fromName);
}

/** True if a file/dir exists at the given relative path. */
export async function pathExists(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<boolean> {
  try {
    const { dir, name } = await resolveParent(root, path, false);
    try {
      await dir.getFileHandle(name);
      return true;
    } catch {
      await dir.getDirectoryHandle(name);
      return true;
    }
  } catch {
    return false;
  }
}

/** Last path segment without its extension. */
export function baseNameNoExt(path: string): string {
  const name = path.split("/").pop() ?? path;
  return name.replace(/\.[^.]+$/, "");
}

/** Turn an arbitrary title into a filesystem-safe slug. */
export function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, 60) || "document"
  );
}

/**
 * Build a unique .html path inside `dirPath`, appending -1, -2... if needed.
 * Returns the relative path (does not write).
 */
export async function uniqueHtmlPath(
  root: FileSystemDirectoryHandle,
  dirPath: string,
  baseName: string,
): Promise<string> {
  const safe = slugify(baseName);
  const prefix = dirPath ? `${dirPath}/` : "";
  let candidate = `${prefix}${safe}.html`;
  let i = 1;
  while (await pathExists(root, candidate)) {
    candidate = `${prefix}${safe}-${i}.html`;
    i++;
  }
  return candidate;
}
