import { defineConfig, devices } from '@playwright/test';

const web = process.env.E2E_WEB_URL || 'http://localhost:3000';
const dashboard = process.env.E2E_DASHBOARD_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: { ...devices['Desktop Chrome'], channel: 'chrome', trace: 'off' },
  projects: [
    { name: 'web', testMatch: /web\.spec\.ts/, use: { baseURL: web } },
    { name: 'dashboard', testMatch: /dashboard\.spec\.ts/, use: { baseURL: dashboard } },
  ],
});
