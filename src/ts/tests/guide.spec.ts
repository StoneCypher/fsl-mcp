import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GUIDE_FLOWCHARTS, GUIDE_GRAPHVIZ, GUIDE_LANGUAGE } from '../tools/guide-content.js';
import { analyze, hasErrors } from '../analyze.js';
import { graphvizRender } from '../tools/graphviz.js';

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
    const dot    = readFileSync('src/prompts/graphviz-primer.md', 'utf8');
    expect(GUIDE_FLOWCHARTS).toBe(flow);
    expect(GUIDE_LANGUAGE).toBe(primer + '\n\n' + flow);
    expect(GUIDE_GRAPHVIZ).toBe(dot);
  });

  it('returns graphviz guidance for the graphviz topic', () => {
    expect(GUIDE_GRAPHVIZ).toContain('digraph');
    expect(GUIDE_GRAPHVIZ.length).toBeGreaterThan(1000);
  });

  it('keeps the graphviz guide out of the fsl language topic', () => {
    expect(GUIDE_LANGUAGE).not.toContain('rankdir');
  });

  it('every dot fence in the graphviz guide renders', async () => {
    const fences = [...GUIDE_GRAPHVIZ.matchAll(/```dot\n([\s\S]*?)```/g)].map((m) => m[1] ?? '');
    expect(fences.length).toBeGreaterThanOrEqual(8);
    for (const dot of fences) {
      const r = await graphvizRender(dot);
      expect(r.valid, `failed to render:\n${dot}`).toBe(true);
    }
  });

  it('every fenced block in the graphviz guide carries a language tag', () => {
    // Fences alternate open/close, so even indices are openers and must be tagged.
    const fences = [...GUIDE_GRAPHVIZ.matchAll(/^```(.*)$/gm)].map((m) => m[1] ?? '');
    expect(fences.length % 2).toBe(0);
    fences.forEach((tag, i) => {
      expect(i % 2 === 0 ? tag !== '' : tag === '', `fence line ${String(i)}: "${tag}"`).toBe(true);
    });
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
