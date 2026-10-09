# Environment sentinel / 环境哨兵

Archimedes calls `patent-init-sentinel` before first RESEARCH and when resuming a
project. This is host orchestration, not a CLI session-start hook. A registered
prompt or a successful CLI check does not establish a real model delegation trace.
Native delegation is used only when exposed by the active host; otherwise the
sentinel role runs sequentially and the report records that mode.

Archimedes 在首次进入 RESEARCH 前及恢复项目时执行哨兵检查。由宿主提供的原生
委派工具调用；没有该能力时明确记录为顺序检查。代理注册、doctor 或 CI 通过均
不等于实际宿主的模型调用链路已经验收。

## Plugin checks / 插件检查

Reinstall plugin mode to update generated agents and add the bundled runtime:
重新安装插件模式以更新代理配置及随安装分发的检查器：

```bash
oh-my-patent adapt install
```

The same installation is available with `npx oh-my-patent@latest adapt install`.
The installed checkers use Node.js 22+; they keep working after npm/npx cache or
package location changes. They derive workspace and host from their own location.
运行时只依赖 Node.js 22+，根据安装位置确定工作区与宿主，运行时不依赖源码、
全局 CLI、node_modules 或 npx 缓存。

From the workspace root / 从工作区根目录执行：

| Host / 宿主 | Command / 命令 |
| --- | --- |
| Claude Code | `node ".oh-my-patent/runtime/claude-code/check.mjs" --json` |
| Codex | `node ".oh-my-patent/runtime/codex/check.mjs" --json` |
| OpenCode | `node ".oh-my-patent/runtime/opencode/check.mjs" --json` |

From another directory, resolve that installed script and use its complete path.
To save the raw JSON, append `--output projects/<project>/references/init-report.json`;
the output path is resolved inside the installed workspace. The public CLI supports
`oh-my-patent check --json --tool <host>` for explicit host selection too.
在其他目录执行时使用已安装脚本的完整路径。可加 `--output` 保存真实 JSON，
输出位置相对安装工作区解析。公共 CLI 同样支持 `--tool <host>` 显式选择宿主。

Claude uses `.mcp.json`; Codex checks its `codex.json` integration manifest;
OpenCode uses `opencode.jsonc`. Mixed-host installations read only the selected
host's configuration. A Codex integration manifest is not a guarantee that a
particular Codex version has native MCP tools configured.

`mcpVerification=configuration_only` means no MCP connection or authentication
was verified. Observe actual host tool access separately. `ready=false`, failed
execution or unknown capabilities must not be reported as passed. Missing MCP
sources allow user-approved degraded retrieval; missing plugin runtime/git/mmdc
remain blockers. Record retrieval limitations; a search plan is not a completed search.

MCP 只检测配置，连接/认证/实际工具可调用性需在当前宿主中观察。执行失败、阻塞
或未知能力不得写为通过；缺少 MCP 时可以记录用户选择的检索降级及证据不足。
主编排器将实际 JSON、宿主/版本、执行模式与工具观测保存为
`references/init-report.json`，哨兵不修改正式工作流状态。

## Skill checks / Skill 检查

Skill activation and resume load `references/role-patent-init-sentinel.md` and run
the Skill's own `scripts/runtime.mjs --doctor` by its installation path. This
proves the runtime can execute, not that independent agents/search/image tools
are available. The main orchestrator saves actual results and unknowns. Without
execution/Node, document assistance remains available with persistence unavailable.

Skill 激活及恢复时读取哨兵角色，并使用安装目录内运行时的完整路径执行 doctor。
角色引用不自动注册独立 Agent；没有原生委派时记录顺序检查。doctor 通过只证明
运行时可执行，检索、生图、预览及子代理能力分别观察和记录。

## Verification boundary / 验证边界

CI tests generated registration, mixed-host routing, isolated installed scripts,
relocation, structured failures and actual npm archives on Ubuntu/Windows.
Real Claude Code/Codex/OpenCode model delegation requires separately recorded
host/session/version and invocation/result evidence. See the
[repair ledger](../specs/005-sentinel-startup/tasks.md) for the current verdicts.
