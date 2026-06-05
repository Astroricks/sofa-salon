/**
 * Perf probe: home cold load + screening card switch (Playwright ≈ DevTools Network).
 * Run: node scripts/measure-screening-switch.mjs
 */
import { chromium } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

function summarize(times) {
  const sorted = times.filter((x) => typeof x === 'number' && x >= 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    n: sorted.length,
    minMs: Math.round(sorted[0]),
    maxMs: Math.round(sorted[sorted.length - 1]),
    avgMs: Math.round(sum / sorted.length),
    p50Ms: Math.round(sorted[Math.floor(sorted.length * 0.5)]),
  };
}

async function collectColdLoad(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const responses = [];

  page.on('response', (res) => {
    const url = res.url();
    const interesting =
      url === `${BASE}/` ||
      url.startsWith(`${BASE}/?`) ||
      url.includes('/api/screenings/') ||
      url.includes('supabase.co');
    if (!interesting) return;
    responses.push({
      url: url.length > 100 ? url.slice(0, 100) + '…' : url,
      status: res.status(),
      type: res.request().resourceType(),
      category: url.includes('seatmap')
        ? 'seatmap-api'
        : url.includes('supabase.co/auth')
          ? 'supabase-auth'
          : url.includes('supabase.co')
            ? 'supabase-rest'
            : url === `${BASE}/` || url.startsWith(`${BASE}/?`)
              ? 'document'
              : 'other',
    });
  });

  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const documentMs = Date.now() - t0;
  await page.waitForSelector('.screening-card', { timeout: 90000 }).catch(() => null);

  await page.waitForResponse((r) => r.url().includes('seatmap'), { timeout: 60000 }).catch(() => null);

  const counts = responses.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});

  await ctx.close();
  return { documentMs, responseCounts: counts, totalResponses: responses.length, sample: responses.slice(0, 20) };
}

async function measureSwitch(page, cardIndex) {
  const cards = page.locator('.screening-card');
  const card = cards.nth(cardIndex);
  const cardTitle = (await card.locator('.film-title').first().textContent())?.trim() ?? '';
  const wasActive = await card.evaluate((el) => el.classList.contains('active'));

  const seatmapDone = wasActive
    ? Promise.resolve(null)
    : page
        .waitForResponse((res) => res.url().includes('/seatmap'), { timeout: 90000 })
        .then((res) => ({ status: res.status(), url: res.url() }))
        .catch(() => null);

  const t0 = Date.now();
  await card.click();

  let activeMs = null;
  for (let i = 0; i < 100; i++) {
    if (await card.evaluate((el) => el.classList.contains('active'))) {
      activeMs = Date.now() - t0;
      break;
    }
    await page.waitForTimeout(5);
  }

  const seatmapRes = await seatmapDone;
  const seatmapMs = wasActive ? null : Date.now() - t0;

  const seatSectionText = await page.locator('.seat-map-section').innerText().catch(() => '');

  return {
    cardIndex,
    cardTitle: cardTitle.slice(0, 40),
    wasAlreadyActive: wasActive,
    activeClassMs: activeMs,
    seatmapHttpMs: seatmapMs,
    seatmapStatus: seatmapRes?.status ?? (wasActive ? 'skipped-already-active' : null),
    seatSectionIncludesTitle: cardTitle ? seatSectionText.includes(cardTitle.slice(0, 12)) : null,
  };
}

async function measureDuplicateFetches(page) {
  const calls = [];
  const handler = (req) => {
    const url = req.url();
    if (url.includes('/seatmap')) {
      calls.push({ at: Date.now(), kind: 'next-seatmap-api', url });
    } else if (url.includes('supabase.co/rest/v1/reservations')) {
      calls.push({ at: Date.now(), kind: 'supabase-reservations', url: url.split('?')[0].slice(-60) });
    } else if (url.includes('get_user_attendance_counts')) {
      calls.push({ at: Date.now(), kind: 'supabase-attendance-rpc', url });
    } else if (url.includes('supabase.co/auth/v1/user')) {
      calls.push({ at: Date.now(), kind: 'supabase-auth', url });
    }
  };
  page.on('request', handler);

  const cards = page.locator('.screening-card');
  const n = await cards.count();
  if (n < 2) return { error: 'need 2+ cards' };

  await page.waitForResponse((r) => r.url().includes('seatmap'), { timeout: 60000 }).catch(() => null);
  calls.length = 0;
  const t0 = Date.now();
  await cards.nth(1).click();
  await page.waitForResponse((r) => r.url().includes('seatmap'), { timeout: 60000 }).catch(() => null);
  await page.waitForTimeout(2500);
  const windowMs = Date.now() - t0;

  page.off('request', handler);
  const byKind = calls.reduce((acc, c) => {
    acc[c.kind] = (acc[c.kind] ?? 0) + 1;
    return acc;
  }, {});

  return { windowMs, byKind, calls };
}

