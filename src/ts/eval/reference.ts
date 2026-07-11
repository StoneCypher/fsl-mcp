import { spawnSync } from 'node:child_process';

/** A synchronous spawn returning captured stdout and an exit status. Injectable for tests. */
export type PrimerSpawn = (cmd: string, args: string[]) => { stdout: string; status: number };

/** Default spawn: run the installed jssm `fsl-export-system-prompt` CLI via npx. */
function defaultSpawn(cmd: string, args: string[]): { stdout: string; status: number } {
  /* v8 ignore start -- shells out to a real CLI; untestable without a live process */
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return { stdout: r.stdout ?? '', status: r.status ?? 1 };
  /* v8 ignore stop */
}

/**
 * Capture the version-locked FSL language primer from jssm's
 * `fsl-export-system-prompt` CLI. Returns the primer text, or null if the CLI
 * is unavailable or fails — callers skip the reference conditions on null.
 *
 * @param spawn - injectable synchronous spawn (defaults to a real npx call)
 * @returns the primer text, or null when unavailable
 *
 * @example
 *   const primer = captureReference();
 *   if (primer === null) { /* skip reference conditions *\/ }
 */
export function captureReference(spawn: PrimerSpawn = defaultSpawn): string | null {
  try {
    const { stdout, status } = spawn('npx', ['fsl-export-system-prompt']);
    if (status !== 0) { return null; }
    const text = stdout.trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
