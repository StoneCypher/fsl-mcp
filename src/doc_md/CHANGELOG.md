# Changelog

All notable changes to this project will be documented in this file.

Changelogging the last 10 commits; Full changelog at [CHANGELOG.long.md](CHANGELOG.long.md)



&nbsp;

&nbsp;

Published tags:







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