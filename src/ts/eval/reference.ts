import { spawnSync } from 'node:child_process';

/** A synchronous spawn returning captured stdout and an exit status. Injectable for tests. */
export type PrimerSpawn = (cmd: string, args: string[]) => { stdout: string; status: number };

/**
 * Default spawn: run the installed jssm `fsl-export-system-prompt` CLI via
 * npx. On win32, `npx` resolves through a `.cmd` shim that `spawnSync` cannot
 * exec directly without `shell: true` (it otherwise fails with `ENOENT`), so
 * on that platform only, the command and its args are joined into a single
 * string and run through the shell — passing `shell: true` alongside a
 * separate args array instead triggers Node's `DEP0190` warning, since the
 * args would be concatenated into the shell command line unescaped. Other
 * platforms exec `cmd`/`args` directly, unchanged from before.
 */
function defaultSpawn(cmd: string, args: string[]): { stdout: string; status: number } {
  /* v8 ignore start -- shells out to a real CLI; untestable without a live process */
  const r = process.platform === 'win32'
    ? spawnSync([cmd, ...args].join(' '), { encoding: 'utf8', shell: true })
    : spawnSync(cmd, args, { encoding: 'utf8' });
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
