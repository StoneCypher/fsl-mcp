import { describe, it, expect, vi, afterEach } from 'vitest';
import { toolsCacheHint } from '../cache-hints.js';

const HOUR_MS = 3_600_000;

afterEach(() => { vi.restoreAllMocks(); });

describe('toolsCacheHint', () => {
  it('defaults to one hour, public, when no override is set', () => {
    expect(toolsCacheHint({})).toEqual({ ttlMs: HOUR_MS, cacheScope: 'public' });
  });

  it('honours a valid override', () => {
    expect(toolsCacheHint({ FSL_MCP_TOOLS_TTL_MS: '5000' }))
      .toEqual({ ttlMs: 5000, cacheScope: 'public' });
  });

  it('honours zero, the spec value for immediately stale', () => {
    expect(toolsCacheHint({ FSL_MCP_TOOLS_TTL_MS: '0' }))
      .toEqual({ ttlMs: 0, cacheScope: 'public' });
  });

  it('ignores a non-numeric override and warns on stderr', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(toolsCacheHint({ FSL_MCP_TOOLS_TTL_MS: 'banana' }))
      .toEqual({ ttlMs: HOUR_MS, cacheScope: 'public' });
    expect(err).toHaveBeenCalledOnce();
    expect(err.mock.calls[0]?.[0]).toContain('banana');
  });

  it('ignores a negative override and warns on stderr', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(toolsCacheHint({ FSL_MCP_TOOLS_TTL_MS: '-1' }))
      .toEqual({ ttlMs: HOUR_MS, cacheScope: 'public' });
    expect(err).toHaveBeenCalledOnce();
  });

  it('ignores a fractional override, since ttlMs is a whole-millisecond count', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(toolsCacheHint({ FSL_MCP_TOOLS_TTL_MS: '1.5' }))
      .toEqual({ ttlMs: HOUR_MS, cacheScope: 'public' });
    expect(err).toHaveBeenCalledOnce();
  });
});
