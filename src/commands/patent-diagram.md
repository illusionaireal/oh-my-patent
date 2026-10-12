---
name: patent-diagram
description: 生成、重渲染或查看专利附图
---

# /patent-diagram — 专利附图命令

## 用法

```
/patent-diagram [action] [options]
```

## 操作

| Action | 说明 |
|--------|------|
| `generate` | 读取 MAIN.md，生成全部附图（默认操作） |
| `regenerate <figureId>` | 重新生成指定图 |
| `status` | 查看当前图渲染状态 |
| `render <figureId>` | 仅重新渲染指定图（不修改源码） |

## 示例

- `/patent-diagram` — 生成全部附图
- `/patent-diagram generate` — 同上
- `/patent-diagram regenerate fig1_system_architecture` — 重新生成图1
- `/patent-diagram status` — 查看渲染状态

## 流程

1. 确认当前项目目录和 MAIN.md 存在
2. 加载哨兵，刷新实际后端/预览/计时能力并保存 .patent/figure-capabilities.json
3. 根据 MAIN 保存每图 figure-spec；共享运行时 figure.plan 读取偏好和可执行方案
4. 有计时能力先 figure.offer，等待最多 30 秒；回答用 figure.select mode=user，超时
   mode=timeout。无计时能力告知默认后立即 mode=default；可执行已保存方案用 mode=reuse
5. 默认可执行本地偏好，否则 SVG，再其他本地后端；系统选择不代替披露/付费批准
6. 使用实际原生委派工具调用 patent-diagram-generator；无委派则记录顺序执行
7. 主编排器 figure.register 保存来源/审阅；必须实际预览才能通过视觉审阅
8. 报告选择来源、局限、绘图结果和文件位置

重复提供选择或刷新观测保留原 30 秒期限，到期重新计算当前可用本地方案。
本地渲染限时 60 秒，失败后保存 render-failure.json，通过 figure.fallback 转用一次
可用 SVG；SVG 或远程调用失败时报告并停止该图，不循环重试。刷新观测/会话并
复用相同后端不清空已通过审阅；技术内容、图源、结果或执行边界变化仍需重新审阅。
