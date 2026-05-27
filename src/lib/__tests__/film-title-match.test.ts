import {
  MAX_YEAR_DELTA_FOR_MATCH,
  normalizeTitleForMatch,
  pickFilmByExactTitle,
  releaseYearFromDate,
  titleMatchScore,
  titlesMatchExactly,
  matchConfidenceFromTitleYear,
  isYearCloseEnough,
} from '../film-title-match';

describe('film-title-match', () => {
  it('normalizes titles for comparison', () => {
    expect(normalizeTitleForMatch('The Taxi Driver')).toBe(normalizeTitleForMatch('taxi driver'));
  });

  it('only scores exact titles (no substring)', () => {
    expect(titleMatchScore('Pan\'s Labyrinth', "Pan's Labyrinth")).toBe(3);
    expect(titleMatchScore('Fireworks, Should We See It from the Side or the Bottom?', 'Fireworks')).toBe(0);
    expect(titleMatchScore('The Case of Hana and Alice', 'The Murder Case of Hana and Alice')).toBe(0);
    expect(titlesMatchExactly('Taxi Driver', 'Taxi Driver')).toBe(true);
  });

  it('picks exact year + title match', () => {
    const pick = pickFilmByExactTitle(
      [
        { id: 1, title: 'Taxi Driver', release_date: '1976-02-08' },
        { id: 2, title: 'Taxi', release_date: '2004-01-01' },
      ],
      { titleEn: 'Taxi Driver', year: 1976 }
    );
    expect(pick).toMatchObject({
      confidence: 'high',
      hit: { id: 1, title: 'Taxi Driver', release_date: '1976-02-08' },
    });
  });

  it('accepts exact title when catalog year is within ±2', () => {
    const pick = pickFilmByExactTitle(
      [{ id: 1, title: 'Love Go Go', release_date: '1997-01-01' }],
      { titleEn: 'Love Go Go', year: 1998 }
    );
    expect(pick).toMatchObject({
      confidence: 'high',
      matchNote: expect.stringContaining('year ±1'),
    });
  });

  it('rejects exact title when year gap is too large', () => {
    const pick = pickFilmByExactTitle(
      [{ id: 1, title: 'Brazil', release_date: '1985-02-20' }],
      { titleEn: 'Brazil', year: 1990 }
    );
    expect(pick.confidence).toBe('none');
  });

  it('returns ambiguous when multiple same-year exact matches', () => {
    const pick = pickFilmByExactTitle(
      [
        { id: 1, title: 'Mother', release_date: '2009-05-30' },
        { id: 2, title: 'Mother', release_date: '2009-01-01' },
      ],
      { titleEn: 'Mother', year: 2009 }
    );
    expect(pick.confidence).toBe('ambiguous');
  });

  it('reads release year from date', () => {
    expect(releaseYearFromDate('1994-03-11')).toBe(1994);
    expect(releaseYearFromDate('')).toBeNull();
  });

  it('defines close year tolerance', () => {
    expect(MAX_YEAR_DELTA_FOR_MATCH).toBe(2);
    expect(isYearCloseEnough(2)).toBe(true);
    expect(isYearCloseEnough(3)).toBe(false);
    const { matchNote } = matchConfidenceFromTitleYear(2, 2010, 2012);
    expect(matchNote).toContain('year ±2');
  });
});
