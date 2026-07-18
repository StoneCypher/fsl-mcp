import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { fslScaffold } from '../tools/scaffold.js';
import { SCAFFOLD_REGISTRY, PRESET_IDS } from '../tools/scaffold-registry.js';
import { analyze, hasErrors } from '../analyze.js';

describe('fslScaffold stochastic', () => {
  it('any printable role names either compile cleanly or are rejected - never a throw, never a broken success', () => {
    fc.assert(fc.property(
      fc.constantFrom(...PRESET_IDS),
      fc.string({ minLength: 0, maxLength: 24 }),
      fc.nat({ max: 999 }),
      (preset, name, seed) => {
        const def = SCAFFOLD_REGISTRY[preset];
        if (def === undefined) return;
        const roles: Record<string, string | string[]> = {};
        for (const [i, slot] of def.slots.entries()) {
          if (i % 3 !== seed % 3) continue;
          roles[slot.role] = slot.kind === 'stateList'
            ? slot.canonical.map((_, j) => `${name}${String(j)}`)
            : name;
        }
        const r = fslScaffold(preset, undefined, roles);
        if (r.valid) expect(hasErrors(analyze(r.source))).toBe(false);
        else expect(r.errors.length).toBeGreaterThan(0);
      }), { numRuns: 200 });
  });
});
