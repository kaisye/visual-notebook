import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conditional logic. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Classify a filename into a high-level kind used across the UI. */
export function fileKindFromName(name: string): "html" | "markdown" | "pdf" | "other" {
  const lower = name.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".pdf")) return "pdf";
  return "other";
}

/** Human readable byte size. */
export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Strip extension for display titles. */
export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}
