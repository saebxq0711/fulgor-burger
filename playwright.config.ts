import { defineConfig } from "@playwright/test";

const PORT = 3100;
const TEST_DB = process.env.E2E_DATABASE_URL ?? "postgres://fulgor:fulgor_local_dev@localhost:5433/fulgor_test";

export default defineConfig({
  testDir: "tests/e2e",
  // Comparten una base real: en serie para que los conteos de cupos sean predecibles.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    locale: "es-CO",
    timezoneId: "America/Bogota",
  },
  projects: [
    { name: "movil", use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: "escritorio", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/api/availability`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: TEST_DB,
      APP_SECRET: "secreto-e2e-solo-para-pruebas-0123456789abcdef",
      CRON_SECRET: "cron-e2e-0123456789abcdef",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      NODE_ENV: "production",
    },
  },
});
