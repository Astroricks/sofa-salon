# ZiggyGraph / Sofa Salon

## What is this project?

This app is a **private screening room / cinema club booking system**. Members browse upcoming film screenings, reserve seats, and after attending they can rate films and send short messages to a shared ticker. An **admin** manages events (create/edit screenings, rooms, waitlist) and configures the ticker. Main user flows: **browse upcoming screenings ? reserve a seat (or join waitlist) ? attend ? rate and optionally send a ticker message**. The stack is Next.js, Supabase (auth + database), and optional Resend for email.

---

## 1. Project structure

```
sofa-salon/
??? src/
?   ??? app/                    # Next.js App Router
?   ?   ??? api/                # API routes (reserve, cancel, screening, waitlist, etc.)
?   ?   ??? admin/              # Admin UI (events, rooms, ticker, feedback, settings)
?   ?   ??? auth/               # Login (Google OAuth)
?   ?   ??? profile/            # User profile, watch history, ticket stub export
?   ?   ??? receipt/            # Viewing receipt (SVG) + export
?   ?   ??? screening/[id]/    # Seat map for a screening
?   ?   ??? layout.tsx
?   ?   ??? page.tsx            # Home (upcoming screenings)
?   ??? components/             # Shared UI (SeatMap, Ticker, NavBar, ReceiptSVG, etc.)
?   ??? lib/                    # Utilities and config
?   ?   ??? config.ts           # App name, tagline (env)
?   ?   ??? supabase/           # Supabase client (browser, server, admin)
?   ?   ??? i18n.ts             # EN/ZH strings
?   ?   ??? badges.ts           # Badge tiers by attendance
?   ?   ??? email.ts            # Resend (confirmation, promotion, reminder)
?   ?   ??? furniture.ts         # Seat layout, squeeze rules
?   ??? middleware.ts           # Protects /admin, /profile; redirects empty wechat_id to /profile/setup
??? supabase-sql/               # Database migrations (run in order 00 ? 21)
?   ??? README.md               # Migration list and descriptions
?   ??? 00-base-schema.sql      # Base tables and RLS (run first)
?   ??? 01-... through 21-...   # Incremental migrations
??? e2e/                        # Playwright E2E tests
??? .env.example                # Copy to .env.local and fill
??? jest.config.js              # Jest (unit tests)
??? jest.setup.js
??? playwright.config.ts        # E2E (Playwright)
??? package.json
```

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind. Auth: Supabase Auth (Google OAuth).
- **Backend**: Next.js API routes in `src/app/api/`; Supabase (Postgres) for data; optional Resend for email.
- **SQL**: All schema and migrations live in `supabase-sql/`. Run files in numeric order in Supabase SQL Editor.

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
   - **Where to get Supabase values:** In the Supabase Dashboard, go to **Project Settings** (gear icon in the left sidebar) ? **API**. There you will see:
     - **Project URL** — copy this into `NEXT_PUBLIC_SUPABASE_URL`.
     - **Project API keys** — under "anon" / "public", copy that key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Fill at least these two; the rest are optional (see `.env.example` comments for details).

3. **Database**
   - In Supabase Dashboard ? **SQL Editor**, run the scripts in `supabase-sql/` **in order**: `00-base-schema.sql` first, then `01-...` through `21-...` (see `supabase-sql/README.md` for the full list and purpose of each).
   - Set yourself as admin (replace with your auth user UUID):
     ```sql
     UPDATE profiles SET is_admin = TRUE WHERE id = 'your-auth-user-uuid';
     ```

4. **Auth (Google)**
   - In Supabase: **Authentication** ? **Providers** ? **Google**: enable and set Client ID / Secret.
   - In Google Cloud Console: create OAuth 2.0 credentials (Web application), add authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.

5. **E2E tests (optional but recommended)**  
   Before running E2E tests for the first time, install the browser:  
   `npx playwright install chromium`

### 2.3 Run locally

```bash
npm run dev
```

