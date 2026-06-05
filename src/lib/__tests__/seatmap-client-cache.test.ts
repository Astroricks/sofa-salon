import {
  getCachedSeatmap,
  setCachedSeatmap,
  type SeatmapApiPayload,
} from '../seatmap-client-cache';

const sample: SeatmapApiPayload = {
  room: null,
  reservations: [{ id: 'r1' }],
  waitlist: [],
  filmTitle: 'Test',
};

describe('seatmap-client-cache', () => {
  it('stores and returns cached payload by screening id', () => {
    setCachedSeatmap('abc', sample);
    expect(getCachedSeatmap('abc')).toEqual(sample);
    expect(getCachedSeatmap('other')).toBeNull();
  });
});
