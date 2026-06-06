/**
 * Cold-load probe: measures home first visit (SSR seatmap seeding, document TTFB, seatmap ready).
 * Run with dev server: npm run dev  →  npm run measure:cold-load
 *
 * Key signals:
 * - ssrSeatmapSeedingEffective: no skeleton flash + seatmap ready before any seatmap API completes
 * - serverTtfbMs: HTML time-to-first-byte (layout ticker + home SSR dominate)
 * - seatmapReadyMs: client time until seat map is interactive (not skeleton)
 */
import { chromium } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const RUNS = Number(process.env.MEASURE_RUNS ?? '3');

function median(nums) {
  const sorted = nums.filter((n) => typeof n === 'number' && n >= 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  return Math.round(sorted[Math.floor(sorted.length / 2)]);
}

function avg(nums) {
  const sorted = nums.filter((n) => typeof n === 'number' && n >= 0);
  if (!sorted.length) return null;
  return Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
}

async function measureServerTtfb() {
  const samples = [];
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    const res = await fetch(BASE, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    const body = await res.arrayBuffer();
    const ms = Date.now() - t0;
    samples.push({ ms, status: res.status, bytes: body.byteLength });
  }
  return {
    medianMs: median(samples.map((s) => s.ms)),
    avgMs: avg(samples.map((s) => s.ms)),
    samples,
  };
}

async function measureColdBrowserRun(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const requests = [];
  const seatmapResponses = [];

  page.on('request', (req) => {
    const url = req.url();
    if (!url.includes('/seatmap')) return;
    requests.push({ at: Date.now(), phase: 'request', url });
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (!url.includes('/seatmap')) return;
    seatmapResponses.push({
      at: Date.now(),
      status: res.status(),
      url: url.slice(-80),
    });
  });

  const navStart = Date.now();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });

  const domMs = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    if (!nav || nav.domContentLoadedEventEnd <= 0) return null;
    return Math.round(nav.domContentLoadedEventEnd);
  });

  await page.waitForSelector('.screening-card', { timeout: 90000 }).catch(() => null);

  const activeScreeningId = await page.evaluate(() => {
    const active = document.querySelector('.screening-card.active');
    return active?.getAttribute('data-screening-id') ?? null;
  });

  let seatmapReadyMs = null;
  let skeletonEverVisible = false;
  const readyDeadline = Date.now() + 90000;

  while (Date.now() < readyDeadline) {
    const state = await page.evaluate(() => {
      const section = document.querySelector('.seat-map-section');
      if (!section) return { skeleton: false, ready: false, textLen: 0 };
      const skeleton = !!section.querySelector('.seatmap-loading-skeleton');
      const text = section.innerText?.trim() ?? '';
      const ready =
        !skeleton &&
        text.length > 40 &&
        !text.includes('Select an event') &&
        !text.includes('点击上方活动');
      return { skeleton, ready, textLen: text.length };
    });

    if (state.skeleton) skeletonEverVisible = true;
    if (state.ready) {
      seatmapReadyMs = Date.now() - navStart;
      break;
    }
    await page.waitForTimeout(50);
  }

  const seatmapApiBeforeReady = seatmapResponses.filter(
    (r) => seatmapReadyMs == null || r.at - navStart <= seatmapReadyMs
  ).length;

  const perfResources = await page.evaluate(() => {
    return performance
      .getEntriesByType('resource')
      .filter((e) => e.name.includes('seatmap') || e.name.includes('supabase.co'))
      .map((e) => ({
        name: e.name.includes('seatmap')
          ? 'seatmap-api'
          : e.name.includes('auth')
            ? 'supabase-auth'
            : 'supabase-rest',
        durationMs: Math.round(e.duration),
        startMs: Math.round(e.startTime),
      }));
  });

  const seatmapApiResources = perfResources.filter((r) => r.name === 'seatmap-api');
  const earliestSeatmapApiMs =
    seatmapApiResources.length > 0
      ? Math.min(...seatmapApiResources.map((r) => r.startMs))
      : null;

  await ctx.close();

  const ssrSeatmapSeedingEffective =
    !skeletonEverVisible && seatmapApiBeforeReady === 0 && seatmapReadyMs != null && seatmapReadyMs < 2000;

  return {
    domContentLoadedMs: domMs,
    seatmapReadyMs,
    skeletonEverVisible,
    seatmapApiBeforeReady,
    earliestSeatmapApiMs,
    activeScreeningId,
    ssrSeatmapSeedingEffective,
    supabaseClientCalls: perfResources.filter((r) => r.name !== 'seatmap-api').length,
    seatmapApiTotal: seatmapApiResources.length,
  };
}

