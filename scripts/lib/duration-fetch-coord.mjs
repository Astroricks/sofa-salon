import { existsSync, readFileSync, writeFileSync, unlinkSync, openSync, closeSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const DURATION_LOCK_PATH = join(__dirname, '../data/.duration-fetch.lock');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Spin lock so two CLI processes do not corrupt the report JSON. */
export async function withDurationFetchLock(fn) {
  const staleMs = 30 * 60 * 1000;
  const started = Date.now();

  while (true) {
    try {
      const fd = openSync(DURATION_LOCK_PATH, 'wx');
      closeSync(fd);
      break;
    } catch (err) {
      if (err?.code !== 'EEXIST') throw err;
      if (existsSync(DURATION_LOCK_PATH)) {
        const age = Date.now() - readFileSync(DURATION_LOCK_PATH, 'utf8').trim().split('\n')[0];
        if (Number.isFinite(age) && Date.now() - Number(age) > staleMs) {
          try {
            unlinkSync(DURATION_LOCK_PATH);
          } catch {
            /* ignore */
          }
        }
      }
      if (Date.now() - started > staleMs) {
        throw new Error('Could not acquire duration fetch lock (another run active?)');
      }
      await sleep(500);
    }
  }

  try {
    writeFileSync(DURATION_LOCK_PATH, `${Date.now()}\n${process.pid}\n`);
    return await fn();
  } finally {
    try {
      unlinkSync(DURATION_LOCK_PATH);
    } catch {
      /* ignore */
    }
  }
}

function mergeAttempts(a = [], b = []) {
  const byProvider = new Map();
  for (const x of [...a, ...b]) {
    if (x?.provider) byProvider.set(x.provider, x);
  }
  return [...byProvider.values()];
}

/** Prefer any row that already has duration; merge attempt history. */
export function mergeReportEntry(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  if (incoming.durationMinutes != null) {
    return {
      ...existing,
      ...incoming,
      attempts: mergeAttempts(existing.attempts, incoming.attempts),
    };
  }
  if (existing.durationMinutes != null) {
    return {
      ...incoming,
      ...existing,
      attempts: mergeAttempts(existing.attempts, incoming.attempts),
    };
  }
  return {
    ...existing,
    ...incoming,
    attempts: mergeAttempts(existing.attempts, incoming.attempts),
  };
}

/**
 * Pull latest results from disk (e.g. parallel terminals or checkpoints).
 * @param {Map<string, object>} reportById
 * @param {Map<string, { id: string, durationMinutes: number }>} patchById
 */
export function mergeReportFromDisk(reportById, patchById, reportPath) {
  if (!existsSync(reportPath)) return 0;
  let merged = 0;
  const prev = JSON.parse(readFileSync(reportPath, 'utf8'));
  for (const row of prev) {
    if (!row?.id) continue;
    const existing = reportById.get(row.id);
    const next = mergeReportEntry(existing, row);
    if (next !== existing) merged++;
    reportById.set(row.id, next);
    if (next.durationMinutes != null) {
      patchById.set(row.id, {
        id: row.id,
        durationMinutes: next.durationMinutes,
      });
    }
  }
  return merged;
}

export function hasProviderAttempt(entry, provider) {
  return (entry?.attempts ?? []).some((a) => a.provider === provider);
}

/**
 * @param {Array<{ id: string }>} rows
 * @param {Map<string, object>} reportById
 * @param {{ reverse?: boolean }} opts
 */
export function orderRowsForParallelPass(rows, reportById, opts) {
  void reportById;
  const list = [...rows];
  if (opts.reverse) list.reverse();
  return list;
}
