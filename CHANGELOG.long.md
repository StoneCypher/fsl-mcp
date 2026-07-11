# Changelog

All notable changes to this project will be documented in this file.





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




&nbsp;

&nbsp;

## [Untagged] - Jul 9, 2026 12:43:50 PM

Commit [c2834fefd485de2d7469c82588a9efe1f6276e7b](https://github.com/StoneCypher/fsl-mcp/commit/c2834fefd485de2d7469c82588a9efe1f6276e7b)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(eval): cover empty-stdout branch in captureReference




&nbsp;

&nbsp;

## [Untagged] - Jul 9, 2026 11:04:25 AM

Commit [4f273e23a531a475deaae2d60cf5893024375de9](https://github.com/StoneCypher/fsl-mcp/commit/4f273e23a531a475deaae2d60cf5893024375de9)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(eval): capture version-locked FSL reference primer




&nbsp;

&nbsp;

## [Untagged] - Jul 9, 2026 7:59:40 AM

Commit [6ea14061be0e54daae00762553aab1c4a2f2bba4](https://github.com/StoneCypher/fsl-mcp/commit/6ea14061be0e54daae00762553aab1c4a2f2bba4)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(eval): jssm-backed scoring (extract, validity, correctness)




&nbsp;

&nbsp;

## [Untagged] - Jul 8, 2026 9:06:26 PM

Commit [78d3b926bb57b3b3fd833ed65790e5d113860b60](https://github.com/StoneCypher/fsl-mcp/commit/78d3b926bb57b3b3fd833ed65790e5d113860b60)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(eval): shared types for the eval harness




&nbsp;

&nbsp;

## [Untagged] - Jul 8, 2026 2:45:42 PM

Commit [3819034fa7b7f1cfe8fa639a9bf0070eb874d1d2](https://github.com/StoneCypher/fsl-mcp/commit/3819034fa7b7f1cfe8fa639a9bf0070eb874d1d2)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: design spec for the subscription-based fsl-mcp eval harness
  * A repeatable regression metric measuring whether fsl-mcp (and a shipped
FSL reference) improves FSL authoring vs authoring blind. Runs on the
Claude Code subscription via headless 'claude -p' (no API key); 4-way
conditions (bare/reference/tools/reference+tools); jssm as the scoring
oracle; configurable model (default opus), tasks, and trials.




&nbsp;

&nbsp;

## [Untagged] - Jul 8, 2026 3:50:33 PM

Commit [a5ca7f2ffb06635a579a8300e94e3cf46c3128f9](https://github.com/StoneCypher/fsl-mcp/commit/a5ca7f2ffb06635a579a8300e94e3cf46c3128f9)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: implementation plan for the fsl-mcp eval harness
  * Seven bite-sized TDD tasks under src/ts/eval/: shared types, jssm-backed
scoring, version-locked reference capture, condition->claude-p invocation
builder, injectable-spawn trial runner, aggregation/report, and the task
corpus + CLI orchestrator (npm run eval). Subscription-only via claude -p;
no API.




&nbsp;

&nbsp;

## [Untagged] - Jul 8, 2026 8:54:31 PM

Commit [1ef15df478acb32f5a6692762bd35e8acac3587b](https://github.com/StoneCypher/fsl-mcp/commit/1ef15df478acb32f5a6692762bd35e8acac3587b)

Author: `StoneCypher <StoneCypher@users.noreply.github.com>`

  * deploy: babcb1605ce43f1389bfc4c27f27528933cf99db




&nbsp;

&nbsp;

## [Untagged] - Jul 8, 2026 8:51:28 PM

Commit [babcb1605ce43f1389bfc4c27f27528933cf99db](https://github.com/StoneCypher/fsl-mcp/commit/babcb1605ce43f1389bfc4c27f27528933cf99db)

Author: `John Haugeland <stonecypher@gmail.com>`

  * ci: fix post-merge CI failures (version-bump, eslint/playwright, windows profile, Node 22) (#2)
  * Four fixes for the CI failures surfaced by the v1 merge: verify-version-bump now passes for an unpublished first release; eslint ignores the CI-cached .playwright-browsers/ (the failure that blocked test-main-full and thus gh-pages); the ci-lite profile is passed via BUILD_PROFILE env so PowerShell on the windows runner doesn't eat the -- flag; and the CI Node runner drops 23 -> 22 (LTS, clears EBADENGINE, avoids the 24/Playwright issue).




&nbsp;

&nbsp;

## [Untagged] - Jul 8, 2026 8:39:58 PM

Commit [e9222585f54e4d1862d9d321803adeb9e98afd53](https://github.com/StoneCypher/fsl-mcp/commit/e9222585f54e4d1862d9d321803adeb9e98afd53)

Author: `John Haugeland <stonecypher@gmail.com>`

  * ci: ignore playwright browser cache in eslint, pass profile via env #fullbuild
  * Two more CI failures from the v1 merge run:
  * - Full build failed because eslint linted the CI-cached chromium under
  .playwright-browsers/ ('chrome' is not defined). CI installs browsers
  workspace-relative (PLAYWRIGHT_BROWSERS_PATH), which the ignore list
  didn't cover; locally the browsers live outside the repo so it passed.
  Add .playwright-browsers/** and .playwright-mcp/** to eslint ignores.
  This is what blocked test-main-full (and thus deploy-pages/gh-pages)
  and stryker.
  * - Windows CI ran the DEFAULT profile instead of ci-lite: PowerShell (the
  windows runner's default shell) consumes the -- in
  'npm run build -- --profile=ci-lite', so the flag never reached the
  script and viz_png ran without a browser and failed. Pass the profile
  via the BUILD_PROFILE env var (read by build_config.js, shell-agnostic)
  in both lite-build steps instead.
  * #fullbuild validates the full matrix on this PR before merge.




&nbsp;

&nbsp;

## [Untagged] - Jul 8, 2026 6:41:22 PM

Commit [9148095b98018f3f5b01cf52b24c8cce01887805](https://github.com/StoneCypher/fsl-mcp/commit/9148095b98018f3f5b01cf52b24c8cce01887805)

Author: `John Haugeland <stonecypher@gmail.com>`

  * ci: pass version-bump on first release, run CI on Node 22
  * - verify_version_bump.cjs crashed on an unpublished package: 'npm view
  <name> version' 404s and the throw aborted the job. Wrap the lookup and
  treat 'no published version' as a passing first release (valid local
  semver, nothing to regress against) instead of erroring. This unblocked
  job was the only red in CI after the v1 merge.
- Switch every CI Node runner from 23 to 22. 22 is LTS and satisfies the
  devDeps' engines (^22.13), clearing the EBADENGINE warns, and avoids the
  Playwright-installer trouble on 24.




&nbsp;

&nbsp;

## [Untagged] - Jul 8, 2026 3:57:13 PM

Commit [9b0fecc0ae92261858e293c13140bfe0e33a16bf](https://github.com/StoneCypher/fsl-mcp/commit/9b0fecc0ae92261858e293c13140bfe0e33a16bf)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat: fsl-mcp v1 — FSL authoring MCP server (#1)
  * Ships fsl-mcp v1 (0.2.0): a stdio MCP server exposing five FSL authoring tools (fsl_validate, fsl_render, fsl_explain, fsl_simulate, fsl_lint) over a shared analyze-first core, plus the createServer/startServer library and the npx fsl-mcp bin. ESM+CJS bundles with externalized deps (no IIFE). Enforced 80% coverage gate. CI publishes Pages via gh-pages and runs on Node 23.




&nbsp;

&nbsp;

## [Untagged] - Jul 8, 2026 3:50:33 PM

Commit [57c6e288b7302e35d057257f738fcd2a0a99181e](https://github.com/StoneCypher/fsl-mcp/commit/57c6e288b7302e35d057257f738fcd2a0a99181e)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: implementation plan for the fsl-mcp eval harness
  * Seven bite-sized TDD tasks under src/ts/eval/: shared types, jssm-backed
scoring, version-locked reference capture, condition->claude-p invocation
builder, injectable-spawn trial runner, aggregation/report, and the task
corpus + CLI orchestrator (npm run eval). Subscription-only via claude -p;
no API.




&nbsp;

&nbsp;

## [Untagged] - Jul 8, 2026 2:45:42 PM

Commit [c714fd5531be1f9aa9f20ab98a35f9fec1926be7](https://github.com/StoneCypher/fsl-mcp/commit/c714fd5531be1f9aa9f20ab98a35f9fec1926be7)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: design spec for the subscription-based fsl-mcp eval harness
  * A repeatable regression metric measuring whether fsl-mcp (and a shipped
FSL reference) improves FSL authoring vs authoring blind. Runs on the
Claude Code subscription via headless 'claude -p' (no API key); 4-way
conditions (bare/reference/tools/reference+tools); jssm as the scoring
oracle; configurable model (default opus), tasks, and trials.




&nbsp;

&nbsp;

## [Untagged] - Jul 8, 2026 8:06:16 AM

Commit [25d760cd52b4fd91877266764becd87f34ee9a08](https://github.com/StoneCypher/fsl-mcp/commit/25d760cd52b4fd91877266764becd87f34ee9a08)

Author: `John Haugeland <stonecypher@gmail.com>`

  * chore(release): 0.2.0
  * Version bump for fsl-mcp v1 (five FSL authoring tools, MCP stdio server,
npx bin). Full build green at 0.2.0: 67/67 tests, coverage gate
94.73/88/91.3/95.16, attw clean across all four resolution modes,
docs/site/visualizations regenerated.
  * Also in this commit:
- Make the identity guard test semver-tolerant (match /^\d+\.\d+\.\d+/)
  instead of pinning version 0.1.0, so version bumps don't break it.
- Stop tracking the .superpowers/ sdd scratch dir (now gitignored).




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 11:01:16 PM

Commit [954fa93f8fa8bcdd9fc688b6229b17bb671e8b68](https://github.com/StoneCypher/fsl-mcp/commit/954fa93f8fa8bcdd9fc688b6229b17bb671e8b68)

Author: `John Haugeland <stonecypher@gmail.com>`

  * build: regenerate bundles for render note reword
  * Claude-Session: https://claude.ai/code/session_01YQ2XHZixjbJyPBMBEXiK4Y




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 11:01:00 PM

Commit [236397a34138d22e8f4120ae9a788a99489102d3](https://github.com/StoneCypher/fsl-mcp/commit/236397a34138d22e8f4120ae9a788a99489102d3)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix: clean up dead IIFE references and internal jargon in tool output
  * Final-review follow-ups (no critical/important issues; these are the
polish items):
- render.ts: reword the png-degrade note to drop the internal 'Wmcp sync
  items' roadmap jargon that was leaking into a user-facing tool result;
  still matches /not yet supported/i so the test is unaffected.
- src/html/index.html: drop the <script src=index.iife.js> tag left
  dangling when the IIFE bundle was removed (would 404 on the published
  gh-pages site).
- e2e/index.spec.ts: remove the now-invalid 'loads the application
  script' assertion for that removed bundle.
  * Claude-Session: https://claude.ai/code/session_01YQ2XHZixjbJyPBMBEXiK4Y




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 10:44:00 PM

Commit [7f3e947e96473e1d137c47119adb229d5ec31f38](https://github.com/StoneCypher/fsl-mcp/commit/7f3e947e96473e1d137c47119adb229d5ec31f38)

Author: `John Haugeland <stonecypher@gmail.com>`

  * ci: publish Pages via gh-pages branch, downgrade runner to Node 23
  * - Add a deploy-pages job that pushes the committed docs/ (site + typedoc
  API docs) to the gh-pages branch on push to main, gated behind
  test-main-full, using peaceiris/actions-gh-pages. GitHub Pages must be
  set (repo Settings > Pages) to serve from the gh-pages branch.
- Downgrade every CI Node runner from 24 to 23 (PR check, main full,
  cross-platform matrix, stryker, verify-version-bump, release).
  * Claude-Session: https://claude.ai/code/session_01YQ2XHZixjbJyPBMBEXiK4Y




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 10:39:47 PM

Commit [12747b61097279385d246784f57432cb88287c34](https://github.com/StoneCypher/fsl-mcp/commit/12747b61097279385d246784f57432cb88287c34)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(build): make dts copy idempotent, drop nested dist/tools/tools cruft
  * The dts step ran 'cp -r build/ts/tools dist/tools' into an existing
dist/tools, nesting a spurious dist/tools/tools/ (with stray .js files
a types dir shouldn't carry). rm -rf dist/tools before the copy makes
it idempotent. attw still clean across all four resolution modes.
  * Claude-Session: https://claude.ai/code/session_01YQ2XHZixjbJyPBMBEXiK4Y




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 10:38:21 PM

Commit [3d52577927c847211d5415918a4908c4d19e7e16](https://github.com/StoneCypher/fsl-mcp/commit/3d52577927c847211d5415918a4908c4d19e7e16)

Author: `John Haugeland <stonecypher@gmail.com>`

  * build: regenerate dist, docs, changelog, coverage artifacts
  * Regenerated outputs for the ESM+CJS build: dist/index.{mjs,cjs} +
index.d.{ts,cts} + bin.mjs + per-module .d.ts, typedoc site with the
five tool + createServer/startServer pages, changelog, coverage, and
the generated README.md. Removes the stale stub/double artifacts and
the dropped IIFE bundle.
  * Claude-Session: https://claude.ai/code/session_01YQ2XHZixjbJyPBMBEXiK4Y




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 10:38:08 PM

Commit [eca3e4828ef517b1f51fc6c19b87d9e0d288bf37](https://github.com/StoneCypher/fsl-mcp/commit/eca3e4828ef517b1f51fc6c19b87d9e0d288bf37)

Author: `John Haugeland <stonecypher@gmail.com>`

  * build: real docs, ESM+CJS-only bundles, externalized deps
  * Write the real base_README.md (what fsl-mcp is, npx/MCP-client install,
the five tools, v1 ceilings) and a contributor CLAUDE.md (analyze-first
architecture, strict TS/eslint gotchas, generated-README rule, real
coverage gate, transitive viz-js note).
  * Reshape the build to fit an MCP server:
- Drop the IIFE/browser bundle entirely — a stdio server can't run in a
  browser (its config had to stub the server deps with inert globals).
- Keep ESM + CJS library bundles + the npx bin (all three ESM/CJS).
- Externalize every runtime dep (jssm, jssm/viz, SDK, zod) in all
  bundles instead of inlining jssm: smaller bundles, proper dedup, and
  it removes the terser hang that inlining jssm+viz caused. minify only
  ESM+CJS now.
- package.json exports/main/types reduced to import+require (no browser).
- update_madlibs.js: fill the unit/stoch branch/func/line README madlibs
  the template left unreplaced.
- index.ts: export the FslDiagnostic/FslSeverity public types.
  * Verified: tsc clean, eslint clean, 67/67 tests, coverage gate green
(94.73/88/91.3/95.16), attw clean (node10/node16-CJS/node16-ESM/bundler),
bin smoke test OK.
  * Claude-Session: https://claude.ai/code/session_01YQ2XHZixjbJyPBMBEXiK4Y




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 9:11:35 PM

Commit [efed8a5d989426ef7e0c94d5f5b0154a8b6e369c](https://github.com/StoneCypher/fsl-mcp/commit/efed8a5d989426ef7e0c94d5f5b0154a8b6e369c)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(coverage): enforce 80% gate via nested thresholds




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 9:05:35 PM

Commit [65240306462f6fbabda59968ad0cce6537143cc8](https://github.com/StoneCypher/fsl-mcp/commit/65240306462f6fbabda59968ad0cce6537143cc8)

Author: `John Haugeland <stonecypher@gmail.com>`

  * chore(coverage): exclude bin.ts entry shim from coverage




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 9:05:29 PM

Commit [c236d5b38c1b39df1704e679360dd44ee9bf21d2](https://github.com/StoneCypher/fsl-mcp/commit/c236d5b38c1b39df1704e679360dd44ee9bf21d2)

Author: `John Haugeland <stonecypher@gmail.com>`

  * chore(tests): drop unused expect import in analyze.stoch.ts




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 9:05:22 PM

Commit [592d7e84bf82c01b08ed0e63dbf6cda039228644](https://github.com/StoneCypher/fsl-mcp/commit/592d7e84bf82c01b08ed0e63dbf6cda039228644)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(explain): cover named-action edge (e.action branch)




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 9:05:16 PM

Commit [e3def30bceea415817867525c7277eec88ecef1b](https://github.com/StoneCypher/fsl-mcp/commit/e3def30bceea415817867525c7277eec88ecef1b)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(e2e): exercise all five MCP tool handlers over one client




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 8:47:42 PM

Commit [4d2dd800e6940950642fbe04e092b76535dd36d2](https://github.com/StoneCypher/fsl-mcp/commit/4d2dd800e6940950642fbe04e092b76535dd36d2)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat: wire MCP stdio server and fsl-mcp bin entry




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 8:21:37 PM

Commit [c8e50bcb86cbc4635a5d533b1939fdd5c25fca9d](https://github.com/StoneCypher/fsl-mcp/commit/c8e50bcb86cbc4635a5d533b1939fdd5c25fca9d)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat: add fsl_render tool (svg; png degrades with note)




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 6:45:45 PM

Commit [34d0eff789a251fda96b26ae4acc9115fe085360](https://github.com/StoneCypher/fsl-mcp/commit/34d0eff789a251fda96b26ae4acc9115fe085360)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test: cover action-first branch in fsl_simulate
  * Claude-Session: https://claude.ai/code/session_01YQ2XHZixjbJyPBMBEXiK4Y




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 6:45:45 PM

Commit [f15ab0eb40cf40442afd926fe473621464155119](https://github.com/StoneCypher/fsl-mcp/commit/f15ab0eb40cf40442afd926fe473621464155119)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test: cover action-first branch in fsl_simulate




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 6:36:25 PM

Commit [35949130024062aa5516171e3d50685c72557c24](https://github.com/StoneCypher/fsl-mcp/commit/35949130024062aa5516171e3d50685c72557c24)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat: add fsl_simulate tool
  * Drives a machine through a list of actions/targets, trying each as an
action label first then a target-state transition. Stops at the first
illegal move and reports the rejection, path, end state, and legal
next actions. Invalid FSL source yields diagnostics via the standard
analyze-first guard.
  * Claude-Session: https://claude.ai/code/session_01YQ2XHZixjbJyPBMBEXiK4Y




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 6:27:12 PM

Commit [24e67127531ebf9eee726b4c48549319c2a89c7b](https://github.com/StoneCypher/fsl-mcp/commit/24e67127531ebf9eee726b4c48549319c2a89c7b)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: mark Task 6 (fsl_explain) complete in progress ledger




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 6:26:53 PM

Commit [bd89d56c0221bf2f4b642b1b8ea71bcb221e3c45](https://github.com/StoneCypher/fsl-mcp/commit/bd89d56c0221bf2f4b642b1b8ea71bcb221e3c45)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat: add fsl_explain tool




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 6:18:49 PM

Commit [eefd8c479a4b1d91d23a871c379f780fb110dd34](https://github.com/StoneCypher/fsl-mcp/commit/eefd8c479a4b1d91d23a871c379f780fb110dd34)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat: add fsl_lint tool




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 6:15:25 PM

Commit [af3e90d6407aedd7d1491c5ae4b2441d47d9ab3e](https://github.com/StoneCypher/fsl-mcp/commit/af3e90d6407aedd7d1491c5ae4b2441d47d9ab3e)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat: add fsl_validate tool




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 6:08:07 PM

Commit [16d0e959123769bf82839f97289e0f642ae7b993](https://github.com/StoneCypher/fsl-mcp/commit/16d0e959123769bf82839f97289e0f642ae7b993)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat: add analyze diagnostics core (offset->line/col, fslDiagnostics wrapper)
  * Add src/ts/types.ts (FslSeverity, FslDiagnostic) and src/ts/analyze.ts
(offsetToLineCol, analyze, hasErrors), the shared diagnostics core every
FSL tool built in later tasks calls first.
  * TDD: analyze.spec.ts written first, confirmed RED (missing module), then
implementation made it GREEN (5/5 tests, 100% coverage). Added
analyze.stoch.ts fast-check property tests (line/col never below 1; line
never exceeds newline-count + 1) - both pass.
  * Full regression: 50/50 unit + 5/5 stochastic tests pass repo-wide; tsc
--noEmit clean under isolatedDeclarations/noUncheckedIndexedAccess/
exactOptionalPropertyTypes; eslint clean.
  * Claude-Session: https://claude.ai/code/session_01YQ2XHZixjbJyPBMBEXiK4Y




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 5:43:25 PM

Commit [0154e63a67d6ecbc985a752b441682c4eb32db8f](https://github.com/StoneCypher/fsl-mcp/commit/0154e63a67d6ecbc985a752b441682c4eb32db8f)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat: add jssm/mcp deps and verify jssm capability floor
  * Move jssm, @modelcontextprotocol/sdk, zod into dependencies (zod was
in devDependencies; server ships it at runtime). Add
src/ts/tests/jssm_capability.spec.ts proving the four jssm entry
points the tools rely on work in-process: from(), fslDiagnostics()
(valid + invalid FSL), and jssm/viz's fsl_to_svg_string().
  * @viz-js/viz was NOT added explicitly: npm installed it automatically
as jssm's optional dependency (npm ls confirms jssm@5.162.1 ->
@viz-js/viz@3.28.0), and the svg-rendering test passed on the first
run without any extra install step.
  * npx vitest run src/ts/tests/jssm_capability.spec.ts: 4 passed (4)
  * Claude-Session: https://claude.ai/code/session_01YQ2XHZixjbJyPBMBEXiK4Y




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 5:32:16 PM

Commit [de8caea63eedc07299849fb8e5ef7dafd3630115](https://github.com/StoneCypher/fsl-mcp/commit/de8caea63eedc07299849fb8e5ef7dafd3630115)

Author: `John Haugeland <stonecypher@gmail.com>`

  * chore: remove stub demo, add identity guard test




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 5:17:35 PM

Commit [538d28b9870b78b3311c1ed081096d031baa60f9](https://github.com/StoneCypher/fsl-mcp/commit/538d28b9870b78b3311c1ed081096d031baa60f9)

Author: `John Haugeland <stonecypher@gmail.com>`

  * chore: de-template package identity to fsl-mcp
  * Rename package (name, version, description, keywords, urls), rollup
output names, and base_README (title, links, remove template checklist).
Regenerated build artifacts. Partial Task 1; stub removal follows.
  * Claude-Session: https://claude.ai/code/session_01YQ2XHZixjbJyPBMBEXiK4Y




&nbsp;

&nbsp;

## [Untagged] - Jul 7, 2026 9:17:43 AM

Commit [1d72d8046d70d86ab7b896836954d5886d1ae398](https://github.com/StoneCypher/fsl-mcp/commit/1d72d8046d70d86ab7b896836954d5886d1ae398)

Author: `John Haugeland <stonecypher@gmail.com>`

  * Initial commit