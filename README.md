# ZiggyGraph / Sofa Salon

> Sofa Salon was originally created by [Eve Shi](https://eveshi.com/).
> This repository is a public open-source fork with ongoing feature development.

Public deployments should include visible attribution to Shi Qianyi as the original creator.

Open-source under the [MIT License](LICENSE). See [SECURITY.md](SECURITY.md).

## What is this project?

This app is a **private screening room / cinema club booking system**. Members browse upcoming film screenings, reserve seats, and after attending they can rate films and send short messages to a shared ticker. An **admin** manages events (create/edit screenings, rooms, waitlist), configures the ticker, and can **generate a WeChat-style group announcement** (Chinese text with date, **weekday**, time, titles, and optional signup status). Main user flows: **browse upcoming screenings → reserve a seat (or join waitlist) → attend → rate and optionally send a ticker message**. The stack is Next.js, Supabase (auth + database), and optional Resend for email.

---

## 1. Project structure

```
sofa-salon/
├── src/
│   ├── app/
│   │   ├── api/                 # API routes (reserve, cancel, screening, waitlist, etc.)
│   │   ├── admin/               # Admin UI (events, rooms, ticker, feedback, settings, group announcement)
│   │   ├── auth/                # Login (Google OAuth)
│   │   ├── profile/             # User profile, watch history, ticket stub export
│   │   ├── receipt/             # Viewing receipt (SVG) + export
│   │   ├── screening/[id]/      # Seat map for a screening
│   │   ├── layout.tsx
│   │   └── page.tsx             # Home (upcoming screenings)
│   ├── components/              # Shared UI (SeatMap, Ticker, NavBar, ReceiptSVG, etc.)
│   ├── lib/                     # Utilities and config
│   │   ├── config.ts            # App name, tagline (env)
│   │   ├── supabase/            # Supabase client (browser, server, admin)
│   │   ├── i18n.ts              # EN/ZH strings
│   │   ├── badges.ts            # Badge tiers by attendance
│   │   ├── email.ts             # Resend (confirmation, promotion, reminder)
│   │   └── furniture.ts         # Seat layout, squeeze rules
│   └── middleware.ts            # Protects /admin, /profile; redirects empty wechat_id to /profile/setup
├── supabase-sql/                # Database migrations (run in order 00–21)
│   ├── README.md                # Migration list, safety notes, how to add new files
│   ├── 00-base-schema.sql
│   └── 01-... through 21-...
├── e2e/                         # Playwright E2E tests
├── docs/                        # DEVELOPMENT_RULES.md (lint / dev / test checklist)
├── .cursor/rules/               # Cursor rules (e.g. development.mdc)
├── .env.example                 # Copy to .env.local and fill
├── jest.config.js
├── jest.setup.js
├── playwright.config.ts         # E2E baseURL, CI webServer
├── TESTING.md                   # What each test covers, how to run one file
└── package.json
```

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind. Auth: Supabase Auth (Google OAuth).
- **Backend**: Next.js API routes in `src/app/api/`; Supabase (Postgres) for data; optional Resend for email.
- **SQL**: All schema and migrations live in `supabase-sql/`. Run files in numeric order in the Supabase SQL Editor.

---

## Self-host (your own Supabase + Resend)

This app is designed to run against **your** infrastructure — do not point a public fork at a production database that holds real guest data. This repository does not include a hosted demo or shared database — each deployment uses its own Supabase project.

1. **Supabase** — Create a project, run `supabase-sql/` migrations in order (see `supabase-sql/README.md`), and set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. For waitlist promotion, admin attendance, and some cron paths, also set `SUPABASE_SERVICE_ROLE_KEY` to a server-only `sb_secret_...` key (preferred) or the legacy `service_role` JWT.
2. **Auth** — Enable Google (or other providers) in Supabase; set Site URL and redirect URLs to your app origin.
3. **Resend (optional)** — Sign up at [resend.com](https://resend.com), verify a sending domain, then set `RESEND_API_KEY` and `EMAIL_FROM`. Without Resend, bookings still work; confirmation/reminder emails are skipped.
4. **Host contact (optional)** — Set `HOST_CONTACT_EMAIL` for the `/contact` form.
5. **Branding** — Override the `NEXT_PUBLIC_*` display and identity variables in `.env.local`; no source edits are required. This includes the app/salon name, tagline, locale-specific past-screening links, navigation attribution, host references, and receipt venue details. Optional links and attribution are hidden when unset.

Deploy the Next.js app (e.g. Vercel) with the same env vars. Use a **separate** Supabase project for staging vs production.

---

## 2. Local setup and running the app

### 2.1 Prerequisites

- Node.js 18+
- npm (or pnpm/yarn)
- A Supabase project (create at [supabase.com](https://supabase.com))

### 2.2 One-time setup

1. **Clone and install**
   ```bash
   cd sofa-salon
   npm install
   ```

2. **Environment variables**
   - Copy `.env.example` to `.env.local`.
   - **Where to get Supabase values:** In the Supabase Dashboard, go to **Project Settings** (gear icon in the left sidebar) → **API**. There you will see:
     - **Project URL** — copy into `NEXT_PUBLIC_SUPABASE_URL`.
     - **Project API keys** — under "anon" / "public", copy into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Fill at least these two; the rest are optional (see `.env.example` for required vs optional and `CRON_SECRET`, etc.).

3. **Database**
   - In Supabase Dashboard → **SQL Editor**, run the scripts in `supabase-sql/` **in order**: `00-base-schema.sql` first, then `01-...` through `21-...` (see `supabase-sql/README.md` for the full list, migration safety, and how to add a new numbered file).
   - Set yourself as admin (replace with your auth user UUID):
     ```sql
     UPDATE profiles SET is_admin = TRUE WHERE id = 'your-auth-user-uuid';
     ```

4. **Auth (Google)**
   - In Supabase: **Authentication** → **Providers** → **Google**: enable and set Client ID / Secret.
   - In Google Cloud Console: create OAuth 2.0 credentials (Web application), add authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.

5. **E2E tests (optional but recommended)**  
   Before running E2E for the first time: `npx playwright install chromium`

### 2.3 Run locally

```bash
npm run dev
```

Default URL: [http://localhost:3000](http://localhost:3000). To use another port: `npm run dev -- -p 3001` (and set `PLAYWRIGHT_BASE_URL` when running E2E against that port).

**Verify it works:** Open the URL above. You should see the home page with upcoming screenings (or an empty list). If you see an error or a blank page, check `.env.local` and that migrations ran.

Log in with Google; if your profile has no WeChat ID, you will be redirected to `/profile/setup`.

### 2.4 Build and production run

```bash
npm run build
npm run start
```

`npm run start` also listens on port **3000** by default. If something is already using that port, stop the other process or use `npm run start -- -p 3001`.

---

## 3. Common tasks

### How to add a new page

- Create a folder under `src/app/` (e.g. `src/app/about/`) and add `page.tsx`. It uses the root layout from `src/app/layout.tsx`.
- Example: `src/app/about/page.tsx` → route `/about`.

### How to add a new API route

- Create `src/app/api/your-route/route.ts` and export `GET`, `POST`, etc. The URL will be `/api/your-route`.

### How to add a new i18n string

- Edit `src/lib/i18n.ts`: add the same key path under both `tEn` and `tZh`.
- In components, use `getT(locale).section.key` (or your app's locale helper).

### How to run database migrations

- Add `supabase-sql/NN-description.sql`, run it in the SQL Editor after earlier files, and document it in `supabase-sql/README.md`.

### Admin: group announcement (群公告)

- On **Admin** home, use **Generate group announcement** / **生成群公告** (or **Generate with signup status**). Text is Chinese, includes **weekday** in parentheses after the date (e.g. `3月15日（周六）晚上6点`) so members can see weekend vs weekday. Implementation: `src/app/admin/AdminAnnouncement.tsx` and `/api/admin/announcement`.

---

## 4. Testing

### 4.1 Unit tests (Jest)

- **Run all:** `npm test`
- **Watch mode:** `npm run test:watch`
- **Run one file:** `npm test -- config` (matches `config.test.ts`)
- **Location:** `src/lib/__tests__/*.test.ts`

See **`TESTING.md`** for each file's scope and how to add tests.

### 4.2 E2E tests (Playwright)

- **Local:** Start the app (`npm run dev`), then in another terminal: `npm run test:e2e`. Targets `http://localhost:3000` by default (`playwright.config.ts` `baseURL`). Override with `PLAYWRIGHT_BASE_URL` if you use another port.
- **CI:** When `CI` is set, Playwright can start `npm run start` automatically (requires a prior `npm run build` in your pipeline).
- **First time:** `npx playwright install chromium`
- **Specs:** `e2e/*.spec.ts` (home, nav, profile unauthenticated, admin gate, mobile viewport).

**Development rules:** **`docs/DEVELOPMENT_RULES.md`** and **`.cursor/rules/development.mdc`** (Cursor). Lint, dev, and tests should pass before considering a change done.

---

## 5. Troubleshooting

| Problem | What to do |
|--------|------------|
| **`NEXT_PUBLIC_SUPABASE_URL` is undefined** | Create `.env.local` from `.env.example` and fill Supabase URL and anon key (Section 2.2). |
| **Google login redirects to an error page** | OAuth redirect URI in Google Cloud must match Supabase: `https://<project-ref>.supabase.co/auth/v1/callback`. |
| **`npm run dev` fails with "module not found"** | Run `npm install` again. |
| **`EADDRINUSE` / port 3000 already in use** | Another `next dev` or `next start` is running. Stop it, or use another port: `npm run dev -- -p 3001`. On Windows: run `netstat -ano`, find the LISTENING row for port 3000, note the PID in the last column, then `taskkill /PID <pid> /F`. |
| **E2E tests fail with "browser not found"** | Run `npx playwright install chromium` (or `npx playwright install`). |
| **Database errors after pulling new code** | Run any new `supabase-sql/` files in order (see `supabase-sql/README.md`). |

---

## 6. Deployment

### 6.1 Deploy app (e.g. Vercel)

1. Connect the repo; add the same env vars as `.env.local` (never commit `.env.local`).
2. Build: `npm run build`.
3. Set `NEXT_PUBLIC_CUSTOMER_SITE_URL` to the deployed URL for links in emails, calendars, and group announcements. `NEXT_PUBLIC_APP_URL` remains the auth callback fallback.

### 6.2 Supabase (production)

- Use the same or a dedicated production Supabase project. Run the same `supabase-sql` migrations (00–21) on a new DB. Back up before applying changes on production (see `supabase-sql/README.md`).
- Auth → URL Configuration: **Site URL** and redirect URLs for production.

### 6.3 Post-deploy

- Set at least one admin: `UPDATE profiles SET is_admin = TRUE WHERE id = '...';`

---

## 7. Code and conventions

- **Deployment identity:** Define app, navigation attribution, host references, and receipt values through `.env.local`; `src/lib/config.ts` is the single source of truth.
- **Env:** Use `process.env.*`; only `NEXT_PUBLIC_*` is available in the browser.
- **Naming:** Prefer clear names (`screeningId`, `userId`, `seatKey`).
- **SQL:** Single source of truth in `supabase-sql/`; run in numeric order.

---

## 8. Quick reference

| Task | Command / place |
|------|------------------|
| Start dev | `npm run dev` |
| Build | `npm run build` |
| Production serve | `npm run start` |
| Unit tests | `npm test` |
| E2E tests | `npm run test:e2e` (app running locally, or CI + build) |
| Lint | `npm run lint` |
| Security | `SECURITY.md` |
| Dev rules | `docs/DEVELOPMENT_RULES.md`, `.cursor/rules/development.mdc` |
| Test guide | `TESTING.md` |
| DB migrations | `supabase-sql/` 00–21, `supabase-sql/README.md` |
