# Changelog

All notable changes to this project will be documented in this file.

Changelogging the last 10 commits; Full changelog at [CHANGELOG.long.md](CHANGELOG.long.md)



&nbsp;

&nbsp;

Published tags:







&nbsp;

&nbsp;

## [Untagged] - Jul 10, 2026 10:13:47 PM

Commit [0019b7dc5ae8f564392fc178ec6f847d0334feef](https://github.com/StoneCypher/fsl-mcp/commit/0019b7dc5ae8f564392fc178ec6f847d0334feef)

Author: `John Haugeland <stonecypher@gmail.com>`

  * chore: untrack per-machine .claude/settings.local.json




&nbsp;

&nbsp;

## [Untagged] - Jul 10, 2026 10:10:20 PM

Commit [505621fdf879055c3960d4de354af383ce8f427f](https://github.com/StoneCypher/fsl-mcp/commit/505621fdf879055c3960d4de354af383ce8f427f)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: add fence languages and fix emphasis in eval spec/plan




&nbsp;

&nbsp;

## [Untagged] - Jul 10, 2026 9:53:51 PM

Commit [c47959d585130a5a736e7c38927daa8cd11a0212](https://github.com/StoneCypher/fsl-mcp/commit/c47959d585130a5a736e7c38927daa8cd11a0212)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(eval): windows-safe primer spawn and per-trial timeout
  * - reference.ts: on win32, spawnSync npx via a joined shell command string
  instead of shell:true + args array (avoids ENOENT and Node's DEP0190
  warning); other platforms unchanged.
- runner.ts: runTrial now races the spawn against a timeoutMs (default
  DEFAULT_TRIAL_TIMEOUT_MS = 600_000ms), killing the child via an
  AbortSignal passed as ClaudeSpawn's new optional third argument, and
  resolving a timeout as a normal error result instead of hanging.
- eval.ts: wire a --timeout flag through the existing
  parsePositiveIntFlag guard.
- tests: cover the timeout and non-timeout paths in runner.spec.ts, and
  fix report.spec.ts's Delta import (declared in report.ts, not types.ts).




&nbsp;

&nbsp;

## [Untagged] - Jul 10, 2026 9:07:59 PM

Commit [99e039ffcdcce2c0d876fc4fbfdc4cfa8398ddd9](https://github.com/StoneCypher/fsl-mcp/commit/99e039ffcdcce2c0d876fc4fbfdc4cfa8398ddd9)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test: raise coverage gate to 95%
  * Raises all four coverage.thresholds (statements/branches/functions/lines)
in vitest.config.ts from 80 to 95, closing the gap with real behavior
tests:
  * - server.ts: startServer now accepts an injectable Transport (defaulting
  to a real StdioServerTransport, unchanged for the fsl-mcp bin entry).
  server.spec.ts exercises it end-to-end over a real stdio JSON-RPC
  round-trip, backed by injected PassThrough streams instead of the
  actual process stdin/stdout — so the previously-untestable process
  wiring is now genuinely covered without hijacking the test process.
- lint.ts: reorder analyze(source).filter().map() to .map().filter().
  Same output, but the map callback now runs over every diagnostic
  (errors included) instead of only the ones that already survived
  filtering, so it is genuinely exercised by the existing invalid-FSL
  test rather than only reachable via a non-error diagnostic that the
  installed jssm never emits.
- runner.spec.ts: cover the spawn-throws (Error and non-Error) catch
  branch and the non-string envelope.result fallback.
  * Full-suite coverage after these changes: 98.4% statements, 95.74%
branches, 95.55% functions, 100% lines — all four thresholds pass.
  * A few branches remain intentionally uncovered because they are not
reachable through real behavior with the installed jssm version (no FSL
input produces a non-error diagnostic, sets an edge's .name, or yields a
machine with zero start states), on top of the pre-existing defaultSpawn
process shims in reference.ts/runner.ts.




&nbsp;

&nbsp;

## [Untagged] - Jul 10, 2026 9:07:39 PM

Commit [f85fdba4682fc4d559b4fb6c520237967818d44b](https://github.com/StoneCypher/fsl-mcp/commit/f85fdba4682fc4d559b4fb6c520237967818d44b)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(eval): close recorded review gaps and extend scoreCorrectness coverage
  * - score.spec.ts: cover the unexpected-rejection branch (walk rejected with
  no rejectedAt expected), an empty-body fsl fence, an invalid-source
  short-circuit, and the states/start/rejectedAt-index mismatch branches
  of scoreCorrectness.
- report.spec.ts: tighten the column-alignment assertions from a +/-1
  tolerance to exact equality, and rename the percentage-formatting test
  to match pct's actual one-decimal-place output.
- eval.ts: guard --trials/--tasks against a non-finite/non-positive
  Number() result (e.g. --trials abc) with a clear stderr message and
  exit(1), instead of silently cascading a NaN through the trial sweep.




&nbsp;

&nbsp;

## [Untagged] - Jul 10, 2026 8:34:53 PM

Commit [f37efb564e51b64cd05586bfa1afb84238016d38](https://github.com/StoneCypher/fsl-mcp/commit/f37efb564e51b64cd05586bfa1afb84238016d38)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(eval): task corpus, CLI orchestrator, and npm run eval
  * - src/ts/eval/tasks.ts: 10-task corpus (3 easy, 4 medium, 3 harder), each
  with a private _reference solution verified against its own expect via
  real jssm (src/ts/eval/tests/tasks.spec.ts).
- src/ts/eval/eval.ts: CLI orchestrator - parses flags, captures the
  reference primer once, writes a temp --mcp-config, sweeps
  tasks x conditions x trials through runTrial, scores, aggregates, prints
  the report, writes eval-results.json. Excluded from coverage (shells to
  claude, not unit-testable).
- package.json: add npm run eval (jiti src/ts/eval/eval.ts).
- vitest.config.ts: exclude src/ts/eval/eval.ts from coverage.
- .gitignore: ignore eval-results.json (run artifact).
- reference.ts / runner.ts: wrap the untestable defaultSpawn shims in
  v8 ignore hints so only those bodies are excluded, keeping
  captureReference/runTrial themselves covered.




&nbsp;

&nbsp;

## [Untagged] - Jul 10, 2026 8:05:15 PM

Commit [182c37f900859fc7bffa4352a0a09926ba89bc57](https://github.com/StoneCypher/fsl-mcp/commit/182c37f900859fc7bffa4352a0a09926ba89bc57)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(eval): cover renderReport and no-baseline deltas
  * - Add comprehensive tests for renderReport with synthetic data:
  - Test percentage formatting (e.g., 0.5 -> 50.0%)
  - Test positive and negative delta sign rendering
  - Test header and data row rendering
  - Test column alignment with single-digit n values
- Add test for computeDeltas returning [] when no bare baseline exists
- Fix one-character column drift in renderReport header by adding space before n label




&nbsp;

&nbsp;

## [Untagged] - Jul 10, 2026 6:10:57 AM

Commit [6784ea60ad447708d8d1703080675f0b9b32e58c](https://github.com/StoneCypher/fsl-mcp/commit/6784ea60ad447708d8d1703080675f0b9b32e58c)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(eval): aggregation, deltas, and report rendering




&nbsp;

&nbsp;

## [Untagged] - Jul 9, 2026 2:43:43 PM

Commit [68059a7e8c3f0349a1c58a00922ae42e4edb07f9](https://github.com/StoneCypher/fsl-mcp/commit/68059a7e8c3f0349a1c58a00922ae42e4edb07f9)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(eval): claude -p trial runner (injectable spawn)




&nbsp;

&nbsp;

## [Untagged] - Jul 9, 2026 12:52:39 PM

Commit [59b5df6ff79f79e9b975f66d522d84811298f999](https://github.com/StoneCypher/fsl-mcp/commit/59b5df6ff79f79e9b975f66d522d84811298f999)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(eval): condition -> claude -p invocation builder