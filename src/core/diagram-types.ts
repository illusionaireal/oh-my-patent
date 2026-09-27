/**
 * Diagram Types - 专利图类型定义
 *
 * 定义专利交底书附图的规格、渲染结果和清单条目类型。
 */

// ============================================================================
// 图类型和引擎
// ============================================================================

/**
 * 图类型
 */
export type DiagramType = 'architecture' | 'flowchart' | 'sequence' | 'state' | 'component';

/**
 * 渲染引擎
 */
export type Engine = 'mermaid' | 'plantuml';

/**
 * Specs file `diagram render` reads when `--specs` is omitted.
 *
 * The diagram agent writes `references/diagram-specs-{phase}.json`. Passing
 * `--phase final` must not silently reuse the draft file.
 */
export function defaultDiagramSpecsFile(phase: string | undefined): string {
  return phase?.toLowerCase() === 'final'
    ? 'diagram-specs-final.json'
    : 'diagram-specs-draft.json';
}

/**
 * 渲染阶段
 */
export type RenderPhase = 'draft' | 'final';

// ============================================================================
// 图规格
// ============================================================================

/**
 * 图规格 — 描述一张待渲染的专利附图
 */
export interface FigureSpec {
  /** 图ID，如 "fig1_system_architecture" */
  figureId: string;
  /** 图序号，1, 2, 3... */
  figureNumber: number;
  /** 图标题，如 "系统整体架构图" */
  title: string;
  /** 图的文字描述 */
  description: string;
  /** 图类型 */
  diagramType: DiagramType;
  /** 渲染引擎 */
  engine: Engine;
  /** Mermaid 或 PlantUML 源代码 */
  source: string;
  /** 渲染阶段 */
  phase: RenderPhase;
}

// ============================================================================
// 渲染结果
// ============================================================================

/**
 * 单张图的渲染结果
 */
export interface RenderResult {
  /** 图ID */
  figureId: string;
  /** SVG 文件路径 */
  svgPath: string;
  /** PNG 文件路径 */
  pngPath: string;
  /** 源文件路径（.mmd 或 .puml） */
  sourcePath: string;
  /** 是否渲染成功 */
  success: boolean;
  /** 错误信息（失败时） */
  error?: string;
}

// ============================================================================
// 清单条目
// ============================================================================

/**
 * figures-manifest.json 中的单条记录
 */
export interface ManifestEntry {
  /** 图ID */
  figureId: string;
  /** 图序号 */
  figureNumber: number;
  /** 图标题 */
  title: string;
  /** 图类型 */
  diagramType: DiagramType;
  /** 渲染引擎 */
  engine: Engine;
  /** 渲染阶段 */
  phase: RenderPhase;
  /** 输出文件路径（相对于 figures/ 目录） */
  files: {
    source: string;
    svg: string;
    png: string;
  };
  /**
   * 该图最近一次渲染是否成功。
   * 必须持久化：否则无法区分「渲染成功」与「从未渲染 / 渲染失败」，
   * 重渲染时会把全部历史条目一并标记为成功（REQ-003）。
   */
  success: boolean;
  /** 失败原因（`success` 为 false 时存在） */
  error?: string;
}

// ============================================================================
// 渲染器配置
// ============================================================================

/**
 * 渲染器配置
 */
export interface RendererConfig {
  /** PlantUML server URL，默认 `https://www.plantuml.com/plantuml`（可用环境变量覆盖，见 REQ-043） */
  plantumlServerUrl: string;
  /** 默认引擎 */
  defaultEngine: Engine;
  /** mmdc 可执行文件路径，默认 "mmdc" */
  mmdcPath: string;
  /** 渲染超时（毫秒），默认 30000 */
  timeout: number;
  /** 批量渲染的最大并发数，默认 4（REQ-042） */
  maxConcurrentRenders: number;
}

/**
 * 覆盖 PlantUML 服务地址的环境变量名（REQ-043）。
 *
 * 存在的理由有二：① 企业内网通常无法访问公共 `plantuml.com`，须指向私有部署；
 * ② 默认地址会把**技术方案源码**发送给第三方 —— 专利内容敏感，必须留出关闭通道。
 */
export const PLANTUML_SERVER_URL_ENV = 'PLANTUML_SERVER_URL';

/**
 * 默认 PlantUML 服务地址（公共服务器）。
 */
export const DEFAULT_PLANTUML_SERVER_URL = 'https://www.plantuml.com/plantuml';

/**
 * 解析默认 PlantUML 服务地址：环境变量优先，空值回落默认。
 */
function resolveDefaultPlantUmlServerUrl(): string {
  const fromEnv = process.env[PLANTUML_SERVER_URL_ENV];
  return typeof fromEnv === 'string' && fromEnv.trim() !== ''
    ? fromEnv.trim()
    : DEFAULT_PLANTUML_SERVER_URL;
}

/**
 * 默认渲染器配置
 *
 * ⚠️ `plantumlServerUrl` 在**模块加载时**读取一次环境变量。若需在进程运行中
 * 改变，请显式构造 `new DiagramRenderer({ plantumlServerUrl })`。
 */
export const DEFAULT_RENDERER_CONFIG: RendererConfig = {
  plantumlServerUrl: resolveDefaultPlantUmlServerUrl(),
  defaultEngine: 'mermaid',
  mmdcPath: 'mmdc',
  timeout: 30000,
  maxConcurrentRenders: 4,
};

/**
 * 图类型到 Mermaid 图类型关键词的映射
 */
export const MERMAID_DIAGRAM_KEYWORDS: Record<DiagramType, string> = {
  architecture: 'graph',
  flowchart: 'flowchart',
  sequence: 'sequenceDiagram',
  state: 'stateDiagram-v2',
  component: 'graph',
};

/**
 * 图类型到 PlantUML 关键词的映射
 */
export const PLANTUML_DIAGRAM_KEYWORDS: Record<DiagramType, string> = {
  architecture: 'package',
  flowchart: 'start',
  sequence: '->',
  state: '[*] -->',
  component: 'component',
};