function architecturalRecommendation(report) {
  const rec = {
    ssrSeeding: 'implemented',
    tickerCache: 'defer',
    forceDynamicOrIsr: 'defer',
    rationale: [],
  };

  const ttfb = report.serverTtfb.medianMs;
  const ready = report.browser.medianSeatmapReadyMs;
  const ssrOk = report.browser.ssrEffectiveRuns >= Math.ceil(RUNS / 2);

  if (ssrOk) {
    rec.rationale.push(
      `SSR seatmap seeding works: seat map ready ~${ready}ms without skeleton or blocking seatmap API on cold load.`
    );
  } else {
    rec.rationale.push('SSR seatmap seeding did not consistently eliminate skeleton/API wait — investigate before larger changes.');
  }

  if (ttfb != null && ttfb > 1500) {
    rec.rationale.push(
      `Server HTML TTFB median ~${ttfb}ms is high — layout Ticker + home SSR queries likely dominate remaining cold load.`
    );
    if (ready != null && ready < ttfb * 0.6) {
      rec.rationale.push(
        'Seatmap is no longer the main bottleneck after SSR; ticker/layout server work is the next cost center.'
      );
      rec.tickerCache = 'consider_later';
      rec.rationale.push(
        'Ticker cache (e.g. unstable_cache 30–60s) is the smallest architectural win if you need faster first paint — not implemented here pending product need.'
      );
    }
  } else if (ttfb != null) {
    rec.rationale.push(
      `Server TTFB median ~${ttfb}ms is acceptable locally; bigger architectural changes are not justified from these numbers alone.`
    );
  }

  rec.rationale.push(
    'Removing force-dynamic / adding ISR on home is not recommended: live reservation counts and auth-adjacent seatmap data must stay fresh.'
  );

  rec.decision =
    rec.tickerCache === 'consider_later'
      ? 'SSR seeding is worth keeping. Defer ticker cache and ISR unless prod TTFB remains >2s after deploy.'
      : 'SSR seeding is worth keeping. No further architectural changes warranted from local measurements.';

  return rec;
}

async function main() {
  const serverTtfb = await measureServerTtfb();

  const browser = await chromium.launch({ headless: true });
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    runs.push(await measureColdBrowserRun(browser));
  }
  await browser.close();

  const report = {
    measuredAt: new Date().toISOString(),
    baseUrl: BASE,
    runs,
    serverTtfb,
    browser: {
      medianDomMs: median(runs.map((r) => r.domContentLoadedMs)),
      medianSeatmapReadyMs: median(runs.map((r) => r.seatmapReadyMs)),
      skeletonVisibleRuns: runs.filter((r) => r.skeletonEverVisible).length,
      ssrEffectiveRuns: runs.filter((r) => r.ssrSeatmapSeedingEffective).length,
      seatmapApiBeforeReadyRuns: runs.map((r) => r.seatmapApiBeforeReady),
      medianEarliestSeatmapApiMs: median(
        runs.map((r) => r.earliestSeatmapApiMs).filter((x) => x != null)
      ),
    },
    recommendation: null,
  };

  report.recommendation = architecturalRecommendation(report);

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
