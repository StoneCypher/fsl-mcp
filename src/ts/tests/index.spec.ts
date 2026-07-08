import { describe, it, expect } from 'vitest';

describe('index module', () => {
  it('imports without side effects', async () => {
    const mod = await import('../index.js');
    expect(mod).toBeTypeOf('object');
  });
});
