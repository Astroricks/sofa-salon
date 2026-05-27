/** Fields for admin event list cards (home + paginated API). */
export const ADMIN_SCREENING_LIST_SELECT = `
  id,
  title,
  screening_at,
  waitlist_mode,
  room_id,
  rooms ( name )
`;

export const ADMIN_PAST_PAGE_SIZE = 30;

export type AdminScreeningListRow = {
  id: string;
  title: string;
  screening_at: string;
  waitlist_mode: string;
  room_id: string | null;
  rooms: { name: string } | { name: string }[] | null;
};
