# fsl-mcp v{{version}}

> Version {{version}} was built on {{built_text}} `{{built}}` from hash `{{gh_hash}}`.

**fsl-mcp** is an MCP (Model Context Protocol) stdio server that lets an AI agent *author* [FSL](https://github.com/StoneCypher/jssm) finite-state machines — giving the model the same structured feedback the FSL editor gives a human (parse diagnostics, a rendered diagram, a plain-English explanation, a step-by-step simulation, and style lint notes) instead of leaving it to guess whether the FSL it just wrote is even valid. It wraps [`jssm`](https://github.com/StoneCypher/jssm), the reference FSL implementation, and exposes five tools over stdio via the official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk).

<!-- Supported embeds: {{built}} {{built_text}} {{coverage}} {{docblockcount}} {{doccoverage}} {{gh_hash}} {{stochbranch}} {{stochcoverage}} {{stochfunc}} {{stochline}} {{stochtestcount}} {{testcasecount}} {{unitbranch}} {{unitfunc}} {{unitline}} {{unittestcount}} {{version}} -->

&nbsp;

## Install / run

fsl-mcp ships as a standalone package and runs with no local install:

```sh
npx fsl-mcp
```

Point any MCP-speaking client at it with a stdio server entry:

```json
{
  "mcpServers": {
    "fsl": { "command": "npx", "args": ["fsl-mcp"] }
  }
}
```

&nbsp;

## The five tools

Every tool takes FSL `source` (a string) and returns structured JSON — never a thrown error for bad FSL, always diagnostics.

| Tool | Input | Returns |
|---|---|---|
| `fsl_validate` | `source` | `{ valid, diagnostics: [{severity, message, line, col}] }` |
| `fsl_explain` | `source` | `{ states, transitions, start, terminals, summary }`, or diagnostics if invalid |
| `fsl_simulate` | `source`, `actions: string[]` | `{ endState, path, legalNext, rejected? }`, or diagnostics if invalid |
| `fsl_lint` | `source` | `{ notes: [{rule, message, line}] }` |

Under the hood, every tool runs the same non-throwing `analyze()` pass first and short-circuits to diagnostics on a compile error, so a model can always find out *why* its FSL didn't work instead of getting an exception.

### fsl_render

Render FSL to a diagram.

| format | returns |
|--------|---------|
| `svg` (default) | SVG text |
| `dot` | Graphviz DOT text |
| `png` / `jpeg` | an MCP image content block (the model can see it) |
| `gif` | an animated random walk as an image content block |

Raster options: `width`, `height`, `scale` (zoom %, 100 = 3x natural), `quality`
(jpeg 1-100), `delay` (gif centiseconds/frame), `maxFrames` (gif frame ceiling -
keep it at or under 20 in chat contexts). PNG and GIF work in plain Node (via
jssm's bundled resvg-wasm); JPEG needs a Canvas-capable runtime and otherwise
degrades to SVG plus a note, as does any raster format when no backend is
available. Invalid source returns diagnostics, as everywhere else.

&nbsp;

## Ceilings (v1)

- **Rendering** is SVG-only. `format:"png"` is accepted but returns the SVG plus a `note` explaining that rasterization isn't shipped yet — there's no bundled rasterizer in v1.
- **Simulation** matches `fsl_simulate`'s `actions` against edge *action labels* first, then falls back to target-state names. Machines whose edges carry no action labels will report an empty `legalNext` even where target-state transitions are legal — this is a labeling ceiling, not a bug in the walk itself.

&nbsp;

## Test status

<table>
  <tr>
    <th></th>
    <th>Count</th>
    <th>Statement</th>
    <th>Branch</th>
    <th>Func</th>
    <th>Line</th>
  </tr>
  <tr>
    <th>Unit</th>
    <td>{{unittestcount}}</td>
    <td>{{coverage}}<small>%</small></td>
    <td>{{unitbranch}}<small>%</small></td>
    <td>{{unitfunc}}<small>%</small></td>
    <td>{{unitline}}<small>%</small></td>
  </tr>
  <tr>
    <th>Stochastic</th>
    <td>{{stochtestcount}}</td>
    <td>{{coverage}}<small>%</small></td>
    <td>{{stochbranch}}<small>%</small></td>
    <td>{{stochfunc}}<small>%</small></td>
    <td>{{stochline}}<small>%</small></td>
  </tr>
</table>

<table>
  <tr>
    <th></th>
    <th>Docblock count</th>
    <th>{{doccoverage}}<small>%</small></th>
  </tr>
  <tr>
    <th>Docblock coverage</th>
    <td>{{docblockcount}}</td>
    <td>{{doccoverage}}<small>%</small></td>
  </tr>
</table>

* [Site](https://stonecypher.github.io/fsl-mcp/index.html)
* [Documentation](https://stonecypher.github.io/fsl-mcp/docs/index.html)
* [Builds](https://www.github.com/stonecypher/fsl-mcp/actions)
* [Source](https://www.github.com/stonecypher/fsl-mcp/)

<img alt="star_chart" src="https://starchart.cc/StoneCypher/fsl-mcp.svg" />

<table>
  <tr>
    <td><img alt="sunburst visualization" src="bundle_sunburst.png" /></td>
    <td><img alt="treemap visualization" src="bundle_treemap.png" /></td>
  </tr>
  <tr>
    <td><img alt="network visualization" src="bundle_network.png" /></td>
    <td><img alt="flamegraph visualization" src="bundle_flamegraph.png" /></td>
  </tr>
</table>

&nbsp;

## License

MIT
