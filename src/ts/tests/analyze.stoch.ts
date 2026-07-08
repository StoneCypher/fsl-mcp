import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { offsetToLineCol } from '../analyze.js';

describe('offsetToLineCol properties', () => {
  it('always returns line>=1 and col>=1 for any string and integer offset', () => {
    fc.assert(fc.property(fc.string(), fc.integer(), (s, off) => {
      const { line, col } = offsetToLineCol(s, off);
      return line >= 1 && col >= 1;
    }));
  });

  it('line never exceeds newline-count + 1', () => {
    fc.assert(fc.property(fc.string(), fc.nat(), (s, off) => {
      const newlines = (s.match(/\n/g) ?? []).length;
      return offsetToLineCol(s, off).line <= newlines + 1;
    }));
  });
});
