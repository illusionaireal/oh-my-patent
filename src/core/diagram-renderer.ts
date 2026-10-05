/**
 * Diagram Renderer - 专利图渲染器
 *
 * 将 FigureSpec（Mermaid/PlantUML 源码）渲染为 SVG+PNG 文件。
 * 支持：
 * - Mermaid 渲染（通过 mmdc CLI）
 * - PlantUML 渲染（通过远程 PlantUML server HTTP API）
 * - 批量渲染和单图重渲染
 * - figures-manifest.json 读写
 */

import { execFile } from 'child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { disclosedFetch } from './disclosure.js';
import { assertLegacyOutput } from './legacy-write-guard.js';
import { join, resolve } from 'path';
import { promisify } from 'util';
import { deflateRawSync } from 'zlib';
import {
  FigureSpec,
  RenderResult,
  ManifestEntry,
  RendererConfig,
  DEFAULT_RENDERER_CONFIG,
  Engine,
} from './diagram-types.js';

const execFileAsync = promisify(execFile);

// ============================================================================
// 安全校验
// ============================================================================

/**
 * Valid figureId pattern: alphanumeric, underscore, dash.
 * Prevents path traversal (e.g. ../../etc/passwd) and directory separators.
 */
const FIGURE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function isValidFigureId(figureId: string): boolean {
  return typeof figureId === 'string' && figureId.length > 0 && figureId.length <= 128 && FIGURE_ID_PATTERN.test(figureId);
}

function assertValidFigureId(figureId: string): void {
  if (!isValidFigureId(figureId)) {
    throw new Error(`Invalid figureId: ${figureId}. Must match ${FIGURE_ID_PATTERN.source} and be 1-128 chars`);
  }
}

// ============================================================================
// PlantUML 编码
// ============================================================================

/**
 * PlantUML 文本编码为 URL 路径段
 * 使用 PlantUML 的 deflate+base64 编码方案
 */
export function encodePlantUML(text: string): string {
  const compressed = deflateRawSync(Buffer.from(text, 'utf-8'));
  return encode64(compressed);
}

/**
 * PlantUML 私有的 6bit→字符表（标准 base64 的**位移变体**）。
 *
 * 0-9 → `0`-`9`，10-35 → `A`-`Z`，36-61 → `a`-`z`，62 → `-`，63 → `_`。
 */
function encode6bit(b: number): string {
  if (b < 10) return String.fromCharCode(48 + b);
  b -= 10;
  if (b < 26) return String.fromCharCode(65 + b);
  b -= 26;
  if (b < 26) return String.fromCharCode(97 + b);
  b -= 26;
  if (b === 0) return '-';
  if (b === 1) return '_';
  return '?';
}

/**
 * 3 字节 → 4 个 6bit 字符（高位在前）。
 */
function append3bytes(b1: number, b2: number, b3: number): string {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3f;
  return (
    encode6bit(c1 & 0x3f) +
    encode6bit(c2 & 0x3f) +
    encode6bit(c3 & 0x3f) +
    encode6bit(c4 & 0x3f)
  );
}

/**
 * PlantUML 自定义 base64 编码。
 *
 * ⚠️ 位序**必须**是「3 字节按高位优先切成 4 个 6bit」（即 `append3bytes`）。
 * 历史实现把它写成了 base64 **解码**方向的位序（`b1 = data[i] & 0x3f`
 * 等），产出的路径段语法上合法、长度也对，但 PlantUML 服务端无法解码，
 * 于是**静默返回「Welcome to PlantUML!」占位图**——HTTP 200、Content-Type
 * 为 `image/svg+xml`、尺寸正常，任何状态码/类型校验都发现不了（REQ-052）。
 *
 * 导出供单元测试直接钉住位序，勿在别处复制实现。
 */
export function encode64(data: Buffer): string {
  let r = '';
  for (let i = 0; i < data.length; i += 3) {
    if (i + 2 === data.length) {
      r += append3bytes(data[i], data[i + 1], 0);
    } else if (i + 1 === data.length) {
      r += append3bytes(data[i], 0, 0);
    } else {
      r += append3bytes(data[i], data[i + 1], data[i + 2]);
    }
  }
  return r;
}

// ============================================================================
// 响应体校验（REQ-042 / REQ-052）
// ============================================================================

/** PNG 文件签名（前 8 字节）。 */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** PNG 响应体尺寸下限（字节）：低于此值必然不是一张有效图。 */
const MIN_PNG_BYTES = 512;

/** SVG 响应体尺寸下限（字符）：`<svg/>` 骨架本身已大于此值。 */
const MIN_SVG_BYTES = 128;

/** PNG 允许的 Content-Type。 */
const PNG_CONTENT_TYPES = ['image/png'];

