import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { analyze, hasErrors } from '../analyze.js';
import { SCAFFOLD_SOURCES } from '../tools/scaffold-content.js';
import { SCAFFOLD_REGISTRY, PRESET_IDS } from '../tools/scaffold-registry.js';
import { fslScaffold } from '../tools/scaffold.js';

const SCAFFOLD_DIR = 'src/prompts/scaffolds';

describe('scaffold preset sources', () => {
  it('all eight presets exist and compile raw', () => {
    const files = readdirSync(SCAFFOLD_DIR).filter((f) => f.endsWith('.fsl')).sort();
    expect(files).toEqual(['decision.fsl', 'flowchart.fsl', 'handshake.fsl',
      'job-lifecycle.fsl', 'network-topology.fsl', 'org-chart.fsl',
      'pipeline.fsl', 'review-loop.fsl']);
    for (const f of files) {
      const source = readFileSync(`${SCAFFOLD_DIR}/${f}`, 'utf8');
      expect(hasErrors(analyze(source)), f).toBe(false);
    }
  });
});

describe('scaffold registry and embedding', () => {
  it('generated module matches the authored files exactly (drift guard)', () => {
    const files = readdirSync(SCAFFOLD_DIR).filter((f) => f.endsWith('.fsl')).sort();
    expect(Object.keys(SCAFFOLD_SOURCES).sort()).toEqual(files.map((f) => f.replace(/\.fsl$/, '')));
    for (const f of files) {
      expect(SCAFFOLD_SOURCES[f.replace(/\.fsl$/, '')]).toBe(readFileSync(`${SCAFFOLD_DIR}/${f}`, 'utf8'));
    }
  });

  it('registry covers exactly the embedded presets, and every canonical token appears in its source', () => {
    expect(PRESET_IDS).toEqual(Object.keys(SCAFFOLD_SOURCES).sort());
    for (const id of PRESET_IDS) {
      const def = SCAFFOLD_REGISTRY[id];
      const src = SCAFFOLD_SOURCES[id] ?? '';
      expect(def).toBeDefined();
      if (def === undefined) continue;
      expect(src).toContain(`machine_name: "${def.machineName}"`);
      for (const slot of def.slots) {
        const names = slot.kind === 'stateList' ? slot.canonical : [slot.canonical];
        for (const n of names) {
          expect(src, `${id}:${slot.role}:${n}`).toMatch(
            slot.kind === 'action' ? new RegExp(`'${n}'`) : new RegExp(`\\b${n}\\b`));
        }
      }
    }
  });
});

