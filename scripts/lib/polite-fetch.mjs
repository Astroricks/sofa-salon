/** HTTP GET JSON with backoff (429 / 5xx / network). */

const DEFAULT_GAP_MS = 350;
const MAX_RETRIES = 6;
const MAX_GAP_MS = 5000;

let gapMs = DEFAULT_GAP_MS;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryAfterMs(header) {
  if (!header) return 0;
  const n = Number(header);
  if (Number.isFinite(n) && n > 0) return n * 1000;
  const d = Date.parse(header);
  if (Number.isFinite(d)) return Math.max(0, d - Date.now());
  return 0;
}

export function setGapMs(ms) {
  gapMs = ms;
}

export function bumpGapOnRateLimit() {
  gapMs = Math.min(MAX_GAP_MS, Math.round(gapMs * 1.4));
}

export function easeGapOnSuccess() {
  if (gapMs > DEFAULT_GAP_MS) {
    gapMs = Math.max(DEFAULT_GAP_MS, gapMs - 40);
  }
}

export function currentGapMs() {
  return gapMs;
}

/**
 * @param {string} url
 * @param {RequestInit} [init]
 */
export async function politeGetJson(url, init = {}) {
  let lastErr;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await sleep(gapMs);

    let res;
    try {
      res = await fetch(url, init);
    } catch (err) {
      lastErr = err;
      const wait = Math.min(30_000, 1000 * 2 ** attempt);
      console.warn(`Fetch network error, retry in ${wait}ms:`, err instanceof Error ? err.message : err);
      await sleep(wait);
      continue;
    }

    if (res.status === 429) {
      const retryAfter = parseRetryAfterMs(res.headers.get('retry-after'));
      const wait = retryAfter > 0 ? retryAfter : Math.min(60_000, 2000 * 2 ** attempt);
      bumpGapOnRateLimit();
      console.warn(
        `HTTP 429 — waiting ${Math.round(wait / 1000)}s (attempt ${attempt + 1}, gap ${gapMs}ms)`
      );
      await sleep(wait);
      continue;
    }

    if (res.status >= 500 && attempt < MAX_RETRIES) {
      const wait = Math.min(30_000, 1000 * 2 ** attempt);
      console.warn(`HTTP ${res.status}, retry in ${wait}ms`);
      await sleep(wait);
      continue;
    }

    const data = await res.json();
    if (!res.ok) {
      const msg =
        typeof data.error === 'string'
          ? data.error
          : data.error?.info ?? data.status_message ?? `HTTP ${res.status}`;
      throw new Error(msg);
    }

    easeGapOnSuccess();
    return data;
  }

  throw lastErr instanceof Error ? lastErr : new Error('Request failed after retries');
}
