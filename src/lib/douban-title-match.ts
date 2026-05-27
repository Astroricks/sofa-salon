/** Decode common HTML entities in Douban list titles. */
export function decodeDoubanHtml(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Douban list titles are often "中文 English title" or "中文".
 * Returns the Chinese (CJK-leading) portion for matching sheet `title`.
 */
export function chineseTitleFromDoubanListTitle(raw: string): string {
  const t = decodeDoubanHtml(raw).replace(/\s+/g, ' ');
  const parts = t.split(/\s+/);
  if (parts.length >= 2 && /^[\u4e00-\u9fff]/.test(parts[0])) {
    return parts[0];
  }
  const latinSplit = t.search(/\s+(?=[A-Za-z\u00C0-\u024F])/);
  if (latinSplit > 0) return t.slice(0, latinSplit).trim();
  return t;
}

/** Sheet/DB title (no year suffix) vs Douban list Chinese title. */
export function sheetTitleMatchesDouban(sheetZh: string, doubanZh: string): boolean {
  const a = sheetZh.trim();
  const b = doubanZh.trim();
  if (!a || !b) return false;
  if (a === b) return true;
  return b.startsWith(a) || a.startsWith(b);
}
