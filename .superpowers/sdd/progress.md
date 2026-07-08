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
- Task 7: fsl_simulate — pending
- Task 8: fsl_render — pending
- Task 9: MCP server + bin — pending
- Task 10: README + green build — pending
- Task 11 (user request): GitHub Action — publish GitHub Pages via the `gh-pages` branch (not master/docs) — pending
- Task 12 (user request): downgrade CI node runner to node 23 — pending

## Minor findings (for final review triage)

- T1: package-lock.json dev-transitive drift (259 lines) in de8caea — no action; Task 2 re-resolves the lock. Superseded.
- T1: `.claude/settings.local.json` allowlist entry committed in de8caea — harness side effect, harmless.
- T3: `src/ts/tests/analyze.stoch.ts:1` imports `expect` from vitest but never uses it (fast-check properties return booleans). Inherited verbatim from the brief. FIX: drop `expect` from the import. Slips past build (tsconfig excludes *.stoch.ts; eslint ignores test files). TO FIX in batched Minor pass before final review.

## Task 3 status
- Task 3: complete (commits 0154e63..16d0e95, review Approved; one Minor recorded above).

## Notes

- Plan file was globally find-replaced `react_ts_with_claude_gh_template` -> `fsl-mcp`, corrupting the Task 1 identity-guard test (it now asserts the package does NOT contain 'fsl-mcp'). Correct guard must check for leftover `react_ts_with_claude_gh_template`. Flagged to user; fix in Task 1.
- User pre-did package.json (name/version/desc/keywords/urls), rollup.config.js (names -> fsl-mcp), and base_README.md (title/links + removed template checklist) on main; carried onto the feature branch.