**Verify it works:** Open [http://localhost:3000](http://localhost:3000). You should see the home page with upcoming screenings (or an empty list). If you see an error or a blank page, check that your `.env.local` values are correct and that you ran the database migrations.

Log in with Google; if your profile has no WeChat ID, you'll be redirected to `/profile/setup`.

### 2.4 Build and production run

```bash
npm run build
npm run start
```

---

## 3. Common tasks

### How to add a new page

- Create a folder under `src/app/` (e.g. `src/app/about/`).
- Add a `page.tsx` file. It will automatically use the root layout from `src/app/layout.tsx`.
- Example: `src/app/about/page.tsx` ? the route will be `/about`.

### How to add a new API route

- Create a folder under `src/app/api/` (e.g. `src/app/api/hello/`).
- Add a `route.ts` file and export `GET`, `POST`, etc. Example:
  ```ts
  // src/app/api/hello/route.ts
  import { NextResponse } from 'next/server';
  export async function GET() {
    return NextResponse.json({ message: 'Hello' });
  }
  ```
- The route will be available at `/api/hello`.

### How to add a new i18n string

- Open `src/lib/i18n.ts`.
- Add the key under both `tEn` (English) and `tZh` (Chinese) in the same nested path (e.g. `profile.myNewKey`).
- In your component, get the locale (e.g. from cookies or props) and call `getT(locale).profile.myNewKey` (or the path you used).

### How to run database migrations

- Add a new numbered SQL file in `supabase-sql/` (e.g. `22-my-new-feature.sql`).
- Run it in Supabase Dashboard ? **SQL Editor** after the previous migrations.
- Update `supabase-sql/README.md` with a one-line description and the new step number.

---

## 4. Testing

### 4.1 Unit tests (Jest)

- **Run all:** `npm test`
- **Watch mode:** `npm run test:watch`
- **Run one file:** `npm test -- config` (runs `config.test.ts`)
- **Location:** `src/lib/__tests__/*.test.ts`

See **`TESTING.md`** for what each test file covers and how to add new tests.

### 4.2 E2E tests (Playwright)

- **Run E2E:** `npm run test:e2e` (app must be running, e.g. `npm run dev` in another terminal).
- **First time:** Run `npx playwright install chromium` so the browser is available.
- **Location:** `e2e/*.spec.ts`

**Development rules:** See **`docs/DEVELOPMENT_RULES.md`**. Lint, dev, and tests must pass before considering a change done.

---

## 5. Troubleshooting

| Problem | What to do |
|--------|------------|
| **`NEXT_PUBLIC_SUPABASE_URL` is undefined** | You forgot to create `.env.local`. Copy `.env.example` to `.env.local` and fill in the Supabase URL and anon key (see Section 2.2). |
| **Google login redirects to an error page** | Check that the OAuth redirect URI in Google Cloud Console exactly matches the Supabase callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`. |
| **`npm run dev` fails with "module not found"** | Run `npm install` and try again. |
| **E2E tests fail with "browser not found"** | Run `npx playwright install chromium` (or `npx playwright install` for all browsers). |
| **Database errors after pulling new code** | There may be new SQL migration files. Check `supabase-sql/` and run any new numbered files in order in the Supabase SQL Editor. |

---

## 6. Deployment

### 6.1 Deploy app (e.g. Vercel)

1. Connect the repo to Vercel (or your platform).
2. Add environment variables (same as `.env.local`; at least `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Do **not** commit `.env.local`.
3. Build command: `npm run build`.
4. Set `NEXT_PUBLIC_APP_URL` to your deployed URL if you need correct OAuth redirects or links in emails.

### 6.2 Supabase (production)

- Use the same or a dedicated production Supabase project. Run the same `supabase-sql` migrations (00 ? 21) if the DB is new.
- In Supabase Auth ? URL Configuration, set **Site URL** to your production app URL and add the redirect URL for Google OAuth.

### 6.3 Post-deploy

- Set at least one admin: `UPDATE profiles SET is_admin = TRUE WHERE id = '...';`

---

## 7. Code and conventions

- **App name / tagline:** Only in `src/lib/config.ts`; do not hardcode elsewhere.
- **Env:** All env access via `process.env.*`; only `NEXT_PUBLIC_*` is exposed to the client.
- **Naming:** Use clear names (e.g. `screeningId`, `userId`, `seatKey`).
- **SQL:** Keep a single source of truth in `supabase-sql/`; run in order.

---

## 8. Quick reference

| Task          | Command / place        |
|---------------|------------------------|
| Start dev     | `npm run dev`          |
| Build         | `npm run build`        |
| Unit tests    | `npm test`             |
| E2E tests     | `npm run test:e2e`     |
| Lint          | `npm run lint`         |
| Dev rules     | `docs/DEVELOPMENT_RULES.md` |
| Test guide    | `TESTING.md`           |
| DB migrations | Run `supabase-sql/00-...sql` through `21-...sql` in order (see `supabase-sql/README.md`). |
