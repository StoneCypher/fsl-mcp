# fsl-mcp: migration to MCP protocol revision 2026-07-28 (SDK v2)

**Date:** 2026-07-29
**Branch:** `refactor_26-07-29_mcp-2026-07-28`
**Target version:** 0.5.1 -> 0.6.0

## 1. Context

MCP protocol revision `2026-07-28` went final on 2026-07-28. It is the largest
change to the protocol since launch: sessions are removed, the
`initialize`/`notifications/initialized` handshake is gone, and every request
now carries its own protocol version, client capabilities, and identity in
`_meta`. The TypeScript SDK ships this as a new package family
(`@modelcontextprotocol/server`, `/client`, `/core`) at `2.0.0`, published
2026-07-27, rather than as a major bump of `@modelcontextprotocol/sdk`.

fsl-mcp is well positioned for this. It is a stdio server whose seven tools are
all pure request/response over a `source` argument, holding no state between
calls. It uses none of the features deprecated in this revision (Roots,
Sampling, Logging). The migration is therefore mechanical rather than
architectural.

## 2. Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Dual-era**, not modern-only | Per the spec's compatibility matrix, a legacy client against a modern-only server *fails*. Today's Claude Code and Claude Desktop are legacy clients. `serveStdio` serves both eras by default, so this costs nothing. |
| D2 | **Preserve `startServer(transport?)`** | `ServeStdioOptions.transport` is supported (verified, section 3), so the public signature survives and every test path still runs through `serveStdio`, keeping the era-handling code under test. |
| D3 | **Hand-migrate**, no codemod | The affected surface is three imports, seven `registerTool` calls, and one function. A repo-wide codemod across the build scripts, Stryker, and typedoc config is more blast radius than the edit warrants. |
| D4 | **Generate the server version** | `server.ts` hardcodes `'0.1.0'` against a package at `0.5.1`. Under this revision that string is stamped into every response's `_meta`. |

## 3. Verified facts

Established by installing `@modelcontextprotocol/server@2.0.0` and
`@modelcontextprotocol/client@2.0.0` into a throwaway sandbox and reading the
shipped declarations. These are quoted, not inferred.

```ts
// @modelcontextprotocol/server/stdio
declare function serveStdio(factory: McpServerFactory, options?: ServeStdioOptions): StdioServerHandle;

interface ServeStdioOptions {
  legacy?: 'serve' | 'reject';
  transport?: Transport;
  onerror?: (error: Error) => void;
  maxSubscriptions?: number;
}

interface StdioServerHandle { close(): Promise<void>; }
```

```ts
// re-exported from BOTH @modelcontextprotocol/client and /server
declare class InMemoryTransport implements Transport {
  static createLinkedPair(): [InMemoryTransport, InMemoryTransport];
  start(): Promise<void>;
  close(): Promise<void>;
}
```

```ts
/** The cache scopes defined for cacheable results (SEP-2549). */
type CacheScope = 'public' | 'private';

// on ServerOptions:
cacheHints?: Partial<Record<CacheableResultMethod, CacheHint>>;

// on registerResource config:
cacheHint?: CacheHint;
```

Three behaviours documented in the SDK's own declarations that shape this design:

1. Cache hints default to `{ ttlMs: 0, cacheScope: 'private' }`. Caching is
   **opt in**, never opt out.
2. *"Invalid values throw a `RangeError` at construction time."*
3. *"Responses to 2025-era requests are never affected."* The configured hint
   reaches the wire codec on a symbol-keyed property, which cannot serialize to
   JSON, so a legacy response structurally cannot grow a `ttlMs` field.

Note: the SDK migration guide's example writes `cacheScope: 'global'`. That
value does not exist. Trust the declarations, not the guide.

## 4. Design

### 4.1 Dependencies

| Change | Detail |
|---|---|
| Remove | `@modelcontextprotocol/sdk` |
| Add (runtime) | `@modelcontextprotocol/server@^2.0.0` |
| Add (dev) | `@modelcontextprotocol/client@^2.0.0`, used only by the e2e specs |
| Add | `"engines": { "node": ">=20" }`, which v2 requires and `package.json` does not currently declare at all |
| Unchanged | `zod@^4.3.6` already satisfies v2's `^4.2.0` |

TypeScript stays at `^5.9.3`. v2's `.d.mts` files reference `Buffer`, and from
TS 6.0 `@types/*` is no longer auto-included, so `"types"` must name `node`.

