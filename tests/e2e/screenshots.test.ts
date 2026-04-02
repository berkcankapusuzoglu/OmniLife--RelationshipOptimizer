import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const publicPages = ['/', '/pricing', '/quiz', '/login', '/register'];

// Ensure screenshots directory exists
test.beforeAll(async () => {
  const dir = path.join(process.cwd(), 'tests', 'screenshots');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

for (const pagePath of publicPages) {
  test(`screenshot: ${pagePath}`, async ({ page }, testInfo) => {
    await page.goto(pagePath);
    await page.waitForLoadState('networkidle');
    const fileName = `${testInfo.project.name}${pagePath.replace(/\//g, '-') || '-root'}.png`;
    await page.screenshot({
      path: `tests/screenshots/${fileName}`,
      fullPage: false,
    });
  });
}
