import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 60000,
  use: {
    headless: true,
    baseURL: 'http://localhost:5175',
    viewport: { width: 1280, height: 800 },
  },
  webServer: [
    { command: 'npm run server', url: 'http://localhost:4000/api/clients', reuseExistingServer: true },
    { command: 'npx vite --host 0.0.0.0 --port 5175', url: 'http://localhost:5175', reuseExistingServer: true },
  ],
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  testDir: 'tests',
});
