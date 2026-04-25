import { render, screen } from '@testing-library/react';

import ScreeningCard from '@/components/ScreeningCard';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- lightweight stub for Jest (not shipped)
    <img src={props.src} alt={props.alt ?? ''} data-mock-next-image />
  ),
}));

const tMock = {
  home: {
    full: 'FULL',
    left: 'LEFT',
    open: 'OPEN',
    selectSeat: 'Select seat',
    selectedSeat: 'Selected',
  },
  screening: {
    linkDouban: 'Douban',
    linkLetterboxd: 'Letterboxd',
    linkTrailer: 'Trailer',
  },
};

jest.mock('@/components/LocaleProvider', () => ({
  useLocale: () => ({ t: tMock, locale: 'en' as const }),
}));

const baseScreening = {
  id: '1',
  title: 'Test Film',
  screening_at: new Date('2030-06-15T18:00:00.000Z').toISOString(),
  year: 1994,
  director: 'Director Name',
  duration_minutes: 120,
};

describe('ScreeningCard external icons', () => {
  it('renders icon-only outbound links under meta when URLs are valid', () => {
    render(
      <ScreeningCard
        screening={{
          ...baseScreening,
          douban_url: 'https://movie.douban.com/subject/1291999/',
          letterboxd_url: 'https://letterboxd.com/film/chungking-express/',
          trailer_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        }}
        reservedCount={0}
        totalSeats={4}
        selected={false}
        onSelect={() => {}}
      />
    );

    const douban = screen.getByRole('link', { name: 'Douban' });
    const lb = screen.getByRole('link', { name: 'Letterboxd' });
    const trailer = screen.getByRole('link', { name: 'Trailer' });
    expect(douban).toHaveAttribute('href', 'https://movie.douban.com/subject/1291999/');
    expect(douban).toHaveAttribute('target', '_blank');
    expect(lb).toHaveAttribute('href', 'https://letterboxd.com/film/chungking-express/');
    expect(trailer).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(screen.queryByText('Douban')).not.toBeInTheDocument();
    expect(screen.queryByText('Letterboxd')).not.toBeInTheDocument();
  });

  it('omits the icon row when no valid external URLs', () => {
    render(
      <ScreeningCard
        screening={{ ...baseScreening, douban_url: '', letterboxd_url: '' }}
        reservedCount={0}
        totalSeats={4}
        selected={false}
        onSelect={() => {}}
      />
    );

    expect(screen.queryByTestId('screening-card-external-icons')).not.toBeInTheDocument();
  });
});
