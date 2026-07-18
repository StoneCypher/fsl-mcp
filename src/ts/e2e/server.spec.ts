import { describe, it, expect } from 'vitest';
import { PassThrough } from 'node:stream';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer, startServer } from '../server.js';

describe('fsl-mcp server', () => {
  it('lists the seven tools and validates FSL over the protocol', async () => {
    const server = createServer();
    const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });

    await Promise.all([server.connect(serverTx), client.connect(clientTx)]);

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
  });

  it('returns an image content block for png renders', async () => {
    const server = createServer();
    const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });

    await Promise.all([server.connect(serverTx), client.connect(clientTx)]);

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
  });

  it('forwards all raster options end-to-end (bounded gif)', async () => {
    const server = createServer();
    const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });

    await Promise.all([server.connect(serverTx), client.connect(clientTx)]);

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
  });

  it('serves the flowchart guide through fsl_guide', async () => {
    const server = createServer();
    const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });

    await Promise.all([server.connect(serverTx), client.connect(clientTx)]);

    const result = await client.callTool({ name: 'fsl_guide', arguments: { topic: 'flowcharts' } });
    const content = result.content as { type: string; text?: string }[];
    const text = content.find((c) => c.type === 'text');
    expect(text?.text).toContain('# Flowcharts in FSL');
    expect(text?.text).toContain('shape: diamond');

    await client.close();
  });

  it('serves the full language primer through fsl_guide', async () => {
    const server = createServer();
    const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });

    await Promise.all([server.connect(serverTx), client.connect(clientTx)]);

    const result = await client.callTool({ name: 'fsl_guide', arguments: { topic: 'language' } });
    const content = result.content as { type: string; text?: string }[];
    const text = content.find((c) => c.type === 'text');
    expect(text?.text).toContain('Finite State Language (authoring guide for LLMs)');
    expect(text?.text).toContain('# Flowcharts in FSL');

    await client.close();
  });

  it('scaffolds a renamed decision preset through fsl_scaffold', async () => {
    const server = createServer();
    const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });

    await Promise.all([server.connect(serverTx), client.connect(clientTx)]);

    const result = await client.callTool({ name: 'fsl_scaffold',
      arguments: { preset: 'decision', machine_name: 'Fraud Check', roles: { outcomes: ['Approve', 'Deny'] } } });
    const content = result.content as { type: string; text?: string }[];
    const text = content.find((c) => c.type === 'text');
    expect(text?.text).toBeDefined();
    const parsed = JSON.parse(text?.text ?? '{}') as { valid: boolean; family: string; source: string };
    expect(parsed.valid).toBe(true);
    expect(parsed.family).toBe('flowchart');
    expect(parsed.source).toContain('Approve');

    await client.close();
  });
});

describe('startServer', () => {
  it('wires a real stdio transport and answers a JSON-RPC request over it', async () => {
    // Real StdioServerTransport, real newline-delimited JSON-RPC framing —
    // just backed by injected streams instead of the actual process
    // stdin/stdout, so the test never touches (or hijacks) real process IO.
    const stdin  = new PassThrough();
    const stdout = new PassThrough();
    const transport = new StdioServerTransport(stdin, stdout);

    await startServer(transport);

    const response = new Promise<{ result: { tools: { name: string }[] } }>(resolve => {
      stdout.once('data', (chunk: Buffer) => {
        resolve(JSON.parse(chunk.toString()) as { result: { tools: { name: string }[] } });
      });
    });
    stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })}\n`);

    const { result } = await response;
    expect(result.tools.map(t => t.name).sort()).toEqual(
      ['fsl_explain', 'fsl_guide', 'fsl_lint', 'fsl_render', 'fsl_scaffold', 'fsl_simulate', 'fsl_validate'].sort(),
    );

    await transport.close();
  });
});
