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
function encodePlantUML(text: string): string {
  const compressed = deflateRawSync(Buffer.from(text, 'utf-8'));
  return encode64(compressed);
}

function encode64(data: Buffer): string {
  const encode6bit = (b: number): string => {
    if (b < 10) return String.fromCharCode(48 + b);
    b -= 10;
    if (b < 26) return String.fromCharCode(65 + b);
    b -= 26;
    if (b < 26) return String.fromCharCode(97 + b);
    b -= 26;
    if (b === 0) return '-';
    if (b === 1) return '_';
    return '?';
  };

  let r = '';
  for (let i = 0; i < data.length; i += 3) {
    const b1 = data[i] & 0x3f;
    const b2 = ((data[i] >> 6) | (data[i + 1] << 2)) & 0x3f;
    const b3 = ((data[i + 1] >> 4) | (data[i + 2] << 4)) & 0x3f;
    const b4 = (data[i + 2] >> 2) & 0x3f;
    r += encode6bit(b1) + encode6bit(b2) + encode6bit(b3) + encode6bit(b4);
  }
  return r;
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
    assertValidFigureId(spec.figureId);
    const baseName = spec.figureId;
    const sourcePath = join(outputDir, `${baseName}.mmd`);
    const pngPath = join(outputDir, `${baseName}.png`);
    const svgPath = join(outputDir, `${baseName}.svg`);

    mkdirSync(outputDir, { recursive: true });

    // 写入源文件
    writeFileSync(sourcePath, spec.source, 'utf-8');

    try {
      // 渲染 PNG
      await execFileAsync(this.config.mmdcPath, [
        '-i', sourcePath,
        '-o', pngPath,
        '-t', 'default',
        '--scale', '2',
      ], { timeout: this.config.timeout });

      // 渲染 SVG
      await execFileAsync(this.config.mmdcPath, [
        '-i', sourcePath,
        '-o', svgPath,
        '-t', 'default',
      ], { timeout: this.config.timeout });

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
        fetch(`${baseUrl}/png/${encoded}`, { signal: AbortSignal.timeout(this.config.timeout) }),
        fetch(`${baseUrl}/svg/${encoded}`, { signal: AbortSignal.timeout(this.config.timeout) }),
      ]);

      if (!pngResp.ok) {
        throw new Error(`PlantUML PNG request failed: ${pngResp.status} ${pngResp.statusText}`);
      }
      if (!svgResp.ok) {
        throw new Error(`PlantUML SVG request failed: ${svgResp.status} ${svgResp.statusText}`);
      }

      const pngBuffer = Buffer.from(await pngResp.arrayBuffer());
      const svgText = await svgResp.text();

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
   */
  async renderAll(specs: FigureSpec[], outputDir: string): Promise<RenderResult[]> {
    const results: RenderResult[] = [];

    for (const spec of specs) {
      const result = spec.engine === 'mermaid'
        ? await this.renderMermaid(spec, outputDir)
        : await this.renderPlantUML(spec, outputDir);
      results.push(result);
    }

    // 写入 manifest
    if (results.some(r => r.success)) {
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

    // 更新 manifest
    if (result.success && entry) {
      this.writeManifest(
        manifest.map(e => ({
          figureId: e.figureId,
          figureNumber: e.figureNumber,
          title: e.title,
          description: '',
          diagramType: e.diagramType,
          engine: e.engine,
          source: '', // manifest 不存 source
          phase: e.phase,
        })),
        manifest.map(e => ({
          figureId: e.figureId,
          svgPath: join(outputDir, e.files.svg),
          pngPath: join(outputDir, e.files.png),
          sourcePath: join(outputDir, e.files.source),
          success: e.figureId === figureId ? true : true,
        })),
        outputDir
      );
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
      if (!result?.success) continue;

      const sourceExt = spec.engine === 'mermaid' ? 'mmd' : 'puml';
      entries.push({
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
      });
    }

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
