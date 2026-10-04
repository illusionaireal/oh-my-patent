---
name: brainstorm-path
description: Use when recording, querying, branching, restoring, or visualizing patent brainstorm decision paths.
---

# Skill: Brainstorm Path

Manage brainstorm decision paths — recording rounds, querying history, creating branches, evaluating thresholds, and rendering visualizations.

## Overview

The brainstorm path system records the evolution of innovation candidates across brainstorming rounds. It enables:
- Round-by-round recording with scores and decisions
- Threshold-based pass/iterate decisions
- Branching from any historical node
- Restoring abandoned innovations
- Visualizing the complete decision path

All operations are performed via the `oh-my-patent` CLI, which wraps the TypeScript APIs. **Do not manually write JSON files** — use the CLI commands below.

## CLI Access

```bash
node <oh-my-patent-dir>/dist/cli.js path <subcommand> [options]
```

Where `<oh-my-patent-dir>` is the path to the oh-my-patent plugin directory (e.g., `./oh-my-patent` from the workspace root).

## Subcommands

### Initialize a new path

```bash
node dist/cli.js path init <project-path>
```

Creates the `.brainstorm/` directory structure with `path.json`, `nodes/`, and `snapshots/`.

Output: `{ "ok": true, "pathId": "path-..." }`

### Record a brainstorm round

```bash
node dist/cli.js path record <project-path> \
  --round <N> \
  --data '<json-string>'
```

Or read from a file:
```bash
node dist/cli.js path record <project-path> \
  --round <N> \
  --data @/path/to/round-data.json
```

The `--data` JSON structure:
```json
{
  "projectId": "05-crypto-hsm-cache-concurrency",
  "topic": "加密机缓存并发优化",
  "agentOutputs": [
    {
      "agentId": "patent-innovation-architect",
      "outputFile": "references/brainstorm_round1_innovation_architect.md",
      "summary": "生成3个候选方案",
      "keyPoints": ["A1: 三级缓存架构", "A2: 失效协议"]
    }
  ],
  "innovations": [
    {
      "id": "INN-001",
      "title": "安全策略约束的多级缓存并发控制系统",
      "problem": "HSM高并发场景重复计算、缓存风暴",
      "coreSolution": ["三级缓存架构", "单flight并发控制"],
      "differences": ["vs R6/R7: HSM场景特化"],
      "status": "active"
    }
  ],
  "scores": [
    {
      "innovationId": "INN-001",
      "novelty": 8,
      "creativity": 8,
      "practicality": 9,
      "businessValue": 7,
      "weightedScore": 8.1
    }
  ],
  "decision": {
    "action": "ITERATE",
    "reason": "综合分 8.0 < 阈值 8.5",
    "recommendations": ["强化缓存键策略绑定的差异性描述"]
  }
}
```

Output: `{ "ok": true, "nodeId": "round-1", "pathId": "...", "totalNodes": 1, "status": "active" }`

### Show path overview

```bash
node dist/cli.js path overview <project-path>
```

Returns JSON with: totalRounds, currentRound, status, innovationEvolution, scoreProgression.

### Show node detail

```bash
node dist/cli.js path node <project-path> <node-id>
```

Example: `node dist/cli.js path node ./projects/05-crypto-hsm-cache-concurrency round-1`

### Show innovation history

```bash
node dist/cli.js path innovation <project-path> <innovation-id>
```

Example: `node dist/cli.js path innovation ./projects/05-crypto-hsm-cache-concurrency INN-001`

### List all innovations

```bash
node dist/cli.js path innovations <project-path>
```

Returns a JSON array of all innovation summaries with their status and scores.

### Create a branch

```bash
node dist/cli.js path branch <project-path> \
  --from-node round-2 \
  --reason "探索不同的整合策略"
```

Output: `{ "ok": true, "branchId": "path-...-branch-1", "parentPathId": "...", ... }`

### List branches

```bash
node dist/cli.js path branches <project-path>
```

### Restore an abandoned innovation

```bash
node dist/cli.js path restore <project-path> \
  --node round-1 \
  --innovation INN-003
```

### Evaluate threshold for a round

```bash
node dist/cli.js path threshold <project-path> --round <N>
```

Evaluates all innovation scores in the given round against default thresholds (passToDraft: 8.5, novelty red-line: 6.0, creativity red-line: 6.0). Returns decisions and improvement suggestions.

### Visualize the path (box-drawing)

```bash
node dist/cli.js path visualize <project-path> [--mode overview|node|innovation|branch|dashboard] [--target <id>]
```

Renders a formatted box-drawing visualization to stdout. Modes:
- `overview` (default): Full timeline with score sparklines
- `node`: Single node detail
- `innovation`: Innovation evolution history
- `branch`: Branch overview
- `dashboard`: Combined overview + latest node + top innovation

### Render as Markdown

```bash
node dist/cli.js path markdown <project-path> [--mode overview|node|innovation|branch] [--target <id>] [--output <file>]
```

Renders a Markdown report. Same modes as visualize but in Markdown format. Use `--output` to write to a file.

## Integration with Agents

### patent-path-recorder

After each brainstorm round, the Moderator should call:

```bash
node dist/cli.js path record <project-path> --round <N> --data '<round-data-json>'
```

**Do not manually create .brainstorm/ JSON files.** The CLI handles atomicity and consistency.

### patent-brainstorm-moderator

After scoring, use threshold evaluation:

```bash
node dist/cli.js path threshold <project-path> --round <N>
```

This returns the pass/iterate/force-pass decision with improvement suggestions.

### Archimedes (orchestrator)

To view the current brainstorm state:

```bash
node dist/cli.js path overview <project-path>
node dist/cli.js path visualize <project-path> --mode dashboard
```

To branch or restore:

```bash
node dist/cli.js path branch <project-path> --from-node <id> --reason "<text>"
node dist/cli.js path restore <project-path> --node <id> --innovation <id>
```

## File Structure

After initialization and recording, the project directory will contain:

```
<project>/
├── .brainstorm/
│   ├── path.json                    # Path metadata and edges
│   ├── nodes/
│   │   ├── round-1.json
│   │   └── round-2.json
│   ├── snapshots/
│   │   ├── round-1-innovations.json
│   │   └── round-2-innovations.json
│   └── branches/
│       ├── index.json               # Branch registry
│       └── path-...-branch-1/
│           └── nodes/               # Branch-specific node copies
└── references/
    └── brainstorm_round1_*.md       # Agent raw outputs
```
