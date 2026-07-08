# Changelog

All notable changes to this project will be documented in this file.

Changelogging the last 10 commits; Full changelog at [CHANGELOG.long.md](CHANGELOG.long.md)



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