import { invoke } from "@tauri-apps/api/core";

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
  ico: "image/x-icon",
  svg: "image/svg+xml",
};

/**
 * True for sources the webview can load by itself: remote URLs, data URIs and
 * blob URIs. Everything else is a path on disk and goes through the backend.
 */
export function isExternalImage(source: string): boolean {
  return (
    /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(source) || /^(?:data|blob):/i.test(source)
  );
}

export function mimeTypeFor(source: string): string {
  const extension = source.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  return (extension && MIME_TYPES[extension]) || "application/octet-stream";
}

function decodeSource(source: string): string {
  try {
    return decodeURIComponent(source);
  } catch {
    return source;
  }
}

async function createObjectUrl(
  documentPath: string,
  source: string,
): Promise<string> {
  const data = await invoke<ArrayBuffer | number[]>("read_image_file", {
    documentPath,
    source: decodeSource(source),
  });

  const bytes =
    data instanceof ArrayBuffer ? new Uint8Array(data) : Uint8Array.from(data);

  return URL.createObjectURL(new Blob([bytes], { type: mimeTypeFor(source) }));
}

/**
 * Loads images referenced by relative or absolute paths into blob URLs, since
 * the webview cannot read the filesystem itself. Returns a cleanup function
 * that releases every created blob URL.
 */
export async function resolveLocalImages(
  container: HTMLElement,
  documentPath: string,
): Promise<() => void> {
  const images = Array.from(
    container.querySelectorAll<HTMLImageElement>("img[src]"),
  ).filter((image) => !isExternalImage(image.getAttribute("src") ?? ""));

  const objectUrls = new Set<string>();
  const pending = new Map<string, Promise<string>>();
  let cancelled = false;

  function urlFor(source: string): Promise<string> {
    let promise = pending.get(source);

    if (!promise) {
      promise = createObjectUrl(documentPath, source);
      pending.set(source, promise);
    }

    return promise;
  }

  await Promise.all(
    images.map(async (image) => {
      const source = image.getAttribute("src") ?? "";

      try {
        const url = await urlFor(source);

        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        objectUrls.add(url);
        image.src = url;
      } catch (cause) {
        image.title = typeof cause === "string" ? cause : String(cause);
      }
    }),
  );

  return () => {
    cancelled = true;

    for (const url of objectUrls) {
      URL.revokeObjectURL(url);
    }

    objectUrls.clear();
  };
}
