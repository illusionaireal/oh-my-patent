import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

describe('CLI Commands', () => {
  const testDir = resolve(process.cwd(), '.test-cli-temp');
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
    // 清理测试目录
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
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

      // 验证生成的文件
      expect(existsSync(resolve(outputPath, '.claude'))).toBe(true);
      expect(existsSync(resolve(outputPath, '.claude/agents'))).toBe(true);
      expect(existsSync(resolve(outputPath, '.claude/commands'))).toBe(true);
      expect(existsSync(resolve(outputPath, 'CLAUDE.md'))).toBe(true);
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

      // 验证生成的文件
      expect(existsSync(resolve(outputPath, '.codex'))).toBe(true);
      expect(existsSync(resolve(outputPath, 'AGENTS.md'))).toBe(true);
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
      expect(existsSync(resolve(outputPath, '.opencode/agent/archimedes.md'))).toBe(true);
      expect(existsSync(resolve(outputPath, '.opencode/command/archimedes.md'))).toBe(true);
      expect(existsSync(resolve(outputPath, '.opencode/skills/brainstorm-path/SKILL.md'))).toBe(true);
      expect(existsSync(resolve(outputPath, 'opencode.json'))).toBe(false);
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
});
