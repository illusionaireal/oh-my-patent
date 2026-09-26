# 使用指南与 CLI 参考

[文档中心](./README.md) · [English](./usage-en.md)

## 安装

需要 Node.js 22+、npm 和已配置的 AI 编程宿主。建议使用专门的专利工作区；
在已有工作区安装前，先备份现有的指令与配置文件。

```bash
npm install -g oh-my-patent
oh-my-patent adapt setup --workspace-dir .
oh-my-patent check --workspace-dir .
```

Setup 默认安装三个适配器的配置。只选择一个平台时：

```bash
oh-my-patent adapt setup --tool claude-code --workspace-dir .
oh-my-patent adapt setup --tool codex --workspace-dir .
oh-my-patent adapt setup --tool opencode --workspace-dir .
```

只运行你需要的那一条。`setup` 与 `install` 执行相同安装逻辑，并额外输出完成提示；
npm 安装完成后，需要显式执行这一步。

| 适配器 | 写入工作区的文件 |
|---|---|
| Claude Code | `.claude/agents/`、`.claude/commands/`、`.claude/settings.json`、`CLAUDE.md` |
| Codex | `.codex/agents/`、`.codex/commands/`、`.codex/skills/`、`AGENTS.md`、`codex.json`、`plugins/oh-my-patent/`、`.agents/plugins/marketplace.json` |
| OpenCode | `.opencode/agent/`、`.opencode/command/`、`.opencode/skills/` |

Claude Code 和 Codex 会覆盖生成路径上的文件，包括工作区指令文件。
OpenCode 安装时跳过已存在的文件。
Claude Code 还会将工作区智能体、命令目录中的 Markdown 文件复制到
`~/.claude-best/agents/` 与 `~/.claude-best/commands/`，覆盖同名文件；
这些目录中原有的 Markdown 文件也会被复制。

## 平台说明

在宿主中打开同一工作区，加载生成的集成后，再使用 `/archimedes`。
各平台生成的内容不同：

- **Claude Code**：工作区智能体与命令定义，以及 `CLAUDE.md`。
- **Codex**：指令文件与提示词目录，以及 `plugins/oh-my-patent/` 下的本地插件和
  marketplace 清单。请通过所安装 Codex 版本的插件功能启用本地插件。
  `codex.json` 是供封装工具使用的清单，不会把所有目录项自动变成可原生调用的子智能体。
- **OpenCode**：`.opencode/` 下的智能体、命令与技能定义。

命令未出现时，确认工作区路径、检查生成文件，并重新加载宿主集成。
专业智能体调度依赖宿主的实际能力；在终端输入智能体名称不会发起调用。

