# fsl-mcp v0.3.0

> Version 0.3.0 was built on Friday, July 10, 2026 at GMT-07:00 `1783746895275` from hash `0019b7d`.

**fsl-mcp** is an MCP (Model Context Protocol) stdio server that lets an AI agent *author* [FSL](https://github.com/StoneCypher/jssm) finite-state machines — giving the model the same structured feedback the FSL editor gives a human (parse diagnostics, a rendered diagram, a plain-English explanation, a step-by-step simulation, and style lint notes) instead of leaving it to guess whether the FSL it just wrote is even valid. It wraps [`jssm`](https://github.com/StoneCypher/jssm), the reference FSL implementation, and exposes five tools over stdio via the official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk).

<!-- Supported embeds: 1783746895275 Friday, July 10, 2026 at GMT-07:00 98.5 62 33 0019b7d 0.77 3.08 1.78 3.31 5 124 95.95 95.91 100 119 0.3.0 -->

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
| `fsl_render` | `source`, `format?: "svg" \| "png"` | an SVG diagram (`format:"png"` degrades to svg + a note in v1), or diagnostics if invalid |
| `fsl_explain` | `source` | `{ states, transitions, start, terminals, summary }`, or diagnostics if invalid |
| `fsl_simulate` | `source`, `actions: string[]` | `{ endState, path, legalNext, rejected? }`, or diagnostics if invalid |
| `fsl_lint` | `source` | `{ notes: [{rule, message, line}] }` |

Under the hood, every tool runs the same non-throwing `analyze()` pass first and short-circuits to diagnostics on a compile error, so a model can always find out *why* its FSL didn't work instead of getting an exception.

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
    <td>119</td>
    <td>98.5<small>%</small></td>
    <td>95.95<small>%</small></td>
    <td>95.91<small>%</small></td>
    <td>100<small>%</small></td>
  </tr>
  <tr>
    <th>Stochastic</th>
    <td>5</td>
    <td>98.5<small>%</small></td>
    <td>0.77<small>%</small></td>
    <td>1.78<small>%</small></td>
    <td>3.31<small>%</small></td>
  </tr>
</table>

<table>
  <tr>
    <th></th>
    <th>Docblock count</th>
    <th>33<small>%</small></th>
  </tr>
  <tr>
    <th>Docblock coverage</th>
    <td>62</td>
    <td>33<small>%</small></td>
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
