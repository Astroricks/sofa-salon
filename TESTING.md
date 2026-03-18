# Testing Guide

This project uses **Jest** for unit tests and **Playwright** for end-to-end (E2E) tests. Running tests before committing helps catch regressions.

---

## What each test file covers

| File | What it tests |
|------|----------------|
| `src/lib/__tests__/config.test.ts` | App name and tagline defaults (`APP_NAME`, `APP_TAGLINE`, `APP_NAME_PARTS`). Assumes env vars unset. |
| `src/lib/__tests__/badges.test.ts` | `getBadgeLevel()`: tier by attendance (Sprout, Bronze, Silver, Gold, Diamond) and negative clamp. |
| `src/lib/__tests__/i18n.test.ts` | `getT()` en/zh strings (e.g. ticker labels), and **key parity** — every key in `tEn` exists in `tZh` with a non-empty string. |
| `src/lib/__tests__/ticker-utils.test.ts` | `RECENT_RATINGS_SCREENING_LIMIT` (2), `starsFromAvg()` for rating display. |
| `src/lib/__tests__/avatar.test.ts` | `avatarConfigFromSeed()` (deterministic), `jsonToConfig()` (parse + defaults). |
| `src/lib/__tests__/furniture.test.ts` | `seatKeyToDisplayLabel`, `lSofaSeatSplit`, `canSqueeze`, `roomCapacity`, `roomCapacityWithSqueeze`; empty room and edge cases. |
| `src/lib/__tests__/email.test.ts` | Email **template** construction: mocks Resend and checks subject/body for confirmation, cancel, waitlist promotion. |

**E2E** (`e2e/home.spec.ts`): Home page loads, has heading, screening-related text, ticker strip; profile page shows ticker section or login; nav and unauthenticated/admin checks.

---

## How to run tests

- **All unit tests:** `npm test`
- **Watch mode (re-run on file change):** `npm run test:watch`
- **Run one test file:** `npm test -- config` (runs files matching `config`, e.g. `config.test.ts`)
- **Run one test by name:** `npm test -- -t "default APP_NAME"`

**E2E:**

- Start the app in another terminal: `npm run dev`
- Run E2E: `npm run test:e2e`
- First time only: `npx playwright install chromium` (so the browser exists)

---

## How to add a new test

1. **Unit test:** Create a file next to the code it tests, e.g. `src/lib/foo.ts` → `src/lib/__tests__/foo.test.ts`. Copy an existing test file and follow the same pattern (describe, it, expect). Import from `../foo` (relative to `__tests__`).
2. **E2E test:** Add or edit a file in `e2e/`, e.g. `e2e/home.spec.ts`. Use `test.describe` and `test('...', async ({ page }) => { ... })`. Use `page.goto('/path')` and `expect(...).toBeVisible()` or `.toContainText()`.

---

## Unit vs E2E in this project

- **Unit tests** run in Node with Jest. They test individual functions and modules (config, badges, i18n, furniture, email templates, etc.) with no browser and no real API. They are fast and should cover business logic and data shaping.
- **E2E tests** run in a real browser (Playwright). They test that key pages load and that critical UI/text is present. They do **not** require logging in unless you add fixtures for auth. Use E2E for navigation, unauthenticated redirects, and responsive checks; use unit tests for calculations and formatting.
