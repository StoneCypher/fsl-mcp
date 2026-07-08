import { describe, it, expect } from 'vitest';
import { offsetToLineCol, analyze, hasErrors } from '../analyze.js';

describe('offsetToLineCol', () => {
  it('maps offset 0 to line 1, col 1', () => {
    expect(offsetToLineCol('abc', 0)).toEqual({ line: 1, col: 1 });
  });
  it('counts newlines and resets the column', () => {
    // "ab\ncd", offset 4 is the 'd' -> line 2, col 2
    expect(offsetToLineCol('ab\ncd', 4)).toEqual({ line: 2, col: 2 });
  });
  it('clamps out-of-range offsets to the string bounds', () => {
    expect(offsetToLineCol('ab', 99)).toEqual({ line: 1, col: 3 });
    expect(offsetToLineCol('ab', -5)).toEqual({ line: 1, col: 1 });
  });
});

describe('analyze / hasErrors', () => {
  it('returns [] and hasErrors=false for valid FSL', () => {
    const diags = analyze('a -> b -> c;');
    expect(diags).toEqual([]);
    expect(hasErrors(diags)).toBe(false);
  });
  it('returns line/col-bearing error diagnostics for invalid FSL', () => {
    const diags = analyze('a -> ;');
    expect(hasErrors(diags)).toBe(true);
    const err = diags.find(d => d.severity === 'error')!;
    expect(err.line).toBeGreaterThanOrEqual(1);
    expect(err.col).toBeGreaterThanOrEqual(1);
    expect(err.message).toBeTypeOf('string');
  });
});
