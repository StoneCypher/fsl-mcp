# Changelog

All notable changes to this project will be documented in this file.

2 releases; Changelogging the last 10 commits; Full changelog at [CHANGELOG.long.md](CHANGELOG.long.md)



&nbsp;

&nbsp;

Published tags:

<a href="#0__4__0">0.4.0</a>, <a href="#0__3__0">0.3.0</a>





&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 4:36:35 PM

Commit [c96896d654bb48c5a363c1779dd6d36ea9d82e70](https://github.com/StoneCypher/fsl-mcp/commit/c96896d654bb48c5a363c1779dd6d36ea9d82e70)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(scaffold): reject backslashes and control characters in names wholesale - the roles map must never lie about compiled state names




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 12:20:52 PM

Commit [bc0c6634a11d80de38027411e885b97dfc3aa974](https://github.com/StoneCypher/fsl-mcp/commit/bc0c6634a11d80de38027411e885b97dfc3aa974)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(scaffold): validate trailing-backslash names and duplicate action labels; honest eval claim in README




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 10:42:35 AM

Commit [65135dfa8bbb61dc0f5869fe316d8bcf37651094](https://github.com/StoneCypher/fsl-mcp/commit/65135dfa8bbb61dc0f5869fe316d8bcf37651094)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(e2e): scalar-kind role rename crosses the fsl_scaffold protocol boundary




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 10:29:46 AM

Commit [ee9b942a1d28ae87e9e260e97510c38b7e413c3b](https://github.com/StoneCypher/fsl-mcp/commit/ee9b942a1d28ae87e9e260e97510c38b7e413c3b)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(server): fsl_scaffold tool - eight presets, five families; v0.5.0




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 9:16:28 AM

Commit [fa923a1e2db0121a5cba7f6f6fd34a71d825069c](https://github.com/StoneCypher/fsl-mcp/commit/fa923a1e2db0121a5cba7f6f6fd34a71d825069c)

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

Commit [9ac6fef300f0f0e12903757e322b896e830cb5e2](https://github.com/StoneCypher/fsl-mcp/commit/9ac6fef300f0f0e12903757e322b896e830cb5e2)

Author: `John Haugeland <stonecypher@gmail.com>`

  * build: raise unit coverage gate to 100 on all four metrics




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 8:48:47 AM

Commit [6465eb31cd7810edb20c7c95b448ebcacba519d3](https://github.com/StoneCypher/fsl-mcp/commit/6465eb31cd7810edb20c7c95b448ebcacba519d3)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(scaffold): shield machine_name line in every substitution pass; stoch cross-slot coverage




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 8:35:33 AM

Commit [f8c0c13fcb9cc2e29f1f796f2164070c8a85c8a9](https://github.com/StoneCypher/fsl-mcp/commit/f8c0c13fcb9cc2e29f1f796f2164070c8a85c8a9)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(scaffold): single-pass substitution and own-property preset lookup; harden stoch generator




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:53:00 AM

Commit [7895b10e2716372da54af98c24d55187c93c3ad8](https://github.com/StoneCypher/fsl-mcp/commit/7895b10e2716372da54af98c24d55187c93c3ad8)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(eval): allow mcp__fsl__fsl_guide in the tools-condition allowlist




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:52:48 AM

Commit [1ae9b7c30e16d3b19804eee29cd707dc7de2f30a](https://github.com/StoneCypher/fsl-mcp/commit/1ae9b7c30e16d3b19804eee29cd707dc7de2f30a)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(build): externalize jssm/cli in rollup config - main's build broke when render.ts began importing it