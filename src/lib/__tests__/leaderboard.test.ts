import {
  LEADERBOARD_TOP_N,
  leaderboardRankAtIndex,
  selectLeaderboardCutoff,
} from '../leaderboard';

describe('LEADERBOARD_TOP_N', () => {
  it('defaults to 10 places', () => {
    expect(LEADERBOARD_TOP_N).toBe(10);
  });
});

describe('selectLeaderboardCutoff', () => {
  const rows = [
    { user_id: '1', attendance_count: 20 },
    { user_id: '2', attendance_count: 15 },
    { user_id: '3', attendance_count: 12 },
    { user_id: '4', attendance_count: 11 },
    { user_id: '5', attendance_count: 10 },
    { user_id: '6', attendance_count: 9 },
    { user_id: '7', attendance_count: 8 },
    { user_id: '8', attendance_count: 7 },
    { user_id: '9', attendance_count: 5 },
    { user_id: '10', attendance_count: 4 },
    { user_id: '11', attendance_count: 4 },
    { user_id: '12', attendance_count: 4 },
    { user_id: '13', attendance_count: 3 },
  ];

  it('returns all rows when fewer than minPlaces', () => {
    expect(selectLeaderboardCutoff(rows.slice(0, 5), 10)).toHaveLength(5);
  });

  it('includes everyone tied at the 10th-place count', () => {
    const top = selectLeaderboardCutoff(rows, 10);
    expect(top).toHaveLength(12);
    expect(top.map((r) => r.user_id)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
      '12',
    ]);
    expect(top.every((r) => r.attendance_count >= 4)).toBe(true);
    expect(top.some((r) => r.attendance_count === 3)).toBe(false);
  });

  it('returns exactly minPlaces when no tie at cutoff', () => {
    const noTie = rows.filter((r) => r.user_id !== '11' && r.user_id !== '12');
    expect(selectLeaderboardCutoff(noTie, 10)).toHaveLength(10);
  });
});

describe('leaderboardRankAtIndex', () => {
  const rows = [
    { attendance_count: 10 },
    { attendance_count: 10 },
    { attendance_count: 4 },
    { attendance_count: 4 },
    { attendance_count: 3 },
  ];

  it('assigns the same rank to tied counts', () => {
    expect(leaderboardRankAtIndex(rows, 0)).toBe(1);
    expect(leaderboardRankAtIndex(rows, 1)).toBe(1);
    expect(leaderboardRankAtIndex(rows, 2)).toBe(3);
    expect(leaderboardRankAtIndex(rows, 3)).toBe(3);
    expect(leaderboardRankAtIndex(rows, 4)).toBe(5);
  });
});
