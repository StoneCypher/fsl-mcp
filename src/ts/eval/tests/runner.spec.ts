import { describe, it, expect } from 'vitest';
import { runTrial } from '../runner.js';
import type { Invocation } from '../types.js';

const inv: Invocation = { args: ['-p', '--output-format', 'json'], prompt: 'make a machine' };

function fakeSpawn(stdout: string, code = 0) {
  return async () => ({ stdout, code });
}

describe('runTrial', () => {
  it('extracts fsl from the claude json result field', async () => {
    const envelope = JSON.stringify({ type: 'result', is_error: false, result: 'sure:\n```fsl\na -> b;\n```' });
    const r = await runTrial(inv, fakeSpawn(envelope));
    expect(r.fsl).toBe('a -> b;');
    expect(r.error).toBeUndefined();
  });
  it('reports an error and null fsl when the envelope has is_error', async () => {
    const envelope = JSON.stringify({ type: 'result', is_error: true, result: 'boom' });
    const r = await runTrial(inv, fakeSpawn(envelope));
    expect(r.fsl).toBeNull();
    expect(r.error).toBeTruthy();
  });
  it('reports an error when claude exits nonzero', async () => {
    const r = await runTrial(inv, fakeSpawn('', 1));
    expect(r.fsl).toBeNull();
    expect(r.error).toBeTruthy();
  });
  it('reports an error when the output is not JSON', async () => {
    const r = await runTrial(inv, fakeSpawn('not json'));
    expect(r.fsl).toBeNull();
    expect(r.error).toBeTruthy();
  });
  it('reports null fsl (no error) when the result has no fsl block', async () => {
    const envelope = JSON.stringify({ type: 'result', is_error: false, result: 'no code' });
    const r = await runTrial(inv, fakeSpawn(envelope));
    expect(r.fsl).toBeNull();
  });
});