describe('fslScaffold', () => {
  it('returns the canonical source with defaults resolved when no params given', () => {
    const r = fslScaffold('decision');
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.family).toBe('flowchart');
    expect(r.source).toBe(SCAFFOLD_SOURCES['decision']);
    expect(r.roles['decision']).toBe('Validate');
    expect(r.notes.length).toBeGreaterThan(0);
  });

  it('renames states, auto-quoting multi-word names, and output compiles', () => {
    const r = fslScaffold('decision', 'Fraud Check',
      { decision: 'Screen Payment', outcomes: ['Approve', 'Deny'] });
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.source).toContain('machine_name: "Fraud Check";');
    expect(r.source).toContain('"Screen Payment"');
    expect(r.source).toContain('Approve');
    expect(r.source).not.toContain('Validate');
    expect(hasErrors(analyze(r.source))).toBe(false);
  });

  it('renames action labels with apostrophe escaping', () => {
    const r = fslScaffold('review-loop', undefined, { approve: "it's fine" });
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.source).toContain("'it\\'s fine'");
    expect(hasErrors(analyze(r.source))).toBe(false);
  });

  it('rejects wrong list arity, unknown roles, duplicates, and illegal characters', () => {
    expect(fslScaffold('pipeline', undefined, { stages: ['A', 'B'] }).valid).toBe(false);
    expect(fslScaffold('decision', undefined, { nonsense: 'X' }).valid).toBe(false);
    expect(fslScaffold('decision', undefined, { outcomes: ['Same', 'Same'] }).valid).toBe(false);
    expect(fslScaffold('decision', undefined, { decision: 'has"quote' }).valid).toBe(false);
    expect(fslScaffold('decision', undefined, { decision: '' }).valid).toBe(false);
    expect(fslScaffold('no-such-preset').valid).toBe(false);
  });

  it('rejects a stateList role when one of its individual names is bad', () => {
    const empty = fslScaffold('decision', undefined, { outcomes: ['Approve', ''] });
    expect(empty.valid).toBe(false);
    if (empty.valid) return;
    expect(empty.errors.some((e) => e.includes('outcomes'))).toBe(true);

    const quoted = fslScaffold('decision', undefined, { outcomes: ['Approve', 'has"quote'] });
    expect(quoted.valid).toBe(false);
    if (quoted.valid) return;
    expect(quoted.errors.some((e) => e.includes('outcomes'))).toBe(true);
  });

  it('rejects duplicate resolved action labels within a preset', () => {
    const r = fslScaffold('review-loop', undefined, { approve: 'go', revise: 'go' });
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.errors).toContain('resolved action labels must be unique');
    expect(r.errors.some((e) => e.includes('tool defect'))).toBe(false);
  });

  it('rejects a state rename, action rename, stateList entry, or machine_name containing a backslash', () => {
    const state = fslScaffold('decision', undefined, { decision: 'Screen\\' });
    expect(state.valid).toBe(false);
    if (!state.valid) {
      expect(state.errors.some((e) => e.includes('role decision: bad name'))).toBe(true);
      expect(state.errors.some((e) => e.includes('tool defect'))).toBe(false);
    }

    const action = fslScaffold('review-loop', undefined, { approve: 'go\\' });
    expect(action.valid).toBe(false);
    if (!action.valid) {
      expect(action.errors.some((e) => e.includes('role approve: bad name'))).toBe(true);
      expect(action.errors.some((e) => e.includes('tool defect'))).toBe(false);
    }

    const list = fslScaffold('decision', undefined, { outcomes: ['Ship\\', 'Reject'] });
    expect(list.valid).toBe(false);
    if (!list.valid) {
      expect(list.errors.some((e) => e.includes('role outcomes: bad name'))).toBe(true);
      expect(list.errors.some((e) => e.includes('tool defect'))).toBe(false);
    }

    const name = fslScaffold('decision', 'Name\\');
    expect(name.valid).toBe(false);
    if (!name.valid) {
      expect(name.errors).toContain('machine_name must be non-empty with no quotes, control characters, or backslashes');
      expect(name.errors.some((e) => e.includes('tool defect'))).toBe(false);
    }
  });

  it('regression: rejects an interior recognized escape (a\\\\b) - jssm would collapse it and the roles map would lie', () => {
    // probe4 case: the caller's literal string is a<backslash><backslash>b.
    // Before the wholesale backslash rejection this returned valid:true with
    // roles.decision = 'a\\b' while jssm compiled the state as 'a\b' -
    // a compiling-but-wrong silent divergence between the roles map and the
    // machine. It must be rejected in validation, with the generic bad-name
    // error, never the tool-defect message.
    const r = fslScaffold('decision', undefined, { decision: 'a\\\\b' });
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.errors.some((e) => e.includes('role decision: bad name'))).toBe(true);
    expect(r.errors.some((e) => e.includes('tool defect'))).toBe(false);

    const single = fslScaffold('decision', undefined, { decision: 'a\\b' });
    expect(single.valid).toBe(false);
    if (single.valid) return;
    expect(single.errors.some((e) => e.includes('role decision: bad name'))).toBe(true);
    expect(single.errors.some((e) => e.includes('tool defect'))).toBe(false);
  });

  it('rejects control characters in any name position - previously the last gate-reachable class', () => {
    const action = fslScaffold('review-loop', undefined, { approve: 'go\tnow' });
    expect(action.valid).toBe(false);
    if (!action.valid) {
      expect(action.errors.some((e) => e.includes('role approve: bad name'))).toBe(true);
      expect(action.errors.some((e) => e.includes('tool defect'))).toBe(false);
    }

    const state = fslScaffold('decision', undefined, { decision: 'Screen\u001b' });
    expect(state.valid).toBe(false);
    if (!state.valid) {
      expect(state.errors.some((e) => e.includes('role decision: bad name'))).toBe(true);
    }

    const name = fslScaffold('decision', 'Nul\u0000Name');
    expect(name.valid).toBe(false);
    if (!name.valid) {
      expect(name.errors).toContain('machine_name must be non-empty with no quotes, control characters, or backslashes');
    }
  });

  it('rejects an array value given for a scalar-kind (state/action) role', () => {
    const r = fslScaffold('decision', undefined, { decision: ['A', 'B'] });
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.errors.some((e) => e.includes('decision'))).toBe(true);
  });

  it('rejects empty, quoted, and multi-line machine names', () => {
    expect(fslScaffold('decision', '').valid).toBe(false);
    expect(fslScaffold('decision', 'has"quote').valid).toBe(false);
    expect(fslScaffold('decision', 'line\nbreak').valid).toBe(false);
  });

  it('every preset compiles under a full rename of every slot', () => {
    for (const id of PRESET_IDS) {
      const def = SCAFFOLD_REGISTRY[id];
      if (def === undefined) continue;
      const roles: Record<string, string | string[]> = {};
      def.slots.forEach((slot, i) => {
        roles[slot.role] = slot.kind === 'stateList'
          ? slot.canonical.map((_, j) => `Zz_${String(i)}_${String(j)}`)
          : `Zz_${String(i)}`;
      });
      const r = fslScaffold(id, 'Renamed', roles);
      expect(r.valid, id).toBe(true);
      if (r.valid) expect(hasErrors(analyze(r.source)), id).toBe(false);
    }
  });

  it('rejects prototype-chain preset ids without throwing (own-property guard)', () => {
    expect(() => fslScaffold('__proto__')).not.toThrow();
    expect(() => fslScaffold('constructor')).not.toThrow();
    const proto = fslScaffold('__proto__');
    expect(proto.valid).toBe(false);
    if (proto.valid) return;
    expect(proto.errors[0]).toContain('unknown preset');
    const ctor = fslScaffold('constructor');
    expect(ctor.valid).toBe(false);
    if (ctor.valid) return;
    expect(ctor.errors[0]).toContain('unknown preset');
  });

  it('regression: a later stateList rename must not corrupt an earlier state rename (single-pass substitution)', () => {
    const r = fslScaffold('decision', undefined, { decision: 'Reject Now', outcomes: ['Ship', 'Reject2'] });
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.source).toContain('"Reject Now" \'ok\'  -> Ship;');
    expect(r.source).toContain('"Reject Now" \'bad\' -> Reject2;');
    expect(r.source).toContain('state "Reject Now": { shape: diamond; };');
    expect((r.source.match(/"Reject Now"/g) ?? []).length).toBe(3);
    expect(r.source).not.toContain('Reject2 Now');
    expect(r.source).not.toContain('Validate');
    expect(hasErrors(analyze(r.source))).toBe(false);
  });

  it('regression: a role rename must not corrupt the already-substituted machine_name statement (single-pass substitution)', () => {
    const r = fslScaffold('decision', 'Validate Corp', { decision: 'Screen' });
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.source).toContain('machine_name: "Validate Corp";');
    expect(r.source).not.toContain('machine_name: "Screen Corp";');
    expect(hasErrors(analyze(r.source))).toBe(false);
  });

  it('regression: the default machine_name line is shielded from state renames when no machineName is given', () => {
    const r = fslScaffold('review-loop', undefined, { review: 'Assess' });
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.source).toContain('machine_name: "Review Loop";');
    expect(r.source).not.toContain('machine_name: "Assess Loop";');
    expect(hasErrors(analyze(r.source))).toBe(false);
  });

  it('regression: an explicit identity machineName is likewise shielded from state renames', () => {
    const r = fslScaffold('review-loop', 'Review Loop', { review: 'Assess' });
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.source).toContain('machine_name: "Review Loop";');
    expect(r.source).not.toContain('machine_name: "Assess Loop";');
    expect(hasErrors(analyze(r.source))).toBe(false);
  });
});
