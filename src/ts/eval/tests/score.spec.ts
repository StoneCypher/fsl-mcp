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
  it('returns null for a fenced block whose body is empty', () => {
    expect(extractFsl('```fsl\n```')).toBeNull();
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
  it('fails immediately for source that does not compile', () => {
    expect(scoreCorrectness('a -> ;', {})).toBe(false);
  });
  it('fails when an expected state is missing', () => {
    expect(scoreCorrectness('a -> b;', { states: ['a', 'c'] })).toBe(false);
  });
  it('fails when an expected transition is missing', () => {
    expect(scoreCorrectness('a -> b;', { transitions: [['a', 'c']] })).toBe(false);
  });
  it('checks start and terminal states', () => {
    expect(scoreCorrectness('a -> b -> c;', { start: ['a'], terminals: ['c'] })).toBe(true);
    expect(scoreCorrectness('a -> b -> c;', { terminals: ['a'] })).toBe(false);
  });
  it('fails when an expected start state is not actually a start state', () => {
    expect(scoreCorrectness('a -> b -> c;', { start: ['b'] })).toBe(false);
  });
  it('checks a behavioral walk end state', () => {
    expect(scoreCorrectness('a -> b -> c;', { walks: [{ actions: ['b', 'c'], endState: 'c' }] })).toBe(true);
    expect(scoreCorrectness('a -> b -> c;', { walks: [{ actions: ['b'], endState: 'c' }] })).toBe(false);
  });
  it('checks a walk that must be rejected at an index', () => {
    // 'c' is not reachable from a in one step, so the move at index 0 is rejected
    expect(scoreCorrectness('a -> b -> c;', { walks: [{ actions: ['c'], endState: 'a', rejectedAt: 0 }] })).toBe(true);
  });
  it('fails when the rejection happens at a different index than expected', () => {
    expect(scoreCorrectness('a -> b -> c;', { walks: [{ actions: ['c'], endState: 'a', rejectedAt: 1 }] })).toBe(false);
  });
  it('fails a walk that is unexpectedly rejected when no rejection was expected', () => {
    // no `rejectedAt` is given, but 'c' is illegal from 'a', so the walk is rejected anyway
    expect(scoreCorrectness('a -> b -> c;', { walks: [{ actions: ['c'], endState: 'a' }] })).toBe(false);
  });
  it('an empty expectation set passes for any valid machine', () => {
    expect(scoreCorrectness('a -> b;', {})).toBe(true);
  });

  describe('case-insensitive name matching', () => {
    // 'On' is the default start state (first state named); it has one outgoing
    // edge to 'Off', so 'On' is the (sole) start state and 'Off' is the (sole)
    // terminal state (no outgoing edges).
    const onOff = 'On -> Off;';

    it('matches states case-insensitively', () => {
      expect(scoreCorrectness(onOff, { states: ['on', 'off'] })).toBe(true);
    });

    it('matches transition endpoints case-insensitively', () => {
      expect(scoreCorrectness(onOff, { transitions: [['on', 'off']] })).toBe(true);
    });

    it('matches start states case-insensitively', () => {
      expect(scoreCorrectness(onOff, { start: ['on'] })).toBe(true);
    });

    it('matches terminal states case-insensitively', () => {
      expect(scoreCorrectness(onOff, { terminals: ['off'] })).toBe(true);
    });

    it('does not let case-insensitivity mask a genuinely wrong state name', () => {
      expect(scoreCorrectness(onOff, { states: ['on', 'nonexistent'] })).toBe(false);
    });

    it('matches a walk endState case-insensitively', () => {
      // Target-state walk (no action label involved), so this isolates the
      // endState comparison from action-label resolution.
      expect(scoreCorrectness(onOff, { walks: [{ actions: ['Off'], endState: 'off' }] })).toBe(true);
    });

    it('resolves a capitalized action label against a lowercase expected action', () => {
      // The machine defines action labels 'TurnOff'/'TurnOn'; the expectation
      // (as a task author or model might write it) uses lowercase action
      // names. jssm's own m.action()/m.transition() are case-sensitive, so the
      // scorer must resolve 'turnoff' to the machine's actual 'TurnOff' label
      // before simulating, then compare the (also differently-cased) endState.
      const fsl = "On 'TurnOff' -> Off; Off 'TurnOn' -> On;";
      expect(scoreCorrectness(fsl, { walks: [{ actions: ['turnoff'], endState: 'off' }] })).toBe(true);
    });

    it('a walk with a genuinely unmatched action label still fails after case folding', () => {
      const fsl = "On 'TurnOff' -> Off;";
      expect(scoreCorrectness(fsl, { walks: [{ actions: ['nonexistent'], endState: 'off' }] })).toBe(false);
    });
  });
});
