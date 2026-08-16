# Changelog

All notable changes to this project will be documented in this file.

4 releases



&nbsp;

&nbsp;

Published tags:

<a href="#0__5__1">0.5.1</a>, <a href="#0__5__0">0.5.0</a>, <a href="#0__4__0">0.4.0</a>, <a href="#0__3__0">0.3.0</a>





&nbsp;

&nbsp;

## [Untagged] - Jul 30, 2026 7:01:26 PM

Commit [ff04f72cb22b1579e6988061982c32abebd0dafd](https://github.com/StoneCypher/fsl-mcp/commit/ff04f72cb22b1579e6988061982c32abebd0dafd)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(spec): reconcile the design record with what was actually built
  * The final whole-branch review found four drifts. Fixed all four: section 4.2 now carries the onerror wiring it originally omitted (and the accepted residual risk around it); 4.4 returns ToolsCacheHint rather than the SDK's CacheHint, which is what shipped and is the better choice; section 5 documents spawn.spec.ts, which was added mid-flight and is load-bearing because it is the condition the v8 ignore was accepted on; and section 7's risk rows are marked resolved rather than still open.
  * Also added 7.1, recording that the risk table was the wrong shape: every risk it named resolved without incident, and all three real problems came from places it never looked - the tracked dist/ artifact, rollup.config.js's externals, and a required _meta key the research recorded as merely present.




&nbsp;

&nbsp;

## [Untagged] - Jul 30, 2026 6:56:07 PM

Commit [33c8547d19f378c1e283c5c299d9655577011f84](https://github.com/StoneCypher/fsl-mcp/commit/33c8547d19f378c1e283c5c299d9655577011f84)

Author: `John Haugeland <stonecypher@gmail.com>`

  * build(dist): rebuild release artifacts against the v2 SDK
  * The committed dist/ was byte-identical to the branch base: pre-migration v1
output. dist/bin.mjs imported @modelcontextprotocol/sdk/server/mcp.js, a package
this branch uninstalled, and package.json points "bin" at that file - so a
published v0.6.0 would have died at its first import with ERR_MODULE_NOT_FOUND.
dist/server.d.ts and dist/index.d.cts were stale the same way. Every task's
git add list was internally consistent, nothing in the suite touches dist/, and
CI builds without diffing the result, so no gate could see it.
  * Rebuilt on top of the corrected rollup externals, so the bundles shrink rather
than swell:
  *   dist/bin.mjs     58,852 -> 63,558   (would have been 948,393 inlined)
  dist/index.mjs   38,532 -> 39,040   (would have been 467,673 inlined)
  dist/index.cjs   38,819 -> 39,359   (would have been 467,989 inlined)
  * No @modelcontextprotocol/sdk reference survives anywhere under dist/. Smoke
tested the shipped artifact directly - spawned dist/bin.mjs as a child process,
ran a legacy initialize handshake and tools/list over stdio, got all seven
tools back, stdout stayed pure JSON, exit code 0.
  * Also picks up the two declaration files that were never added (cache-hints,
version), the regenerated README/docs/changelog, and the new
StdioServerHandle typedoc page.
  * Claude-Session: https://claude.ai/code/session_011CX5oVa2L52UkmWZ1jQtXr




&nbsp;

&nbsp;

## [Untagged] - Jul 30, 2026 6:55:29 PM

Commit [7f73098a32cdfe3ac62f2ab2e9fcd0c247947425](https://github.com/StoneCypher/fsl-mcp/commit/7f73098a32cdfe3ac62f2ab2e9fcd0c247947425)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(build): keep the MCP SDK external in rollup, resync lock, prune dead generator
  * rollup.config.js was never migrated with the rest of the branch: its externals
still named @modelcontextprotocol/sdk, so rollup resolved and inlined the whole
of @modelcontextprotocol/server into every bundle (bin.mjs 58,852 -> 948,393
bytes). The SDK stays a declared runtime dependency, so the inlined megabyte was
pure duplication - and worse, it froze the SDK against security patching. Swap
both entries (bare name plus the subpath regex, which the ./stdio import needs)
to @modelcontextprotocol/server and correct the comment that claimed the SDK was
already external.
  * Also in this pass:
  * - CLAUDE.md: runtime deps said @modelcontextprotocol/sdk. Added a bundling
  contract section - nothing in the suite touches dist/, so a missed external is
  invisible to CI and shows up only as a bundle that grew by 10x.
- package-lock.json: root version fields still said 0.5.1 against a 0.6.0
  manifest. Resynced via npm install; no dependency resolutions changed.
- base_README.md: FSL_MCP_TOOLS_TTL_MS=0 does not "disable" the cache hint, it
  emits ttlMs 0 with cacheScope public. Reworded to immediately-stale.
- dual-era.spec.ts: the ttlMs assertion read the ambient environment, so anyone
  with FSL_MCP_TOOLS_TTL_MS set failed the branch's flagship spec. vi.stubEnv.
- index.ts: re-export StdioServerHandle so a consumer can name what startServer
  returns without reaching into an SDK subpath.
- Deleted src/build_js/make_ver.cjs - unused since the initial commit and broken
  (it writes into src/ts/generated_code/, which does not exist), and a trap next
  to the live generator this branch added. Pruned the matching dead
  generated_code paths from clean.js and stryker.config.json.
- tsconfig.json: the breadcrumb said a TS 6 bump "will need" types: ["node"];
  it is already there. Now says never drop it.
- typedoc-options.cjs: map the SDK's serveStdio link so the new re-export does
  not introduce a docs warning.
  * Claude-Session: https://claude.ai/code/session_011CX5oVa2L52UkmWZ1jQtXr




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




&nbsp;

&nbsp;

## [Untagged] - Jul 29, 2026 8:40:25 AM

Commit [3498e6f122d6e115892018e12b797ea8d4e62638](https://github.com/StoneCypher/fsl-mcp/commit/3498e6f122d6e115892018e12b797ea8d4e62638)

Author: `John Haugeland <stonecypher@gmail.com>`

  * build(version): generate src/ts/version.ts from package.json




&nbsp;

&nbsp;

## [Untagged] - Jul 29, 2026 8:35:34 AM

Commit [b3c2d02ea54931c031291bd83f59eadbcbb6aa0a](https://github.com/StoneCypher/fsl-mcp/commit/b3c2d02ea54931c031291bd83f59eadbcbb6aa0a)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(spec): correct the stale TypeScript types claim
  * The Task 1 review found the spec claimed a future TS 6.0 bump would need types: [node] added, implying it was unset. tsconfig.json has carried types: [vitest/globals, node] all along. The constraint is inverted: nothing to add, but node must never be dropped.




&nbsp;

&nbsp;

## [Untagged] - Jul 29, 2026 8:19:24 AM

Commit [f81379b17ae1fb087400430fa6e99a1df8833a1b](https://github.com/StoneCypher/fsl-mcp/commit/f81379b17ae1fb087400430fa6e99a1df8833a1b)

Author: `John Haugeland <stonecypher@gmail.com>`

  * chore(docs): move spec and plan out of the build's sweep path
  * npm run build's clean stage deletes docs/superpowers/ and the site stage does not restore it, so every build removed the design spec and the implementation plan. Moved to .superpowers/docs/, which the build never touches.
  * Keeping them tracked required inverting the ignore rule: git cannot re-include a path whose parent directory is excluded, so .superpowers/ became .superpowers/* plus a !.superpowers/docs/ negation. The SDD scratch (ledger, briefs, reports) stays ignored.




&nbsp;

&nbsp;

## [Untagged] - Jul 29, 2026 8:15:38 AM

Commit [8e9b910a31c2e89c4952b4703ec4b12a27f6a2e0](https://github.com/StoneCypher/fsl-mcp/commit/8e9b910a31c2e89c4952b4703ec4b12a27f6a2e0)

Author: `John Haugeland <stonecypher@gmail.com>`

  * build(deps): add MCP SDK v2 packages alongside v1
  * Added @modelcontextprotocol/server@^2.0.0 to dependencies and @modelcontextprotocol/client@^2.0.0 to devDependencies; both resolved to exact version 2.0.0. zod range unchanged at ^4.3.6; @types/node range unchanged at ^25.5.0 - npm did not widen either as a side effect of this install. Added engines.node >=20 after the license field. tsconfig.json already contains JSONC-style comments, so the future TypeScript-6.0 Buffer/@types breadcrumb was added directly above compilerOptions rather than falling back to base_README.md. Full npm run build passed clean both before and after the dependency changes: 176 unit tests and 6 stochastic tests passed, attw reported no problems, and rollup/terser/typedoc all completed without error. v1 SDK (@modelcontextprotocol/sdk@^1.0.0) left untouched, per task scope; no source code was modified.




&nbsp;

&nbsp;

## [Untagged] - Jul 29, 2026 8:09:36 AM

Commit [b57f7d4bbd9f660c54bcb57176aef83ed293130a](https://github.com/StoneCypher/fsl-mcp/commit/b57f7d4bbd9f660c54bcb57176aef83ed293130a)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(plan): extract legacyHandshake helper in the dual-era spec
  * Pre-flight scan finding: the initialize/initialized sequence was duplicated verbatim across two specs, which the review rubric treats as a defect. Resolved before execution rather than during it.




&nbsp;

&nbsp;

## [Untagged] - Jul 29, 2026 8:00:53 AM

Commit [955b9fd0c2131d0b3beff815249f2efb28eecf70](https://github.com/StoneCypher/fsl-mcp/commit/955b9fd0c2131d0b3beff815249f2efb28eecf70)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(plan): implementation plan for the MCP 2026-07-28 migration
  * Six tasks. Task 1 isolates the one real unknown (toolchain compatibility with v2's dual ESM/CJS output) by adding the dependency without touching source, so a build failure there is unambiguously the dependency's fault.
  * Claude-Session: https://claude.ai/code/session_011CX5oVa2L52UkmWZ1jQtXr




&nbsp;

&nbsp;

## [Untagged] - Jul 29, 2026 7:53:08 AM

Commit [30d2ff5a00f6f36f0de1aea01f8c0c7c4ee37d3c](https://github.com/StoneCypher/fsl-mcp/commit/30d2ff5a00f6f36f0de1aea01f8c0c7c4ee37d3c)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(spec): migration design for MCP revision 2026-07-28
  * Dual-era stdio via serveStdio, preserving the startServer(transport?) signature. Records the four SDK v2 facts verified against the shipped declarations, including that cacheScope is 'public' | 'private' (the SDK migration guide's 'global' does not exist) and that an invalid cache hint throws a RangeError at server construction.
  * Claude-Session: https://claude.ai/code/session_011CX5oVa2L52UkmWZ1jQtXr




&nbsp;

&nbsp;

## [Untagged] - Jul 19, 2026 12:49:41 AM

Commit [846b5669c174f0347acf80063a6bec8ee8266b43](https://github.com/StoneCypher/fsl-mcp/commit/846b5669c174f0347acf80063a6bec8ee8266b43)

Author: `StoneCypher <StoneCypher@users.noreply.github.com>`

  * deploy: 0261e055f3e1c978bfb83e1f0bdf0aed73a66eb2




&nbsp;

&nbsp;

<a name="0__5__1" />

## [0.5.1] - Jul 19, 2026 12:38:27 AM

Commit [0261e055f3e1c978bfb83e1f0bdf0aed73a66eb2](https://github.com/StoneCypher/fsl-mcp/commit/0261e055f3e1c978bfb83e1f0bdf0aed73a66eb2)

Author: `John Haugeland <stonecypher@gmail.com>`

  * chore(test): remove dead deprecated-position stoch coverage keys; document informational-only stance; v0.5.1




&nbsp;

&nbsp;

## [Untagged] - Jul 19, 2026 12:38:27 AM

Commit [a544bc80f546dd5d0773e55c9d159f05b78651f2](https://github.com/StoneCypher/fsl-mcp/commit/a544bc80f546dd5d0773e55c9d159f05b78651f2)

Author: `John Haugeland <stonecypher@gmail.com>`

  * chore(test): remove dead deprecated-position stoch coverage keys; document informational-only stance; v0.5.1




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 4:44:03 PM

Commit [907c81f84a9f228d857914622b2698c3bda0c2d7](https://github.com/StoneCypher/fsl-mcp/commit/907c81f84a9f228d857914622b2698c3bda0c2d7)

Author: `StoneCypher <StoneCypher@users.noreply.github.com>`

  * deploy: c96896d654bb48c5a363c1779dd6d36ea9d82e70




&nbsp;

&nbsp;

<a name="0__5__0" />

## [0.5.0] - Jul 18, 2026 4:36:35 PM

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




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:51:30 AM

Commit [2b90402af3a0c697531f88a076d66db9f128034f](https://github.com/StoneCypher/fsl-mcp/commit/2b90402af3a0c697531f88a076d66db9f128034f)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(scaffold): rename engine with analyze gate, unit and stochastic coverage




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:39:26 AM

Commit [8f86ab63c85d04c72ae7e2217cf3b59dc73a3f13](https://github.com/StoneCypher/fsl-mcp/commit/8f86ab63c85d04c72ae7e2217cf3b59dc73a3f13)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(scaffold): directory-scanning embedder, preset registry, drift guard




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:31:39 AM

Commit [b49d8e2990306e220564a4eeb6e4ffcc9294fed2](https://github.com/StoneCypher/fsl-mcp/commit/b49d8e2990306e220564a4eeb6e4ffcc9294fed2)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(scaffold): eight preset sources across five families with raw-compile test




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:28:55 AM

Commit [5d0cc1313273e48a2541ab618f389b46de3c348f](https://github.com/StoneCypher/fsl-mcp/commit/5d0cc1313273e48a2541ab618f389b46de3c348f)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(plan): implementation plan for fsl_scaffold - eight presets, five families




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:23:39 AM

Commit [4f102c8535f9062e1fa527cf3eb3365e5be9d89e](https://github.com/StoneCypher/fsl-mcp/commit/4f102c8535f9062e1fa527cf3eb3365e5be9d89e)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: fsl_scaffold spec - eight presets across five families; fixed-arity list slots; state and action role kinds




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:18:31 AM

Commit [055548a675cd2803bd4d6dbddbad8fd696dfe133](https://github.com/StoneCypher/fsl-mcp/commit/055548a675cd2803bd4d6dbddbad8fd696dfe133)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: fsl_scaffold spec - registry-driven preset families for future chart types




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:16:55 AM

Commit [1336c0f4e264e0b84a8520c890191ba5e7dd3033](https://github.com/StoneCypher/fsl-mcp/commit/1336c0f4e264e0b84a8520c890191ba5e7dd3033)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: design spec for fsl_scaffold preset tool




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 4:36:35 PM

Commit [22f76b60223e7441b4b5fe51eb7abc61013a35df](https://github.com/StoneCypher/fsl-mcp/commit/22f76b60223e7441b4b5fe51eb7abc61013a35df)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(scaffold): reject backslashes and control characters in names wholesale - the roles map must never lie about compiled state names




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 12:20:52 PM

Commit [348ca029c7dba76026e3eb8b9628c3b5ecfe7009](https://github.com/StoneCypher/fsl-mcp/commit/348ca029c7dba76026e3eb8b9628c3b5ecfe7009)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(scaffold): validate trailing-backslash names and duplicate action labels; honest eval claim in README




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 10:42:35 AM

Commit [1a90ae3b08538a8818eda6f97fcb845d45c316e3](https://github.com/StoneCypher/fsl-mcp/commit/1a90ae3b08538a8818eda6f97fcb845d45c316e3)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(e2e): scalar-kind role rename crosses the fsl_scaffold protocol boundary




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 10:29:46 AM

Commit [77c2224aad4f29146b5c9ded754c220542d9801a](https://github.com/StoneCypher/fsl-mcp/commit/77c2224aad4f29146b5c9ded754c220542d9801a)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(server): fsl_scaffold tool - eight presets, five families; v0.5.0




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




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:23:39 AM

Commit [dd4a394ef99ac48c3c607e797f9c2ee649a0a02e](https://github.com/StoneCypher/fsl-mcp/commit/dd4a394ef99ac48c3c607e797f9c2ee649a0a02e)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: fsl_scaffold spec - eight presets across five families; fixed-arity list slots; state and action role kinds




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:18:31 AM

Commit [25fc5544000e268e6839fe528b07104ccf76e867](https://github.com/StoneCypher/fsl-mcp/commit/25fc5544000e268e6839fe528b07104ccf76e867)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: fsl_scaffold spec - registry-driven preset families for future chart types




&nbsp;

&nbsp;

## [Untagged] - Jul 18, 2026 7:16:55 AM

Commit [a1f5dd928dcffc1dc128f2b99d8cf84ed4b02223](https://github.com/StoneCypher/fsl-mcp/commit/a1f5dd928dcffc1dc128f2b99d8cf84ed4b02223)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: design spec for fsl_scaffold preset tool




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 9:59:46 PM

Commit [812f1e4603afaad0a7ebf0b7b021560b9e2255b0](https://github.com/StoneCypher/fsl-mcp/commit/812f1e4603afaad0a7ebf0b7b021560b9e2255b0)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(primer): state declarations create neither states nor edges; explicit parallel-edge remedy




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 9:55:09 PM

Commit [454e0394100da572ff862a47a672b70cb87d4e7f](https://github.com/StoneCypher/fsl-mcp/commit/454e0394100da572ff862a47a672b70cb87d4e7f)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(primer): re-verify against jssm 5.162.10; forced-edge and islands semantics, state-registration remedy
  * Forced edges now traverse via their named action and appear in actions() /
list_exit_actions(); target-name transition() still refuses them. Islands
are allowed by default; false and with_start are the restrictive modes.
Correct the flowchart remedy: only edges register states (self-loop works;
properties are styling only). Add gotchas: post-arrow misplacement yields
zero diagnostics; +N targets compile to an object pseudo-state; parallel
same-(source,target) edges are legal with distinct action labels.
  * Refs #12




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 9:59:46 PM

Commit [ce12e6f9606d3dbbb2e8378d4f0d7095b93a7e18](https://github.com/StoneCypher/fsl-mcp/commit/ce12e6f9606d3dbbb2e8378d4f0d7095b93a7e18)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(primer): state declarations create neither states nor edges; explicit parallel-edge remedy




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 9:55:09 PM

Commit [d560605968a457c7b8663b138274ddb9e8867a87](https://github.com/StoneCypher/fsl-mcp/commit/d560605968a457c7b8663b138274ddb9e8867a87)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(primer): re-verify against jssm 5.162.10; forced-edge and islands semantics, state-registration remedy
  * Forced edges now traverse via their named action and appear in actions() /
list_exit_actions(); target-name transition() still refuses them. Islands
are allowed by default; false and with_start are the restrictive modes.
Correct the flowchart remedy: only edges register states (self-loop works;
properties are styling only). Add gotchas: post-arrow misplacement yields
zero diagnostics; +N targets compile to an object pseudo-state; parallel
same-(source,target) edges are legal with distinct action labels.
  * Refs #12




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 2:47:23 PM

Commit [8245c244d159cf06b9bc12a31d952d439dafd151](https://github.com/StoneCypher/fsl-mcp/commit/8245c244d159cf06b9bc12a31d952d439dafd151)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: six tools in intro and contributor brief; note fsl_guide analyze exception




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 2:43:04 PM

Commit [590df4643b9e34cdbd1ee8f90bc3e80ec1fda0d5](https://github.com/StoneCypher/fsl-mcp/commit/590df4643b9e34cdbd1ee8f90bc3e80ec1fda0d5)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(server): cover fsl_guide language topic; correct createServer doc to six tools




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 2:36:04 PM

Commit [363995761df2d6ba3d8209e4972100bfe44debbe](https://github.com/StoneCypher/fsl-mcp/commit/363995761df2d6ba3d8209e4972100bfe44debbe)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(server): fsl_guide tool serves language and flowchart guidance




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 2:23:03 PM

Commit [4c3c3e6f41d88bbe284f54e211150bcfb2de5687](https://github.com/StoneCypher/fsl-mcp/commit/4c3c3e6f41d88bbe284f54e211150bcfb2de5687)

Author: `John Haugeland <stonecypher@gmail.com>`

  * build: pin src/prompts markdown to LF for the guide drift test




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 2:21:13 PM

Commit [c9aad94214232a69112b71e07458d9061f70693f](https://github.com/StoneCypher/fsl-mcp/commit/c9aad94214232a69112b71e07458d9061f70693f)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(guide): flowchart idiom doc and build-time guide content embedding




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 1:39:55 PM

Commit [592bd7097bdfdb4fb98f4f353552d7345b323408](https://github.com/StoneCypher/fsl-mcp/commit/592bd7097bdfdb4fb98f4f353552d7345b323408)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(plan): implementation plan for fsl_guide and flowchart idiom




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 1:24:48 PM

Commit [d9b36d2cd7673f1afd21d63a6a1898df78ad8193](https://github.com/StoneCypher/fsl-mcp/commit/d9b36d2cd7673f1afd21d63a6a1898df78ad8193)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: design spec for fsl_guide tool and flowchart idiom guidance




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 2:47:23 PM

Commit [f39ceaa659ae5114e28562b95a402eaa311c34a2](https://github.com/StoneCypher/fsl-mcp/commit/f39ceaa659ae5114e28562b95a402eaa311c34a2)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: six tools in intro and contributor brief; note fsl_guide analyze exception




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 2:43:04 PM

Commit [6185093a696683e0a310d739ebb56ebc640bcd91](https://github.com/StoneCypher/fsl-mcp/commit/6185093a696683e0a310d739ebb56ebc640bcd91)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(server): cover fsl_guide language topic; correct createServer doc to six tools




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 2:36:04 PM

Commit [60259ed752c0ecceaa751a3c7def4eabded9d989](https://github.com/StoneCypher/fsl-mcp/commit/60259ed752c0ecceaa751a3c7def4eabded9d989)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(server): fsl_guide tool serves language and flowchart guidance




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 2:23:03 PM

Commit [000149a303c35d2754da484d1f9c3f87d28caeae](https://github.com/StoneCypher/fsl-mcp/commit/000149a303c35d2754da484d1f9c3f87d28caeae)

Author: `John Haugeland <stonecypher@gmail.com>`

  * build: pin src/prompts markdown to LF for the guide drift test




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 2:21:13 PM

Commit [3cc497ba76ae81b08100af34aeabebd047964e4d](https://github.com/StoneCypher/fsl-mcp/commit/3cc497ba76ae81b08100af34aeabebd047964e4d)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(guide): flowchart idiom doc and build-time guide content embedding




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 1:39:55 PM

Commit [024ffa765bd509837ff5abac0ede40caedc0f345](https://github.com/StoneCypher/fsl-mcp/commit/024ffa765bd509837ff5abac0ede40caedc0f345)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(plan): implementation plan for fsl_guide and flowchart idiom




&nbsp;

&nbsp;

## [Untagged] - Jul 17, 2026 1:24:48 PM

Commit [2ae0832d71f7007aca46acb2af5dff3702156237](https://github.com/StoneCypher/fsl-mcp/commit/2ae0832d71f7007aca46acb2af5dff3702156237)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: design spec for fsl_guide tool and flowchart idiom guidance




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 10:32:04 AM

Commit [297ee6bb74b1ae1fef3c7a5e6e0fba4e17808878](https://github.com/StoneCypher/fsl-mcp/commit/297ee6bb74b1ae1fef3c7a5e6e0fba4e17808878)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(render): reconcile stale v1 ceilings note; document and surface RasterizationUnsupportedError




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 10:15:39 AM

Commit [35dba560dd935a3d64a3d774683ecc92c3c1cdc1](https://github.com/StoneCypher/fsl-mcp/commit/35dba560dd935a3d64a3d774683ecc92c3c1cdc1)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(render): cover option-forwarding guards and fallback failure paths




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 10:11:50 AM

Commit [d37ad2bd1d3d2910cb97ec419046d77d357ca87c](https://github.com/StoneCypher/fsl-mcp/commit/d37ad2bd1d3d2910cb97ec419046d77d357ca87c)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(render): e2e image-block round-trip and README format table




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 10:02:43 AM

Commit [5f9330344de412ef4bc0cdabf652376e53c1c59b](https://github.com/StoneCypher/fsl-mcp/commit/5f9330344de412ef4bc0cdabf652376e53c1c59b)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(server): fsl_render raster results ship as MCP image content blocks




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 9:54:01 AM

Commit [6ed4dd0c9c89c4c278e2810497ad512e5616e031](https://github.com/StoneCypher/fsl-mcp/commit/6ed4dd0c9c89c4c278e2810497ad512e5616e031)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(render): jpeg mapping via stub engine; real engine held to degrade contract




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 9:51:56 AM

Commit [9de79d86a01179cd1b071138fce54aa71e9782bb](https://github.com/StoneCypher/fsl-mcp/commit/9de79d86a01179cd1b071138fce54aa71e9782bb)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(plan): jpeg needs Canvas runtime - test via stub engine + degrade contract; allowlist read-only npm/mcp patterns




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 9:47:03 AM

Commit [6c89e16fb1a4b4bed3056711f67c77396e474c5d](https://github.com/StoneCypher/fsl-mcp/commit/6c89e16fb1a4b4bed3056711f67c77396e474c5d)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(render): real png/jpeg/gif and dot output via jssm/cli render engine




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 7:14:46 AM

Commit [ac8353840e3a507e85ad1816eabf5cbf57394e5f](https://github.com/StoneCypher/fsl-mcp/commit/ac8353840e3a507e85ad1816eabf5cbf57394e5f)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(plan): implementation plan for fsl_render image derivation




&nbsp;

&nbsp;

## [Untagged] - Jul 15, 2026 11:47:27 PM

Commit [53f9a675f1ab7e8d75dde2dfc4b34924faa56221](https://github.com/StoneCypher/fsl-mcp/commit/53f9a675f1ab7e8d75dde2dfc4b34924faa56221)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: design spec for fsl_render image derivation (png/jpeg/gif as MCP image blocks)




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 10:32:04 AM

Commit [0d954d45275b0b4f77edb3b27c6c9d27146fdc5c](https://github.com/StoneCypher/fsl-mcp/commit/0d954d45275b0b4f77edb3b27c6c9d27146fdc5c)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(render): reconcile stale v1 ceilings note; document and surface RasterizationUnsupportedError




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 10:15:39 AM

Commit [bfac9aac3bdb1392b66851d69233795aeae109e6](https://github.com/StoneCypher/fsl-mcp/commit/bfac9aac3bdb1392b66851d69233795aeae109e6)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(render): cover option-forwarding guards and fallback failure paths




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 10:11:50 AM

Commit [df93201d3693f0d5513611fddabb7323d6b50237](https://github.com/StoneCypher/fsl-mcp/commit/df93201d3693f0d5513611fddabb7323d6b50237)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(render): e2e image-block round-trip and README format table




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 10:02:43 AM

Commit [cb8d60c0c5208c405b34a43a382ed472720245a6](https://github.com/StoneCypher/fsl-mcp/commit/cb8d60c0c5208c405b34a43a382ed472720245a6)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(server): fsl_render raster results ship as MCP image content blocks




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 9:54:01 AM

Commit [d2e5a20c25ab564eaa8f6a4760ecd4afb476f65e](https://github.com/StoneCypher/fsl-mcp/commit/d2e5a20c25ab564eaa8f6a4760ecd4afb476f65e)

Author: `John Haugeland <stonecypher@gmail.com>`

  * test(render): jpeg mapping via stub engine; real engine held to degrade contract




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 9:51:56 AM

Commit [4254dbf9e7829702546eec376928f4fb34c0ac8d](https://github.com/StoneCypher/fsl-mcp/commit/4254dbf9e7829702546eec376928f4fb34c0ac8d)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(plan): jpeg needs Canvas runtime - test via stub engine + degrade contract; allowlist read-only npm/mcp patterns




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 9:47:03 AM

Commit [1a1e91ec06566d458a17bf8e0d06a3b4bbaea9c9](https://github.com/StoneCypher/fsl-mcp/commit/1a1e91ec06566d458a17bf8e0d06a3b4bbaea9c9)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(render): real png/jpeg/gif and dot output via jssm/cli render engine




&nbsp;

&nbsp;

## [Untagged] - Jul 16, 2026 7:14:46 AM

Commit [471e1702b88f1eadb34af2ffdf72849cc3c02ac4](https://github.com/StoneCypher/fsl-mcp/commit/471e1702b88f1eadb34af2ffdf72849cc3c02ac4)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs(plan): implementation plan for fsl_render image derivation




&nbsp;

&nbsp;

## [Untagged] - Jul 15, 2026 11:47:27 PM

Commit [f45a5ca539f8600fbd92eaf9ea1aed657460d96f](https://github.com/StoneCypher/fsl-mcp/commit/f45a5ca539f8600fbd92eaf9ea1aed657460d96f)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: design spec for fsl_render image derivation (png/jpeg/gif as MCP image blocks)




&nbsp;

&nbsp;

## [Untagged] - Jul 15, 2026 11:33:42 PM

Commit [22518eae72c4ed1aec167d4be3a7c9c3bfb6c546](https://github.com/StoneCypher/fsl-mcp/commit/22518eae72c4ed1aec167d4be3a7c9c3bfb6c546)

Author: `StoneCypher <StoneCypher@users.noreply.github.com>`

  * deploy: d69b2dcc3c017c01ea2edd6ab6ed603d4a609754




&nbsp;

&nbsp;

<a name="0__4__0" />

## [0.4.0] - Jul 15, 2026 11:27:25 PM

Commit [d69b2dcc3c017c01ea2edd6ab6ed603d4a609754](https://github.com/StoneCypher/fsl-mcp/commit/d69b2dcc3c017c01ea2edd6ab6ed603d4a609754)

Author: `John Haugeland <stonecypher@gmail.com>`

  * build: bump to v0.4.0 and regenerate build artifacts
  * Rolls up the post-0.3.0 mainline: primer A/B tooling (--primer-file,
case-insensitive scoring, per-trial FSL capture), the jssm 5.162.10 bump,
eval report spread/guards/timeout-sentinel, the Stryker fix, the release
pipeline repair, and the prompt artifacts (FSL LLM primer draft and
ambient-context spec). Adds the shared project permission allowlist
(.claude/settings.json). Regenerates README madlibs, CHANGELOG, dist
bundles, typedoc site, coverage reports, and bundle visualizations.




&nbsp;

&nbsp;

## [Untagged] - Jul 15, 2026 10:26:16 AM

Commit [faecb5d2d86d6ece30b38601d7a910c86590c037](https://github.com/StoneCypher/fsl-mcp/commit/faecb5d2d86d6ece30b38601d7a910c86590c037)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: prompt artifacts - FSL LLM primer draft and ambient-context spec (#15)
  * - src/prompts/fsl-llms-draft.md: the grammar-verified FSL primer (A/B-tested;
  100% validity over 70 trials; exact-names directive from failure autopsy),
  staged here ahead of its jssm handoff.
- src/prompts/ambient-context-spec.md: portable spec of the ambient-context
  injection hook (time, context gauge, git, tasks, heartbeats, affect tail)
  for reimplementation in other harnesses.




&nbsp;

&nbsp;

## [Untagged] - Jul 15, 2026 7:57:04 AM

Commit [f5730bdb2fdb7895e2366e81032fe8bbe70ff00f](https://github.com/StoneCypher/fsl-mcp/commit/f5730bdb2fdb7895e2366e81032fe8bbe70ff00f)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: prompt artifacts - FSL LLM primer draft and ambient-context spec
  * - src/prompts/fsl-llms-draft.md: the grammar-verified FSL primer (A/B-tested;
  100% validity over 70 trials; exact-names directive from failure autopsy),
  staged here ahead of its jssm handoff.
- src/prompts/ambient-context-spec.md: portable spec of the ambient-context
  injection hook (time, context gauge, git, tasks, heartbeats, affect tail)
  for reimplementation in other harnesses.




&nbsp;

&nbsp;

## [Untagged] - Jul 15, 2026 7:07:09 AM

Commit [673d7dab739b4d98bda59eb2508d3f3aa699f82f](https://github.com/StoneCypher/fsl-mcp/commit/673d7dab739b4d98bda59eb2508d3f3aa699f82f)

Author: `John Haugeland <stonecypher@gmail.com>`

  * chore: bump jssm to 5.162.10 for upstream fixes (#11)
  * Full suite green against the new version: 128/128, coverage
98.56/95.95/96.15/100 vs the 95 gate.




&nbsp;

&nbsp;

## [Untagged] - Jul 15, 2026 7:06:55 AM

Commit [add6910383c77cec167886d4ec05cfe188b12f90](https://github.com/StoneCypher/fsl-mcp/commit/add6910383c77cec167886d4ec05cfe188b12f90)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(eval): primer A/B tooling - --primer-file, case-fold scoring, per-trial capture (#8)
  * * feat(eval): --primer-file flag for A/B testing alternative primers
  * * fix(eval): case-insensitive name matching in the scorer
  * scoreCorrectness now folds case on every name comparison: states,
transition endpoints, start/terminal states, and a walk's endState.
A/B runs showed models writing On/Off for tasks specifying on/off -
structurally correct FSL that only differed in identifier case, which
should not fail a trial.
  * Because jssm's own action()/transition() lookups are case-sensitive, a
walk's actions are resolved case-insensitively against the machine's
own action labels and state names before being simulated, so a
differently-cased action label in the expectation still walks
correctly. Only the resolved copy is ever passed to jssm; nothing
jssm returns is mutated.
  * Extends score.spec.ts with a case-insensitive-matching describe block
covering states/transitions/start/terminals, a walk endState, a
capitalized action label resolved against a lowercase expected action,
and a negative control confirming a genuinely wrong name still fails.
  * * feat(eval): capture per-trial FSL and error in results
  * ScoredTrial gains fsl (the trial's extracted FSL, null when extraction
failed) and an optional error, populated from the TrialResult when
eval.ts pushes each scored row. Lets a failing or miscored trial be
inspected directly from eval-results.json instead of re-running the
sweep.
  * report.ts's aggregate/computeDeltas only read task/condition/valid/
correct, so they're unaffected; report.spec.ts's hand-built
ScoredTrial fixtures gained the now-required fsl field to keep
typechecking.




&nbsp;

&nbsp;

## [Untagged] - Jul 15, 2026 5:59:52 AM

Commit [c718dd15d224867217bb8b6130c10d46e20920a0](https://github.com/StoneCypher/fsl-mcp/commit/c718dd15d224867217bb8b6130c10d46e20920a0)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: prompt artifacts - FSL LLM primer draft, ambient-context spec, system prompt capture
  * - src/prompts/fsl-llms-draft.md: the grammar-verified FSL primer (A/B-tested;
  100% validity over 70 trials; exact-names directive from failure autopsy),
  staged here ahead of its jssm handoff.
- src/prompts/ambient-context-spec.md: portable spec of the ambient-context
  injection hook (time, context gauge, git, tasks, heartbeats, affect tail)
  for reimplementation in other harnesses.
- src/prompts/claude-code-system-prompt-2026-07-12.md: verbatim capture of a
  Claude Code session system prompt, kept as reference; contains
  machine-specific paths and a session UUID - drop from this PR if that
  bothers anyone.




&nbsp;

&nbsp;

## [Untagged] - Jul 12, 2026 8:55:55 AM

Commit [dc4219a37af83238a918aec2b08e6ce0ed00aafc](https://github.com/StoneCypher/fsl-mcp/commit/dc4219a37af83238a918aec2b08e6ce0ed00aafc)

Author: `John Haugeland <stonecypher@gmail.com>`

  * chore: bump jssm to 5.162.10 for upstream fixes
  * Full suite green against the new version: 128/128, coverage
98.56/95.95/96.15/100 vs the 95 gate.




&nbsp;

&nbsp;

## [Untagged] - Jul 12, 2026 6:36:36 AM

Commit [df036980c892936b466bc1f156cc66ae2d6c0e44](https://github.com/StoneCypher/fsl-mcp/commit/df036980c892936b466bc1f156cc66ae2d6c0e44)

Author: `John Haugeland <stonecypher@gmail.com>`

  * ci: replace archived create-release action with gh release create (#6)
  * The release job (`.github/workflows/ci.yml`) still used
`actions/create-release@v1`, which is archived upstream and emits three
deprecated `set-output` warnings on every run. It also checked out with
`actions/checkout@v4` while every other job already uses `@v5`, and ran
a `Push tags` step (`git push origin --tags`) that has always been a
no-op: checkout runs with `fetch-tags: false` and no local tag is ever
created, so there was nothing for that step to push — the tag has
always been created by `create-release` itself. That leftover step used
to mask the same-shaped 403 permissions bug this job hit before
`contents: write` was added.
  * - Bump checkout to `actions/checkout@v5` to match the rest of the
  workflow.
- Drop the now-dead `Push tags` step and the `Use Node.js 22.x` setup
  step (nothing left in the job runs node/npm since release creation no
  longer needs `actions/setup-node`'s npm registry auth). Left a comment
  showing how to restore setup-node ahead of the commented-out
  `Publish to npm` step if that's ever revived.
- Replace `actions/create-release@v1` with a single step that shells out
  to the preinstalled `gh` CLI: `gh release create "$TAG" --title "$TAG"
  --notes-file CHANGELOG.md`. Guarded with `gh release view "$TAG"`
  first so a re-run of a main push without a version bump skips
  gracefully instead of failing on a duplicate release/tag.
  * `permissions: contents: write` and the job's `if:`/`needs:` are
unchanged. No other job was touched.




&nbsp;

&nbsp;

## [Untagged] - Jul 12, 2026 6:36:19 AM

Commit [a15907563e0c61b2ca3350c40e58fd18b9924c4f](https://github.com/StoneCypher/fsl-mcp/commit/a15907563e0c61b2ca3350c40e58fd18b9924c4f)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(eval): spread in report, conditions guard, typed timeout sentinel (#7)
  * * feat(eval): add per-condition stderr spread to report
  * The design spec calls for spread across trials so noise is visible
against real regressions. validityRate/correctnessRate are Bernoulli
means over n trials, so the honest spread figure is the standard
error sqrt(p*(1-p)/n) per metric -- not a sample stddev, which does
not apply to a 0/1 outcome.
  * - types.ts: add validityStderr/correctnessStderr to ConditionSummary.
- report.ts: export a pure stderr(p, n) helper, compute it in
  aggregate(), and render each rate as "50.0% ±15.8%" in renderReport.
- report.spec.ts: dedicated stderr() unit tests plus hand-derived
  expected values (sqrt(2)/4, sqrt(0.025), etc.) for every updated
  fixture -- never pasted from running the code.
  * * fix(eval): guard --conditions against unrecognized tokens
  * Previously an unmatched token (e.g. a typo like 'tool' for 'tools')
was silently filtered out, which could shrink --conditions bare,tool
down to just ['bare'] -- or empty the sweep entirely -- with no
indication anything was wrong.
  * parseConditionsFlag now checks every comma-separated token against
the known Condition set and, on the first miss, prints the bad token
and the valid set to stderr and exits(1), mirroring the existing
parsePositiveIntFlag guard. The check now runs before captureReference
so a bad --conditions value fails before any subprocess is spawned.
  * Also documents that --timeout is milliseconds in main's DocBlock, so
it isn't mistaken for seconds.
  * * fix(eval): detect trial timeouts by type, not by message text
  * withTimeout previously rejected with a plain Error whose message
happened to start with 'timeout after', and runTrial detected a
timeout by checking that string prefix. Introduce TrialTimeoutError,
a dedicated Error subclass, thrown from the timeout race and detected
via instanceof in runTrial. The message text and runTrial's public
contract are unchanged: a timeout still yields
{ fsl: null, error: 'timeout after Ns' }.
  * Also adds a runner.spec.ts test proving the AbortSignal passed to an
injected spawn actually fires (signal.aborted === true) once runTrial
resolves with a timeout, plus a small direct test of
TrialTimeoutError's message/name.




&nbsp;

&nbsp;

<a name="0__3__0" />

## [0.3.0] - Jul 11, 2026 2:59:42 PM

Commit [8b6f107ecef6ced6431184d32fb6db96b6b6a813](https://github.com/StoneCypher/fsl-mcp/commit/8b6f107ecef6ced6431184d32fb6db96b6b6a813)

Author: `John Haugeland <stonecypher@gmail.com>`

  * ci: grant the release job contents write permission (#5)
  * The workflow-level GITHUB_TOKEN is read-only, so the release job's
'Push tags' step failed with 403 (Write access to repository not
granted) the first time the job actually ran (post-#4 push). Give the
release job the same contents: write grant the gh-pages deploy job
already carries, so tag push and release creation can succeed.




&nbsp;

&nbsp;

## [Untagged] - Jul 11, 2026 2:31:54 PM

Commit [cd19b0ae026326d17101fc10f300bf0b31e745cc](https://github.com/StoneCypher/fsl-mcp/commit/cd19b0ae026326d17101fc10f300bf0b31e745cc)

Author: `John Haugeland <stonecypher@gmail.com>`

  * ci: grant the release job contents write permission
  * The workflow-level GITHUB_TOKEN is read-only, so the release job's
'Push tags' step failed with 403 (Write access to repository not
granted) the first time the job actually ran (post-#4 push). Give the
release job the same contents: write grant the gh-pages deploy job
already carries, so tag push and release creation can succeed.




&nbsp;

&nbsp;

## [Untagged] - Jul 11, 2026 9:49:54 AM

Commit [2ee966150a737a897136ec1e6c087f3436134c14](https://github.com/StoneCypher/fsl-mcp/commit/2ee966150a737a897136ec1e6c087f3436134c14)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(stryker): run the real spec suite so mutation testing executes (#4)
  * vitest-mutat.config.ts included only src/**/*.mutat.ts, and v1 deleted the
last such file, so Stryker's vitest runner had zero tests to execute and
failed with ConfigError: No tests were executed. Include src/**/*.spec.ts
too so the real suite runs under mutation testing.
  * stryker.config.json's ignorePatterns excluded **/*.spec.* (and *.stoch.*)
from the sandbox, which would have kept the specs out of reach of the
vitest runner even after the include fix. Drop those two entries; the
mutate array already excludes spec/stoch/mutat files from being mutated,
so nothing gets mutated that shouldn't be. *.stoch.* files now reach the
sandbox but aren't in vitest-mutat's test.include, so they are present but
inert - confirmed harmless via a full run.
  * Add coverage-mutat/ to .gitignore: it's vitest-mutat's own coverage
output directory, and the existing bare "coverage" entry doesn't match
this differently-named directory.
  * Verified: subset run (--mutate src/ts/tools/validate.ts) scores 100%;
full run scores 859 mutants in 5m58s, exit 0, with reports/mutation.html
produced. Default vitest suite and eslint on the changed config file both
stay green.




&nbsp;

&nbsp;

## [Untagged] - Jul 10, 2026 10:24:17 PM

Commit [df3eb34599b3312e35723ae6bdcc75b80b04d5ea](https://github.com/StoneCypher/fsl-mcp/commit/df3eb34599b3312e35723ae6bdcc75b80b04d5ea)

Author: `StoneCypher <StoneCypher@users.noreply.github.com>`

  * deploy: 3e2d895118d039cfadff019dc6f22a4ebb41da99




&nbsp;

&nbsp;

## [Untagged] - Jul 10, 2026 10:21:18 PM

Commit [3e2d895118d039cfadff019dc6f22a4ebb41da99](https://github.com/StoneCypher/fsl-mcp/commit/3e2d895118d039cfadff019dc6f22a4ebb41da99)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(eval): subscription-based eval harness for FSL authoring (#3)
  * * docs: design spec for the subscription-based fsl-mcp eval harness
  * A repeatable regression metric measuring whether fsl-mcp (and a shipped
FSL reference) improves FSL authoring vs authoring blind. Runs on the
Claude Code subscription via headless 'claude -p' (no API key); 4-way
conditions (bare/reference/tools/reference+tools); jssm as the scoring
oracle; configurable model (default opus), tasks, and trials.
  * * docs: implementation plan for the fsl-mcp eval harness
  * Seven bite-sized TDD tasks under src/ts/eval/: shared types, jssm-backed
scoring, version-locked reference capture, condition->claude-p invocation
builder, injectable-spawn trial runner, aggregation/report, and the task
corpus + CLI orchestrator (npm run eval). Subscription-only via claude -p;
no API.
  * * feat(eval): shared types for the eval harness
  * * feat(eval): jssm-backed scoring (extract, validity, correctness)
  * * feat(eval): capture version-locked FSL reference primer
  * * test(eval): cover empty-stdout branch in captureReference
  * * feat(eval): condition -> claude -p invocation builder
  * * feat(eval): claude -p trial runner (injectable spawn)
  * * feat(eval): aggregation, deltas, and report rendering
  * * test(eval): cover renderReport and no-baseline deltas
  * - Add comprehensive tests for renderReport with synthetic data:
  - Test percentage formatting (e.g., 0.5 -> 50.0%)
  - Test positive and negative delta sign rendering
  - Test header and data row rendering
  - Test column alignment with single-digit n values
- Add test for computeDeltas returning [] when no bare baseline exists
- Fix one-character column drift in renderReport header by adding space before n label
  * * feat(eval): task corpus, CLI orchestrator, and npm run eval
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
  * * test(eval): close recorded review gaps and extend scoreCorrectness coverage
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
  * * test: raise coverage gate to 95%
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
  * * fix(eval): windows-safe primer spawn and per-trial timeout
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
  * * docs: add fence languages and fix emphasis in eval spec/plan
  * * chore: untrack per-machine .claude/settings.local.json
  * * build: bump to v0.3.0 and regenerate build artifacts
  * Minor bump for the new eval harness (npm run eval). Regenerates README
madlibs, CHANGELOG, dist bundles, typedoc site, coverage reports, and
bundle visualizations at the new version.




&nbsp;

&nbsp;

## [Untagged] - Jul 10, 2026 10:16:12 PM

Commit [a7075aeaa01f371d6519cba3e150fb137bf1d812](https://github.com/StoneCypher/fsl-mcp/commit/a7075aeaa01f371d6519cba3e150fb137bf1d812)

Author: `John Haugeland <stonecypher@gmail.com>`

  * build: bump to v0.3.0 and regenerate build artifacts
  * Minor bump for the new eval harness (npm run eval). Regenerates README
madlibs, CHANGELOG, dist bundles, typedoc site, coverage reports, and
bundle visualizations at the new version.




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