import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

const workspaceRoot = join(__dirname, '..', '..');

/**
 * Browser e2e against the real stack: the API webServer command prepares the
 * dedicated e2e database/Redis db and starts the API on :3000 (the dev web
 * build points its apiUrl there), and the Angular dev server serves the SPA
 * on :4200. reuseExistingServer stays false on purpose — an already-running
 * dev API would be wired to the dev database, so failing fast on an occupied
 * port is the safe behavior.
 */
export default defineConfig({
  testDir: './src',
  outputDir: '../../dist/.playwright/apps/web-e2e/test-output',
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'node apps/web-e2e/src/support/start-api.cjs',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: false,
      timeout: 240_000,
      cwd: workspaceRoot,
    },
    {
      command: 'npx nx serve web',
      url: 'http://localhost:4200',
      reuseExistingServer: false,
      timeout: 240_000,
      cwd: workspaceRoot,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
