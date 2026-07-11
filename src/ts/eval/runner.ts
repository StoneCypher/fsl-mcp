import { spawn as nodeSpawn } from 'node:child_process';
import { extractFsl }         from './score.js';
import type { Invocation, TrialResult } from './types.js';

/** Async spawn of the `claude` CLI: pass argv + stdin, get stdout + exit code. Injectable for tests. */
export type ClaudeSpawn = (args: string[], stdin: string) => Promise<{ stdout: string; code: number }>;

/** Default spawn: run the real `claude` CLI, feeding the prompt on stdin. */
function defaultSpawn(args: string[], stdin: string): Promise<{ stdout: string; code: number }> {
  /* v8 ignore start -- shells out to the real claude CLI; untestable without a live process */
  return new Promise((resolve, reject) => {
    const child = nodeSpawn('claude', args, { stdio: ['pipe', 'pipe', 'inherit'] });
    let stdout = '';
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.on('error', reject);
    child.on('close', code => { resolve({ stdout, code: code ?? 1 }); });
    child.stdin.end(stdin);
  });
  /* v8 ignore stop */
}

/**
 * Run one trial: spawn `claude -p`, parse the JSON envelope, extract the FSL.
 * Never throws — failures surface as `{ fsl: null, error }` so the sweep continues.
 *
 * @param inv - the built invocation (args + stdin prompt)
 * @param spawn - injectable spawn (defaults to the real `claude` CLI)
 * @returns the extracted FSL (or null) and an error note on failure
 *
 * @example
 *   await runTrial({ args: ['-p','--output-format','json'], prompt: '...' })
 */
export async function runTrial(inv: Invocation, spawn: ClaudeSpawn = defaultSpawn): Promise<TrialResult> {
  let stdout: string;
  let code: number;
  try {
    ({ stdout, code } = await spawn(inv.args, inv.prompt));
  } catch (err) {
    return { fsl: null, error: `spawn failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (code !== 0) { return { fsl: null, error: `claude exited ${String(code)}` }; }

  let envelope: { is_error?: boolean; result?: unknown };
  try {
    envelope = JSON.parse(stdout) as { is_error?: boolean; result?: unknown };
  } catch {
    return { fsl: null, error: 'claude output was not JSON' };
  }

  if (envelope.is_error === true) { return { fsl: null, error: 'claude reported is_error' }; }

  const result = typeof envelope.result === 'string' ? envelope.result : '';
  return { fsl: extractFsl(result) };
}
