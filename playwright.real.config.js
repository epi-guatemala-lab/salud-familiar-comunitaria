import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

const backendPython = process.env.SFYC_BACKEND_PYTHON;
const backendDir = process.env.SFYC_BACKEND_DIR;
const cleanupManifest = process.env.SFYC_E2E_CLEANUP_MANIFEST
  || path.join(os.tmpdir(), `sfyc-playwright-real-${process.pid}.json`);
process.env.SFYC_E2E_CLEANUP_MANIFEST = cleanupManifest;

if (!backendPython || !backendDir) {
  throw new Error(
    'test:e2e:real requiere SFYC_BACKEND_PYTHON y SFYC_BACKEND_DIR; nunca apunta a producción.'
  );
}

export default defineConfig({
  testDir: './e2e-real',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  globalTeardown: './e2e/real-global-teardown.js',
  use: {
    baseURL: 'http://127.0.0.1:4273/salud-familiar-comunitaria/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'real-api-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `"${backendPython}" e2e/start-ephemeral-backend.py`,
      url: 'http://127.0.0.1:8529/health',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        SFYC_BACKEND_DIR: backendDir,
        SFYC_E2E_CLEANUP_MANIFEST: cleanupManifest,
      },
    },
    {
      command: 'VITE_API_URL=http://127.0.0.1:8529 VITE_BASE_PATH=/salud-familiar-comunitaria/ VITE_BITACORA_ENABLED=true npm run dev -- --host 127.0.0.1 --port 4273',
      url: 'http://127.0.0.1:4273/salud-familiar-comunitaria/',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
