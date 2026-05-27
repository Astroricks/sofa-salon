import {
  chineseTitleFromDoubanListTitle,
  decodeDoubanHtml,
  sheetTitleMatchesDouban,
} from '../douban-title-match';

describe('douban-title-match', () => {
  it('decodes HTML entities', () => {
    expect(decodeDoubanHtml("&#39;night, Mother")).toBe("'night, Mother");
  });

  it('extracts Chinese prefix from bilingual list title', () => {
    expect(chineseTitleFromDoubanListTitle('布拉格之恋 The Unbearable Lightness of Being')).toBe(
      '布拉格之恋'
    );
    expect(chineseTitleFromDoubanListTitle('盗日者 太陽を盗んだ男')).toBe('盗日者');
  });

  it('matches sheet title as prefix of douban title', () => {
    expect(sheetTitleMatchesDouban('花月佳期', '花月佳期')).toBe(true);
    expect(sheetTitleMatchesDouban('对你说', '对你说')).toBe(true);
  });
});
