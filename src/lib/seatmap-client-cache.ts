/** Client-side cache for GET /api/screenings/[id]/seatmap (home card switching). */

export type SeatmapApiPayload = {
  room: {
    furniture: unknown[];
    decorations: unknown[];
    canvasW: number;
    canvasH: number;
    roomBackgroundId?: string | null;
  } | null;
  reservations: unknown[];
  waitlist: unknown[];
  filmTitle?: string;
  filmTitleEn?: string | null;
  screeningTitle?: string;
  squeezeNote?: string | null;
  waitlistMode?: string;
};

const cache = new Map<string, SeatmapApiPayload>();
const inflight = new Map<string, Promise<SeatmapApiPayload | null>>();

export function getCachedSeatmap(screeningId: string): SeatmapApiPayload | null {
  return cache.get(screeningId) ?? null;
}

export function setCachedSeatmap(screeningId: string, payload: SeatmapApiPayload): void {
  cache.set(screeningId, payload);
}

type FetchOptions = { signal?: AbortSignal; force?: boolean };

/** Fetch seatmap JSON; dedupes concurrent requests per screeningId. */
export async function fetchSeatmapPayload(
  screeningId: string,
  options?: FetchOptions
): Promise<SeatmapApiPayload | null> {
  if (!options?.force) {
    const cached = cache.get(screeningId);
    if (cached) return cached;
    const pending = inflight.get(screeningId);
    if (pending) return pending;
  }

  const promise = fetch(`/api/screenings/${screeningId}/seatmap`, {
    credentials: 'include',
    signal: options?.signal,
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const json = (await res.json()) as SeatmapApiPayload;
      cache.set(screeningId, json);
      return json;
    })
    .catch((e) => {
      if (e instanceof DOMException && e.name === 'AbortError') return null;
      throw e;
    })
    .finally(() => {
      inflight.delete(screeningId);
    });

  if (!options?.force) inflight.set(screeningId, promise);
  return promise;
}

/** Warm cache for other home carousel cards (low priority). */
export function prefetchSeatmap(screeningId: string): void {
  if (cache.has(screeningId) || inflight.has(screeningId)) return;
  void fetchSeatmapPayload(screeningId).catch(() => null);
}
