/** A cache hint for a cacheable MCP result (protocol revision 2026-07-28). */
export interface ToolsCacheHint {
  /** Milliseconds the client may treat the response as fresh; 0 means immediately stale. */
  ttlMs: number;
  /** `'public'` allows shared intermediaries to cache; `'private'` confines it to one authorization context. */
  cacheScope: 'public' | 'private';
}

/** Default freshness window for `tools/list`: one hour. */
const DEFAULT_TTL_MS = 3_600_000;

/**
 * Resolve the cache hint applied to `tools/list` results.
 *
 * fsl-mcp's tool list is compiled in and cannot change while the process runs,
 * so it is safely cacheable for a long window, and it carries no
 * authorization-specific or user-specific data, so it is `'public'`. The TTL is
 * overridable via `FSL_MCP_TOOLS_TTL_MS` so a development loop can force a
 * refetch after a rebuild; set it to `0` to mark every response immediately
 * stale.
 *
 * An unparseable, fractional, or negative override is ignored with a warning
 * rather than propagated, because the SDK throws a `RangeError` at
 * server-construction time for an invalid hint - which would take the whole
 * server down at startup and surface to the user as a broken server.
 *
 * @param env - the environment to read `FSL_MCP_TOOLS_TTL_MS` from
 * @returns the hint to pass as the server's `tools/list` cache hint
 *
 * @example
 *   toolsCacheHint({});                                 // { ttlMs: 3600000, cacheScope: 'public' }
 *   toolsCacheHint({ FSL_MCP_TOOLS_TTL_MS: '0' });      // { ttlMs: 0, cacheScope: 'public' }
 *   toolsCacheHint({ FSL_MCP_TOOLS_TTL_MS: 'banana' }); // default, plus a stderr warning
 *
 * @see {@link https://modelcontextprotocol.io/specification/2026-07-28/changelog | SEP-2549}
 */
export function toolsCacheHint(env: NodeJS.ProcessEnv): ToolsCacheHint {
  const raw = env['FSL_MCP_TOOLS_TTL_MS'];
  if (raw === undefined) { return { ttlMs: DEFAULT_TTL_MS, cacheScope: 'public' }; }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    console.error(`fsl-mcp: ignoring invalid FSL_MCP_TOOLS_TTL_MS=${raw}; using ${String(DEFAULT_TTL_MS)}`);
    return { ttlMs: DEFAULT_TTL_MS, cacheScope: 'public' };
  }
  return { ttlMs: parsed, cacheScope: 'public' };
}
