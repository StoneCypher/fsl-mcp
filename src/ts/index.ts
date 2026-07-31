// Public API surface for fsl-mcp. Tool exports are added by later tasks.

export type { FslDiagnostic, FslSeverity } from './types.js';

export { fslValidate } from './tools/validate.js';
export type { ValidateResult } from './tools/validate.js';

export { fslLint } from './tools/lint.js';
export type { LintResult, LintNote } from './tools/lint.js';

export { fslExplain } from './tools/explain.js';
export type { ExplainResult, ExplainError, ExplainTransition } from './tools/explain.js';

export { fslSimulate } from './tools/simulate.js';
export type { SimulateResult, SimulateError } from './tools/simulate.js';

export { fslRender, RasterizationUnsupportedError } from './tools/render.js';
export type { RenderFormat, RenderRasterOptions, RenderEngine, RenderSvg, RenderDot, RenderImage, RenderUnsupported, RenderFailure, RenderError } from './tools/render.js';

export { createServer, startServer } from './server.js';

// `startServer` returns the SDK's stdio handle. Re-exported so a consumer can
// name the type of what they were handed without reaching into an SDK subpath.
export type { StdioServerHandle } from '@modelcontextprotocol/server/stdio';
