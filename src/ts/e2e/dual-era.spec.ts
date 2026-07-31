import { describe, it, expect } from 'vitest';
import { PassThrough } from 'node:stream';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { startServer } from '../server.js';

const TOOLS = ['fsl_explain', 'fsl_guide', 'fsl_lint', 'fsl_render',
               'fsl_scaffold', 'fsl_simulate', 'fsl_validate'].sort();

interface Rpc { id?: number; result?: Record<string, unknown>; error?: { code: number } }

/**
 * Drive raw JSON-RPC against a real stdio transport on injected streams.
 * Returns a `send` that resolves with the response bearing the matching id,
 * so the era handshake's extra traffic cannot desynchronize the reader.
 */
function harness() {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const handle = startServer(new StdioServerTransport(stdin, stdout));

  const waiting = new Map<number, (r: Rpc) => void>();
  let buffer = '';
  stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    let nl = buffer.indexOf('\n');
    while (nl >= 0) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.trim() !== '') {
        const msg = JSON.parse(line) as Rpc;
        if (msg.id !== undefined) { waiting.get(msg.id)?.(msg); waiting.delete(msg.id); }
      }
      nl = buffer.indexOf('\n');
    }
  });

  const send = (msg: Record<string, unknown>): Promise<Rpc> =>
    new Promise((resolve) => {
      if (typeof msg['id'] === 'number') { waiting.set(msg['id'], resolve); }
      stdin.write(`${JSON.stringify(msg)}\n`);
      if (typeof msg['id'] !== 'number') { resolve({}); }
    });

  return { send, close: () => handle.close() };
}

/** Open a legacy (2025-era) connection: initialize, then initialized. */
async function legacyHandshake(h: ReturnType<typeof harness>): Promise<Rpc> {
  const init = await h.send({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-11-25', capabilities: {},
              clientInfo: { name: 'legacy-test', version: '0.0.0' } },
  });
  await h.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  return init;
}

// The per-request envelope on protocol revision 2026-07-28 requires BOTH
// reserved keys: `protocolVersion` alone is not enough to classify a message
// as modern. `classifyOpeningMessage`/`checkInboundEnvelope`
// (node_modules/@modelcontextprotocol/server/dist/src-CX2iR2pK.mjs,
// REQUIRED_ENVELOPE_KEYS at L3989) require `io.modelcontextprotocol/protocolVersion`
// AND `io.modelcontextprotocol/clientCapabilities` on every modern request -
// a `_meta` carrying only the version key fails envelope validation and the
// message is answered with an InvalidParams error instead of being routed to
// the modern instance. `clientCapabilities: {}` is valid: every field of
// ClientCapabilities2026Schema is optional.
const META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientCapabilities': {},
};

describe('dual-era stdio', () => {
  it('answers a modern tools/list carrying per-request _meta', async () => {
    const h = harness();
    const res = await h.send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: META } });

    const tools = res.result?.['tools'] as { name: string }[] | undefined;
    expect(tools?.map((t) => t.name).sort()).toEqual(TOOLS);
    expect(res.result?.['resultType']).toBe('complete');
    await h.close();
  });

  it('answers server/discover with the modern revision', async () => {
    const h = harness();
    const res = await h.send({ jsonrpc: '2.0', id: 1, method: 'server/discover', params: { _meta: META } });

    expect(res.result?.['supportedVersions']).toContain('2026-07-28');
    await h.close();
  });

  it('answers a legacy client that opens with initialize', async () => {
    const h = harness();
    const init = await legacyHandshake(h);
    expect(init.error).toBeUndefined();
    expect(init.result?.['protocolVersion']).toBe('2025-11-25');

    const res = await h.send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const tools = res.result?.['tools'] as { name: string }[] | undefined;
    expect(tools?.map((t) => t.name).sort()).toEqual(TOOLS);
    await h.close();
  });

  it('stamps cache hints on modern tools/list only', async () => {
    const modern = harness();
    const m = await modern.send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: META } });
    expect(m.result?.['ttlMs']).toBe(3_600_000);
    expect(m.result?.['cacheScope']).toBe('public');
    await modern.close();

    const legacy = harness();
    await legacyHandshake(legacy);
    const l = await legacy.send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    expect(l.result?.['ttlMs']).toBeUndefined();
    expect(l.result?.['cacheScope']).toBeUndefined();
    await legacy.close();
  });
});