**Correction (2026-07-29, from the Task 1 review):** an earlier draft of this
section claimed that requirement "does not bite yet" and implied `types` was
unset. It is already satisfied - `tsconfig.json` has carried
`"types": ["vitest/globals", "node"]` all along. The practical consequence is
inverted: nothing needs adding, but `node` must never be dropped from that
array. The `tsconfig.json` comment added in Task 1 documents the constraint,
though its wording still reflects the original mistaken framing.

### 4.2 Server module (`src/ts/server.ts`)

```typescript
import { McpServer }  from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import type { Transport } from '@modelcontextprotocol/server';
```

`createServer()` keeps its exact contract: build and return a configured,
unconnected `McpServer`. It gains a `cacheHints` entry (section 4.4) and a
generated version string (section 4.5).

`startServer` keeps its parameter and changes its return type from
`Promise<void>` to the SDK's `StdioServerHandle`:

```typescript
export function startServer(transport?: Transport): StdioServerHandle {
  const onerror = (e: Error): void => { console.error(e); };
  return serveStdio(
    () => createServer(),
    transport === undefined ? { onerror } : { transport, onerror },
  );
}
```

The conditional spread rather than `{ transport }` is required by
`exactOptionalPropertyTypes`.

**As-built correction (2026-07-30, from the Task 4 review).** The `onerror`
wiring above was NOT in this spec's original draft, and its absence was a real
defect rather than an omission of detail. `serveStdio` routes every out-of-band
error through `options.onerror`; with no handler, `reportError` is
`try { options.onerror?.(error); } catch {}` and roughly eighteen call sites
drop their errors silently. `wire.start()`'s rejection is swallowed too, so a
startup failure would have produced no output at all. The old `bin.ts` had
`startServer().catch(e => { console.error(e); process.exit(1); })`; this spec
removed that and replaced it with nothing. It must be wired on BOTH arms —
reporting only in production and swallowing in tests is worse than either.

`stderr` only: `stdout` is the protocol channel.

**Known residual, accepted.** This restores visibility but not failure
signalling. A `wire.start()` rejection still leaves `bin.ts` at exit 0 with a
live process, because the SDK exposes one `onerror` shared between fatal
startup failure and routine per-message noise, with no phase tag and no
distinguishable subtype, and `StdioServerHandle` exposes only `close()`. On
`bin.ts`'s real path this is unreachable — the SDK's own `StdioServerTransport`
`start()` throws only on its double-start guard. The honest fix is upstream: a
`ready: Promise<void>` on the handle, or a distinguishable startup-failure type.

This is still a change to a documented public export (`src/ts/index.ts:20`), so
it needs: a rewritten DocBlock explaining that `serveStdio` now owns transport
construction and that the factory form is what provides dual-era support; a
`@returns` describing the handle; and an updated example. `src/ts/bin.ts`
becomes a `close()` on `SIGINT` rather than a `catch` on a promise.

### 4.3 Tool registration

v2 requires `inputSchema` to be a wrapped `z.object({...})` rather than a raw
shape. Seven mechanical edits, no handler bodies touched:

```typescript
// before
inputSchema: { source: z.string() }
// after
inputSchema: z.object({ source: z.string() })
```

`jsonResult` and `renderResult` are unaffected. `resultType: "complete"` is
stamped by the SDK's wire codec, not by fsl-mcp.

### 4.4 Cache hints

`tools/list` is the entire cacheable surface of this server: fsl-mcp exposes no
resources and no prompts, and `tools/call` results are not cacheable under the
spec at all. The tool list is a compile-time constant, so a long TTL is honest.
`cacheScope` is `'public'` because fsl-mcp has no authorization and returns no
user-specific data.

A client can hold a cached list across a server restart, which is a real
nuisance while iterating on tool definitions, so the TTL is runtime-overridable.
Because an invalid value would throw a `RangeError` during server construction
and present to the user as "fsl-mcp is broken", the parse validates and falls
back loudly on stderr:

