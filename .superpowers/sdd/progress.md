# fsl-mcp Authoring — Progress Ledger

Plan: `src/superpowers/plans/2026-07-07-fsl-mcp-authoring.md`
Branch: `feat_26-07-07_fsl-mcp-authoring`
Base commit (fork from main): `1d72d80`

## Tasks

- Task 1: complete (commits 538d28b..de8caea, review clean/Approved)
- Task 2: complete (commits de8caea..0154e63, review Approved). Key finding: @viz-js/viz NOT needed as direct dep — jssm dynamically import()s it at render time and declares it as its own optional dep; comes in transitively. Do NOT pin it. CI does a normal `npm install` (optional deps included by default).
- Task 3: complete. analyze diagnostics core: `FslSeverity`/`FslDiagnostic` (src/ts/types.ts), `offsetToLineCol`/`analyze`/`hasErrors` (src/ts/analyze.ts) wrapping jssm's `fslDiagnostics`. TDD: analyze.spec.ts written first, confirmed RED (`Cannot find module '../analyze.js'`), then implementation made it GREEN (5/5 passing, 100% coverage on analyze.ts). Stochastic property tests (analyze.stoch.ts, fast-check) pass 2/2. Full regression: 50/50 unit + 5/5 stochastic tests pass repo-wide; `tsc --noEmit` clean; eslint clean. `src/ts/index.ts` left untouched per task scope.
- Task 4: complete (commits 16d0e95..af3e90d, review Approved, no issues).
- Task 5: complete (commits af3e90d..eefd8c4, review Approved, no issues).
- Task 6: complete (commit eefd8c4..bd89d56). `fsl_explain` (src/ts/tools/explain.ts): builds the machine via jssm's `from()` after an analyze-first guard (mirrors validate/lint), reports states/transitions/start/terminals/summary as a discriminated union (`ExplainResult` valid:true vs `ExplainError` valid:false). Adjustment vs. brief: jssm 5.162.1's `.d.ts` types state names and edge fields as plain `string`/string-literal unions already, so the brief's `String(e.from)` etc. wrapping tripped `@typescript-eslint/no-unnecessary-type-conversion` under this repo's `strictTypeChecked` eslint config; removed the redundant `String()` calls (assignment works directly) and instead wrapped the two numeric summary interpolations (`states.length`/`transitions.length`) in `String()` to satisfy `restrict-template-expressions`. Behavior unchanged. TDD: explain.spec.ts written first (RED: `Cannot find module '../tools/explain.js'`), implementation made it GREEN (2/2). Full regression: 57/57 tests pass repo-wide; `tsc --noEmit` clean; `eslint` clean; `mcp__ide__getDiagnostics` clean.
- Task 7: complete (commits 24e6712..34d0eff, review Approved after fixing one Important test-coverage finding). `fsl_simulate` (src/ts/tools/simulate.ts): analyze-first guard, action-first then transition fallback, break-on-reject, conditional `rejected`. Deviations from brief (both eslint-driven, behavior-preserving): dropped redundant `String()` wrappers; replaced `actions[i]!` with `actions.entries()` (repo errors on no-non-null-assertion). Important fix: added 2 tests incl. a discriminating fixture `"a 'x' -> b; a -> x;"` proving action-first precedence (endState 'b'); simulate.ts branch coverage 50%->100%. 62/62 suite green.
- Task 8: complete (commits 34d0eff..c8e50bc, review Approved, no issues). `fsl_render` (async, three-variant union: RenderSvg/RenderUnsupported/RenderError); png degrades to svg+note; analyze-first guard; render.ts 100% coverage; 65/65 suite. ALL FIVE TOOLS DONE.
- Task 9: complete (commits c8e50bc..4d2dd80, review Approved, DONE_WITH_CONCERNS handled). server.ts (createServer/startServer, 5 tools registered w/ correct names+schemas), bin.ts (shebang, error handling), e2e/server.spec.ts (real in-memory protocol round-trip). Build-system fixes (all verified correct by controller + reviewer): SDK externalized from library bundles (server_deps_external); IIFE name -> `fslMcp` w/ browser-inert placeholder globals; `inlineDynamicImports` for jssm/viz's dynamic import; vitest exclude narrowed `src/ts/e2e/**` -> `src/ts/e2e/index.spec.ts` (Playwright) so server.spec.ts runs. Sync handlers dropped `async` (require-await) — valid per SDK BaseToolCallback. 66/66 suite; bin smoke test (init round-trip) OK.

