/**
 * Benchmark screening card switch: latency + duplicate network calls.
 * Run: node scripts/measure-switch-benchmark.mjs
 */
import { chromium } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

function stats(nums) {
  const s = nums.filter((n) => typeof n === 'number').sort((a, b) => a - b);
  if (!s.length) return null;
  return {
    n: s.length,
    min: Math.round(s[0]),
    p50: Math.round(s[Math.floor(s.length / 2)]),
    max: Math.round(s[s.length - 1]),
    avg: Math.round(s.reduce((a, b) => a + b, 0) / s.length),
  };
}

async function measureSwitchNetwork(page, fromIdx, toIdx) {
  const log = [];
  const onRes = (res) => {
    const url = res.url();
    if (url.includes('/seatmap')) log.push('seatmap-api');
    else if (url.includes('supabase.co/rest/v1/reservations')) log.push('supabase-reservations');
    else if (url.includes('get_user_attendance_counts')) log.push('attendance-rpc');
    else if (url.includes('supabase.co/auth/v1/user')) log.push('supabase-auth');
  };
  page.on('response', onRes);

  const cards = page.locator('.screening-card');
  log.length = 0;
  const t0 = Date.now();
  await cards.nth(toIdx).click();
  await page.waitForResponse((r) => r.url().includes('/seatmap'), { timeout: 90000 }).catch(() => null);
  // allow SeatMap effects to settle
  await page.waitForTimeout(1500);
  const elapsed = Date.now() - t0;

  page.off('response', onRes);
  const byKind = log.reduce((a, k) => {
    a[k] = (a[k] ?? 0) + 1;
    return a;
  }, {});

  const skeletonVisible = await page.locator('.seatmap-loading-skeleton').isVisible().catch(() => false);
  const activeMs = await cards.nth(toIdx).evaluate((el) => el.classList.contains('active'));

  return { fromIdx, toIdx, elapsed, byKind, skeletonVisible, activeSelected: activeMs };
}

async function measureSeatmapReady(page, toIdx) {
  const cards = page.locator('.screening-card');
  const t0 = Date.now();
  await cards.nth(toIdx).click();
  let activeMs = null;
  for (let i = 0; i < 80; i++) {
    if (await cards.nth(toIdx).evaluate((el) => el.classList.contains('active'))) {
      activeMs = Date.now() - t0;
      break;
    }
    await page.waitForTimeout(5);
  }
  await page.waitForFunction(
    () => !document.querySelector('.seatmap-loading-skeleton'),
    { timeout: 90000 }
  ).catch(() => null);
  const readyMs = Date.now() - t0;
  return { activeMs, readyMs };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const coldT0 = Date.now();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.screening-card', { timeout: 90000 });
  await page.waitForFunction(
    () => !document.querySelector('.seatmap-loading-skeleton'),
    { timeout: 90000 }
  ).catch(() => null);
  const firstInteractiveMs = Date.now() - coldT0;

  const cardCount = await page.locator('.screening-card').count();
  const switches = [];
  if (cardCount >= 2) {
    switches.push(await measureSwitchNetwork(page, 0, 1));
    switches.push(await measureSwitchNetwork(page, 1, 0));
    switches.push(await measureSwitchNetwork(page, 0, 1));
  }

  const readySamples = [];
  if (cardCount >= 2) {
    readySamples.push(await measureSeatmapReady(page, 1));
    readySamples.push(await measureSeatmapReady(page, 0));
  }

  // cached re-switch: 0 -> 1 -> 0 -> 1
  const cacheSamples = [];
  if (cardCount >= 2) {
    for (let i = 0; i < 3; i++) {
      cacheSamples.push(await measureSeatmapReady(page, i % 2));
    }
  }

  await browser.close();

  const report = {
    label: process.env.BENCH_LABEL ?? 'run',
    measuredAt: new Date().toISOString(),
    cardCount,
    firstInteractiveMs,
    switchNetwork: switches,
    seatMapReadyMs: stats(readySamples.map((s) => s.readyMs)),
    activeClassMs: stats(readySamples.map((s) => s.activeMs)),
    cacheReswitchReadyMs: stats(cacheSamples.map((s) => s.readyMs)),
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
