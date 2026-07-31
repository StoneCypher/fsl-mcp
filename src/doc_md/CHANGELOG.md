# Changelog

All notable changes to this project will be documented in this file.

3 releases; Changelogging the last 10 commits; Full changelog at [CHANGELOG.long.md](CHANGELOG.long.md)



&nbsp;

&nbsp;

Published tags:

<a href="#0__5__0">0.5.0</a>, <a href="#0__4__0">0.4.0</a>, <a href="#0__3__0">0.3.0</a>





&nbsp;

&nbsp;

## [Untagged] - Jul 30, 2026 6:29:17 PM

Commit [0b1c584ff56b001f43677b4604e887824c795b56](https://github.com/StoneCypher/fsl-mcp/commit/0b1c584ff56b001f43677b4604e887824c795b56)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: note dual-era protocol support; v0.6.0




&nbsp;

&nbsp;

## [Untagged] - Jul 30, 2026 6:14:28 PM

Commit [99e378adc198503b0224b69e906d0233e33f75b5](https://github.com/StoneCypher/fsl-mcp/commit/99e378adc198503b0224b69e906d0233e33f75b5)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(e2e): cover the production bin entry as a real subprocess




&nbsp;

&nbsp;

## [Untagged] - Jul 30, 2026 6:11:47 PM

Commit [22f97b2f35b64633b7c761325469cb4ba60853d7](https://github.com/StoneCypher/fsl-mcp/commit/22f97b2f35b64633b7c761325469cb4ba60853d7)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(e2e): prove modern and legacy eras are both served over stdio




&nbsp;

&nbsp;

## [Untagged] - Jul 30, 2026 5:52:01 PM

Commit [5be3038e210d2030f293e6c348b6ef1f194fdb60](https://github.com/StoneCypher/fsl-mcp/commit/5be3038e210d2030f293e6c348b6ef1f194fdb60)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(server): wire onerror reporting and correct createServer's stale DocBlock
  * Review of the SDK v2 migration (00eea67) found two Important defects,
both in the brief that commit transcribed faithfully rather than in the
transcription itself:
  * 1. The new bin/startServer pairing dropped all error reporting. The old
   bin did `startServer().catch(e => { console.error(e); process.exit(1); })`;
   the new one did nothing, and serveStdio routes every out-of-band error
   (send failures, factory-construction failures, malformed envelopes,
   discarded-probe timeouts, and a failed wire.start() among ~18 call
   sites) through `options.onerror`, which was never passed - so
   `reportError`'s `try { options.onerror?.(error); } catch {}` dropped
   every one of them on the floor, including a startup failure, silently.
  *    Fixed by wiring `onerror: (error) => { console.error(error); }` into
   both arms of startServer's transport-options ternary (injected and
   omitted), so a real client (bin.ts) and the e2e specs alike get error
   visibility, on stderr only - `stdout` is the protocol channel and a
   stray write there corrupts it for every connected client.
  *    Chose not to reintroduce `process.exit(1)`: `onerror` is a single sink
   shared between a fatal startup failure and routine per-message
   conditions (one malformed notification, a discarded probe timeout),
   and the SDK gives the callback no way to distinguish them. Exiting
   unconditionally would risk killing an otherwise-healthy server over a
   transient client mistake, which the review explicitly flagged as a
   trap to avoid. Logging restores the pre-migration behavior's
   visibility without that risk.
  * 2. createServer's DocBlock still described the pre-migration usage
   pattern - "connect it to stdio (production)" plus an
   `@example await server.connect(new StdioServerTransport())` -
   referencing a symbol server.ts no longer imports, and directly
   contradicting startServer's own DocBlock, which says a hand-connected
   transport "bypasses the era dispatch entirely." Rewritten to describe
   what createServer actually is now: a factory product consumed by
   serveStdio via startServer, not something to .connect() directly.
  * Covering tests: added a new e2e spec exercising the onerror wiring via
a minimal custom Transport double, asserting the injected error reaches
console.error (stderr) and never console.log (stdout). See the fix
report appended to
.superpowers/sdd/2026-07-29-mcp-2026-07-28-migration/task-4-report.md
for the exact commands and output.
  * Claude-Session: https://claude.ai/code/session_011CX5oVa2L52UkmWZ1jQtXr




&nbsp;

&nbsp;

## [Untagged] - Jul 30, 2026 5:46:19 PM

Commit [c6c81db2f3f05d9459ba7977a26a40434c5f5c8c](https://github.com/StoneCypher/fsl-mcp/commit/c6c81db2f3f05d9459ba7977a26a40434c5f5c8c)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(plan): correct the stale SDK claim in base_README during Task 6
  * Task 4's review found base_README.md:5 still claims the tools are exposed via @modelcontextprotocol/sdk, the package Task 4 uninstalls. Task 6 as written only added a section, so the false claim would have shipped in the generated README. Folded in as Step 1b rather than deferred to the final review, since it is user-facing and certain rather than a judgment call.




&nbsp;

&nbsp;

## [Untagged] - Jul 30, 2026 5:40:14 PM

Commit [fc718c88efaa5f4472325c9955064d7f43387881](https://github.com/StoneCypher/fsl-mcp/commit/fc718c88efaa5f4472325c9955064d7f43387881)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(plan): add a subprocess spec covering the production entry path
  * Task 4's startServer carries a v8 ignore on its omitted-transport arm, which is the exact call bin.ts makes in production; bin.ts is itself coverage-excluded, so nothing tested the shipped entry path. John chose to close that with a spawn test.
  * Targets src/ts/bin.ts via jiti rather than dist/bin.mjs: run_build.js runs each stage's scripts concurrently, so the test run races tsc and dist/bin.mjs does not exist until Stage 2. A spec pointed at dist would find nothing, or silently exercise a stale binary from a previous build and report a false pass. The tradeoff is stated in the plan: this covers the no-arg startServer path, real process stdio, stdout purity, and EOF shutdown, but not rollup bundling or the shebang.




&nbsp;

&nbsp;

## [Untagged] - Jul 30, 2026 5:33:32 PM

Commit [00eea6706b004cd615cf7288eaaf218faebb8ae8](https://github.com/StoneCypher/fsl-mcp/commit/00eea6706b004cd615cf7288eaaf218faebb8ae8)

Author: `John Haugeland <stonecypher@gmail.com>`

  * refactor(server)!: migrate to MCP SDK v2 and revision 2026-07-28
  * Step 1 export-path discovery (node_modules/@modelcontextprotocol/server/dist/*.d.mts):
- Transport (type) - main entry only (./dist/index.d.mts), NOT re-exported
  from ./stdio. Confirmed via the index.d.mts export list: 'type Transport'.
- StdioServerTransport (class) and StdioServerHandle (type) - ./stdio
  subpath only (./dist/stdio.d.mts export list), NOT re-exported from the
  main entry.
- serveStdio (function) - ./stdio subpath only.
The brief's Step 2 guess matched these findings exactly; no adjustment
was needed.
  * CacheHint structural check: ToolsCacheHint ({ ttlMs: number; cacheScope:
'public' | 'private' }, both required) assigns cleanly to the SDK's
CacheHint ({ ttlMs?: number; cacheScope?: CacheScope }, both optional) -
required fields satisfy optional targets under exactOptionalPropertyTypes.
cacheHints key used: 'tools/list', a literal member of the SDK's closed
CacheableResultMethod union.
  * Also fixes a real 100%-branch-coverage regression the exactOptionalPropertyTypes-
mandated ternary in startServer introduced: the omitted-transport arm (real
stdio) has no safe way to be exercised by tests without hijacking the test
process's actual stdin/stdout, so it carries a targeted v8 ignore with
rationale, mirroring bin.ts's existing coverage exclusion for the same reason.
  * Claude-Session: https://claude.ai/code/session_011CX5oVa2L52UkmWZ1jQtXr




&nbsp;

&nbsp;

## [Untagged] - Jul 30, 2026 5:33:32 PM

Commit [e5979495107dd05630d6fb0491555e827fe2518b](https://github.com/StoneCypher/fsl-mcp/commit/e5979495107dd05630d6fb0491555e827fe2518b)

Author: `John Haugeland <stonecypher@gmail.com>`

  * refactor(server)!: migrate to MCP SDK v2 and revision 2026-07-28
  * Step 1 export-path discovery (node_modules/@modelcontextprotocol/server/dist/*.d.mts):
- Transport (type) - main entry only (./dist/index.d.mts), NOT re-exported
  from ./stdio. Confirmed via the index.d.mts export list: 'type Transport'.
- StdioServerTransport (class) and StdioServerHandle (type) - ./stdio
  subpath only (./dist/stdio.d.mts export list), NOT re-exported from the
  main entry.
- serveStdio (function) - ./stdio subpath only.
The brief's Step 2 guess matched these findings exactly; no adjustment
was needed.
  * CacheHint structural check: ToolsCacheHint ({ ttlMs: number; cacheScope:
'public' | 'private' }, both required) assigns cleanly to the SDK's
CacheHint ({ ttlMs?: number; cacheScope?: CacheScope }, both optional) -
required fields satisfy optional targets under exactOptionalPropertyTypes.
cacheHints key used: 'tools/list', a literal member of the SDK's closed
CacheableResultMethod union.
  * Also fixes a real 100%-branch-coverage regression the exactOptionalPropertyTypes-
mandated ternary in startServer introduced: the omitted-transport arm (real
stdio) has no safe way to be exercised by tests without hijacking the test
process's actual stdin/stdout, so it carries a targeted v8 ignore with
rationale, mirroring bin.ts's existing coverage exclusion for the same reason.




&nbsp;

&nbsp;

## [Untagged] - Jul 30, 2026 5:33:32 PM

Commit [bb29b49a18791f9288a9e4a86ffcfce6ad271465](https://github.com/StoneCypher/fsl-mcp/commit/bb29b49a18791f9288a9e4a86ffcfce6ad271465)

Author: `John Haugeland <stonecypher@gmail.com>`

  * refactor(server)!: migrate to MCP SDK v2 and revision 2026-07-28




&nbsp;

&nbsp;

## [Untagged] - Jul 29, 2026 8:49:07 AM

Commit [e7190ab711cd8b24e6a389bdedcb1e22d1c7d43e](https://github.com/StoneCypher/fsl-mcp/commit/e7190ab711cd8b24e6a389bdedcb1e22d1c7d43e)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(cache): toolsCacheHint resolver for tools/list