## Task 10 COVERAGE WATCH-LIST (the 80% gate is the main remaining risk)
- explain.ts ~60% branch — action/name optional-field branches uncovered. Plan Task 10 Step 3 adds an action/named-edge explain test. FSL action syntax confirmed: `a 'go' -> b;`.
- server.ts partial — e2e only calls fsl_validate, so lint/explain/simulate/render handlers + startServer are UNCOVERED. FIX: expand e2e/server.spec.ts to call ALL FIVE tools (genuine coverage, good test). startServer (stdio) is hard to cover via in-memory — consider whether to exclude it or accept.
- bin.ts — not imported by any test (only smoke-tested). Entry-point shim. FIX: add `src/ts/bin.ts` (and possibly startServer/stdio) to vitest coverage `exclude`, OR accept if aggregate clears.
- types.ts — types only, no runtime; verify it doesn't count against coverage oddly.
- `all: true` in vitest.config.ts:22 throws a TYPE warning under vitest 4 (pre-existing, from template) — verify coverage still behaves; `all` may be silently dropped (making coverage import-based). Decide: keep, remove, or fix to the v4 equivalent.
- Full `npm run build` must regenerate stale dist/index.mjs/cjs/iife.js (Task 9 only built the bin + typescript).
- Task 10a: complete (commits 4d2dd80..efed8a5, review Approved). Coverage now 94.73/88/91.3/95.16 (stmt/branch/func/line), all >=80. Items: e2e expanded to call all 5 tool handlers; explain named-action test (`a 'go' -> b;`) covers action branch; dropped unused `expect` in analyze.stoch.ts; excluded bin.ts entry shim from coverage. IMPORTANT FIX: the template's coverage gate was DECORATIVE (flat threshold keys under `coverage` are inert; @vitest/coverage-v8 only enforces `coverage.thresholds`). Nested the thresholds -> gate now BITES (proven: threshold 99 -> exit 1, reverted to 80 -> exit 0). `all:true` kept (cosmetic type warning only; vitest.config.ts not in tsconfig include).
- Task 10b: complete (commits efed8a5..12747b6). Real base_README.md + CLAUDE.md written. BUILD RESHAPED per live user decision: dropped the dead IIFE/browser bundle (a stdio server can't run in a browser); kept ESM+CJS library + npx bin; EXTERNALIZED all runtime deps (jssm/jssm/viz/SDK/zod) in every bundle instead of inlining jssm — smaller bundles, proper dedup, and it eliminated the terser hang (inlining jssm+viz was pathologically slow to minify). Fixed update_madlibs.js (fill unit/stoch branch/func/line README madlibs) and made the `dts` step idempotent (was nesting dist/tools/tools). Verified: tsc clean, eslint clean, 67/67 tests, coverage gate green (94.73/88/91.3/95.16), attw clean (node10/node16-CJS/node16-ESM/bundler), bin smoke OK. NOTE: 10b morphed heavily via interactive user Q&A after the plan; controller hand-verified all gates. Full ceremonial `npm run build` (viz_png/site/changelog) NOT run to completion — terser hang is fixed so it should now complete, but viz_png (Playwright) is untested; fold into final review / leave for user's own build.
- Task 11 (user): gh-pages GitHub Action — complete (commit 7f3e947). Added deploy-pages job (peaceiris/actions-gh-pages -> gh-pages branch, publish ./docs, on push to main, needs test-main-full). NOTE TO USER: repo Settings > Pages must be set to serve from the gh-pages branch.
- Task 12 (user): downgrade CI node runner to node 23 — complete (commit 7f3e947). All Node 24 -> 23 across every job.
- (Dropped) "issues that don't fit our issue format" request was for a different session/project — user said ignore.
- Task 11 (user request): GitHub Action — publish GitHub Pages via the `gh-pages` branch (not master/docs) — pending
- Task 12 (user request): downgrade CI node runner to node 23 — pending

## Minor findings (for final review triage)

- T1: package-lock.json dev-transitive drift (259 lines) in de8caea — no action; Task 2 re-resolves the lock. Superseded.
- T1: `.claude/settings.local.json` allowlist entry committed in de8caea — harness side effect, harmless.
- T3: `src/ts/tests/analyze.stoch.ts:1` imports `expect` from vitest but never uses it (fast-check properties return booleans). Inherited verbatim from the brief. FIX: drop `expect` from the import. Slips past build (tsconfig excludes *.stoch.ts; eslint ignores test files). TO FIX in batched Minor pass before final review.
- T6: `src/ts/tools/explain.ts:110-111` — the `action`/`name` optional-field branches are uncovered (explain.ts ~60% branch). HANDLED BY PLAN: Task 10 Step 3 adds an action/named-edge explain test to close this. Verify at Task 10.
- T6: `src/ts/tools/explain.ts:106` — `m.states().map(String)` left as redundant String() (inconsistent with edge-field cleanup); harmless (states() already string[]). Optional cleanup.
- T10a: `src/ts/e2e/server.spec.ts:28` lint assertion (`notes` is `[]` for the clean shared fixture) is the shallowest of the 5 e2e checks — catches wiring only, not lint logic. Defensible (lint.spec.ts has dedicated coverage). No action.

## IMPORTANT repo fact (affects Tasks 7, 8)
- This repo's `eslint.config.js` uses `tseslint.configs.strictTypeChecked` + `stylisticTypeChecked`. Consequences for the tool code:
  - `no-unnecessary-type-conversion`: do NOT wrap already-string jssm values in `String()` (edge fields, `m.state()`, `m.states()`, `m.actions()` are string/string[]). Assign directly.
  - `restrict-template-expressions`: DO wrap NUMERIC values in `String()` inside template literals (e.g. counts, indices).
  - The Task 7/8 briefs contain the old redundant-`String()` pattern (e.g. `String(m.state())`, `m.actions().map(String)`) — implementers must drop those to pass eslint, exactly as Task 6 did.

## Task 3 status
- Task 3: complete (commits 0154e63..16d0e95, review Approved; one Minor recorded above).

## Notes

- Plan file was globally find-replaced `react_ts_with_claude_gh_template` -> `fsl-mcp`, corrupting the Task 1 identity-guard test (it now asserts the package does NOT contain 'fsl-mcp'). Correct guard must check for leftover `react_ts_with_claude_gh_template`. Flagged to user; fix in Task 1.
- User pre-did package.json (name/version/desc/keywords/urls), rollup.config.js (names -> fsl-mcp), and base_README.md (title/links + removed template checklist) on main; carried onto the feature branch.