/** SVG 允许的 Content-Type。 */
const SVG_CONTENT_TYPES = ['image/svg+xml', 'text/xml', 'application/xml'];

/**
 * PlantUML 在图本身出错时回填的响应头。
 *
 * 实测（2026-09-18，`www.plantuml.com`）：语法错误与 `!include` 失败均返回
 * **HTTP 400** 且该头为 `(Error)`；正常图则是 `(2 participants)` 之类的描述。
 * 该头是服务端给出的**权威**错误信号 —— 比猜测响应体里的错误文案可靠。
 */
const PLANTUML_DESCRIPTION_HEADER = 'x-plantuml-diagram-description';

/**
 * PlantUML 在**无法解码路径段**时返回的占位图标记。
 *
 * 实测：路径段位序错误（REQ-052 的原始缺陷）时，服务端仍返回 HTTP 200、
 * `Content-Type: image/svg+xml`、尺寸正常，内容是这篇「欢迎页」—— 属于
 * 「成功但内容是错的」，任何状态码/类型校验都发现不了。两句文本**同时**
 * 出现才判定为占位图，避免与用户真实绘制的标题撞车。
 */
const PLANTUML_PLACEHOLDER_MARKERS = [
  'Welcome to PlantUML!',
  'You can start with a simple UML Diagram',
];

/** 读取响应头；兼容缺少 `headers` 的测试替身与不同 fetch 实现。 */
function readHeader(
  resp: { headers?: { get?: (name: string) => string | null } },
  name: string
): string {
  const value =
    typeof resp.headers?.get === 'function' ? resp.headers.get(name) : null;
  return (value ?? '').trim();
}

/** 读取响应 Content-Type（去掉 `;charset=…` 与大小写差异）。 */
function readContentType(resp: {
  headers?: { get?: (name: string) => string | null };
}): string {
  return readHeader(resp, 'content-type').split(';')[0].trim().toLowerCase();
}

/**
 * 校验 PlantUML 的 PNG 响应体。
 *
 * 抛出的错误会被 `renderPlantUML` 的 catch 收敛为 `success: false`，
 * 从而**不会**把错误产物写进 `figures/`。
 */
function assertPlantUmlPng(body: Buffer, resp: unknown): void {
  const contentType = readContentType(resp as never);
  if (contentType !== '' && !PNG_CONTENT_TYPES.includes(contentType)) {
    throw new Error(`PlantUML PNG response has unexpected Content-Type: ${contentType}`);
  }
  if (body.length < MIN_PNG_BYTES) {
    throw new Error(
      `PlantUML PNG response too small: ${body.length} bytes < ${MIN_PNG_BYTES}`
    );
  }
  if (!body.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error('PlantUML PNG response is not a PNG (signature mismatch)');
  }
}

/**
 * 校验 PlantUML 的 SVG 响应体。
 *
 * SVG 是纯文本，因此除类型/尺寸外还能检视内容：它同时承担
 * 「图是否可解码」的门禁职责（PNG 是二进制，无法检视）。
 */
function assertPlantUmlSvg(body: string, resp: unknown): void {
  const contentType = readContentType(resp as never);
  if (contentType !== '' && !SVG_CONTENT_TYPES.includes(contentType)) {
    throw new Error(`PlantUML SVG response has unexpected Content-Type: ${contentType}`);
  }
  if (body.length < MIN_SVG_BYTES) {
    throw new Error(
      `PlantUML SVG response too small: ${body.length} bytes < ${MIN_SVG_BYTES}`
    );
  }
  if (!/<svg[\s>]/i.test(body)) {
    throw new Error('PlantUML SVG response does not contain an <svg> element');
  }
  if (PLANTUML_PLACEHOLDER_MARKERS.every((marker) => body.includes(marker))) {
    throw new Error(
      'PlantUML returned its "Welcome to PlantUML!" placeholder — ' +
        'the encoded source could not be decoded by the server'
    );
  }
}

/**
 * 有界并发地映射数组，**保持输入顺序**。
 *
 * `renderAll` 依赖「结果下标 === 规格下标」来写 manifest，故不能用
 * 无序的 `Promise.all` 直出 `push`（REQ-042）。
 */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const width = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;

  const run = async (): Promise<void> => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: width }, run));
  return results;
}

// ============================================================================
// 渲染器类
// ============================================================================

export class DiagramRenderer {
  private config: RendererConfig;

  constructor(config?: Partial<RendererConfig>) {
    this.config = { ...DEFAULT_RENDERER_CONFIG, ...config };
  }

  // ============================================================================
  // Mermaid 渲染
  // ============================================================================

