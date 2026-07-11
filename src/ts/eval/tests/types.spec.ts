import { describe, it, expect } from 'vitest';
import { CONDITIONS } from '../types.js';

describe('eval types', () => {
  it('CONDITIONS lists the four conditions', () => {
    expect([...CONDITIONS]).toEqual(['bare', 'reference', 'tools', 'reference+tools']);
  });
});
