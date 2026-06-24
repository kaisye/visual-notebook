"use client";

import { emptyManifest, type Manifest, MANIFEST_VERSION } from "@/types";

const MANIFEST_DIR = ".visualnotebook";
const MANIFEST_FILE = "manifest.json";

/** Read `.visualnotebook/manifest.json`, returning an empty manifest if absent. */
export async function readManifest(
  root: FileSystemDirectoryHandle,
): Promise<Manifest> {
  try {
    const dir = await root.getDirectoryHandle(MANIFEST_DIR);
    const handle = await dir.getFileHandle(MANIFEST_FILE);
    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text) as Manifest;
    return {
      version: parsed.version ?? MANIFEST_VERSION,
      collections: parsed.collections ?? [],
      tags: parsed.tags ?? [],
      files: parsed.files ?? {},
    };
  } catch {
    return emptyManifest();
  }
}

/** Persist the manifest, creating `.visualnotebook/` if needed. */
export async function writeManifest(
  root: FileSystemDirectoryHandle,
  manifest: Manifest,
): Promise<void> {
  const dir = await root.getDirectoryHandle(MANIFEST_DIR, { create: true });
  const handle = await dir.getFileHandle(MANIFEST_FILE, { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(manifest, null, 2));
  await writable.close();
}
