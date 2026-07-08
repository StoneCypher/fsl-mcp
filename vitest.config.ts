
import { defineConfig } from 'vitest/config';



export default defineConfig({

  test: {
    include: ['src/**/*.spec.ts'],
    // Only the Playwright-authored e2e/index.spec.ts is excluded here — it uses
    // @playwright/test's own test/expect globals and errors if vitest collects
    // it. Vitest-native e2e specs (e.g. e2e/server.spec.ts) stay discoverable,
    // including via explicit-path invocation (vitest applies `exclude` before
    // any CLI filename filter, so a blanket `src/ts/e2e/**` would hide them too).
    exclude: ['dist/**', 'node_modules/**', 'src/ts/e2e/index.spec.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.stoch.ts', 'src/**/*.mutat.ts', 'src/ts/bin.ts'],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    },
    globals: true
  },

});
