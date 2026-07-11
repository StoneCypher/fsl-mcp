import { spawn as nodeSpawn } from 'node:child_process';
import { extractFsl }         from './score.js';
import type { Invocation, TrialResult } from './types.js';

/**
 * Async spawn of the `claude` CLI: pass argv + stdin, get stdout + exit code.
 * An optional `signal` is passed by `runTrial`'s timeout guard so the spawn
 * can abort a hung child. Injectable for tests.
 */
export type ClaudeSpawn = (args: string[], stdin: string, signal?: AbortSignal) => Promise<{ stdout: string; code: number }>;

/** Per-trial timeout ceiling, in milliseconds: generous enough for a `tools`
 *  trial (which may legitimately run for minutes) while still bounding a
 *  hung `claude` call so one stuck trial can't stall an entire sweep. */
export const DEFAULT_TRIAL_TIMEOUT_MS = 600_000;

/**
 * Default spawn: run the real `claude` CLI, feeding the prompt on stdin.
 * Kills the child with `SIGTERM` if `signal` fires (wired to `runTrial`'s
 * timeout), so a hung call is actually terminated rather than left running.
 */
function defaultSpawn(args: string[], stdin: string, signal?: AbortSignal): Promise<{ stdout: string; code: number }> {
  /* v8 ignore start -- shells out to the real claude CLI; untestable without a live process */
  return new Promise((resolve, reject) => {
    const child = nodeSpawn('claude', args, { stdio: ['pipe', 'pipe', 'inherit'] });
    let stdout = '';
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.on('error', reject);
    child.on('close', code => { resolve({ stdout, code: code ?? 1 }); });
    child.stdin.end(stdin);
    signal?.addEventListener('abort', () => { child.kill('SIGTERM'); });
  });
  /* v8 ignore stop */
}

/**
 * Race `work` against a `ms`-millisecond timer. Calls `onTimeout` once and
 * rejects with an `Error` whose message starts with `timeout after` if the
 * timer fires first; always clears the timer afterward so neither outcome
 * leaves a dangling handle open.
 *
 * @param work - the promise being bounded
 * @param ms - the timeout, in milliseconds
 * @param onTimeout - invoked synchronously when the timer fires, before the
 *   race rejects (used to signal cancellation to the loser)
 * @returns `work`'s resolution, when it settles before the timer
 * @throws {Error} with a `timeout after <seconds>s` message, when the timer
 *   fires first
 */
async function withTimeout<T>(work: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      onTimeout();
      reject(new Error(`timeout after ${String(ms / 1000)}s`));
    }, ms);
  });
  try {
    return await Promise.race([work, limit]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run one trial: spawn `claude -p`, parse the JSON envelope, extract the FSL.
 * Never throws — failures (a spawn error, or exceeding `timeoutMs`, in which
 * case the child is killed) surface as `{ fsl: null, error }` so the sweep
 * continues.
 *
 * @param inv - the built invocation (args + stdin prompt)
 * @param spawn - injectable spawn (defaults to the real `claude` CLI)
 * @param timeoutMs - how long to wait before killing a hung call and
 *   recording a timeout error (default {@link DEFAULT_TRIAL_TIMEOUT_MS})
 * @returns the extracted FSL (or null) and an error note on failure
 *
 * @example
 *   await runTrial({ args: ['-p','--output-format','json'], prompt: '...' })
 */
export async function runTrial(
  inv: Invocation,
  spawn: ClaudeSpawn = defaultSpawn,
  timeoutMs: number = DEFAULT_TRIAL_TIMEOUT_MS,
): Promise<TrialResult> {
  const controller = new AbortController();
  let stdout: string;
  let code: number;
  try {
    ({ stdout, code } = await withTimeout(
      spawn(inv.args, inv.prompt, controller.signal),
      timeoutMs,
      () => { controller.abort(); },
    ));
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('timeout after')) {
      return { fsl: null, error: err.message };
    }
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
