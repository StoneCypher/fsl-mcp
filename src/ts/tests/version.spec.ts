import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FSL_MCP_VERSION } from '../version.js';

describe('FSL_MCP_VERSION', () => {
  it('equals the version in package.json', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    expect(FSL_MCP_VERSION).toBe(pkg.version);
  });

  it('is a semver triple', () => {
    expect(FSL_MCP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
