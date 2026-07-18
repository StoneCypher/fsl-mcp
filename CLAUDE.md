# fsl-mcp — contributor brief

fsl-mcp is an MCP stdio server that lets an AI agent *author* FSL finite-state
machines: five authoring tools (`fsl_validate`, `fsl_render`, `fsl_explain`,
`fsl_simulate`, `fsl_lint`), each taking FSL `source` and returning structured
JSON, plus `fsl_guide`, which takes no source and returns authoring guidance
as raw markdown (topics: `language`, `flowcharts`), plus `fsl_scaffold`, which
also takes no FSL source — it *generates* one from a preset — but
analyze-gates its generated output before returning it. Seven tools total.
Wraps the `jssm` library.

## Analyze-first architecture

Every authoring tool calls `analyze(source)` (`src/ts/analyze.ts`) *first*.
(`fsl_guide` is the one exception: it has no source input and never touches
jssm or `analyze` at all.) It wraps
jssm's non-throwing `fslDiagnostics()` and normalizes offsets to 1-based
`line`/`col`. If `hasErrors(diagnostics)` is true, the tool short-circuits and
returns diagnostics immediately. Only after that guard passes do tools call
jssm's *throwing* APIs (`from()`, `fsl_to_svg_string`) — those calls only ever
see FSL that is already known to compile. Do not call a throwing jssm API
before the analyze-first guard.

## Docs are generated

Never edit `README.md` directly — it is overwritten on every build. Edit
`base_README.md` instead; `src/build_js/update_madlibs.js` copies it to
`README.md` and fills `{{placeholder}}` madlibs (version, coverage, build
hash, etc.).

## Tests

- Unit: `*.spec.ts` (vitest, default run, 80% coverage gate on all four
  metrics via `coverage.thresholds` in `vitest.config.ts` — real and
  enforced, not decorative).
- Stochastic: `*.stoch.ts` (fast-check property tests), run via
  `vitest run --config vitest-stoch.config.ts`.
- Mutation: `*.mutat.ts`, run via Stryker (`vitest-mutat.config.ts`).
- e2e: `src/ts/e2e/`. Vitest-native specs (e.g. `server.spec.ts`) run in the
  default suite; the Playwright-authored `index.spec.ts` is excluded (it uses
  `@playwright/test`'s own globals).
- No fake tests: a test must exercise real behavior, not just assert output
  it generated itself.

## Strict TypeScript / eslint gotchas

- `isolatedDeclarations`: every export needs an explicit return type.
- `exactOptionalPropertyTypes`: set optional keys conditionally
  (`if (x !== undefined) obj.k = x;`) — never assign `undefined` directly.
- `noUncheckedIndexedAccess` + nodenext: relative imports need `.js`.
- eslint is `strictTypeChecked` + `stylisticTypeChecked`: no `!` non-null
  assertions; don't wrap already-string jssm values (state names, edge
  fields, `m.actions()`) in `String()`, but do wrap numeric values inside
  template literals. Test files are eslint-ignored.

## Dependencies

Runtime: `jssm`, `@modelcontextprotocol/sdk`, `zod`. `@viz-js/viz` is
*not* a direct dependency — jssm dynamically `import()`s it as its own
optional dep at render time; it arrives transitively.
