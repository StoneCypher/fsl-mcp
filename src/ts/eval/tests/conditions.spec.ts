import { describe, it, expect } from 'vitest';
import { buildInvocation, mcpConfigJson, PROMPT_PREAMBLE } from '../conditions.js';
import type { Task } from '../types.js';

const task: Task = { id: 't1', difficulty: 'easy', prompt: 'Make a light switch.', expect: {} };
const opts = { model: 'claude-opus-4-8', primer: 'PRIMER TEXT', mcpConfigPath: '/tmp/fsl.json' };

describe('buildInvocation', () => {
  it('always sets --output-format json, --model, and --strict-mcp-config', () => {
    const inv = buildInvocation(task, 'bare', opts);
    expect(inv.args).toEqual(expect.arrayContaining(['-p', '--output-format', 'json', '--model', 'claude-opus-4-8', '--strict-mcp-config']));
  });
  it('bare: no --mcp-config, no primer in the prompt', () => {
    const inv = buildInvocation(task, 'bare', opts);
    expect(inv.args).not.toContain('--mcp-config');
    expect(inv.prompt).not.toContain('PRIMER TEXT');
    expect(inv.prompt).toContain('Make a light switch.');
    expect(inv.prompt).toContain(PROMPT_PREAMBLE);
  });
  it('reference: primer present, no --mcp-config', () => {
    const inv = buildInvocation(task, 'reference', opts);
    expect(inv.prompt).toContain('PRIMER TEXT');
    expect(inv.args).not.toContain('--mcp-config');
  });
  it('tools: --mcp-config present, no primer', () => {
    const inv = buildInvocation(task, 'tools', opts);
    expect(inv.args).toContain('--mcp-config');
    expect(inv.args).toContain('/tmp/fsl.json');
    expect(inv.prompt).not.toContain('PRIMER TEXT');
  });
  it('reference+tools: both primer and --mcp-config', () => {
    const inv = buildInvocation(task, 'reference+tools', opts);
    expect(inv.prompt).toContain('PRIMER TEXT');
    expect(inv.args).toContain('--mcp-config');
  });
});

describe('mcpConfigJson', () => {
  it('wires the fsl server at the given bin path', () => {
    const cfg = JSON.parse(mcpConfigJson('/repo/dist/bin.mjs'));
    expect(cfg.mcpServers.fsl.command).toBe('node');
    expect(cfg.mcpServers.fsl.args).toEqual(['/repo/dist/bin.mjs']);
  });
});
