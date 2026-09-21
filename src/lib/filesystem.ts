import { invoke } from "@tauri-apps/api/core";

const MARKDOWN_EXTENSIONS = [".md", ".markdown"] as const;

export function isMarkdownPath(path: string): boolean {
  const lower = path.toLowerCase();
  return MARKDOWN_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export function basename(path: string): string {
  const segments = path.split(/[\\/]/);
  return segments[segments.length - 1] || path;
}

export function readMarkdownFile(path: string): Promise<string> {
  return invoke<string>("read_markdown_file", { path });
}
