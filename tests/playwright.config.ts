import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially for DNS operations
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for DNS tests to avoid conflicts
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'Quick Tests',
      testMatch: '**/quick-powerdns-test.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'User Flows',
      testMatch: '**/comprehensive-user-flows.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Integration Tests',
      testMatch: '**/powerdns-integration.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'cd .. && ./start-dev.sh',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for all services to start
  },
});
