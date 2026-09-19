# oh-my-patent README 品牌与版式规范

本规范取代此前棕色复古工程期刊风格。品牌资产和使用规则以
[assets/brand/README.md](./assets/brand/README.md) 为准。

## 定位与记忆点

- 项目：`oh-my-patent`。
- 品类：面向 **Claude Code、Codex、OpenCode** 的 **AI 专利插件**。
- 核心角色：**Archimedes（阿基米德）**，也是 `/archimedes` 使用入口。
- 视觉记忆点：阿基米德举起专利文档，惊呼 **WOW!**；文字以 **Eureka!** 表达发现时刻。
- 交付价值：从技术构想形成专利交底书，决策路径可追溯、可分叉。
- CLI 是安装、适配和工作流操作方式；首屏先讲产品价值与支持平台。

## 视觉系统

沿用已确认的蓝色母版，不重绘角色，不更改人物、文档、轮廓或负空间。
品牌蓝用于强调；深海军蓝用于标题和深色底；白色用于默认留白。
以下是文档和分享卡的界面配色，不是要求重新给 Logo 着色：

| 用途 | 色值 |
|---|---|
| 强调蓝 | `#2563EB` |
| 深色文字 | `#10182D` |
| 次级文字 | `#52617A` |
| 浅蓝底 | `#EFF5FF` |
| 分隔线 | `#DCE4EF` |
| 背景 | `#FFFFFF` |

GitHub README 使用平台原生字体和 Markdown 排版，不依赖自定义 CSS、
外部字体或大块海报承载正文。Logo 是图片，标题、平台名称和说明保留为可检索文字。

## 首屏顺序

项目标题与徽章 → Logo → Archimedes / Eureka 核心句 → 三个平台与插件定位 → 安装入口。
中英文使用相同资产和同义描述。项目标题只保留一个普通一级标题，
不使用行内代码样式，不在 Logo 下方重复标题。
仅 Logo 所在的图片段落居中；说明文字、安装步骤和代码块保持左对齐。
禁止用居中容器包裹 Markdown 代码块，以免代码继承居中样式。
英文首页优先展示 Quick start，面向 AI 助手的重复安装提示放入折叠区。
相邻内容间使用标题或单条分隔线，避免连续横线和多余留白。
不再使用期刊卷号或未核对的智能体数量作为宣传重点。

英文核心句：

> Meet Archimedes. Turn your “Eureka!” into a patent disclosure.

中文核心句：

> 遇见 Archimedes（阿基米德），让灵光一现成为专利交底书。

直接复制的引用片段见
[README-snippet.md](./assets/brand/README-snippet.md)。

## 正文与图像

保留痛点、能力、协作模式、安装、用法和架构等现有技术内容。
品牌图片统一放在 `assets/brand/`；流程图、协作图继续放在 `docs/images/`。
不要为每个平台复制一套 Logo，也不要把品牌图放进运行时或生成的适配目录。

## 各展示面

| 展示面 | 使用内容 |
|---|---|
| GitHub 中英文 README | 同一横版 Logo；深色主题使用现有深色版 |
| GitHub About / npm description | 品牌规范中的统一英文 description |
| GitHub Social preview | 独立 1280×640 横版分享卡，包含三平台名称 |
| 可选账号头像 | 方形 512px 图标；不因仓库品牌更新而更换个人头像 |
| 未来网站 favicon | 现有 ICO；网站部署时配置，仓库 README 不加载 favicon |

## 验收

- 两份 README 的图片路径有效，浅色、深色和窄屏展示可读。
- 在仓库首页实际渲染中核对代码块左对齐，确认未嵌套在居中容器内。
- Archimedes 拼写正确，三个支持平台均出现在首屏与 description 中。
- 原有 Logo 字节保持不变，派生资产能追溯到确认的资产包。
- 分享卡不依赖联网字体，PNG 小于 1 MB；GitHub 设置需单独上传。
- npm 发布范围保留 README 所需图片，排除分享卡和源文件。
