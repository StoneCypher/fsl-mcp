import { describe, it, expect, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/client';
import type { Transport } from '@modelcontextprotocol/server';
import { startServer } from '../server.js';

describe('fsl-mcp server', () => {
  it('lists the seven tools and validates FSL over the protocol', async () => {
    const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });
    const handle = startServer(serverTx);
    await client.connect(clientTx);

    const tools = await client.listTools();
    const names = tools.tools.map(t => t.name).sort();
    expect(names).toEqual(
      ['fsl_explain', 'fsl_guide', 'fsl_lint', 'fsl_render', 'fsl_scaffold', 'fsl_simulate', 'fsl_validate'].sort(),
    );

    const res = await client.callTool({ name: 'fsl_validate', arguments: { source: 'a -> b;' } });
    const payload = JSON.parse((res.content as Array<{ type: string; text: string }>)[0]!.text);
    expect(payload.valid).toBe(true);

    const source = 'a -> b -> c;';

    const lintRes = await client.callTool({ name: 'fsl_lint', arguments: { source } });
    const lintPayload = JSON.parse((lintRes.content as Array<{ type: string; text: string }>)[0]!.text);
    expect(lintPayload.notes).toBeInstanceOf(Array);

    const explainRes = await client.callTool({ name: 'fsl_explain', arguments: { source } });
    const explainPayload = JSON.parse(
      (explainRes.content as Array<{ type: string; text: string }>)[0]!.text,
    );
    expect(explainPayload.valid).toBe(true);
    expect(explainPayload.states.sort()).toEqual(['a', 'b', 'c']);

    const simulateRes = await client.callTool({
      name: 'fsl_simulate',
      arguments: { source, actions: ['b', 'c'] },
    });
    const simulatePayload = JSON.parse(
      (simulateRes.content as Array<{ type: string; text: string }>)[0]!.text,
    );
    expect(simulatePayload.path).toEqual(['a', 'b', 'c']);
    expect(simulatePayload.endState).toBe('c');

    const renderRes = await client.callTool({ name: 'fsl_render', arguments: { source } });
    const renderPayload = JSON.parse(
      (renderRes.content as Array<{ type: string; text: string }>)[0]!.text,
    );
    expect(renderPayload.svg).toContain('<svg');

    await client.close();
    await handle.close();
  });

  it('returns an image content block for png renders', async () => {
    const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });
    const handle = startServer(serverTx);
    await client.connect(clientTx);

    const result = await client.callTool({
      name: 'fsl_render',
      arguments: { source: 'a -> b;', format: 'png', width: 320 },
    });
    const content = result.content as ({ type: string; data?: string; mimeType?: string })[];
    const image = content.find((c) => c.type === 'image');
    expect(image).toBeDefined();
    expect(image?.mimeType).toBe('image/png');
    const bytes = Buffer.from(image?.data ?? '', 'base64');
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
    const summary = content.find((c) => c.type === 'text');
    expect(summary).toBeDefined();

    await client.close();
    await handle.close();
  });

  it('forwards all raster options end-to-end (bounded gif)', async () => {
    const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });
    const handle = startServer(serverTx);
    await client.connect(clientTx);

    const result = await client.callTool({
      name: 'fsl_render',
      arguments: { source: 'a -> b;', format: 'gif', width: 200, height: 200, scale: 100, quality: 80, delay: 5, maxFrames: 2 },
    });
    const content = result.content as ({ type: string; data?: string; mimeType?: string })[];
    const image = content.find((c) => c.type === 'image');
    expect(image).toBeDefined();
    expect(image?.mimeType).toBe('image/gif');
    const bytes = Buffer.from(image?.data ?? '', 'base64');
    const head = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0);
    expect(head).toBe('GIF8');

    await client.close();
    await handle.close();
  });

  it('serves the flowchart guide through fsl_guide', async () => {
    const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });
    const handle = startServer(serverTx);
    await client.connect(clientTx);

    const result = await client.callTool({ name: 'fsl_guide', arguments: { topic: 'flowcharts' } });
    const content = result.content as { type: string; text?: string }[];
    const text = content.find((c) => c.type === 'text');
    expect(text?.text).toContain('# Flowcharts in FSL');
    expect(text?.text).toContain('shape: diamond');

    await client.close();
    await handle.close();
  });

  it('serves the full language primer through fsl_guide', async () => {
    const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });
    const handle = startServer(serverTx);
    await client.connect(clientTx);

    const result = await client.callTool({ name: 'fsl_guide', arguments: { topic: 'language' } });
    const content = result.content as { type: string; text?: string }[];
    const text = content.find((c) => c.type === 'text');
    expect(text?.text).toContain('Finite State Language (authoring guide for LLMs)');
    expect(text?.text).toContain('# Flowcharts in FSL');

    await client.close();
    await handle.close();
  });

  it('scaffolds a renamed decision preset through fsl_scaffold', async () => {
    const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });
    const handle = startServer(serverTx);
    await client.connect(clientTx);

    const result = await client.callTool({ name: 'fsl_scaffold',
      arguments: { preset: 'decision', machine_name: 'Fraud Check', roles: { decision: 'Screen', outcomes: ['Approve', 'Deny'] } } });
    const content = result.content as { type: string; text?: string }[];
    const text = content.find((c) => c.type === 'text');
    expect(text?.text).toBeDefined();
    const parsed = JSON.parse(text?.text ?? '{}') as { valid: boolean; family: string; source: string };
    expect(parsed.valid).toBe(true);
    expect(parsed.family).toBe('flowchart');
    expect(parsed.source).toContain('Approve');
    expect(parsed.source).toContain('Screen');
    expect(parsed.source).not.toContain('Validate');

    await client.close();
    await handle.close();
  });
});

describe('startServer error reporting', () => {
  it('reports an out-of-band transport error to stderr via onerror, never to stdout', async () => {
    // A minimal Transport double: enough for serveStdio to install its own
    // onerror/onmessage/onclose handlers on it without ever touching real
    // process stdio. Once startServer(transport) returns, transport.onerror
    // is the SDK's wrapper around the onerror we wired - invoking it here
    // simulates one of the ~18 out-of-band conditions serveStdio itself
    // reports (send failures, malformed envelopes, a failed wire.start(),
    // etc.), which is the seam this fix owns: getting that report to stderr
    // rather than letting it be dropped for want of a handler.
    const transport: Transport = {
      start: () => Promise.resolve(),
      send: () => Promise.resolve(),
      close: () => Promise.resolve(),
    };
    const handle = startServer(transport);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy   = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const outOfBand = new Error('simulated out-of-band transport error');
      transport.onerror?.(outOfBand);

      expect(errorSpy).toHaveBeenCalledWith(outOfBand);
      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
      logSpy.mockRestore();
      await handle.close();
    }
  });
});
