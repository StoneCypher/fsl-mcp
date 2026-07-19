
import { defineConfig } from 'vitest/config';



export default defineConfig({

  test: {
    include: ['src/**/*.stoch.ts'],
    exclude: ['dist/**', 'node_modules/**', 'src/ts/e2e/**'],
    coverage: {
      // Informational only - the stochastic suite exercises the property-
      // tested modules, not the whole tree, so no thresholds are enforced
      // here. Enforcement lives in vitest.config.ts's unit gate (100 on all
      // four metrics). This block once carried 80s in the deprecated
      // top-level position, which modern vitest silently ignores; they were
      // removed rather than promoted so the config states what is true.
      enabled: true,
      reportsDirectory: './coverage-stoch',
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.stoch.ts', 'src/**/*.mutat.ts'],
      all: true
    },
    globals: true
  },

});
