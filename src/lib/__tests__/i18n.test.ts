/**
 * Unit tests for lib/i18n.ts — locale and ticker-related profile strings.
 * Ensures en/zh keys exist and Chinese strings are used for zh (e.g. 发弹幕).
 */
import { getT, tEn, tZh } from '../i18n';

/** Returns all key paths (e.g. ['nav','home']) in a nested object, sorted. */
function getAllKeyPaths(obj: Record<string, unknown>, prefix: string[] = []): string[][] {
  const paths: string[][] = [];
  for (const key of Object.keys(obj).sort()) {
    const path = [...prefix, key];
    const val = (obj as Record<string, unknown>)[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && typeof (val as Record<string, unknown>).then !== 'function') {
      paths.push(...getAllKeyPaths(val as Record<string, unknown>, path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

function getAtPath(obj: Record<string, unknown>, path: string[]): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    cur = (cur as Record<string, unknown>)?.[k];
  }
  return cur;
}

describe('getT', () => {
  it('returns English strings for locale en', () => {
    const t = getT('en');
    expect(t.profile.sendToTicker).toBe('Send to ticker');
    expect(t.profile.sendToTickerPlaceholder).toBe('Send to ticker...');
    expect(t.profile.sendToTickerButton).toBe('Send');
    expect(t.profile.sendToTickerSent).toBe('Sent');
  });

  it('returns Chinese strings for locale zh (ticker submit)', () => {
    const t = getT('zh');
    expect(t.profile.sendToTicker).toBe('发弹幕');
    expect(t.profile.sendToTickerPlaceholder).toMatch(/发弹幕/);
    expect(t.profile.sendToTickerButton).toBe('发送');
    expect(t.profile.sendToTickerSent).toBe('已发送');
  });

  it('returns nav keys for both locales', () => {
    expect(getT('en').nav.home).toBe('Home');
    expect(getT('zh').nav.home).toBe('首页');
    expect(getT('en').nav.pastScreenings).toBe('Past Screenings');
    expect(getT('zh').nav.pastScreenings).toBe('往期放映');
    expect(getT('en').nav.pastScreeningsHref).toContain('letterboxd.com');
    expect(getT('zh').nav.pastScreeningsHref).toContain('docs.google.com/spreadsheets');
  });

  it('returns admin ticker keys for both locales', () => {
    expect(getT('en').admin.tickerManage).toBe('Ticker');
    expect(getT('zh').admin.tickerManage).toBe('弹幕');
  });
});

describe('i18n key parity (en vs zh)', () => {
  it('tZh has the same key structure as tEn (no missing keys)', () => {
    const enPaths = getAllKeyPaths(tEn as unknown as Record<string, unknown>);
    const zhPaths = getAllKeyPaths(tZh as unknown as Record<string, unknown>);
    expect(zhPaths.length).toBe(enPaths.length);
    const enSet = new Set(enPaths.map((p) => p.join('.')));
    const zhSet = new Set(zhPaths.map((p) => p.join('.')));
    for (const p of enSet) {
      expect(zhSet.has(p)).toBe(true);
    }
  });

  it('every leaf value in tEn and tZh is a non-empty string', () => {
    const enPaths = getAllKeyPaths(tEn as unknown as Record<string, unknown>);
    const zhObj = tZh as unknown as Record<string, unknown>;
    const enObj = tEn as unknown as Record<string, unknown>;
    for (const path of enPaths) {
      const enVal = getAtPath(enObj, path);
      const zhVal = getAtPath(zhObj, path);
      expect(typeof enVal).toBe('string');
      expect((enVal as string).length).toBeGreaterThan(0);
      expect(typeof zhVal).toBe('string');
      expect((zhVal as string).length).toBeGreaterThan(0);
    }
  });
});