  /**
   * 渲染单张 Mermaid 图
   */
  async renderMermaid(spec: FigureSpec, outputDir: string): Promise<RenderResult> {
    assertLegacyOutput(outputDir);
    assertValidFigureId(spec.figureId);
    const baseName = spec.figureId;
    const sourcePath = join(outputDir, `${baseName}.mmd`);
    const pngPath = join(outputDir, `${baseName}.png`);
    const svgPath = join(outputDir, `${baseName}.svg`);

    mkdirSync(outputDir, { recursive: true });

    // 写入源文件
    writeFileSync(sourcePath, spec.source, 'utf-8');

    try {
      if (/(?:https?:|file:|data:|url\s*\(|@import|\bclick\b|%%\s*\{|&#)/i.test(spec.source)) throw new Error('External resources/directives are forbidden; use self-contained SVG');
      // PNG 与 SVG 由同一份源文件生成、写往不同路径，可并发生成（REQ-042）。
      // 旧实现串行等待两次 mmdc，单图耗时是两者之和。
      await Promise.all([
        execFileAsync(this.config.mmdcPath, [
          '-i', sourcePath,
          '-o', pngPath,
          '-t', 'default',
          '--scale', '2',
        ], { timeout: this.config.timeout }),
        execFileAsync(this.config.mmdcPath, [
          '-i', sourcePath,
          '-o', svgPath,
          '-t', 'default',
        ], { timeout: this.config.timeout }),
      ]);

      return {
        figureId: spec.figureId,
        svgPath,
        pngPath,
        sourcePath,
        success: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        figureId: spec.figureId,
        svgPath,
        pngPath,
        sourcePath,
        success: false,
        error: `Mermaid render failed: ${msg}`,
      };
    }
  }

  // ============================================================================
  // PlantUML 渲染
  // ============================================================================

  /**
   * 渲染单张 PlantUML 图
   */
  async renderPlantUML(spec: FigureSpec, outputDir: string): Promise<RenderResult> {
    assertLegacyOutput(outputDir);
    assertValidFigureId(spec.figureId);
    const baseName = spec.figureId;
    const sourcePath = join(outputDir, `${baseName}.puml`);
    const pngPath = join(outputDir, `${baseName}.png`);
    const svgPath = join(outputDir, `${baseName}.svg`);

    mkdirSync(outputDir, { recursive: true });

    // 写入源文件
    writeFileSync(sourcePath, spec.source, 'utf-8');

    try {
      const encoded = encodePlantUML(spec.source);
      const baseUrl = this.config.plantumlServerUrl.replace(/\/$/, '');

      // 并行获取 PNG 和 SVG
      const [pngResp, svgResp] = await Promise.all([
        disclosedFetch(`${baseUrl}/png/${encoded}`, spec.source, baseUrl, 'plantuml', 'diagram.render', this.config.disclosure),
        disclosedFetch(`${baseUrl}/svg/${encoded}`, spec.source, baseUrl, 'plantuml', 'diagram.render', this.config.disclosure),
      ]);

      if (!pngResp.ok) {
        throw new Error(`PlantUML PNG request failed: ${pngResp.status} ${pngResp.statusText}`);
      }
      if (!svgResp.ok) {
        throw new Error(`PlantUML SVG request failed: ${svgResp.status} ${svgResp.statusText}`);
      }

      // HTTP 200 不等于「画出来了」：服务端在图本身出错时也可能回 200 并给出
      // 错误图。故在写盘**之前**做内容校验，失败即整体失败、不落盘（REQ-042）。
      const description = readHeader(svgResp, PLANTUML_DESCRIPTION_HEADER);
      if (/(^|[^a-z])error([^a-z]|$)/i.test(description)) {
        throw new Error(`PlantUML reported a diagram error: ${description}`);
      }

      const pngBuffer = Buffer.from(await pngResp.arrayBuffer());
      const svgText = await svgResp.text();

      assertPlantUmlPng(pngBuffer, pngResp);
      assertPlantUmlSvg(svgText, svgResp);

      writeFileSync(pngPath, pngBuffer);
      writeFileSync(svgPath, svgText, 'utf-8');

      return {
        figureId: spec.figureId,
        svgPath,
        pngPath,
        sourcePath,
        success: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        figureId: spec.figureId,
        svgPath,
        pngPath,
        sourcePath,
        success: false,
        error: `PlantUML render failed: ${msg}`,
      };
    }
  }

  // ============================================================================
  // 批量渲染 & 重渲染
  // ============================================================================

  /**
   * 批量渲染所有图规格
   *
   * 有界并发（`maxConcurrentRenders`，REQ-042）：旧实现逐张串行 await，
   * 图多时耗时线性叠加。`mapWithConcurrency` 保证**结果顺序与入参一致**，
   * 因为 `writeManifest()` 是按下标把 specs 与 results 配对的。
   */
  async renderAll(specs: FigureSpec[], outputDir: string): Promise<RenderResult[]> {
    const results = await mapWithConcurrency(
      specs,
      this.config.maxConcurrentRenders,
      (spec) =>
        spec.engine === 'mermaid'
          ? this.renderMermaid(spec, outputDir)
          : this.renderPlantUML(spec, outputDir)
    );

    // 写入 manifest
    // 只要产生了结果就落盘：全部失败时同样记录，避免「渲染失败 = 没有记录」
    // 这种把失败伪装成「未曾渲染」的静默行为（REQ-003）。
    if (results.length > 0) {
      this.writeManifest(specs, results, outputDir);
    }

    return results;
  }

  /**
   * 重新渲染单张图
   */
  async rerender(
    figureId: string,
    newSource: string,
    outputDir: string,
    engine: Engine
  ): Promise<RenderResult> {
    assertValidFigureId(figureId);
    // 读取 manifest 获取原始 spec 信息
    const manifest = this.readManifest(outputDir);
    const entry = manifest.find(e => e.figureId === figureId);

    const spec: FigureSpec = {
      figureId,
      figureNumber: entry?.figureNumber ?? 1,
      title: entry?.title ?? figureId,
      description: '',
      diagramType: entry?.diagramType ?? 'architecture',
      engine,
      source: newSource,
      phase: entry?.phase ?? 'draft',
    };

    const result = engine === 'mermaid'
      ? await this.renderMermaid(spec, outputDir)
      : await this.renderPlantUML(spec, outputDir);

    // 更新 manifest：只更新本次重渲染的目标条目，其余条目原样保留（REQ-003）。
    //
    // 旧实现有两个缺陷：
    //   1. `success: e.figureId === figureId ? true : true` 是两个分支都取 true 的
    //      重言式 —— 重渲染一次就会把全部历史条目刷成「成功」；
    //   2. 只在 `result.success` 为真时才回写，失败时 manifest 保持旧值，
    //      于是上一次的 success 反把这次的真实失败盖掉。
    // 现在无论成败都按实际结果更新目标条目，其余条目的 success / error 原值透传。
    if (entry) {
      const updated: ManifestEntry[] = manifest.map((e) => {
        if (e.figureId !== figureId) {
          return e;
        }
        const next: ManifestEntry = { ...e, engine, success: result.success };
        if (result.error !== undefined) {
          next.error = result.error;
        } else {
          delete next.error;
        }
        return next;
      });
      this.writeManifestEntries(updated, outputDir);
    }

    return result;
  }

  // ============================================================================
  // Manifest 读写
  // ============================================================================

  /**
   * 写入 figures-manifest.json
   */
  writeManifest(specs: FigureSpec[], results: RenderResult[], outputDir: string): void {
    const entries: ManifestEntry[] = [];

    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const result = results[i];
      if (!result) continue;

      const sourceExt = spec.engine === 'mermaid' ? 'mmd' : 'puml';
      const entry: ManifestEntry = {
        figureId: spec.figureId,
        figureNumber: spec.figureNumber,
        title: spec.title,
        diagramType: spec.diagramType,
        engine: spec.engine,
        phase: spec.phase,
        files: {
          source: `${spec.figureId}.${sourceExt}`,
          svg: `${spec.figureId}.svg`,
          png: `${spec.figureId}.png`,
        },
        // 记录真实结果：失败条目同样入库，否则「失败」与「未曾渲染」无法区分。
        success: result.success,
      };
      if (result.error !== undefined) {
        entry.error = result.error;
      }
      entries.push(entry);
    }

    this.writeManifestEntries(entries, outputDir);
  }

  /**
   * 按给定条目直接写入 figures-manifest.json
   *
   * 供 `rerender()` 使用：它需要保留未被触及的条目（含其 success / error），
   * 不能经由 `writeManifest()` 的「specs + results」重算路径。
   */
  writeManifestEntries(entries: ManifestEntry[], outputDir: string): void {
    const manifestPath = join(outputDir, 'figures-manifest.json');
    writeFileSync(manifestPath, JSON.stringify(entries, null, 2), 'utf-8');
  }

  /**
   * 读取 figures-manifest.json
   */
  readManifest(outputDir: string): ManifestEntry[] {
    const manifestPath = join(outputDir, 'figures-manifest.json');
    if (!existsSync(manifestPath)) {
      return [];
    }

    try {
      const content = readFileSync(manifestPath, 'utf-8');
      return JSON.parse(content) as ManifestEntry[];
    } catch {
      return [];
    }
  }
}
