export type ThemePreference = "system" | "light" | "dark";
export type ContentWidth = "narrow" | "medium" | "wide" | "full";
export type FontSize = "small" | "medium" | "large" | "xlarge";

export type AppSettings = {
  theme: ThemePreference;
  contentWidth: ContentWidth;
  fontSize: FontSize;
  sidebar: boolean;
};

export const THEME_PREFERENCES: ThemePreference[] = ["system", "light", "dark"];
export const CONTENT_WIDTHS: ContentWidth[] = ["narrow", "medium", "wide", "full"];
export const FONT_SIZES: FontSize[] = ["small", "medium", "large", "xlarge"];

export const CONTENT_WIDTH_VALUES: Record<ContentWidth, string> = {
  narrow: "34rem",
  medium: "42rem",
  wide: "52rem",
  full: "100%",
};

export const FONT_SIZE_VALUES: Record<FontSize, string> = {
  small: "0.9375rem",
  medium: "1rem",
  large: "1.125rem",
  xlarge: "1.25rem",
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  contentWidth: "medium",
  fontSize: "medium",
  sidebar: true,
};

const STORAGE_KEY = "markdown-viewer.settings";

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function pickOption<T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Coerces stored or partial data into complete, valid settings. */
export function normalizeSettings(raw: unknown): AppSettings {
  const source = typeof raw === "object" && raw !== null ? raw : {};

  return {
    theme: pickOption(
      (source as Record<string, unknown>).theme,
      THEME_PREFERENCES,
      DEFAULT_SETTINGS.theme,
    ),
    contentWidth: pickOption(
      (source as Record<string, unknown>).contentWidth,
      CONTENT_WIDTHS,
      DEFAULT_SETTINGS.contentWidth,
    ),
    fontSize: pickOption(
      (source as Record<string, unknown>).fontSize,
      FONT_SIZES,
      DEFAULT_SETTINGS.fontSize,
    ),
    sidebar: pickBoolean(
      (source as Record<string, unknown>).sidebar,
      DEFAULT_SETTINGS.sidebar,
    ),
  };
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): "light" | "dark" {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return preference;
}

export function loadSettings(storage: ReadableStorage): AppSettings {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    return normalizeSettings(stored ? JSON.parse(stored) : undefined);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(storage: WritableStorage, settings: AppSettings): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage being unavailable must never break reading a document.
  }
}
