import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';

describe('CLI Commands', () => {
  // REQ-044: 临时目录必须落在 os.tmpdir()。旧实现建在仓库根的 `.test-cli-temp`：
  // 进程崩溃或 afterAll 超时都会把残留目录留在源码树里（还会被工具链扫描到）。
  // 用 mkdtempSync 保证每次运行目录唯一，崩溃也不会踩到上一次的残留。
  const testDir = mkdtempSync(join(tmpdir(), 'omp-cli-temp-'));
  const cliPath = resolve(process.cwd(), 'dist/cli.js');

  beforeAll(() => {
    // 确保CLI已编译
    if (!existsSync(cliPath)) {
      throw new Error('CLI not built. Run `npm run build` first.');
    }
    // 创建测试目录
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // 故意**不**做递归清理（REQ-044）。目录在 os.tmpdir() 下，交给系统回收。
    // 本机实测删除成本约 47 ms/文件，而本文件生成的产物树有数百个文件 ——
    // 在这里递归删除只会把一个卫生动作变成钩子超时（实测 >60 s）。
    //
    // 之所以不再需要清理：目录已移出源码树，残留不会污染仓库，
    // 且 mkdtempSync 保证每次运行的目录名唯一，不会与下次运行相互干扰。
  });

  describe('path init', () => {
    test('should initialize brainstorm directory', () => {
      const projectPath = resolve(testDir, 'test-project-init');

      const output = execSync(`node "${cliPath}" path init "${projectPath}"`, {
        encoding: 'utf-8',
      });

      // 验证输出格式
      const result = JSON.parse(output);
      expect(result.ok).toBe(true);
      expect(result.message).toMatch(/initialized/i); // 不区分大小写

      // 验证文件结构
      expect(existsSync(resolve(projectPath, '.brainstorm'))).toBe(true);
      expect(existsSync(resolve(projectPath, '.brainstorm/path.json'))).toBe(true);
      expect(existsSync(resolve(projectPath, '.brainstorm/nodes'))).toBe(true);
      expect(existsSync(resolve(projectPath, '.brainstorm/snapshots'))).toBe(true);
    });

    test('should succeed when reinitializing (idempotent)', () => {
      const projectPath = resolve(testDir, 'test-project-reinit');

      // 第一次初始化
      const output1 = execSync(`node "${cliPath}" path init "${projectPath}"`, { encoding: 'utf-8' });
      const result1 = JSON.parse(output1);
      expect(result1.ok).toBe(true);

      // 第二次初始化应该是幂等的（成功但可能有不同消息）
      const output2 = execSync(`node "${cliPath}" path init "${projectPath}"`, {
        encoding: 'utf-8',
      });
      const result2 = JSON.parse(output2);
      // CLI实现为幂等操作，再次初始化不报错
      expect(result2.ok).toBe(true);
    });
  });

  describe('path overview', () => {
    test('should show overview of initialized path', () => {
      const projectPath = resolve(testDir, 'test-project-overview');

      // 初始化
      execSync(`node "${cliPath}" path init "${projectPath}"`, { encoding: 'utf-8' });

      // 获取概览
      const output = execSync(`node "${cliPath}" path overview "${projectPath}"`, {
        encoding: 'utf-8',
      });

      const result = JSON.parse(output);
      expect(result.ok).toBe(true);
      expect(result.totalRounds).toBe(0); // 新初始化的路径
      expect(result.status).toBe('active');
    });
  });

  describe('adapt generate', () => {
    test('should generate claude-code adapter', () => {
      const outputPath = resolve(testDir, 'test-adapt-claude');

      const output = execSync(
        `node "${cliPath}" adapt generate --tool claude-code --output "${outputPath}"`,
        { encoding: 'utf-8' }
      );

      const result = JSON.parse(output);
      expect(result.ok).toBe(true);
      expect(result.adapter).toBe('claude-code');
      expect(result.files).toBeGreaterThan(0);

      // 验证生成的文件（REQ-007：--output 下每个适配器有独立子目录）
      expect(existsSync(resolve(outputPath, 'claude-code', '.claude'))).toBe(true);
      expect(existsSync(resolve(outputPath, 'claude-code', '.claude/agents'))).toBe(true);
      expect(existsSync(resolve(outputPath, 'claude-code', '.claude/commands'))).toBe(true);
      expect(existsSync(resolve(outputPath, 'claude-code', 'CLAUDE.md'))).toBe(true);
    });

    test('should generate codex adapter', () => {
      const outputPath = resolve(testDir, 'test-adapt-codex');

      const output = execSync(
        `node "${cliPath}" adapt generate --tool codex --output "${outputPath}"`,
        { encoding: 'utf-8' }
      );

      const result = JSON.parse(output);
      expect(result.ok).toBe(true);
      expect(result.adapter).toBe('codex');
      expect(result.files).toBeGreaterThan(0);

      // 验证生成的文件（REQ-007：codex 写入自己的子目录）
      expect(existsSync(resolve(outputPath, 'codex', '.codex'))).toBe(true);
      expect(existsSync(resolve(outputPath, 'codex', 'AGENTS.md'))).toBe(true);
    });

    test('should generate opencode adapter', () => {
      const outputPath = resolve(testDir, 'test-adapt-opencode');

      const output = execSync(
        `node "${cliPath}" adapt generate --tool opencode --output "${outputPath}"`,
        { encoding: 'utf-8' }
      );

      const result = JSON.parse(output);
      expect(result.ok).toBe(true);
      expect(result.adapter).toBe('opencode');
      expect(result.files).toBeGreaterThan(0);
      expect(existsSync(resolve(outputPath, 'opencode', '.opencode/agent/archimedes.md'))).toBe(true);
      expect(existsSync(resolve(outputPath, 'opencode', '.opencode/command/archimedes.md'))).toBe(true);
      expect(existsSync(resolve(outputPath, 'opencode', '.opencode/skills/brainstorm-path/SKILL.md'))).toBe(true);
      expect(existsSync(resolve(outputPath, 'opencode', 'opencode.json'))).toBe(false);
    });

    test('should preserve existing OpenCode files during install', () => {
      const outputPath = resolve(testDir, 'test-install-opencode');
      const customAgent = resolve(outputPath, '.opencode/agent/archimedes.md');

      mkdirSync(resolve(outputPath, '.opencode/agent'), { recursive: true });
      writeFileSync(customAgent, 'custom agent\n', 'utf-8');

      const output = execSync(
        `node "${cliPath}" adapt install --tool opencode --workspace-dir "${outputPath}"`,
        { encoding: 'utf-8' }
      );

      expect(JSON.parse(output).adapter).toBe('opencode');
      expect(readFileSync(customAgent, 'utf-8')).toBe('custom agent\n');
      expect(existsSync(resolve(outputPath, '.opencode/command/patent-new.md'))).toBe(true);
    });

    test('should fail with invalid tool name', () => {
      const outputPath = resolve(testDir, 'test-adapt-invalid');

      try {
        execSync(
          `node "${cliPath}" adapt generate --tool invalid-tool --output "${outputPath}"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
        // 不应该到达这里
        expect(true).toBe(false);
      } catch (error: any) {
        // 应该失败
        expect(error.status).toBeGreaterThan(0);
      }
    });
  });

  describe('CLI error handling', () => {
    test('should show help when no command provided', () => {
      const output = execSync(`node "${cliPath}" --help`, { encoding: 'utf-8' });
      expect(output).toContain('Usage');
      expect(output).toContain('path');
      expect(output).toContain('adapt');
    });

    test('should fail gracefully with invalid command', () => {
      try {
        execSync(`node "${cliPath}" invalid-command`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        expect(true).toBe(false); // 不应该成功
      } catch (error: any) {
        expect(error.status).toBeGreaterThan(0);
      }
    });
  });

  describe('diagram render', () => {
    test('should validate diagram specs parameter', () => {
      const projectPath = resolve(testDir, 'test-diagram');

      try {
        execSync(`node "${cliPath}" diagram render "${projectPath}" --specs invalid.json`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        expect(true).toBe(false); // 应该失败
      } catch (error: any) {
        // 文件不存在应该报错
        expect(error.status).toBeGreaterThan(0);
      }
    });
  });

  describe('diagram rerender engine inference (REQ-027)', () => {
    test('rerender without --engine keeps the PlantUML engine from the manifest', () => {
      const projectPath = resolve(testDir, 'test-rerender-engine');
      const referencesDir = resolve(projectPath, 'references');
      const figuresDir = resolve(projectPath, 'figures');
      mkdirSync(referencesDir, { recursive: true });

      // 1. Render a PlantUML figure so figures-manifest.json records
      //    engine: plantuml for it. The render itself may fail (no java/
      //    plantuml.jar on this machine) — the manifest is written either
      //    way (REQ-003), and only the recorded engine matters here.
      const specs = [{
        figureId: 'fig1_puml',
        figureNumber: 1,
        title: 'PUML engine test',
        description: 'engine inference fixture',
        diagramType: 'architecture',
        engine: 'plantuml',
        source: '@startuml\nA -> B\n@enduml',
        phase: 'draft',
      }];
      const specsPath = resolve(referencesDir, 'diagram-specs-draft.json');
      writeFileSync(specsPath, JSON.stringify(specs, null, 2), 'utf-8');
      execSync(`node "${cliPath}" diagram render "${projectPath}" --specs "@${specsPath}"`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      const manifest = JSON.parse(readFileSync(resolve(figuresDir, 'figures-manifest.json'), 'utf-8'));
      expect(manifest.find((e: any) => e.figureId === 'fig1_puml').engine).toBe('plantuml');

      // 2. Re-render WITHOUT --engine: the engine must come back from the
      //    manifest, not from the historical hardcoded 'mermaid' default.
      const newSourcePath = resolve(referencesDir, 'fig1-puml-v2.puml');
      writeFileSync(newSourcePath, '@startuml\nC -> D\n@enduml', 'utf-8');
      const out = execSync(
        `node "${cliPath}" diagram rerender "${projectPath}" --figure fig1_puml --source "${newSourcePath}"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      const rerendered = JSON.parse(out);
      expect(rerendered.engine).toBe('plantuml');

      // 3. The manifest entry still records plantuml after the re-render.
      const manifestAfter = JSON.parse(readFileSync(resolve(figuresDir, 'figures-manifest.json'), 'utf-8'));
      expect(manifestAfter.find((e: any) => e.figureId === 'fig1_puml').engine).toBe('plantuml');
    });
  });
});
