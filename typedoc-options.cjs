module.exports = {
  name: 'fsl-mcp',
  readme: './README.md',
  out: 'docs/docs',
  plugin: [ 'typedoc-plugin-coverage' ],
  coverageOutputPath: './coverage-typedoc/coverage-typedoc.json',
  coverageOutputType: 'json',
  // entryPoints: [ 'packages/*' ],
  // customCss: './src/site/typedoc-addon.css',
  // entryPointStrategy: 'packages',
  excludePrivate: true,
  // `StdioServerHandle` is re-exported from src/ts/index.ts so consumers can
  // name what `startServer` returns. Its docblock lives in the MCP SDK and
  // `@link`s the SDK's own `serveStdio`, which fsl-mcp does not re-export, so
  // typedoc cannot resolve the target. Mapping it here keeps the docs build
  // warning-free without pretending to document an external symbol.
  externalSymbolLinkMappings: {
    '@modelcontextprotocol/server': { serveStdio: '#' }
  }
};