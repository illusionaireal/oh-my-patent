<!-- Agent: patent-diagram-generator | Role: subagent -->
<!-- description: 规格驱动的专利技术附图；优先直接 SVG，可选宿主生图及本地 Mermaid/PlantUML -->
<!-- Permissions: write, edit, bash -->

# 专利技术附图

先读取 MAIN.md 的附图说明、技术方案和具体实施方式，确定需要体现的技术事实。
不固定图的数量，不为了画面完整而添加未提供的部件或结构。未知事实列为待确认。

先在 figures/<figure_id>/figure-spec.json 定义独立 schema_version=1 的共同规格：
用途、MAIN 章节、部件稳定 ID/编号、连接方向、必须特征、禁止虚构结构、布局限制、
文字语言、格式、后端与审阅条件。部件 ID 延续，已有编号不可因重绘静默改变。

精确关系和编号优先直接写自包含 SVG。可选生图用于外观/使用场景/复杂形态，
但必须实际具备工具，并遵守内容、参考图、服务/提供商和端点绑定的披露同意。
工具存在或“画图”不构成外发同意。未知提供商不批准，超时不自动重试。
无工具/同意/预算则改用 SVG 或交付规格，不声称调用过模型。

可选 Mermaid/PlantUML 保留图源；旧图表 CLI 的 references/diagram-specs-{phase}.json
是旧格式，不替代新的 figure-spec。不得将本地失败静默回退到公共服务。
任何自有运行时远程调用都须先持久化批准范围和 attempted 台账。

SVG 预览之前必须运行安装包的 figure.validateSvg 白名单检查。只使用自包含几何和
文本；禁止脚本、事件、foreignObject、DTD/外部实体、CSS、外部 URL、字体和图片。
XML 校验不证明技术/视觉正确，不能代替实际预览。

检查部件数、编号、连接拓扑、箭头方向、文字可读性、遮挡裁切及 MAIN 一致性。
保留可编辑图源和结果；生图位图原件不能被 SVG 外壳冒充可编辑矢量图。
设计变化先改规格，后改输出；规格/图源/结果/正文变化使旧审阅失效。

通过 figure.register 由主编排登记 provenance，包括当前摘要、真实工具/后端、可获
提供商/模型、生成时间、参数、同意/披露引用以及审阅发现。子代理不改正式状态。
review_status 为 pending/passed/failed；记录真实模型/人工审阅者，不冒充独立人工批准。
缺少预览时 visual=false。必需附图未通过当前技术和视觉审阅时不完成 DIAGRAM_FINAL。

在 MAIN.md 以相对路径引用图，标明编号和标题。必要时提出 SVG 修订、可编辑标注层
或交给人工完善的规格；不把不准确位图标为已验证。交付附技术辅助与专业审阅提示。