先提供选题，再用 `/patent-status` 查看进度，或用 `/brainstorm-resume` 回访已记录的构思。
完整入口见[命令清单](./agents.md#命令)。

## 环境检查

```bash
oh-my-patent check --workspace-dir .
oh-my-patent check --workspace-dir . --json
oh-my-patent check --workspace-dir . --mcp-status
oh-my-patent check --workspace-dir . --output readiness.md
```

检查内容包括运行时、外部工具、项目状态与 MCP 配置。
MCP 配置状态不等于已成功建立实时连接。

`--mcp-add <template-id>` 写入 MCP 配置模板；
`--mcp-key <key=value,...>` 提供模板参数。支持的模板 ID：
`patsnap_search`、`google_scholar`、`uspto_patent`、`cnipa_patent`、`semantic_scholar`。
每次选择一种检查模式；`--output` 保存默认格式化报告，不保存
`--json` 或 `--mcp-status` 模式的结果。

Mermaid 渲染需要 `mmdc` 可执行程序。PlantUML 渲染器会把附图源码发送到配置的服务端；
[渲染器配置](../src/core/diagram-types.ts)中的默认地址是
`https://www.plantuml.com/plantuml`。检索能力取决于宿主中配置的服务。

## CLI 参考

可执行命令为 `oh-my-patent`。下表中的 `<project>` 表示单个专利项目目录，
例如 `./projects/01-private-computing`；`<workspace>` 表示保存宿主配置和项目的工作区。
执行前替换尖括号占位符；`@file` 表示从本地文件读取输入。

### 适配器

| 接在 `oh-my-patent` 后面的命令 | 用途 |
|---|---|
| `adapt setup --workspace-dir <workspace> [--tool <name>]` | 安装工作区集成并显示完成提示 |
| `adapt install --workspace-dir <workspace> [--tool <name>]` | 安装工作区集成 |
| `adapt generate [--tool <name>] [--output <dir>] [--workspace-dir <workspace>]` | 向输出目录写入生成文件 |
| `adapt uninstall --workspace-dir <workspace> [--tool <name>]` | 移除适配器文件，具体行为见下方卸载说明 |

平台名称为 `claude-code`、`codex`、`opencode`；省略 `--tool` 时选择全部。
Setup、install、uninstall 默认使用当前工作目录。
Generate 默认写入安装包内的 `plugins/<tool>/`；可指定输出目录，先检查生成内容：

```bash
oh-my-patent adapt generate --tool codex --workspace-dir . --output ./adapter-preview
```

高级用法可通过 `--plugin-dir <dir>` 指定另一份插件定义包。

指定 `--output` 时，生成文件位于 `<dir>/<tool>/`。
使用 `adapt install --prune`（或 `adapt setup --prune`）清理带有生成器归属标记的过时文件；
没有标记的文件会保留。设置 `PLANTUML_SERVER_URL` 可改用私有 PlantUML 服务。

### 决策路径

| 接在 `oh-my-patent path` 后面的命令 | 用途 |
|---|---|
| `init <project>` | 初始化 `.brainstorm/` 及路径索引 |
| `record <project> --round <N> --data <json\|@file>` | 保存本轮产出、创新点、评分与决策 |
| `overview <project>` | 读取路径概览 |
| `node <project> <node-id>` | 读取某一轮记录 |
| `innovation <project> <innovation-id>` | 读取单个创新点的历史 |
| `innovations <project>` | 列出全部创新点 |
| `branch <project> --from-node <id> --reason <text>` | 从已记录节点创建替代路径 |
| `branches <project>` | 列出分支 |
| `restore <project> --node <id> --innovation <id>` | 恢复已记录的创新点 |
| `threshold <project> --round <N>` | 评估指定轮次中保存的评分 |
| `visualize <project> [--mode <mode>] [--target <id>] [--output <file>]` | 输出终端可视化 |
| `markdown <project> [--mode <mode>] [--target <id>] [--output <file>]` | 输出 Markdown 报告 |

两种报告命令都支持 `overview`（默认）、`node`、`innovation`、`branch`；
只有 `visualize` 支持 `dashboard`。详情模式需要 `--target`。
`path init` 不会初始化工作流状态，也不会生成交底书。

```bash
oh-my-patent path overview ./projects/01-private-computing
oh-my-patent path node ./projects/01-private-computing round-1
oh-my-patent path branch ./projects/01-private-computing --from-node round-1 --reason "Explore a hardware implementation"
oh-my-patent path markdown ./projects/01-private-computing --output path-report.md
```

分支示例中的节点必须已经存在。需要交互查看时，进入专利项目目录后运行
`oh-my-patent tui`。

### 附图

| 接在 `oh-my-patent diagram` 后面的命令 | 用途 |
|---|---|
| `render <project> [--specs <json\|@file>] [--phase draft\|final]` | 渲染 SVG/PNG，并更新已有 `MAIN.md` 中的引用 |
| `status <project>` | 读取附图清单 |
| `rerender <project> --figure <id> --source <text\|@file> [--engine mermaid\|plantuml]` | 重渲染单张图；省略引擎时先看清单，再看源文件扩展名，最后才是 Mermaid |

输入为 [FigureSpec](../src/core/diagram-types.ts) 数组。每项包含
`figureId`、`figureNumber`、`title`、`description`、`diagramType`、`engine`、
`source` 与 `phase`。这些规格由智能体准备；渲染 CLI 本身不从自然语言中推导图形。

```bash
oh-my-patent diagram render ./projects/01-private-computing --specs @./projects/01-private-computing/references/diagram-specs-draft.json --phase draft
oh-my-patent diagram status ./projects/01-private-computing
```

省略 `--specs` 时，CLI 读取 `references/diagram-specs-<phase>.json`
（`--phase` 缺省为 `draft`）。`--phase final` 不会回退到草稿规格文件；
文件不存在就报错。同时设置每项规格的 `phase`：CLI 参数标记返回结果，
附图清单使用规格中的值。

## 卸载

卸载前先备份对生成文件的修改，并在完成工作区清理前保留 CLI。

```bash
oh-my-patent adapt uninstall --workspace-dir .
npm uninstall -g oh-my-patent
```

添加 `--tool claude-code`、`--tool codex` 或 `--tool opencode` 可只移除一个平台。
各适配器按其列举的文件路径处理：

- **Claude Code 与 Codex**：直接删除对应路径的文件，不比较内容。
  对生成文件、`CLAUDE.md`、`AGENTS.md` 或共享配置路径的修改也可能被删除。
- **Claude Code**：还会删除 `~/.claude-best/` 中已注册智能体和命令对应的文件；
  其他工作区可能也在使用这些文件。
- **OpenCode**：只删除内容与当前生成结果一致的文件；修改过或内容不同的旧版文件会跳过。
  请检查输出中报告的跳过项。

`MAIN.md`、`references/`、`.brainstorm/`、`.patent/` 等项目产物不在适配器删除清单中。

实现依据：[CLI](../src/cli.ts)、[Claude 适配器](../src/adapters/claude/index.ts)、
[Codex 适配器](../src/adapters/codex/index.ts)、[OpenCode 适配器](../src/adapters/opencode/index.ts)。
