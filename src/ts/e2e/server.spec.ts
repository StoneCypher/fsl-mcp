import { describe, it, expect } from 'vitest';
import { PassThrough } from 'node:stream';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer, startServer } from '../server.js';

describe('fsl-mcp server', () => {
  it('lists the five tools and validates FSL over the protocol', async () => {
    const server = createServer();
    const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });

    await Promise.all([server.connect(serverTx), client.connect(clientTx)]);

    const tools = await client.listTools();
    const names = tools.tools.map(t => t.name).sort();
    expect(names).toEqual(
      ['fsl_explain', 'fsl_lint', 'fsl_render', 'fsl_simulate', 'fsl_validate'].sort(),
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
      ['fsl_explain', 'fsl_lint', 'fsl_render', 'fsl_simulate', 'fsl_validate'].sort(),
    );

    await transport.close();
  });
});
