import { invoke } from "@tauri-apps/api/core";

const MARKDOWN_EXTENSIONS = [".md", ".markdown"] as const;

export type FolderListing = {
  files: string[];
  truncated: boolean;
};

export function isMarkdownPath(path: string): boolean {
  const lower = path.toLowerCase();
  return MARKDOWN_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export function basename(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "");
  const segments = trimmed.split(/[\\/]/);
  return segments[segments.length - 1] || trimmed;
}

/** Appends a `/` separated relative path to a platform path. */
export function joinPath(root: string, relative: string): string {
  const separator = root.includes("\\") ? "\\" : "/";
  const base = root.replace(/[\\/]+$/, "");

  return `${base}${separator}${relative.split("/").filter(Boolean).join(separator)}`;
}

/** The `/` separated path of `path` inside `root`, or null when outside it. */
export function relativePath(root: string, path: string): string | null {
  const normalizedRoot = root.replace(/\\/g, "/").replace(/\/+$/, "");
  const normalizedPath = path.replace(/\\/g, "/");

  if (!normalizedPath.startsWith(`${normalizedRoot}/`)) {
    return null;
  }

  return normalizedPath.slice(normalizedRoot.length + 1);
}

export function readMarkdownFile(path: string): Promise<string> {
  return invoke<string>("read_markdown_file", { path });
}

export function listMarkdownFiles(root: string): Promise<FolderListing> {
  return invoke<FolderListing>("list_markdown_files", { root });
}

export function pathKind(path: string): Promise<"directory" | "markdown" | "other"> {
  return invoke<"directory" | "markdown" | "other">("path_kind", { path });
}

export function recentFiles(): Promise<string[]> {
  return invoke<string[]>("recent_files");
}

export function addRecentFile(path: string): Promise<string[]> {
  return invoke<string[]>("add_recent_file", { path });
}

export function clearRecentFiles(): Promise<string[]> {
  return invoke<string[]>("clear_recent_files");
}

/** A document passed to the application from outside, if one is waiting. */
export function takePendingOpen(): Promise<string | null> {
  return invoke<string | null>("take_pending_open");
}
