import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DiagramRenderer,
  encode64,
  encodePlantUML,
} from '../../src/core/diagram-renderer';
import { FigureSpec, RenderResult } from '../../src/core/diagram-types';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { inflateRawSync } from 'zlib';

// Renderer mechanics use an approved-transport test double. Real denial, scope,
// audit and retry behavior are tested separately in skill-package/disclosure.test.ts.
vi.mock('../../src/core/disclosure.js', () => ({ disclosedFetch: (url: string) => fetch(url) }));

// ============================================================================
// Mocks
// ============================================================================

const mockExecFile = vi.fn();

vi.mock('child_process', () => ({
  execFile: (...args: any[]) => mockExecFile(...args),
}));

// Mock global fetch for PlantUML
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// ============================================================================
// 测试数据
// ============================================================================

/**
 * 一个体积达标、签名正确的 PNG 替身。
 *
 * REQ-042 起渲染器会校验响应体（Content-Type / PNG 签名 / 尺寸下限），
 * 因此测试替身不能再是 `Buffer.from('png-data')` 这种假数据。
 */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const makePngBody = (size = 1024): Buffer =>
  Buffer.concat([PNG_SIGNATURE, Buffer.alloc(Math.max(0, size - PNG_SIGNATURE.length), 0x20)]);

/** 体积达标、含 `<svg>` 根元素的 SVG 替身。 */
const makeSvgBody = (padding = 200): string =>
  `<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/>${' '.repeat(
    padding
  )}</svg>`;

/** 构造带 `headers.get()` 的响应替身。 */
const makeResponse = (opts: {
  ok: boolean;
  status: number;
  statusText?: string;
  contentType?: string;
  description?: string;
  body?: Buffer | string;
}) => {
  const headers = new Map<string, string>();
  if (opts.contentType) headers.set('content-type', opts.contentType);
  if (opts.description) headers.set('x-plantuml-diagram-description', opts.description);
  return {
    ok: opts.ok,
    status: opts.status,
    statusText: opts.statusText ?? '',
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    arrayBuffer: async () => Buffer.from(opts.body ?? ''),
    text: async () => String(opts.body ?? ''),
  };
};

const makeMermaidSpec = (overrides: Partial<FigureSpec> = {}): FigureSpec => ({
  figureId: 'fig1_arch',
  figureNumber: 1,
  title: '系统架构图',
  description: '展示系统架构',
  diagramType: 'architecture',
  engine: 'mermaid',
  source: 'graph TB\n  A --> B',
  phase: 'draft',
  ...overrides,
});

const makePlantUMLSpec = (overrides: Partial<FigureSpec> = {}): FigureSpec => ({
  figureId: 'fig2_seq',
  figureNumber: 2,
  title: '时序图',
  description: '展示交互流程',
  diagramType: 'sequence',
  engine: 'plantuml',
  source: '@startuml\nAlice -> Bob: Hello\n@enduml',
  phase: 'draft',
  ...overrides,
});

// ============================================================================
// 测试
// ============================================================================

