/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

// Puerta de humo: NO es la suite e2e. No necesita base de datos ni sesión — levanta la app
// construida, abre una pantalla real en un navegador real y comprueba que responde y que la
// consola está limpia. Es el peldaño que el lint no puede dar.
const port = process.env.SMOKE_PORT ?? '3999';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: 'list',
  use: { baseURL, testIdAttribute: 'data-test', trace: 'off' },
  webServer: {
    command: `pnpm start --port ${port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
