
import nodeResolve    from '@rollup/plugin-node-resolve';
import commonjs       from '@rollup/plugin-commonjs';
import { visualizer } from "rollup-plugin-visualizer";
import dts            from 'rollup-plugin-dts';



// The MCP server surface (createServer/startServer, added in Task 9) pulls in
// @modelcontextprotocol/sdk, which drags along Node-only server dependencies
// (express, cors, ajv, cross-spawn, ...) — including an ajv .json schema file
// that plain Rollup can't parse without @rollup/plugin-json. None of that is
// meaningful to inline into the public library bundles (a stdio server can't
// run in a browser regardless), so it's left external here the same way the
// dedicated bin bundle below externalizes it. jssm/jssm/viz are unaffected and
// stay inlined as before.
const server_deps_external = [ '@modelcontextprotocol/sdk', /^@modelcontextprotocol\/sdk\//, 'zod', /^node:/ ];

// jssm/viz's renderer (@viz-js/viz) does an internal `await import(...)` of its
// wasm-loading module. That dynamic import is a pre-existing latent issue for
// these single-file bundles (it predates Task 9 — index.ts already re-exported
// fslRender/jssm-viz before this task) that only surfaces once the SDK's own
// resolve error (above) is fixed: Rollup refuses to emit a dynamic-import
// split as a single `output.file`. `inlineDynamicImports` folds that chunk
// back into the one file these configs already expect.
const inline_dynamic_imports = true;





const es_config = {

  input: 'build/ts/index.js',

  output: {
    file                 : 'build/rollup/index.mjs',
    format               : 'es',
    name                 : 'fsl-mcp',
    sourcemap            : true,
    inlineDynamicImports : inline_dynamic_imports
  },

  external: server_deps_external,

  plugins : [

    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : [ '.ts' ],
      preferBuiltins : false
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
    file                 : 'build/rollup/index.cjs',
    format               : 'commonjs',
    name                 : 'fsl-mcp',
    sourcemap            : true,
    inlineDynamicImports : inline_dynamic_imports
  },

  external: server_deps_external,

  plugins : [

    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : [ '.ts' ],
      preferBuiltins : false
    }),

    commonjs()

  ]

};





const iife_config = {

  input: 'build/ts/index.js',

  output: {
    file      : 'build/rollup/index.iife.js',
    // IIFE's `name` becomes a `var` declaration, so (unlike the ES/CJS builds
    // above) it must be a legal JS identifier once externals are involved —
    // 'fsl-mcp' isn't. createServer/startServer need stdio and Node's process
    // and can never run in a browser regardless of bundling, so the externals
    // below are given inert placeholder globals: the rest of the IIFE surface
    // (fslValidate/fslLint/fslExplain/fslSimulate/fslRender) is unaffected,
    // and only calling createServer/startServer in-browser would throw.
    name      : 'fslMcp',
    globals   : {
      '@modelcontextprotocol/sdk/server/mcp.js'  : '__fsl_mcp_sdk_unavailable_in_browser__',
      '@modelcontextprotocol/sdk/server/stdio.js': '__fsl_mcp_sdk_unavailable_in_browser__',
      zod                                        : '__fsl_mcp_sdk_unavailable_in_browser__'
    },
    sourcemap            : true,
    inlineDynamicImports : inline_dynamic_imports
  },

  external: server_deps_external,

  plugins : [

    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : [ '.ts' ],
      preferBuiltins : false
    }),

    commonjs()

  ]

};





// const cli_config = {

//   input: 'build/ts/cli.js',

//   output: {
//     file   : 'build/rollup/cli.cjs',
//     format : 'commonjs',
//     banner : '#!/usr/bin/env node',
//     name   : 'fsl-mcp-cli'
//   },

//   plugins : [

//     nodeResolve({
//       mainFields     : ['module', 'main'],
//       browser        : false,
//       extensions     : [ '.ts', '.js' ],
//       preferBuiltins : true
//     }),

//     commonjs(),

//     visualizer()

//   ]

// };




// Emits the CommonJS .d.cts declaration that used to live in
// rollup.ctsphase.config.js. Input is the freshly-emitted .d.ts from
// `tsc --build` (build/ts/index.d.ts), so this config does not need
// to wait for the build chain's `dts` step to copy declarations into
// dist/ — it can run in the same Rollup invocation as the bundlers.
const cjs_cts = {

  input: 'build/ts/index.d.ts',

  output: {
    file   : './dist/index.d.cts',
    format : 'es'
  },

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

  external: [ 'jssm', 'jssm/viz', '@modelcontextprotocol/sdk', /^@modelcontextprotocol\/sdk\//, 'zod', /^node:/ ],

  plugins : [

    nodeResolve({
      exportConditions : ['node'],
      preferBuiltins   : true,
      extensions       : ['.ts', '.js']
    }),

    commonjs()

  ]

};




export default [ es_config, cjs_config, iife_config, cjs_cts, bin_config ];  // , cli_config ];