```typescript
/**
 * Resolve the cache hint applied to `tools/list` results.
 *
 * fsl-mcp's tool list is compiled in and cannot change while the process runs,
 * so it is safely cacheable for a long window. The TTL is overridable via
 * `FSL_MCP_TOOLS_TTL_MS` so a development loop can force a refetch after a
 * rebuild; set it to `0` to mark every response immediately stale.
 *
 * An unparseable or negative override is ignored rather than propagated,
 * because the SDK throws a `RangeError` at server-construction time for an
 * invalid hint, which would take the whole server down at startup.
 *
 * @param env - the environment to read the override from
 * @returns the hint to pass as `cacheHints['tools/list']`
 *
 * @example
 *   toolsCacheHint({});                                 // 1 hour, public
 *   toolsCacheHint({ FSL_MCP_TOOLS_TTL_MS: '0' });      // never cache
 *   toolsCacheHint({ FSL_MCP_TOOLS_TTL_MS: 'banana' }); // 1 hour + stderr warning
 */
export function toolsCacheHint(env: NodeJS.ProcessEnv): ToolsCacheHint {
  const DEFAULT_TTL_MS = 3_600_000;
  const raw = env['FSL_MCP_TOOLS_TTL_MS'];
  if (raw === undefined) { return { ttlMs: DEFAULT_TTL_MS, cacheScope: 'public' }; }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    console.error(`fsl-mcp: ignoring invalid FSL_MCP_TOOLS_TTL_MS=${raw}; using ${DEFAULT_TTL_MS}`);
    return { ttlMs: DEFAULT_TTL_MS, cacheScope: 'public' };
  }
  return { ttlMs: parsed, cacheScope: 'public' };
}
```

Taking `env` as a parameter rather than reading `process.env` keeps it pure and
lets the unit spec reach every branch without mutating global state. `stderr` is
safe here because only `stdout` is reserved for the protocol channel.

**As-built correction.** The shipped code returns its own `ToolsCacheHint`
interface rather than importing the SDK's `CacheHint`, which keeps this module
dependency-free and unit-testable in isolation. It assigns cleanly because the
SDK's `CacheHint` declares both fields optional, so required fields satisfy it
under `exactOptionalPropertyTypes`. The spec's original `CacheHint` return type
was the weaker choice.

**Standing rule.** Any future `resources/read` registration gets
`cacheHint: { ttlMs: 0, ... }` unless the resource is provably immutable.
Resources are the only place where per-request state could be cached, and the
SDK's `registerResource(..., { cacheHint })` is where that decision is made.

### 4.5 Server identity

`server.ts` currently passes `version: '0.1.0'` while the package is at `0.5.1`.
Under this revision the SDK stamps that value into
`_meta['io.modelcontextprotocol/serverInfo']` on every result, so the drift is
now told constantly instead of once at handshake.

Fix it the way this project already handles generated content: a new
`src/build_js/generate_version.js` emits `src/ts/version.ts` from
`package.json`, invoked from the `typescript` npm script alongside the existing
`generate_guide_content.js` and `generate_scaffold_content.js` calls.
`createServer()` imports the constant. This removes the whole class of drift
rather than the single instance.

## 5. Testing

No fake tests. Every test below exercises real protocol behaviour.

**Retargeted, otherwise unchanged.** The six in-memory specs in
`src/ts/e2e/server.spec.ts` keep their structure. `InMemoryTransport` moves to
`@modelcontextprotocol/client` and `createLinkedPair()` is unchanged, so the
edit is the import line plus routing the server side through
`startServer(serverTx)` instead of `server.connect(serverTx)`.

**Rewritten.** The existing `startServer` spec writes a bare `tools/list` with
no `_meta` and no prior `initialize`. That request is era-ambiguous under this
revision and must become explicit. It is replaced by two specs over a real
`StdioServerTransport` on injected `PassThrough` streams:

- a **modern** request carrying
  `_meta['io.modelcontextprotocol/protocolVersion'] = '2026-07-28'`, asserting
  the seven tool names and a `resultType` of `complete`
- a **legacy** request performing the `initialize` handshake first, then
  `tools/list`, asserting the same seven names

Together these are the only honest proof that D1 holds. A single-era test would
pass while dual-era was silently broken.

**New unit spec** for `toolsCacheHint`, covering: absent override, valid
override, `0`, non-numeric, and negative. Five cases, one per branch.

**New e2e spec** asserting `cacheHints` reaches the wire. This one must read the
**raw JSON-RPC** off the `PassThrough` stream rather than going through the SDK
`Client`, because a parsed client result is not guaranteed to surface the
envelope fields. A modern `tools/list` response carries `ttlMs` and
`cacheScope: 'public'`; a legacy `tools/list` response carries neither. The
legacy half is what pins the SDK's "responses to 2025-era requests are never
affected" guarantee.

