/**
 * E2E: Home, profile, admin, and navigation.
 * Run with: npm run test:e2e (ensure npm run dev is running, or set CI for auto start).
 */
import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('loads and has a heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('has a link or content related to screenings', async ({ page }) => {
    await page.goto('/');
    const body = page.locator('body');
    await expect(body).toContainText(/upcoming|screen|reserve|放映|预约/i);
  });

  test('shows ticker strip (ticker-wrap) on the page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.ticker-wrap')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('main nav links load without error', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    const homeLink = page.getByRole('link', { name: /Home|首页/i }).first();
    if ((await homeLink.count()) > 0) {
      await homeLink.click();
      await expect(page).toHaveURL(/\//);
    }
    const profileLink = page.getByRole('link', { name: /Profile|个人|profile/i }).first();
    if ((await profileLink.count()) > 0) {
      await profileLink.click();
      await expect(page).toHaveURL(/\/profile/);
      await expect(page.locator('body')).toContainText(/Send to ticker|发弹幕|Sign in|登录|Profile|个人/i);
    }
  });
});

test.describe('Auth login page', () => {
  test('shows forgot-password control', async ({ page }) => {
    await page.goto('/auth/login');
    const body = page.locator('body');
    await expect(body).toContainText(/Forgot password|忘记密码/i);
  });
});

test.describe('Profile page (unauthenticated)', () => {
  test('shows ticker submit section or login when visiting /profile', async ({ page }) => {
    await page.goto('/profile');
    const body = page.locator('body');
    await expect(body).toContainText(/Send to ticker|发弹幕|Sign in|登录/i);
  });

  test('visit /profile shows login or redirect', async ({ page }) => {
    await page.goto('/profile');
    const url = page.url();
    const hasLogin = await page.locator('body').evaluate((el) =>
      /Sign in|登录|Google|log in/i.test(el.textContent || '')
    );
    const redirectedToAuth = url.includes('/auth');
    expect(hasLogin || redirectedToAuth).toBe(true);
  });
});

test.describe('Admin gate', () => {
  test('visit /admin without admin role shows access denied or redirect', async ({ page }) => {
    await page.goto('/admin');
    const body = page.locator('body');
    const deniedOrRedirect =
      (await body.textContent())?.includes('Admin only') ||
      (await body.textContent())?.includes('仅管理员') ||
      (await body.textContent())?.includes('redirect') ||
      page.url().includes('/auth') ||
      page.url().includes('/login');
    expect(deniedOrRedirect).toBe(true);
  });
});

test.describe('Responsive (mobile viewport)', () => {
  test('home page critical elements visible on mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.ticker-wrap')).toBeVisible();
  });
});
