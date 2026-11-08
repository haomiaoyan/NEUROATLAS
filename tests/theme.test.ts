import { describe, expect, it } from 'vitest';
import { getInitialTheme, readStoredTheme, STORAGE_KEY } from '../src/theme/theme';

const storage = (value: string | null) => ({
  getItem: (key: string) => (key === STORAGE_KEY ? value : null),
});

describe('getInitialTheme', () => {
  it('localStorage 优先', () => {
    expect(getInitialTheme(storage('dark'), { matches: false })).toBe('dark');
    expect(getInitialTheme(storage('light'), { matches: true })).toBe('light');
  });

  it('无存储时跟随系统深色偏好', () => {
    expect(getInitialTheme(storage(null), { matches: true })).toBe('dark');
    expect(getInitialTheme(storage(null), { matches: false })).toBe('light');
  });

  it('存储里的非法值视为不存在', () => {
    expect(readStoredTheme(storage('blue'))).toBeNull();
    expect(getInitialTheme(storage('blue'), { matches: true })).toBe('dark');
  });

  it('都不可用时兜底 light', () => {
    expect(getInitialTheme(undefined, undefined)).toBe('light');
    expect(getInitialTheme(storage(null), undefined)).toBe('light');
  });
});
