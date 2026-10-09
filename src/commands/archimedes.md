# Command: /archimedes

## Description
启动专利交底书主流程编排器（Archimedes），开始或继续一个专利项目。

## Usage
```
/archimedes [topic or intent]
```

## Parameters
- `topic`: 可选的专利选题/意向描述（可选，留空则基于当前项目状态继续）

## Behavior
1. 检查当前目录是否在专利项目内（.patent/state.json 存在）
2. 如果存在现有项目，读取当前状态；先调用哨兵刷新环境与宿主能力，再继续工作流
3. 如果不存在，提示用户选择已有项目或用 `/patent-new` 创建新项目
4. 启动 `archimedes` 编排代理，自动路由到所需的子代理完成任务
5. 首次进入 RESEARCH 前必须完成哨兵检查并保存实际结果；无原生委派工具时明确记录顺序检查

## Example
```
/archimedes 基于国密SM2的预计算池缓存优化
```

## Output
- 当前工作流状态，取值为 10 个阶段之一：
  `INIT` / `RESEARCH` / `BRAINSTORM_R1` / `BRAINSTORM_R2` / `DRAFT` /
  `DIAGRAM_DRAFT` / `QA_LOOP` / `FINAL_REVIEW` / `DIAGRAM_FINAL` / `DONE`
  （与 `src/core/workflow.ts` 的 `WorkflowStage` 一致，顺序即流转顺序）
- 自动启动代理并输出处理结果到 `references/` 目录
