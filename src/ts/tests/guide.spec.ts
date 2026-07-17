import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GUIDE_FLOWCHARTS, GUIDE_LANGUAGE } from '../tools/guide-content.js';
import { analyze, hasErrors } from '../analyze.js';

describe('guide content', () => {
  it('flowcharts guide carries its heading and core idiom vocabulary', () => {
    expect(GUIDE_FLOWCHARTS).toContain('# Flowcharts in FSL');
    expect(GUIDE_FLOWCHARTS).toContain('shape: diamond');
    expect(GUIDE_FLOWCHARTS).toContain('flow: down;');
    expect(GUIDE_FLOWCHARTS).toContain('~>');
  });

  it('language guide is the primer plus the flowchart guide, in that order', () => {
    expect(GUIDE_LANGUAGE).toContain('Finite State Language (authoring guide for LLMs)');
    expect(GUIDE_LANGUAGE).toContain('# Flowcharts in FSL');
    expect(GUIDE_LANGUAGE.indexOf('# Flowcharts in FSL'))
      .toBeGreaterThan(GUIDE_LANGUAGE.indexOf('Finite State Language'));
  });

  it('generated module matches the authored markdown exactly (drift guard)', () => {
    const primer = readFileSync('src/prompts/fsl-llms-draft.md', 'utf8');
    const flow   = readFileSync('src/prompts/fsl-flowcharts.md', 'utf8');
    expect(GUIDE_FLOWCHARTS).toBe(flow);
    expect(GUIDE_LANGUAGE).toBe(primer + '\n\n' + flow);
  });

  it('every fsl fence in the flowchart guide compiles', () => {
    const fences = [...GUIDE_FLOWCHARTS.matchAll(/```fsl\n([\s\S]*?)```/g)].map((m) => m[1] ?? '');
    expect(fences.length).toBeGreaterThanOrEqual(6);
    for (const fsl of fences) {
      const diagnostics = analyze(fsl);
      expect(hasErrors(diagnostics)).toBe(false);
    }
  });
});
