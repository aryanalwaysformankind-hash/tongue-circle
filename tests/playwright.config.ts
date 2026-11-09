import { defineConfig, devices } from '@playwright/test';

// Pre-scaffolded canonical config — edit the marked lines only; do not re-create.
// One worker, one project: 2 workers x desktop+mobile Chromium OOM-kills the 2 GiB pod.
// Resolved once in the runner; workers reload this file without CLI args, so they read PW_PROJECTS.
const argv = process.argv;
const requested = argv.flatMap((a, i) =>
  a.startsWith('--project=') ? [a.slice('--project='.length)] : a === '--project' ? [argv[i + 1]] : [],
);
process.env.PW_PROJECTS ??= (requested.length ? requested : [process.env.PW_MOBILE === '1' ? 'mobile' : 'desktop']).join(',');
// Same matching as Playwright's --project: case-insensitive, `*` wildcards.
const run = process.env.PW_PROJECTS.split(',').map(
  (p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, 'i'),
);

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: './test-results/results.json' }],
  ],
  use: {
    // farm-ts: localhost — Vite proxies /api to FastAPI; the external preview host is not in-pod routable.
    baseURL: 'http://localhost:3000',
    screenshot: 'on',
    trace: 'on-first-retry',
    headless: true,
    ignoreHTTPSErrors: true,
  },
  // Desktop by default; mobile-first briefs run `PW_MOBILE=1 npx playwright test` (or --project=mobile).
  // Only chromium is installed — never switch to iPhone/webkit device descriptors.
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
  ].filter((p) => run.some((re) => re.test(p.name))),
});
