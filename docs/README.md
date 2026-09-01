# oh-my-patent 文档中心

欢迎访问 oh-my-patent 文档中心！本目录包含项目的详细技术文档和可视化图表。

## 📚 文档索引

### 核心文档

- **[README.md](../README.md)** - 项目主文档（英文）
  - 安装指南
  - 快速开始
  - 完整用法
  - 卸载指南
  - 端到端工作流程图

- **[README.zh-CN.md](../README.zh-CN.md)** - 项目主文档（中文）
  - 安装指南
  - 快速开始
  - 完整用法
  - 卸载指南
  - 端到端工作流程图

- **[CLAUDE.md](../CLAUDE.md)** - Claude Code 项目说明
  - 项目架构详解
  - 开发工作流
  - 质量指标
  - 发布流程

- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - 贡献指南
  - 代码风格
  - 测试要求
  - 提交规范
  - PR 流程

### 可视化图表

- **[workflow-diagram.md](workflow-diagram.md)** - 工作流图示（中文）
  - 🔄 端到端工作流程图
  - 🏗️ 系统架构图
  - 🤖 智能体协作图
  - 📊 决策路径数据结构图
  - 📁 文件系统布局图
  - 🔀 工作流状态机图

- **[workflow-diagram-en.md](workflow-diagram-en.md)** - 工作流图示（英文）
  - 🔄 End-to-End Workflow
  - 🏗️ System Architecture
  - 🤖 Agent Collaboration
  - 📊 Decision Path Data Structure
  - 📁 File System Layout
  - 🔀 Workflow State Machine

### 规格文档

- **[specs/](specs/)** - 产品规格和技术设计文档
  - **[PRD.md](specs/PRD.md)** - 产品需求文档
  - **[TECHNICAL-DESIGN.md](specs/TECHNICAL-DESIGN.md)** - 技术设计规格
  - **[API-DESIGN.md](specs/API-DESIGN.md)** - API 设计文档
  - **[README.md](specs/README.md)** - 规格文档索引

## 🎯 快速导航

### 我想...

#### 了解如何使用 oh-my-patent
- 👉 阅读 [README.zh-CN.md](../README.zh-CN.md) 的"快速演示"和"安装步骤"章节
- 👉 查看 [workflow-diagram.md](workflow-diagram.md) 的端到端工作流程图

#### 理解系统架构
- 👉 阅读 [CLAUDE.md](../CLAUDE.md) 的"架构亮点"章节
- 👉 查看 [workflow-diagram.md](workflow-diagram.md) 的系统架构图和智能体协作图

#### 贡献代码
- 👉 阅读 [CONTRIBUTING.md](../CONTRIBUTING.md)
- 👉 了解 [CLAUDE.md](../CLAUDE.md) 中的"开发工作流"和"技术栈"

#### 卸载 oh-my-patent
- 👉 阅读 [README.zh-CN.md](../README.zh-CN.md) 的"卸载"章节
- 👉 使用命令：`oh-my-patent adapt uninstall --workspace-dir .`

#### 理解决策路径系统
- 👉 查看 [workflow-diagram.md](workflow-diagram.md) 的决策路径数据结构图
- 👉 阅读 [CLAUDE.md](../CLAUDE.md) 的"决策路径系统"章节

#### 了解工作流状态机
- 👉 查看 [workflow-diagram.md](workflow-diagram.md) 的工作流状态机图
- 👉 阅读 [README.zh-CN.md](../README.zh-CN.md) 的"工作流"章节

## 📖 图表查看指南

### 在 GitHub 上查看
GitHub 原生支持 Mermaid 渲染。直接在仓库中查看 `.md` 文件即可看到完整的可视化图表。

### 本地查看
使用支持 Mermaid 的 Markdown 编辑器：

#### VS Code
```bash
# 安装插件
code --install-extension bierner.markdown-mermaid
```

#### 其他编辑器
- **Obsidian** - 原生支持 Mermaid
- **Typora** - 原生支持 Mermaid
- **GitHub Desktop** - 原生支持 Mermaid

### 导出为图片
使用 Mermaid CLI：

```bash
# 安装 Mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# 导出为 PDF
mmdc -i docs/workflow-diagram.md -o docs/workflow-diagram.pdf

# 导出为 PNG
mmdc -i docs/workflow-diagram.md -o docs/workflow-diagram.png -w 2400
```

或使用在线编辑器：
- [Mermaid Live Editor](https://mermaid.live/)
- [Mermaid Chart](https://www.mermaidchart.com/)

## 🔗 外部资源

### 官方链接
- **npm**: https://www.npmjs.com/package/oh-my-patent
- **GitHub**: https://github.com/illusionaireal/oh-my-patent
- **Issues**: https://github.com/illusionaireal/oh-my-patent/issues

### 社区支持
- **LINUX DO 社区**: https://linux.do/
- **讨论区**: GitHub Discussions（即将开放）

### 技术文档
- **Mermaid 语法**: https://mermaid.js.org/
- **TypeScript**: https://www.typescriptlang.org/
- **Vitest**: https://vitest.dev/
- **Node.js**: https://nodejs.org/

## 📝 文档维护

### 更新文档
如果你发现文档有误或需要改进：

1. Fork 本仓库
2. 创建特性分支：`git checkout -b docs/improve-xxx`
3. 修改文档
4. 提交更改：`git commit -m "docs: improve xxx documentation"`
5. 推送分支：`git push origin docs/improve-xxx`
6. 创建 Pull Request

### 文档规范
- 使用 Markdown 格式
- 中英文双语支持
- 代码示例使用 ```bash 或 ```typescript 标注
- 图表使用 Mermaid 语法
- 保持文档简洁清晰

## ❓ 获取帮助

如果你在使用过程中遇到问题：

1. 📖 先查阅本文档索引，找到相关章节
2. 🔍 在 [Issues](https://github.com/illusionaireal/oh-my-patent/issues) 中搜索类似问题
3. 💬 在 [LINUX DO 社区](https://linux.do/) 发起讨论
4. 🐛 如果是 bug，创建新的 Issue

## 📜 许可证

本项目及其文档采用 [MIT License](../LICENSE)。

---

**当前版本**: v0.1.0  
**最后更新**: 2026-06-17  
**维护者**: [@zengbods](https://github.com/zengbods)
