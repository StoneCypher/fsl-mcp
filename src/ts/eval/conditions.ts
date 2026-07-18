import type { Task, Condition, Invocation } from './types.js';

/** Instruction appended to every task prompt: emit exactly one fenced fsl block. */
export const PROMPT_PREAMBLE: string =
  'You are authoring an FSL (finite state language) machine. Output your final machine as a single fenced code block tagged fsl, like:\n' +
  '```fsl\na -> b;\n```\n' +
  'Output only that one fsl block as your machine; no other code blocks.';

/**
 * The `--mcp-config` file contents wiring the fsl-mcp stdio server at `binPath`.
 *
 * @example
 *   mcpConfigJson('/repo/dist/bin.mjs')
 *   // => '{"mcpServers":{"fsl":{"command":"node","args":["/repo/dist/bin.mjs"]}}}'
 */
export function mcpConfigJson(binPath: string): string {
  return JSON.stringify({ mcpServers: { fsl: { command: 'node', args: [binPath] } } });
}

/**
 * Build the `claude -p` invocation (args + stdin prompt) for one task under one
 * condition. Reference conditions prepend the primer; tools conditions add
 * `--mcp-config` and auto-allow the fsl_* tools. `--strict-mcp-config` is always
 * set so the user's own MCP servers never leak into a condition.
 *
 * @param task - the task being authored
 * @param condition - which of the four conditions
 * @param opts - the model id, the reference primer text, and the temp mcp-config path
 * @returns the argv (excluding the `claude` program itself) and the stdin prompt
 *
 * @example
 *   buildInvocation(task, 'tools', { model: 'claude-opus-4-8', primer, mcpConfigPath })
 */
export function buildInvocation(
  task: Task,
  condition: Condition,
  opts: { model: string; primer: string; mcpConfigPath: string },
): Invocation {
  const usesReference = condition === 'reference' || condition === 'reference+tools';
  const usesTools     = condition === 'tools'     || condition === 'reference+tools';

  const args: string[] = ['-p', '--output-format', 'json', '--model', opts.model, '--strict-mcp-config'];

  if (usesTools) {
    args.push('--mcp-config', opts.mcpConfigPath);
    // Auto-allow the server's tools so the run never blocks on a permission prompt.
    args.push('--allowedTools', 'mcp__fsl__fsl_validate,mcp__fsl__fsl_render,mcp__fsl__fsl_explain,mcp__fsl__fsl_simulate,mcp__fsl__fsl_lint,mcp__fsl__fsl_guide');
  }

  const prompt = usesReference
    ? `${opts.primer}\n\n---\n\n${PROMPT_PREAMBLE}\n\n${task.prompt}`
    : `${PROMPT_PREAMBLE}\n\n${task.prompt}`;

  return { args, prompt };
}
