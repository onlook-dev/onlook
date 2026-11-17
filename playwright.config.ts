import { defineConfig } from '@playwright/test';

// The fixture repos a spec builds and commits into run a global `core.hooksPath`'s hooks otherwise (ONL-2255); `tests/apparatus/src/preload.ts` is Bun's copy.
process.env['GIT_CONFIG_GLOBAL'] ??= '/dev/null';

export default defineConfig({
  testDir: './tests/e2e',
  // `.e2e.ts`, not `.spec.ts`: a root `bun test` is a builtin package.json cannot redirect, and its default glob collects `*.spec.ts`.
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/e2e/.report' }]],
  outputDir: 'tests/e2e/.artifacts',
  use: {
    trace: 'retain-on-failure',
  },
});
