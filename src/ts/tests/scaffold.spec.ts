import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { analyze, hasErrors } from '../analyze.js';
import { SCAFFOLD_SOURCES } from '../tools/scaffold-content.js';
import { SCAFFOLD_REGISTRY, PRESET_IDS } from '../tools/scaffold-registry.js';

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
