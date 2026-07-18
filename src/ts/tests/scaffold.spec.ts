import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { analyze, hasErrors } from '../analyze.js';

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
