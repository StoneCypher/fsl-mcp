import { describe, it, expect } from 'vitest';
import { from, fslDiagnostics } from 'jssm';
import { fsl_to_svg_string } from 'jssm/viz';

const GOOD = 'a -> b -> c;';
const BAD  = 'a -> ;';   // dangling arrow: a parse/compile error

describe('jssm capability floor', () => {
  it('fslDiagnostics returns [] for valid FSL and never throws', () => {
    expect(fslDiagnostics(GOOD)).toEqual([]);
  });

  it('fslDiagnostics reports an error diagnostic for invalid FSL', () => {
    const diags = fslDiagnostics(BAD);
    expect(diags.some(d => d.severity === 'error')).toBe(true);
    expect(diags[0]).toHaveProperty('range');
    expect(diags[0]).toHaveProperty('message');
  });

  it('from() builds a machine whose states() and state() work', () => {
    const m = from(GOOD);
    expect(m.states().sort()).toEqual(['a', 'b', 'c']);
    expect(m.state()).toBe('a');
  });

  it('fsl_to_svg_string renders valid FSL to an <svg>', async () => {
    const svg = await fsl_to_svg_string(GOOD);
    expect(svg).toContain('<svg');
  });
});