describe('DiagramRenderer', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'diagram-test-'));

    // 清空调用历史：否则后执行的用例会看到前面用例累积的调用次数
    mockExecFile.mockClear();
    mockFetch.mockClear();

    // Default: mmdc succeeds
    mockExecFile.mockImplementation((cmd: string, args: string[], opts: any, cb: any) => {
      if (typeof opts === 'function') { cb = opts; }
      cb(null, { stdout: '', stderr: '' });
    });

    // Default: PlantUML server succeeds
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/png/')) {
        return makeResponse({
          ok: true,
          status: 200,
          contentType: 'image/png',
          description: '(2 participants)',
          body: makePngBody(),
        });
      }
      if (url.includes('/svg/')) {
        return makeResponse({
          ok: true,
          status: 200,
          contentType: 'image/svg+xml',
          description: '(2 participants)',
          body: makeSvgBody(),
        });
      }
      return makeResponse({ ok: false, status: 404, statusText: 'Not Found' });
    });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('renderMermaid', () => {
    it('should write source file and return success', async () => {
      const renderer = new DiagramRenderer();
      const spec = makeMermaidSpec();
      const result = await renderer.renderMermaid(spec, tmpDir);

      expect(result.success).toBe(true);
      expect(result.figureId).toBe('fig1_arch');
      expect(result.sourcePath).toContain('.mmd');
      expect(result.pngPath).toContain('.png');
      expect(result.svgPath).toContain('.svg');

      // Verify source file was written
      const sourceContent = readFileSync(join(tmpDir, 'fig1_arch.mmd'), 'utf-8');
      expect(sourceContent).toBe('graph TB\n  A --> B');
    });

    it('should return error when mmdc fails', async () => {
      mockExecFile.mockImplementation((cmd: string, args: string[], opts: any, cb: any) => {
        if (typeof opts === 'function') { cb = opts; }
        cb(new Error('mmdc not found'));
      });

      const renderer = new DiagramRenderer();
      const spec = makeMermaidSpec();
      const result = await renderer.renderMermaid(spec, tmpDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Mermaid render failed');
    });
  });

  describe('renderPlantUML', () => {
    it('should write source file and call PlantUML server', async () => {
      const renderer = new DiagramRenderer();
      const spec = makePlantUMLSpec();
      const result = await renderer.renderPlantUML(spec, tmpDir);

      expect(result.success).toBe(true);
      expect(result.sourcePath).toContain('.puml');

      // Verify source file was written
      const sourceContent = readFileSync(join(tmpDir, 'fig2_seq.puml'), 'utf-8');
      expect(sourceContent).toContain('@startuml');

      // Verify fetch was called for both PNG and SVG
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should return error when PlantUML server fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const renderer = new DiagramRenderer();
      const spec = makePlantUMLSpec();
      const result = await renderer.renderPlantUML(spec, tmpDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('PlantUML render failed');
    });
  });

  describe('renderAll', () => {
    it('should render multiple specs and write manifest', async () => {
      const renderer = new DiagramRenderer();
      const specs = [
        makeMermaidSpec(),
        makeMermaidSpec({ figureId: 'fig2_flow', figureNumber: 2, title: '流程图' }),
      ];

      const results = await renderer.renderAll(specs, tmpDir);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);

      // Verify manifest was written
      const manifestPath = join(tmpDir, 'figures-manifest.json');
      expect(existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      expect(manifest).toHaveLength(2);
      expect(manifest[0].figureId).toBe('fig1_arch');
      expect(manifest[1].figureId).toBe('fig2_flow');
    });
  });

  describe('readManifest', () => {
    it('should return empty array when manifest does not exist', () => {
      const renderer = new DiagramRenderer();
      const manifest = renderer.readManifest(tmpDir);
      expect(manifest).toEqual([]);
    });

    it('should read existing manifest', async () => {
      const renderer = new DiagramRenderer();
      const specs = [makeMermaidSpec()];
      await renderer.renderAll(specs, tmpDir);

      const manifest = renderer.readManifest(tmpDir);
      expect(manifest).toHaveLength(1);
      expect(manifest[0].figureId).toBe('fig1_arch');
      expect(manifest[0].files.source).toBe('fig1_arch.mmd');
    });
  });
  // ==========================================================================
  // REQ-003: rerender 的 manifest round-trip
  // ==========================================================================

  describe('rerender manifest round-trip (REQ-003)', () => {
    const seedManifest = (): void => {
      const seeded = [
        {
          figureId: 'figA_broken',
          figureNumber: 1,
          title: '一直失败的图',
          diagramType: 'architecture',
          engine: 'mermaid',
          phase: 'draft',
          files: { source: 'figA_broken.mmd', svg: 'figA_broken.svg', png: 'figA_broken.png' },
          success: false,
          error: 'boom',
        },
        {
          figureId: 'figB_ok',
          figureNumber: 2,
          title: '成功的图',
          diagramType: 'flowchart',
          engine: 'mermaid',
          phase: 'draft',
          files: { source: 'figB_ok.mmd', svg: 'figB_ok.svg', png: 'figB_ok.png' },
          success: true,
        },
      ];
      writeFileSync(join(tmpDir, 'figures-manifest.json'), JSON.stringify(seeded, null, 2), 'utf-8');
    };

    it('should keep the other entries success and error untouched', async () => {
      seedManifest();
      const renderer = new DiagramRenderer();

      const result = await renderer.rerender('figB_ok', 'graph TB\n  X --> Y', tmpDir, 'mermaid');
      expect(result.success).toBe(true);

      const after = renderer.readManifest(tmpDir);
      expect(after).toHaveLength(2);

      const a = after.find(e => e.figureId === 'figA_broken');
      const b = after.find(e => e.figureId === 'figB_ok');

      // 未被重渲染的条目必须保留原值 —— 修复前这里会是 success:true、error 丢失
      expect(a.success).toBe(false);
      expect(a.error).toBe('boom');
      expect(a.files.svg).toBe('figA_broken.svg');

      // 目标条目按真实结果更新
      expect(b.success).toBe(true);
      expect(b.error).toBeUndefined();
    });

    it('should persist a failed rerender instead of keeping the stale success', async () => {
      seedManifest();
      mockExecFile.mockImplementation((cmd: string, args: string[], opts: any, cb: any) => {
        if (typeof opts === 'function') { cb = opts; }
        cb(new Error('mmdc crashed'));
      });

      const renderer = new DiagramRenderer();
      const result = await renderer.rerender('figB_ok', 'graph TB\n  X --> Y', tmpDir, 'mermaid');

      expect(result.success).toBe(false);

      const after = renderer.readManifest(tmpDir);
      const b = after.find(e => e.figureId === 'figB_ok');
      const a = after.find(e => e.figureId === 'figA_broken');

      // 失败必须落盘，否则旧的 success:true 会盖住这次的真实失败
      expect(b.success).toBe(false);
      expect(b.error).toContain('Mermaid render failed');
      // 其他条目仍不受影响
      expect(a.success).toBe(false);
      expect(a.error).toBe('boom');
    });

    it('should round-trip success and error through write and read', async () => {
      // 让 mmdc 失败，以便拿到一个真实的失败 RenderResult
      mockExecFile.mockImplementation((cmd: string, args: string[], opts: any, cb: any) => {
        if (typeof opts === 'function') { cb = opts; }
        cb(new Error('mmdc crashed'));
      });

      const renderer = new DiagramRenderer();
      const failed = await renderer.renderMermaid(
        makeMermaidSpec({ figureId: 'fig_fail' }),
        tmpDir,
      );
      expect(failed.success).toBe(false);

      // writeManifest 必须把成功与失败一并落盘，否则「失败」会被伪装成「未曾渲染」
      const okSpec = makeMermaidSpec({ figureId: 'fig_ok', figureNumber: 2 });
      renderer.writeManifest([makeMermaidSpec({ figureId: 'fig_fail' }), okSpec], [
        failed,
        { figureId: 'fig_ok', svgPath: '', pngPath: '', sourcePath: '', success: true },
      ], tmpDir);

      const manifest = renderer.readManifest(tmpDir);
      const fail = manifest.find(e => e.figureId === 'fig_fail');
      const ok = manifest.find(e => e.figureId === 'fig_ok');

      expect(manifest).toHaveLength(2);
      expect(fail?.success).toBe(false);
      expect(fail?.error).toContain('Mermaid render failed');
      expect(ok?.success).toBe(true);
      expect(ok?.error).toBeUndefined();
    });
  });

  // ==========================================================================
  // REQ-004: PlantUML 编码路径必须真的被执行到
  // ==========================================================================

  describe('encodePlantUML reachability (REQ-004)', () => {
    it('should URL-encode the source for both png and svg requests', async () => {
      const renderer = new DiagramRenderer();
      const spec = makePlantUMLSpec();

      const result = await renderer.renderPlantUML(spec, tmpDir);
      expect(result.success).toBe(true);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const urls = mockFetch.mock.calls.map((c) => String(c[0]));
      const pngUrl = urls.find((u) => u.includes('/png/'));
      const svgUrl = urls.find((u) => u.includes('/svg/'));

      expect(pngUrl).toBeDefined();
      expect(svgUrl).toBeDefined();

      // 路径段必须存在、且是 PlantUML 的 deflate+base64 变体（不含原始换行）
      const pngSeg = pngUrl!.split('/png/')[1];
      const svgSeg = svgUrl!.split('/svg/')[1];
      expect(pngSeg.length).toBeGreaterThan(0);
      expect(pngSeg).not.toContain('@startuml');
      expect(pngSeg).not.toContain('\n');
      expect(/^[0-9A-Za-z\-_]+$/.test(pngSeg)).toBe(true);

      // PNG 与 SVG 必须使用同一份编码
      expect(svgSeg).toBe(pngSeg);
    });
  });

  // ==========================================================================
  // REQ-052: 编码位序 —— 位序写错时服务端返回 HTTP 200 + 占位图，
  //         任何状态码/类型校验都发现不了，只能靠钉住编码本身。
  // ==========================================================================

  describe('PlantUML encoding bit order (REQ-052)', () => {
    /** 与编码器互逆的解码器：先把 4 个 6bit 还原成 3 字节（高位优先）。 */
    const decode6bit = (ch: string): number => {
      const c = ch.charCodeAt(0);
      if (c >= 48 && c <= 57) return c - 48;
      if (c >= 65 && c <= 90) return c - 65 + 10;
      if (c >= 97 && c <= 122) return c - 97 + 36;
      if (ch === '-') return 62;
      if (ch === '_') return 63;
      throw new Error(`invalid 6bit char: ${ch}`);
    };

    const decode64 = (encoded: string): Buffer => {
      const out: number[] = [];
      for (let i = 0; i < encoded.length; i += 4) {
        const c1 = decode6bit(encoded[i]);
        const c2 = decode6bit(encoded[i + 1]);
        const c3 = decode6bit(encoded[i + 2]);
        const c4 = decode6bit(encoded[i + 3]);
        out.push(((c1 << 2) | (c2 >> 4)) & 0xff);
        out.push((((c2 & 0x0f) << 4) | (c3 >> 2)) & 0xff);
        out.push((((c3 & 0x03) << 6) | c4) & 0xff);
      }
      return Buffer.from(out);
    };

    it('encode64 must pack 3 bytes high-bits-first (canonical PlantUML table)', () => {
      // 向量由官方实现算出；例如 'Man' 的 shift-base64 为 'JM5k'
      // （标准 base64 的 'TWFu' 经同一 6bit→字符位移表映射而来）。
      expect(encode64(Buffer.from([0x4d, 0x61, 0x6e]))).toBe('JM5k');
      expect(encode64(Buffer.from([0x00, 0x01, 0x02]))).toBe('0042');
      expect(encode64(Buffer.from([0xff, 0x00, 0x3f]))).toBe('_m0_');
      expect(encode64(Buffer.from([0xde, 0xad, 0xbe, 0xef]))).toBe('tgs-xm00');
    });

    it('encode64 must pad a 1-byte and a 2-byte tail', () => {
      expect(encode64(Buffer.from([0x41]))).toBe('GG00');
      expect(encode64(Buffer.from([0x41, 0x42]))).toBe('GK80');
    });

    it('encode64 output must decode back to the original bytes', () => {
      // 无长度信息的 base64 无法还原最后一组的 1~2 个填充字节，
      // 因此判据是「未填充部分逐字节相等、填充部分全为 0」——
      // 这正是 PlantUML 服务端能 inflate 出原文的原因。
      const samples = [
        Buffer.from('Man', 'utf-8'),
        Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]),
        Buffer.from([0x41]),
        Buffer.from([0x41, 0x42]),
        Buffer.from('@startuml\nA -> B\n@enduml', 'utf-8'),
      ];
      for (const sample of samples) {
        const decoded = decode64(encode64(sample));
        expect(decoded.subarray(0, sample.length).equals(sample)).toBe(true);
        expect(decoded.length - sample.length).toBeLessThanOrEqual(2);
        expect(Array.from(decoded.subarray(sample.length))).toEqual(
          new Array(Math.max(0, decoded.length - sample.length)).fill(0)
        );
      }
    });

    it('encodePlantUML output must inflate back to the original source', () => {
      const source = '@startuml\nBob -> Alice : hello\n@enduml';
      const inflated = inflateRawSync(decode64(encodePlantUML(source))).toString('utf-8');
      expect(inflated).toBe(source);
    });

    it('must match the path segment verified against the live PlantUML server', () => {
      // 2026-09-18 实测 www.plantuml.com：该路径段返回 x-plantuml-diagram-description
      // = "(2 participants)"、宽 119，且 SVG 内含 "Alice"；而位序错误的旧实现返回
      // "(0 entities)"、789×310 的 "Welcome to PlantUML!" 占位图。
      expect(encodePlantUML('@startuml\nBob -> Alice : hello\n@enduml')).toBe(
        'SoWkIImgAStDuNBAJrBGjLDmpCbCJbMmKiX8pSd9vt98pKifpSq10000'
      );
    });
  });

  // ==========================================================================
  // REQ-042: 响应体校验 —— HTTP 200 不等于「画出来了」
  // ==========================================================================

  describe('PlantUML response-body validation (REQ-042)', () => {
    const pngPath = (): string => join(tmpDir, 'fig2_seq.png');
    const svgPath = (): string => join(tmpDir, 'fig2_seq.svg');

    it('must treat an "(Error)" description header as a failure and write nothing', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        const isPng = url.includes('/png/');
        return makeResponse({
          ok: true,
          status: 200,
          contentType: isPng ? 'image/png' : 'image/svg+xml',
          description: '(Error)',
          body: isPng ? makePngBody() : makeSvgBody(),
        });
      });

      const renderer = new DiagramRenderer();
      const result = await renderer.renderPlantUML(makePlantUMLSpec(), tmpDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('diagram error');
      expect(existsSync(pngPath())).toBe(false);
      expect(existsSync(svgPath())).toBe(false);
    });

    it('must detect the "Welcome to PlantUML!" placeholder produced by an undecodable payload', async () => {
      const placeholder =
        '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<text>Welcome to PlantUML!</text>' +
        '<text>You can start with a simple UML Diagram like:</text>' +
        '<text>Bob-&gt;Alice: Hello</text>' +
        ' '.repeat(200) +
        '</svg>';

      mockFetch.mockImplementation(async (url: string) =>
        makeResponse({
          ok: true,
          status: 200,
          contentType: url.includes('/png/') ? 'image/png' : 'image/svg+xml',
          description: '(0 entities)',
          body: url.includes('/png/') ? makePngBody() : placeholder,
        })
      );

      const renderer = new DiagramRenderer();
      const result = await renderer.renderPlantUML(makePlantUMLSpec(), tmpDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('placeholder');
      expect(existsSync(pngPath())).toBe(false);
      expect(existsSync(svgPath())).toBe(false);
    });

    it('must reject a PNG body that is not a PNG', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        const isPng = url.includes('/png/');
        return makeResponse({
          ok: true,
          status: 200,
          contentType: isPng ? 'application/octet-stream' : 'image/svg+xml',
          body: isPng ? Buffer.alloc(4096, 0x3c) : makeSvgBody(),
        });
      });

      const renderer = new DiagramRenderer();
      const result = await renderer.renderPlantUML(makePlantUMLSpec(), tmpDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('PlantUML render failed');
      expect(existsSync(pngPath())).toBe(false);
    });

    it('must reject an HTML error page returned with HTTP 200', async () => {
      mockFetch.mockImplementation(async () =>
        makeResponse({
          ok: true,
          status: 200,
          contentType: 'text/html',
          body: '<html><body>502 Bad Gateway</body></html>'.padEnd(1024, ' '),
        })
      );

      const renderer = new DiagramRenderer();
      const result = await renderer.renderPlantUML(makePlantUMLSpec(), tmpDir);

      expect(result.success).toBe(false);
      expect(existsSync(svgPath())).toBe(false);
    });

    it('must reject a truncated SVG body', async () => {
      mockFetch.mockImplementation(async (url: string) =>
        makeResponse({
          ok: true,
          status: 200,
          contentType: url.includes('/png/') ? 'image/png' : 'image/svg+xml',
          body: url.includes('/png/') ? makePngBody() : '<svg>',
        })
      );

      const renderer = new DiagramRenderer();
      const result = await renderer.renderPlantUML(makePlantUMLSpec(), tmpDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('too small');
    });
  });

  // ==========================================================================
  // REQ-042: 并发生成
  // ==========================================================================

  describe('concurrent rendering (REQ-042)', () => {
    it('must keep results aligned with the input order across concurrent renders', async () => {
      const renderer = new DiagramRenderer({ maxConcurrentRenders: 4 });
      const specs = [
        makeMermaidSpec({ figureId: 'fig1', figureNumber: 1 }),
        makeMermaidSpec({ figureId: 'fig2', figureNumber: 2 }),
        makeMermaidSpec({ figureId: 'fig3', figureNumber: 3 }),
      ];

      const results = await renderer.renderAll(specs, tmpDir);

      expect(results.map((r) => r.figureId)).toEqual(['fig1', 'fig2', 'fig3']);
      const manifest = renderer.readManifest(tmpDir);
      expect(manifest.map((e) => e.figureId)).toEqual(['fig1', 'fig2', 'fig3']);
      expect(manifest.map((e) => e.figureNumber)).toEqual([1, 2, 3]);
    });

    it('must overlap the PNG and SVG mmdc invocations for one figure', async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      mockExecFile.mockImplementation((cmd: string, args: string[], opts: any, cb: any) => {
        if (typeof opts === 'function') { cb = opts; }
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        setTimeout(() => {
          inFlight -= 1;
          cb(null, { stdout: '', stderr: '' });
        }, 10);
      });

      const renderer = new DiagramRenderer();
      await renderer.renderMermaid(makeMermaidSpec(), tmpDir);

      expect(mockExecFile).toHaveBeenCalledTimes(2);
      // 串行实现下这里恒为 1；并发实现至少能观察到 2
      expect(maxInFlight).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // REQ-043: PlantUML 服务地址可被环境变量覆盖
  // ==========================================================================

  describe('PlantUML server URL override (REQ-043)', () => {
    afterEach(() => {
      delete process.env.PLANTUML_SERVER_URL;
      vi.resetModules();
    });

    it('should fall back to the public server when the env var is unset', async () => {
      vi.resetModules();
      delete process.env.PLANTUML_SERVER_URL;
      const types = await import('../../src/core/diagram-types');
      expect(types.DEFAULT_RENDERER_CONFIG.plantumlServerUrl).toBe(
        types.DEFAULT_PLANTUML_SERVER_URL
      );
    });

    it('should let PLANTUML_SERVER_URL override the default and be used for requests', async () => {
      vi.resetModules();
      process.env.PLANTUML_SERVER_URL = 'https://puml.internal.example/puml/';

      const types = await import('../../src/core/diagram-types');
      expect(types.DEFAULT_RENDERER_CONFIG.plantumlServerUrl).toBe(
        'https://puml.internal.example/puml/'
      );

      const { DiagramRenderer: FreshRenderer } = await import('../../src/core/diagram-renderer');
      const renderer = new FreshRenderer();
      const result = await renderer.renderPlantUML(makePlantUMLSpec(), tmpDir);

      expect(result.success).toBe(true);
      const urls = mockFetch.mock.calls.map((c) => String(c[0]));
      expect(urls.every((u) => u.startsWith('https://puml.internal.example/puml/'))).toBe(true);
      // 结尾斜杠必须被规整，不能出现 `//png/`
      expect(urls.some((u) => u.includes('//png/'))).toBe(false);
    });
  });
  describe('figureId validation', () => {
    it('should reject path traversal in figureId', async () => {
      const renderer = new DiagramRenderer();
      const malicious = makeMermaidSpec({ figureId: '../../etc/passwd' });
      await expect(renderer.renderMermaid(malicious, tmpDir)).rejects.toThrow(/Invalid figureId/);
    });

    it('should reject figureId with slashes', async () => {
      const renderer = new DiagramRenderer();
      const malicious = makeMermaidSpec({ figureId: 'fig/../evil' });
      await expect(renderer.renderMermaid(malicious, tmpDir)).rejects.toThrow(/Invalid figureId/);
    });

    it('should reject figureId with dots', async () => {
      const renderer = new DiagramRenderer();
      const malicious = makeMermaidSpec({ figureId: '..hidden' });
      await expect(renderer.renderMermaid(malicious, tmpDir)).rejects.toThrow(/Invalid figureId/);
    });

    it('should reject invalid figureId in rerender', async () => {
      const renderer = new DiagramRenderer();
      await expect(renderer.rerender('../../evil', 'graph TB', tmpDir, 'mermaid')).rejects.toThrow(/Invalid figureId/);
    });
  });
});
