import { test, expect } from '@playwright/test';

test.describe('Mobile layout - no status bar overlap', () => {
  test('login page renders without overflow at top', async ({ page }) => {
    await page.goto('/login');
    // Check no content is clipped at top (first 40px should not have interactive elements)
    const card = page.locator('[data-slot="card"]').first();
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box?.y).toBeGreaterThan(20); // card shouldn't start at pixel 0
  });

  test('public pages have back button visible', async ({ page }) => {
    await page.goto('/pricing');
    const backButton = page.getByText('Back').or(page.locator('button').filter({ hasText: /back/i }));
    await expect(backButton).toBeVisible();
  });
});

test.describe('Onboarding page renders', () => {
  test('onboarding page has visible content (not black screen)', async ({ page }) => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run the authenticated onboarding check.');

    // Set up a test session by going to login
    await page.goto('/login');
    await page.fill('input[type="email"]', email!);
    await page.fill('input[type="password"]', password!);
    await page.click('button[type="submit"]');
    // After login, we should land on /overview or /onboarding
    await page.waitForURL(/\/(overview|onboarding)/, { timeout: 10000 });
    // Page should have visible content, not be black
    const body = page.locator('body');
    await expect(body).toBeVisible();
    // Check that there's actual text content
    const textContent = await body.textContent();
    expect(textContent?.trim().length).toBeGreaterThan(50);
  });
});
