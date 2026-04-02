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
    // Set up a test session by going to login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@omnilife.app');
    await page.fill('input[type="password"]', 'AdminTest123!');
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
