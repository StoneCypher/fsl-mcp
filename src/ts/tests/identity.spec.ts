import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('package identity', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

  it('is named fsl-mcp with a semver version', () => {
    expect(pkg.name).toBe('fsl-mcp');
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('carries no leftover template name in package.json', () => {
    expect(JSON.stringify(pkg)).not.toContain('react_ts_with_claude_gh_template');
  });

  it('carries no leftover template name in rollup.config.js', () => {
    expect(readFileSync('rollup.config.js', 'utf8')).not.toContain('react_ts_with_claude_gh_template');
  });
});
