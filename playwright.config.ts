import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_PREVIEW ? 'http://127.0.0.1:4174' : 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    channel: 'chrome',
  },
  webServer: {
    command: process.env.PLAYWRIGHT_PREVIEW ? 'npm run preview -- --host 127.0.0.1 --port 4174' : 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: process.env.PLAYWRIGHT_PREVIEW ? 'http://127.0.0.1:4174' : 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
