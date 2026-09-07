import { beforeEach, describe, expect, test } from 'vitest';
import { getItem, removeItem, setItem } from './storage';

describe('setItem', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test('persists legitimate falsy values instead of silently dropping them', () => {
    const cases: [label: string, value: any][] = [
      ['false', false],
      ['0', 0],
      ['empty string', ''],
      ['null', null],
    ];

    for (const [label, value] of cases) {
      setItem('umami.falsy', value);
      expect(localStorage.getItem('umami.falsy'), `case ${label} writes to localStorage`).toBe(
        JSON.stringify(value),
      );
      expect(getItem('umami.falsy'), `case ${label} round-trips through getItem`).toEqual(value);
      localStorage.removeItem('umami.falsy');
    }
  });

  test('replaces a previous truthy value with a falsy one (issue scenario)', () => {
    setItem('umami.sidebar-collapsed', true);
    setItem('umami.sidebar-collapsed', false);

    expect(getItem('umami.sidebar-collapsed')).toBe(false);
  });

  test('writes falsy values to sessionStorage when session is true', () => {
    setItem('umami.session', 0, true);

    expect(sessionStorage.getItem('umami.session')).toBe('0');
    expect(localStorage.getItem('umami.session')).toBeNull();
  });

  test('skips writing when data is undefined', () => {
    setItem('umami.keep', 'previous');
    setItem('umami.keep', undefined);

    expect(localStorage.getItem('umami.keep')).toBe(JSON.stringify('previous'));
  });

  test('still persists truthy values', () => {
    setItem('umami.truthy', { count: 1 });

    expect(getItem('umami.truthy')).toEqual({ count: 1 });
  });
});

describe('getItem', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test('returns undefined for missing keys', () => {
    expect(getItem('umami.missing')).toBeUndefined();
  });

  test('returns the stored value from sessionStorage when session is true', () => {
    sessionStorage.setItem('umami.session-value', JSON.stringify(false));

    expect(getItem('umami.session-value', true)).toBe(false);
  });
});

describe('removeItem', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test('removes the key from the chosen storage', () => {
    setItem('umami.removed', false);
    removeItem('umami.removed');

    expect(localStorage.getItem('umami.removed')).toBeNull();
  });
});
