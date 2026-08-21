import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3847',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node test/mock-server/server.js',
    port: 3847,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  snapshotPathTemplate: 'test/screenshots/{arg}{ext}',
});
