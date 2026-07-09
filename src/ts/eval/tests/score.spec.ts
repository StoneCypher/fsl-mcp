import { describe, it, expect } from 'vitest';
import { extractFsl, scoreValidity, scoreCorrectness } from '../score.js';

describe('extractFsl', () => {
  it('pulls the fenced fsl block out of surrounding prose', () => {
    const text = 'Here is the machine:\n\n```fsl\na -> b -> c;\n```\n\nDone.';
    expect(extractFsl(text)).toBe('a -> b -> c;');
  });
  it('returns null when there is no fsl block', () => {
    expect(extractFsl('no code here')).toBeNull();
  });
  it('accepts a bare ``` fence with no language tag as a fallback', () => {
    expect(extractFsl('```\na -> b;\n```')).toBe('a -> b;');
  });
});

describe('scoreValidity', () => {
  it('is true for valid FSL', () => {
    expect(scoreValidity('a -> b -> c;')).toBe(true);
  });
  it('is false for invalid FSL', () => {
    expect(scoreValidity('a -> ;')).toBe(false);
  });
});

describe('scoreCorrectness', () => {
  it('passes when states and transitions are present', () => {
    expect(scoreCorrectness('a -> b -> c;', {
      states: ['a', 'b', 'c'],
      transitions: [['a', 'b'], ['b', 'c']],
    })).toBe(true);
  });
  it('fails when an expected transition is missing', () => {
    expect(scoreCorrectness('a -> b;', { transitions: [['a', 'c']] })).toBe(false);
  });
  it('checks start and terminal states', () => {
    expect(scoreCorrectness('a -> b -> c;', { start: ['a'], terminals: ['c'] })).toBe(true);
    expect(scoreCorrectness('a -> b -> c;', { terminals: ['a'] })).toBe(false);
  });
  it('checks a behavioral walk end state', () => {
    expect(scoreCorrectness('a -> b -> c;', { walks: [{ actions: ['b', 'c'], endState: 'c' }] })).toBe(true);
    expect(scoreCorrectness('a -> b -> c;', { walks: [{ actions: ['b'], endState: 'c' }] })).toBe(false);
  });
  it('checks a walk that must be rejected at an index', () => {
    // 'c' is not reachable from a in one step, so the move at index 0 is rejected
    expect(scoreCorrectness('a -> b -> c;', { walks: [{ actions: ['c'], endState: 'a', rejectedAt: 0 }] })).toBe(true);
  });
  it('an empty expectation set passes for any valid machine', () => {
    expect(scoreCorrectness('a -> b;', {})).toBe(true);
  });
});