async function curlSeatmapTiming(screeningIds) {
  if (!screeningIds.length) return null;
  const results = [];
  for (const id of screeningIds.slice(0, 3)) {
    const url = `${BASE}/api/screenings/${id}/seatmap`;
    const t0 = Date.now();
    try {
      const res = await fetch(url);
      const body = await res.text();
      results.push({
        screeningId: id,
        status: res.status,
        ms: Date.now() - t0,
        bytes: body.length,
      });
    } catch (e) {
      results.push({ screeningId: id, error: String(e) });
    }
  }
  return results;
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  const cold = await collectColdLoad(browser);

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('.screening-card', { timeout: 90000 });

  const cardCount = await page.locator('.screening-card').count();
  const screeningIds = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.screening-card'))
      .map((_, i) => i)
      .slice(0, 5);
  });

  // Extract seatmap URLs from performance entries after first load
  const seatmapIds = await page.evaluate(() => {
    return performance
      .getEntriesByType('resource')
      .filter((e) => e.name.includes('/seatmap'))
      .map((e) => {
        const m = e.name.match(/screenings\/([^/]+)\/seatmap/);
        return m ? m[1] : null;
      })
      .filter(Boolean);
  });

  await page.waitForResponse((r) => r.url().includes('seatmap'), { timeout: 60000 }).catch(() => null);

  const warmSwitch = [];
  // Alternate cards so each click triggers a new seatmap fetch
  const order = [];
  for (let i = 1; i < Math.min(cardCount, 4); i++) order.push(i);
  for (let i = 0; i < Math.min(cardCount, 4); i++) order.push(i);
  for (const idx of order) {
    warmSwitch.push(await measureSwitch(page, idx));
    await page.waitForTimeout(400);
  }

  const duplicate = await measureDuplicateFetches(page);

  const curlTimings = await curlSeatmapTiming(seatmapIds);

  // Warm vs cold seatmap: second context already closed; curl first vs second
  let curlColdWarm = null;
  if (seatmapIds[0]) {
    const id = seatmapIds[0];
    const url = `${BASE}/api/screenings/${id}/seatmap`;
    const a = Date.now();
    await fetch(url);
    const first = Date.now() - a;
    const b = Date.now();
    await fetch(url);
    const second = Date.now() - b;
    curlColdWarm = { screeningId: id, firstFetchMs: first, secondFetchMs: second };
  }

  await ctx.close();
  await browser.close();

  const report = {
    measuredAt: new Date().toISOString(),
    baseUrl: BASE,
    cardCount,
    screeningIdsFromNetwork: seatmapIds,
    step1_coldTab: cold,
    step2_cardSwitch: {
      samples: warmSwitch,
      activeClassMs: summarize(warmSwitch.map((s) => s.activeClassMs)),
      seatmapHttpMs: summarize(warmSwitch.map((s) => s.seatmapHttpMs).filter((x) => x != null)),
      seatSectionMatchesCardAfterSeatmap: warmSwitch.filter((s) => s.seatSectionIncludesTitle === true).length,
    },
    step3_duplicateFetchesOnOneSwitch: duplicate,
    step4_curlSeatmapApi: curlTimings,
    step4b_sameSeatmapFetchTwice: curlColdWarm,
    conclusions: [],
  };

  const avgSeatmap = report.step2_cardSwitch.seatmapHttpMs?.avgMs;
  const avgActive = report.step2_cardSwitch.activeClassMs?.avgMs;
  if (avgActive != null && avgSeatmap != null) {
    if (avgActive < 100 && avgSeatmap > 500) {
      report.conclusions.push(
        `Card highlight is fast (~${avgActive}ms) but seatmap API dominates (~${avgSeatmap}ms) — bottleneck is data fetch, not card UI.`
      );
    }
  }
  if (duplicate.byKind) {
    const api = duplicate.byKind['next-seatmap-api'] ?? 0;
    const res = duplicate.byKind['supabase-reservations'] ?? 0;
    const rpc = duplicate.byKind['supabase-attendance-rpc'] ?? 0;
    if (api >= 1 && (res >= 1 || rpc >= 1)) {
      report.conclusions.push(
        `Duplicate work confirmed on one switch: seatmap API=${api}, supabase reservations=${res}, attendance RPC=${rpc}.`
      );
    }
  }
  if (cold.documentMs > 3000) {
    report.conclusions.push(`Cold document+networkidle took ${cold.documentMs}ms — first-tab slowness includes server/layout load.`);
  }
  if (curlColdWarm && curlColdWarm.secondFetchMs < curlColdWarm.firstFetchMs * 0.7) {
    report.conclusions.push(
      `Repeat seatmap fetch faster (${curlColdWarm.secondFetchMs}ms vs ${curlColdWarm.firstFetchMs}ms) — caching would help re-switching.`
    );
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
