import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { fslScaffold } from '../tools/scaffold.js';
import { SCAFFOLD_REGISTRY, PRESET_IDS } from '../tools/scaffold-registry.js';
import { analyze, hasErrors } from '../analyze.js';

// Names are drawn from three sources: arbitrary printable strings (the original
// coverage), canonical vocabulary words that also appear as OTHER slots'
// canonical names (so an echoed/collided rename is generatable, not just
// theoretically possible), and "word + suffix" combinations that build a
// multi-word name whose first token equals another slot's canonical - the
// exact shape of the cross-slot corruption this task's fix addresses.
const nameArb = fc.oneof(
  fc.string({ maxLength: 24 }),
  fc.constantFrom('Ship', 'Reject', 'Validate', 'Fetch', 'Failed', 'Review'),
  fc.tuple(fc.constantFrom('Ship', 'Reject', 'Validate'), fc.string({ minLength: 1, maxLength: 8 }))
    .map(([w, s]) => `${w} ${s.replace(/[\r\n"]/g, 'x')}`),
);

// Sometimes-undefined machine names: fc.option supplies undefined (no rename),
// 'Review Loop' echoes review-loop's default (identity request whose quoted
// text contains the canonical state Review - the shield regression shape),
// and arbitrary short strings cover the general rename path.
const machineNameArb = fc.option(
  fc.oneof(
    fc.constant('Review Loop'),
    fc.string({ minLength: 1, maxLength: 16 }).map((s) => s.replace(/[\r\n"]/g, 'x')),
  ),
  { nil: undefined },
);

describe('fslScaffold stochastic', () => {
  it('any printable role names either compile cleanly or are rejected - never a throw, never a broken success', () => {
    fc.assert(fc.property(
      fc.constantFrom(...PRESET_IDS),
      nameArb,
      machineNameArb,
      fc.nat({ max: 999 }),
      (preset, name, machineName, seed) => {
        const def = SCAFFOLD_REGISTRY[preset];
        if (def === undefined) return;
        const roles: Record<string, string | string[]> = {};
        for (const [i, slot] of def.slots.entries()) {
          if (i % 3 !== seed % 3) continue;
          // Per-slot-distinct names (the _i / _i_j suffixes), so co-selected
          // slots don't all resolve to one identical name and get auto-rejected
          // by the uniqueness check - cross-slot configurations must actually
          // reach the substitution engine.
          roles[slot.role] = slot.kind === 'stateList'
            ? slot.canonical.map((_, j) => `${name}_${String(i)}_${String(j)}`)
            : `${name}_${String(i)}`;
        }
        const r = fslScaffold(preset, machineName, roles);
        if (r.valid) {
          expect(hasErrors(analyze(r.source))).toBe(false);
          // The roles map must never lie about the source: every resolved
          // state name - single or list member - must actually be findable in
          // the emitted source, bare or double-quoted. This is the exact
          // invariant the sequential-mutation bug violated (a later slot's
          // substitution silently rewrote an earlier slot's already-substituted
          // text).
          for (const slot of def.slots) {
            if (slot.kind === 'action') continue;
            const resolvedValue = r.roles[slot.role];
            if (resolvedValue === undefined) continue;
            const resolvedNames = typeof resolvedValue === 'string' ? [resolvedValue] : resolvedValue;
            for (const resolvedName of resolvedNames) {
              const present = r.source.includes(resolvedName) || r.source.includes(`"${resolvedName}"`);
              expect(present, `${preset}:${slot.role}=${JSON.stringify(resolvedName)} missing from source`).toBe(true);
            }
          }
          // The machine_name statement must reflect the request (or the
          // preset default) exactly - never text corrupted by a state rename.
          expect(r.source).toContain(`machine_name: "${machineName ?? def.machineName}";`);
        } else {
          expect(r.errors.length).toBeGreaterThan(0);
        }
      }), { numRuns: 200 });
  });
});
