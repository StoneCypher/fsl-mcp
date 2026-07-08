# Changelog

All notable changes to this project will be documented in this file.





&nbsp;

&nbsp;

Published tags:







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