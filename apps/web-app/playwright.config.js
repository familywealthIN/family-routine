// @ts-check
const path = require('path');
const dotenv = require('dotenv');
const { defineConfig, devices } = require('@playwright/test');

// Load JWT_SECRET from the repo root .env so we can mint test tokens.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET missing from .env — Playwright auth bypass needs it');
}

const WEB_APP_PORT = 8080;
const SERVER_PORT = 3000;

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://localhost:${WEB_APP_PORT}`,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Two-stage webServer: bring up the GraphQL server first, then the web-app.
  webServer: [
    {
      command: 'yarn workspace server start',
      port: SERVER_PORT,
      cwd: path.resolve(__dirname, '../..'),
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'yarn workspace web-app dev',
      port: WEB_APP_PORT,
      cwd: path.resolve(__dirname, '../..'),
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
