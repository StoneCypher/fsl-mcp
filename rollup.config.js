
import nodeResolve    from '@rollup/plugin-node-resolve';
import commonjs       from '@rollup/plugin-commonjs';
import { visualizer } from "rollup-plugin-visualizer";
import dts            from 'rollup-plugin-dts';




// fsl-mcp is a stdio MCP server. It ships three ESM/CJS outputs and nothing else:
//
//   - bin.mjs   — the `npx fsl-mcp` executable (what actually runs)
//   - index.mjs — the importable ESM library (the five tool functions +
//                 createServer/startServer), for `import`-ing the server or
//                 calling the tools directly in a Node program
//   - index.cjs — the same library for CommonJS consumers (`require`)
//
// There is deliberately no IIFE/browser build: a stdio server can't run in a
// browser, so a browser global would be dead weight.
//
// Every runtime dependency is left EXTERNAL in all bundles. jssm, jssm/viz,
// `@modelcontextprotocol/server`, and zod are all declared dependencies, so a
// consumer installing fsl-mcp already has them — inlining them would bloat the
// bundles and defeat dependency dedup. It would also *freeze* them: a consumer
// who patches a security advisory in the MCP SDK would still execute the copy
// welded into dist/bin.mjs. Keeping jssm/viz external also means its internal
// `await import('@viz-js/viz')` stays a normal dynamic import (no single-file
// inlining hack needed). The ESM .d.ts is produced by `tsc --build` and copied
// into dist/ by the `dts` npm script; the CJS .d.cts is bundled by cjs_cts below.
//
// The regex entry is load-bearing: the code imports the `./stdio` subpath
// (`@modelcontextprotocol/server/stdio`), which the bare string alone does not
// match. If the SDK package name ever changes again, BOTH entries must move
// together or rollup silently inlines the whole SDK.
const external = [
  'jssm',
  'jssm/viz',
  'jssm/cli',
  '@modelcontextprotocol/server',
  /^@modelcontextprotocol\/server\//,
  '@viz-js/viz',
  /^@viz-js\//,
  'zod',
  /^node:/
];



const es_config = {

  input: 'build/ts/index.js',

  output: {
    file      : 'build/rollup/index.mjs',
    format    : 'es',
    sourcemap : true
  },

  external,

  plugins : [

    nodeResolve({
      exportConditions : ['node'],
      extensions       : [ '.ts' ],
      preferBuiltins   : true
    }),

    commonjs(),

    visualizer({ filename: "build/rollup/visualizations/bundle_sunburst.html",   template: "sunburst" }),
    visualizer({ filename: "build/rollup/visualizations/bundle_treemap.html",    template: "treemap" }),
    visualizer({ filename: "build/rollup/visualizations/bundle_network.html",    template: "network" }),
    visualizer({ filename: "build/rollup/visualizations/bundle_flamegraph.html", template: "flamegraph" })

  ]

};



const cjs_config = {

  input: 'build/ts/index.js',

  output: {
    file      : 'build/rollup/index.cjs',
    format    : 'commonjs',
    sourcemap : true
  },

  external,

  plugins : [

    nodeResolve({
      exportConditions : ['node'],
      extensions       : [ '.ts' ],
      preferBuiltins   : true
    }),

    commonjs()

  ]

};



// Emits the CommonJS .d.cts declaration bundle from the freshly-emitted .d.ts
// (build/ts/index.d.ts from `tsc --build`), folding the tool/type declarations
// into one file for the CJS `require` types entry.
const cjs_cts = {

  input: 'build/ts/index.d.ts',

  output: {
    file   : './dist/index.d.cts',
    format : 'es'
  },

  external,

  plugins : [ dts() ]

};



const bin_config = {

  input: 'build/ts/bin.js',

  output: {
    file      : 'dist/bin.mjs',
    format    : 'es',
    banner    : '#!/usr/bin/env node',
    sourcemap : true
  },

  external,

  plugins : [

    nodeResolve({
      exportConditions : ['node'],
      preferBuiltins   : true,
      extensions       : ['.ts', '.js']
    }),

    commonjs()

  ]

};



export default [ es_config, cjs_config, cjs_cts, bin_config ];
