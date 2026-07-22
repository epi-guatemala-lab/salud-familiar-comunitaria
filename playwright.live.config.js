import { defineConfig, devices } from '@playwright/test';

const apiUrl = process.env.SFYC_LIVE_API_URL;
if (!apiUrl) {
  throw new Error('SFYC_LIVE_API_URL es obligatorio para el smoke oscuro.');
}

export default defineConfig({
  testDir: './e2e-real',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://127.0.0.1:4274/salud-familiar-comunitaria/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'live-smoke-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `VITE_API_URL=${apiUrl} VITE_BASE_PATH=/salud-familiar-comunitaria/ VITE_BITACORA_ENABLED=true npm run dev -- --host 127.0.0.1 --port 4274`,
    url: 'http://127.0.0.1:4274/salud-familiar-comunitaria/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
