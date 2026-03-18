# Development & Testing Rules

This document defines the rules for developing and shipping changes in this project. **Follow it for every new feature or fix** so that lint, dev, and tests stay green and regressions are caught early.

---

## 1. Lint

- **Before considering work done**: Run `npm run lint`. It must complete with **no errors**.
- **If lint fails**: Fix the reported issues (unused variables, type errors, style). Do not commit or leave lint errors in the codebase.
- **Conventions**: Follow existing project style (e.g. `@/` path aliases, file layout). Avoid adding new lint disables or rule overrides without a clear reason.

---

## 2. Dev (local run)

- **Before considering work done**: Run the app with `npm run dev` and perform a quick smoke check of what you changed (e.g. open the modified page or hit the modified API).
- **If dev fails**: Resolve build or runtime errors. Verify environment (`.env.local`), dependencies (`npm install`), and that your change does not break startup or the affected route.
- **After changing dependencies**: Run `npm install`, then `npm run dev` again to confirm.

---

## 3. Test

### 3.1 Unit tests (Jest)

- **Run**: `npm test` (or `npm run test:watch` while developing).
- **Requirement**: **All unit tests must pass** before you consider the feature complete.
- **When adding or changing behavior**:
  - Add or update unit tests so that the new or changed logic is covered (e.g. new helpers in `src/lib`, new i18n keys, new pure functions).
  - The tests should be written so that **reverting or breaking the behavior would make the test fail**. That way, future changes that introduce bugs will be caught by the test suite.
- **If unit tests fail**:
  - Do **not** ignore failures or “fix” by removing or skipping tests without a justified reason.
  - Understand the cause (wrong expectation, bug in new code, or outdated test assumption).
  - Fix either the code or the test until `npm test` passes.

### 3.2 E2E tests (Playwright)

- **Run**: `npm run test:e2e` (ensure the app is running on the expected port, or use CI if it starts the app automatically).
- **When changing UI or critical flows** (e.g. home, profile, ticker): Add or update E2E tests so that important user paths remain covered.
- **If E2E fails**: Fix the application code or the E2E test; do not leave E2E in a failing state.

### 3.3 Principle

- **Passing tests are evidence the feature works.** If you cannot run the tests or they do not pass, the feature is not done. Fix until both `npm test` and `npm run test:e2e` (where applicable) pass.

---

## 4. Checklist before “done”

Before marking a task or PR as complete:

1. **Lint**: `npm run lint` — passes.
2. **Dev**: `npm run dev` — app runs and the changed flow works.
3. **Unit tests**: `npm test` — all pass; new/changed behavior has tests.
4. **E2E**: `npm run test:e2e` — passes; add or update E2E for changed flows when relevant.

If any step fails, address the cause first. Use test failures as the signal that something is wrong, not as noise to ignore.
