# README header snippets

Copy the matching block into the README at the repository root. GitHub does not
include this file automatically. The paths below are relative to the root README,
not to this snippet file. For a README under `docs/`, use `../assets/brand/`.

Start each README with one plain `# oh-my-patent` heading, followed by its badges.
Place the logo below them. Center only the picture paragraph; keep the tagline,
description, quick-start instructions, and fenced code blocks outside centered
containers so commands remain left-aligned. Do not repeat the project title
below the logo or wrap the heading in inline-code backticks.

## English — README.md

```html
<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/brand/png/logo-on-dark.png">
  <img src="./assets/brand/png/logo-primary.png" width="720"
       alt="oh-my-patent — Archimedes raising a patent document with a WOW! expression">
</picture>
</p>
```

```markdown
**Meet Archimedes. Turn your “Eureka!” into a patent disclosure.**

An AI patent plugin for **Claude Code, Codex, and OpenCode**.
Archimedes orchestrates specialist agents across research, ideation, drafting,
review, and diagrams—with traceable, forkable decision paths.
```

## Chinese — README.zh-CN.md

Use the same picture block, with this alt text:
`oh-my-patent — Archimedes（阿基米德）举起专利文档，惊呼 WOW!`

```markdown
**遇见 Archimedes（阿基米德），让灵光一现成为专利交底书。**

面向 **Claude Code、Codex、OpenCode** 的 AI 专利插件。
由 Archimedes 编排专业智能体，协同完成检索、构思、撰写、审查与附图生成，
并保留可追溯、可分叉的决策路径。
```

For renderers without `<picture>` support, use the primary PNG directly:

```html
<img src="./assets/brand/png/logo-primary.png" width="720"
     alt="oh-my-patent — Archimedes / Eureka">
```
