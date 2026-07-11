import { describe, it, expect } from 'vitest';
import { captureReference } from '../reference.js';

describe('captureReference', () => {
  it('returns the primer text when the CLI succeeds', () => {
    const fakeSpawn = () => ({ stdout: 'FSL v5 primer text', status: 0 });
    expect(captureReference(fakeSpawn)).toBe('FSL v5 primer text');
  });
  it('returns null when the CLI fails', () => {
    const fakeSpawn = () => ({ stdout: '', status: 1 });
    expect(captureReference(fakeSpawn)).toBeNull();
  });
  it('returns null when the CLI throws (not installed)', () => {
    const fakeSpawn = () => { throw new Error('ENOENT'); };
    expect(captureReference(fakeSpawn)).toBeNull();
  });
  it('returns null when the CLI succeeds but output is empty/whitespace', () => {
    const fakeSpawn = () => ({ stdout: '  ', status: 0 });
    expect(captureReference(fakeSpawn)).toBeNull();
  });
});
