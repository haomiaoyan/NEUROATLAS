/* 主题初始逻辑（纯函数，供 vitest 单测与 ThemeProvider 共用） */

export type Theme = 'light' | 'dark';

export const STORAGE_KEY = 'neuroatlas-theme';

export interface StorageLike {
  getItem(key: string): string | null;
}

export interface MediaQueryLike {
  matches: boolean;
}

export function normalizeTheme(value: unknown): Theme | null {
  return value === 'light' || value === 'dark' ? value : null;
}

export function readStoredTheme(storage?: StorageLike | null): Theme | null {
  if (!storage) return null;
  try {
    return normalizeTheme(storage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** 优先级：localStorage → prefers-color-scheme → light */
export function getInitialTheme(
  storage?: StorageLike | null,
  darkQuery?: MediaQueryLike | null,
): Theme {
  const stored = readStoredTheme(storage);
  if (stored) return stored;
  if (darkQuery?.matches) return 'dark';
  return 'light';
}
