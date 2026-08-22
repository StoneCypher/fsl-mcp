/**
 * Stochastic property tests for graphvizRender.
 *
 * viz.render() runs a wasm build of graphviz, so arbitrary DOT text is a
 * path into compiled C. The most valuable property here is the first one:
 * no input string, however malformed, may ever throw out of graphvizRender
 * - a failure there is a genuine crash finding, not a spec violation to be
 * quietly worked around.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { graphvizRender } from '../tools/graphviz.js';

describe('graphvizRender properties', () => {

  it('never throws, for any input string whatsoever', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (junk) => {
        const r = await graphvizRender(junk);
        expect(typeof r.valid).toBe('boolean');
      }),
      { numRuns: 250 },
    );
  }, 60000);

  it('renders any well-formed digraph over simple identifiers', async () => {
    const ident = fc.stringMatching(/^[a-z][a-z0-9]{0,7}$/);
    await fc.assert(
      fc.asyncProperty(fc.array(fc.tuple(ident, ident), { minLength: 1, maxLength: 8 }), async (edges) => {
        const body = edges.map(([a, b]) => `${a} -> ${b};`).join(' ');
        const r = await graphvizRender(`digraph { ${body} }`);
        expect(r.valid).toBe(true);
        if (r.valid && 'svg' in r) { expect(r.svg).toContain('</svg>'); }
      }),
      { numRuns: 100 },
    );
  });

  it('every rendered node identifier appears in the svg output', async () => {
    const ident = fc.stringMatching(/^[a-z][a-z0-9]{0,7}$/);
    await fc.assert(
      fc.asyncProperty(ident, ident, async (a, b) => {
        fc.pre(a !== b);
        const r = await graphvizRender(`digraph { ${a} -> ${b}; }`);
        expect(r.valid).toBe(true);
        if (r.valid && 'svg' in r) {
          expect(r.svg).toContain(a);
          expect(r.svg).toContain(b);
        }
      }),
      { numRuns: 100 },
    );
  });

});
