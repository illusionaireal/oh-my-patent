import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiagramRenderer } from '../../src/core/diagram-renderer';
import { FigureSpec, RenderResult } from '../../src/core/diagram-types';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';

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

    // Default: mmdc succeeds
    mockExecFile.mockImplementation((cmd: string, args: string[], opts: any, cb: any) => {
      if (typeof opts === 'function') { cb = opts; }
      cb(null, { stdout: '', stderr: '' });
    });

    // Default: PlantUML server succeeds
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/png/')) {
        return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('png-data') };
      }
      if (url.includes('/svg/')) {
        return { ok: true, status: 200, text: async () => '<svg>test</svg>' };
      }
      return { ok: false, status: 404, statusText: 'Not Found' };
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
