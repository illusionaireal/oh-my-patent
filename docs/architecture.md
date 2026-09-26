# 架构与开发

[文档中心](./README.md) · [English](./architecture-en.md)

## 四层架构

| 层次 | 职责 | 实现位置 |
|---|---|---|
| 可移植定义 | 注册智能体、技能、命令与默认配置 | [plugin.jsonc](../plugin.jsonc)、`src/agents/`、`src/skills/`、Markdown 命令定义 |
| 宿主适配 | 生成 Claude Code、Codex、OpenCode 集成 | [src/adapters/](../src/adapters/) |
| 运行时核心 | 管理工作流状态、决策路径、阈值、校验与附图渲染 | [src/core/](../src/core/) |
| 用户接口 | 通过 CLI 命令和终端界面提供运行时操作 | [src/cli.ts](../src/cli.ts)、[src/commands/](../src/commands/)、[src/tui/](../src/tui/) |

宿主执行智能体指令；运行时模块提供执行过程中调用的操作，
工作流状态机负责校验阶段转换。仅生成适配器文件不会执行专利工作流。

## 仓库目录

| 路径 | 内容 |
|---|---|
| `src/agents/` | 专业智能体与主编排器指令 |
| `src/skills/` | 可移植技能定义 |
| `src/commands/` | 命令提示词与 TypeScript 命令处理器 |
| `src/adapters/claude/` | Claude Code 适配器 |
| `src/adapters/codex/` | Codex 适配器 |
| `src/adapters/opencode/` | OpenCode 适配器 |
| `src/core/` | 工作流、持久化、评分、校验与附图 |
| `src/tui/` | Ink/React 终端界面 |
| `plugins/` | 适配器生成产物，已加入 `.gitignore`，不是受版本控制的源码目录 |
| `tests/` | 单元、集成与端到端测试 |
| `docs/` | 指南、工作流参考与设计文档 |
| `assets/brand/` | 品牌图片与使用规范 |
| `plugin.jsonc` | 可移植注册清单与默认配置 |
| `dist/` | TypeScript 编译产物 |

`.opencode/` 等工作区文件由 setup 生成，与适配器源码目录不同。
当前受版本控制的仓库根目录没有 `opencode.jsonc`；
实际生成路径见[安装说明](./usage.md#安装)。

## 项目文件

专利工作区保存宿主配置，默认通过 `projects/` 存放各个选题。
单个项目目录例如 `projects/01-private-computing/`。
下表中的路径相对于该项目目录。

| 路径 | 用途 |
|---|---|
| `MAIN.md` | 专利交底书 |
| `conversation.md` | 工作流维护的对话记录 |
| `references/` | 现有技术证据、智能体产出、审查意见与附图规格 |
| `.patent/state.json` | 工作流状态 |
| `.brainstorm/path.json` | 主决策路径索引 |
| `.brainstorm/nodes/round-N.json` | 每轮的产出、创新点、评分与决策 |
| `.brainstorm/snapshots/round-N-innovations.json` | 创新点快照 |
| `.brainstorm/branches/` | 分支元数据与路径记录 |
| `figures/` | 附图源码、SVG、PNG 与 `figures-manifest.json` |

这些文件随对应操作逐步生成；安装适配器不会直接建立完整专利项目。
`path init` 只初始化决策路径存储。
默认 `projectDir` 为 `./projects`，默认法域为 `CN`。

## 决策历史

路径索引关联已保存轮次与演化关系。每轮记录智能体产出引用、创新点快照、
评分和决策。分支保留来源节点，便于追溯替代方案。
实现见[路径类型](../src/core/brainstorm-path.ts)、
[持久化](../src/core/path-persistence.ts)与[分支操作](../src/commands/path-branch.ts)。

工作流状态与决策路径分别存储，两者都不是所有项目文件的备份。
继续工作时，需要结合已保存状态、交底书与支撑材料。

## 开发

在完整仓库中运行：

```bash
npm install
npm test
npm run build
npm run lint
node dist/cli.js --help
```

开发时可运行 `npm run test:watch`，或用
`npm test -- tests/unit/workflow.test.ts` 指定已有测试。
CLI 使用 TypeScript ESM；`build` 编译到 `dist/`，
`lint` 执行不输出文件的 TypeScript 检查。

请遵循 [AGENTS.md](../AGENTS.md) 与 [CONTRIBUTING.md](../CONTRIBUTING.md)。
请求评审前执行 test、build、lint。测试结果写入验证报告，
避免在 README 徽章中手动维护通过数量。
