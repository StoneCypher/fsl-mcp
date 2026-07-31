import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';

const TOOLS = ['fsl_explain', 'fsl_guide', 'fsl_lint', 'fsl_render',
               'fsl_scaffold', 'fsl_simulate', 'fsl_validate'].sort();

// See src/ts/e2e/dual-era.spec.ts for why both reserved `_meta` keys are
// required: the SDK's envelope validation (REQUIRED_ENVELOPE_KEYS in
// node_modules/@modelcontextprotocol/server/dist/src-CX2iR2pK.mjs) treats a
// request carrying only `protocolVersion` as an invalid envelope, not a
// modern one, and answers it with an error instead of routing it.
const META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientCapabilities': {},
};

/**
 * Run the real bin entry as a child process and send it one request.
 * Resolves with every stdout line, the stderr text, and the exit code.
 */
function runBin(request: Record<string, unknown>): Promise<{
  lines: string[]; stderr: string; code: number | null;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['jiti', 'src/ts/bin.ts'], { shell: true });
    let out = '';
    let err = '';
    child.stdout.on('data', (c: Buffer) => { out += c.toString(); });
    child.stderr.on('data', (c: Buffer) => { err += c.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ lines: out.split('\n').filter((l) => l.trim() !== ''), stderr: err, code });
    });
    child.stdin.write(`${JSON.stringify(request)}\n`);
    // Closing stdin is the spec's portable shutdown signal; the server
    // should exit on EOF rather than needing to be killed.
    setTimeout(() => { child.stdin.end(); }, 4000);
  });
}

describe('fsl-mcp bin entry as a real subprocess', () => {
  it('serves tools/list over real process stdio and exits on stdin close', async () => {
    const { lines, code } = await runBin({
      jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: META },
    });

    // Every stdout line MUST be a valid MCP message - stdout is the protocol
    // channel, and one stray console.log corrupts the stream for every client.
    const parsed = lines.map((l) => JSON.parse(l) as { id?: number; result?: Record<string, unknown> });

    const reply = parsed.find((m) => m.id === 1);
    const tools = reply?.result?.['tools'] as { name: string }[] | undefined;
    expect(tools?.map((t) => t.name).sort()).toEqual(TOOLS);
    expect(code).toBe(0);
  }, 30_000);
});
