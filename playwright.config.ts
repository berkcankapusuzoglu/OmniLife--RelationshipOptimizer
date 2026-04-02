import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      // iPhone 14 Pro viewport: 393×852, notch simulated via safe-area CSS.
      // Uses Chromium (not WebKit) so only chromium browser binary is needed.
      name: 'iPhone 14',
      use: {
        ...devices['iPhone 14'],
        browserName: 'chromium',
        // Override viewport to iPhone 14 Pro dimensions
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
    },
    {
      // Pixel 7 viewport: 412×915
      name: 'Pixel 7',
      use: {
        ...devices['Pixel 7'],
        browserName: 'chromium',
      },
    },
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
