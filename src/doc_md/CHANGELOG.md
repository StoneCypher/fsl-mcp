# Changelog

All notable changes to this project will be documented in this file.

2 releases; Changelogging the last 10 commits; Full changelog at [CHANGELOG.long.md](CHANGELOG.long.md)



&nbsp;

&nbsp;

Published tags:

<a href="#0__4__0">0.4.0</a>, <a href="#0__3__0">0.3.0</a>





&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 9:16:28 AM

Commit [4e64081ff4c580433f57948b9046d297f1f86936](https://github.com/StoneCypher/fsl-mcp/commit/4e64081ff4c580433f57948b9046d297f1f86936)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(coverage): close the 100-gate
  * Raises unit coverage to exit-0 at the new 100/100/100/100 gate
(vitest.config.ts, a0beee8) without weakening anything.
  * Real tests added (3): render.ts's JSON.stringify(err) branch for a
non-Error thrown value; scaffold.ts's per-element stateList name
validation and its array-for-scalar-role rejection.
  * v8-ignore fixes/additions (9): reference.ts and runner.ts each had a
defaultSpawn shim whose ignore block wrapped only the body, not the
function declaration, so it still counted toward the functions metric -
widened both to span the whole function. score.ts, explain.ts, and
scaffold.ts each get newly-adjudicated ignores over branches verified
unreachable through any real input (capture-group typing guards, a
provably-redundant re-validation, jssm's edge.name/start-state
guarantees traced through the installed jssm 5.162.10 bundle and
verified empirically, and scaffold's substitution invariants already
proven by its own test suite). Full per-gap justification in
.superpowers/sdd/coverage-closure-report.md (gitignored, not committed).
  * No thresholds lowered, no defensive branches deleted, no tests weakened,
no files added to the coverage exclude list.




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 8:55:19 AM

Commit [a0beee899da09e02b28d7d0d7a492fa68f340ddf](https://github.com/StoneCypher/fsl-mcp/commit/a0beee899da09e02b28d7d0d7a492fa68f340ddf)

Author: `John Haugeland <stonecypher@gmail.com>`

  * build: raise unit coverage gate to 100 on all four metrics




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 8:48:47 AM

Commit [6554cb8d269e779f460fcbb1f2ac7f6c698efca5](https://github.com/StoneCypher/fsl-mcp/commit/6554cb8d269e779f460fcbb1f2ac7f6c698efca5)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(scaffold): shield machine_name line in every substitution pass; stoch cross-slot coverage




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 8:35:33 AM

Commit [91a0d54a953a09f8355acba32e0e741f916bfea6](https://github.com/StoneCypher/fsl-mcp/commit/91a0d54a953a09f8355acba32e0e741f916bfea6)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(scaffold): single-pass substitution and own-property preset lookup; harden stoch generator




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:53:00 AM

Commit [75d0c21be8746daa66e7e76823aac6e8a7f7e67c](https://github.com/StoneCypher/fsl-mcp/commit/75d0c21be8746daa66e7e76823aac6e8a7f7e67c)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(eval): allow mcp__fsl__fsl_guide in the tools-condition allowlist




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:52:48 AM

Commit [212947e9afab4a47dd8822aa05280f72eef3407a](https://github.com/StoneCypher/fsl-mcp/commit/212947e9afab4a47dd8822aa05280f72eef3407a)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(build): externalize jssm/cli in rollup config - main's build broke when render.ts began importing it




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:51:30 AM

Commit [4c78ca39665b0fd3f33e0a78760e788bf685469a](https://github.com/StoneCypher/fsl-mcp/commit/4c78ca39665b0fd3f33e0a78760e788bf685469a)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(scaffold): rename engine with analyze gate, unit and stochastic coverage




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:39:26 AM

Commit [673f796d9b39f2131f9a023c82ef9b6831319e0d](https://github.com/StoneCypher/fsl-mcp/commit/673f796d9b39f2131f9a023c82ef9b6831319e0d)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(scaffold): directory-scanning embedder, preset registry, drift guard




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:31:39 AM

Commit [df16dbb00bcb0ca3c2318a12574bb062fae448e4](https://github.com/StoneCypher/fsl-mcp/commit/df16dbb00bcb0ca3c2318a12574bb062fae448e4)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(scaffold): eight preset sources across five families with raw-compile test




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:28:55 AM

Commit [e6d2972bf3f546825bece6c1d76709af3ff9ab2c](https://github.com/StoneCypher/fsl-mcp/commit/e6d2972bf3f546825bece6c1d76709af3ff9ab2c)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(plan): implementation plan for fsl_scaffold - eight presets, five families