# oh-my-patent 文档中心

[项目首页](../README.zh-CN.md) · [English](./README-en.md)

## 使用与开发指南

| 文档 | 内容 |
|---|---|
| [安装模式](./skill.md) | 插件与 Skill 的安装、更新、卸载与迁移 |
| [发布说明](./releases/0.4.2.md) | 版本变更与升级说明 |
| [哨兵与能力检查](./sentinel.md) | 检索门禁、绘图默认、限时与审阅要求 |
| [使用指南与 CLI](./usage.md) | 安装、平台差异、环境检查、路径与附图命令、卸载 |
| [工作流](./workflow-diagram.md) | 十个阶段、允许转换、评分决策与项目恢复 |
| [智能体与协作](./agents.md) | 14 个智能体、6 项技能、9 个命令与五种协作模式 |
| [架构与开发](./architecture.md) | 四层架构、仓库与项目目录、开发命令 |
| [贡献指南](../CONTRIBUTING.md) | 代码风格、测试与提交约定 |
| [品牌规范](../assets/brand/README.md) | Archimedes 定位与品牌资产 |

## 设计与规划参考

当前规格统一放在仓库根 [`specs/`](../specs/)：参见
[review 修复规格与验收台账](../specs/001-review-remediation/)及
[项目宪章](../CONSTITUTION.md)。`docs/specs/` 是冻结的 v0.1.0 历史快照，不再新增规格。

以下文档保留产品设计背景和规划，不能单独作为已实现功能的清单。
当前使用行为以上面的指南及其引用的源码为准。

- [规格索引](./specs/README.md)：[产品需求](./specs/PRD.md)、
  [技术设计](./specs/TECHNICAL-DESIGN.md)、[API 设计](./specs/API-DESIGN.md)。
- 检索增强：[需求](./RETRIEVAL_PRD.md)、[规格](./RETRIEVAL_SPEC.md)、
  [开发计划](./RETRIEVAL_DEV_PLAN.md)。
- [进度输出设计](./specs/PROGRESS-OUTPUT-ENHANCEMENT.md)。

流程参考中的 Mermaid 图与源码保持同步；`images/` 保留其他图形资产。
修改行为时请同步更新中英文指南，不在入口维护手写版本号或测试通过数量。

需要帮助时，请[提交问题](https://github.com/illusionaireal/oh-my-patent/issues)。