**Added mid-flight, and load-bearing: a real-subprocess spec.** This section's
original draft had no equivalent, and the gap was structural. `startServer`'s
omitted-transport arm — the exact call `bin.ts` makes in production — cannot be
exercised in-process without binding `serveStdio` to the test runner's own
stdin/stdout, so it carries a `/* v8 ignore */`. `bin.ts` is itself
coverage-excluded. Nothing tested the shipped entry path at all.

`src/ts/e2e/spawn.spec.ts` closes it by spawning `src/ts/bin.ts` as a real child
process through `jiti`, asserting `tools/list` over real pipes, and asserting
exit 0 on stdin EOF. It `JSON.parse`s **every** stdout line, which is the
stdout-purity guard: `stdout` is the protocol channel, so one stray
`console.log` must fail the suite.

It targets `src/ts/bin.ts`, NOT `dist/bin.mjs`, because `run_build.js` runs each
stage's scripts concurrently — the test run races `tsc`, and `dist/bin.mjs` is
not produced until a later stage. A spec pointed at `dist/` would find nothing,
or silently exercise a stale binary from a previous build and report a false
pass. It therefore does not cover rollup bundling or the shebang; that gap is
stated rather than papered over.

**This spec is the condition on which the `v8 ignore` was accepted.** Removing
it silently reopens an untested production entry path.

The 100% coverage gate on all four metrics stays enforced, unchanged.

## 6. Non-goals

Explicitly out of scope, to be revisited only if a concrete need appears:
`legacy: 'reject'`; Multi Round-Trip Requests and `inputRequired`; the Tasks
extension; MCP Apps; the Streamable HTTP transport; `subscriptions/listen`;
adding resources or prompts. None of the seven tools need any of them.

`src/ts/analyze.ts`, everything under `src/ts/tools/`, and the analyze-first
architecture are untouched by this work.

## 7. Risks and open items

| Risk | Handling |
|---|---|
| Build toolchain compatibility with v2's dual ESM/CJS output (`rollup`, `attw`, `terser`, Stryker, typedoc) | **RESOLVED.** Full build green, `attw` clean on all four resolution modes. |
| Exact key for the `tools/list` entry of `CacheableResultMethod` | **RESOLVED.** `'tools/list'` is a literal member of the SDK's closed `CACHEABLE_RESULT_METHODS` union, so it could not have been silently accepted as excess. No cast needed. |
| Export path of the `Transport` type in v2 | **RESOLVED.** `Transport` is on the main entry only and is NOT re-exported from `./stdio`; `serveStdio`, `StdioServerTransport`, and `StdioServerHandle` are `./stdio`-only. |
| `z.object()` requirement for `inputSchema` is taken from the migration guide, not read from declarations | **RESOLVED.** Correct as written; all seven wraps compile. |
| `@modelcontextprotocol/sdk@1` and the v2 packages briefly coexisting | **RESOLVED.** Coexisted cleanly; v1 removed in the same commit as the last import change. |

### 7.1 What this spec missed — recorded so the next one does better

The risk table above was the wrong shape. Every risk it named was resolved
without incident; every real problem came from somewhere it did not look.

- **The release artifact.** `dist/` is tracked in this repo and `package.json`'s
  `bin` points into it, but no task's `git add` named it and no test touches it
  (`vitest.config.ts` excludes `dist/**`). The committed bundles stayed
  pre-migration v1 output through the entire branch — a published `0.6.0` would
  have died at `ERR_MODULE_NOT_FOUND`. Only a whole-branch review could see it.
- **`rollup.config.js`.** Its `external` array still named the v1 package, so
  the SDK was inlined: `dist/bin.mjs` grew 58,852 → 948,393 bytes. A build
  config is part of a dependency migration; this spec never mentioned it.
- **Reserved `_meta` keys.** The research behind this spec recorded that modern
  requests carry `protocolVersion` and `clientCapabilities`, but not that BOTH
  are required — a request missing `clientCapabilities` gets `InvalidParams`,
  not a warning. Prose that read as authoritative, wrong in a way only an
  executed request could expose.

The lesson for the next migration spec: enumerate the *artifacts* a change
touches, not only the source files, and treat "no test covers this" as a risk
in its own right rather than an absence of one.

## 8. Release

Single PR from `refactor_26-07-29_mcp-2026-07-28`. Version bump 0.5.1 -> 0.6.0
(breaking change to a public export on a 0.x line), with a build so the README
madlibs regenerate. `base_README.md` gets a note that fsl-mcp speaks protocol
revisions `2026-07-28` and `2025-11-25`, since that is now user-visible
behaviour.
