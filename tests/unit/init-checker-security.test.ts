import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeMcpConfig } from '../../src/core/init-checker';

/**
 * REQ-009: `writeMcpConfig()` wrote an MCP API key to disk in plaintext, in a file
 * that sits in the workspace root and is therefore one `git add -A` away from
 * being published. Masking existed only on the terminal's copy of the value.
 *
 * Three protections are asserted here: the gitignore entry, the permission
 * tightening, and the warning text that the caller is obliged to surface.
 */

const SECRET = 'sk-test-do-not-use-0000';

describe('MCP config write protection (REQ-009)', () => {
  let workspace = '';

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'oh-my-patent-sec-'));
  });

  afterEach(() => {
    if (existsSync(workspace)) {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('always returns a plaintext warning naming the gitignore requirement', () => {
    const result = writeMcpConfig(workspace, 'patsnap_search', {
      type: 'streamableHttp',
      url: `https://connect.example/mcp?apikey=${SECRET}`,
    });

    expect(result.warning).toContain('确保该文件已被 gitignore');
    expect(result.warning).toMatch(/明文/);
    expect(result.warning).toContain(result.configPath);
  });

  test('adds the config file to the workspace .gitignore', () => {
    const result = writeMcpConfig(workspace, 'patsnap_search', {
      type: 'streamableHttp',
      url: `https://connect.example/mcp?apikey=${SECRET}`,
    });

    expect(result.gitignoreUpdated).toBe(true);
    // No `.claude`/`.codex` in this workspace, so the target is opencode.jsonc.
    expect(result.configPath).toBe(join(workspace, 'opencode.jsonc'));
    const gitignore = readFileSync(join(workspace, '.gitignore'), 'utf-8');
    expect(gitignore.split('\n').map((line) => line.trim())).toContain('opencode.jsonc');
  });

  test('is idempotent: a second write does not duplicate the ignore entry', () => {
    const first = writeMcpConfig(workspace, 'patsnap_search', {
      type: 'streamableHttp',
      url: `https://connect.example/mcp?apikey=${SECRET}`,
    });
    expect(first.gitignoreUpdated).toBe(true);

    const second = writeMcpConfig(workspace, 'google_scholar', { command: 'mcp-google-scholar', args: [] });
    expect(second.gitignoreUpdated).toBe(false);

    const entries = readFileSync(first.gitignorePath, 'utf-8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line === 'opencode.jsonc');
    expect(entries).toHaveLength(1);
  });

  test('does not touch .gitignore when the MCP file is already ignored', () => {
    mkdirSync(join(workspace, '.claude'), { recursive: true });
    writeFileSync(join(workspace, '.gitignore'), 'node_modules/\n.mcp.json\n', 'utf-8');

    const result = writeMcpConfig(workspace, 'patsnap_search', {
      type: 'streamableHttp',
      url: `https://connect.example/mcp?apikey=${SECRET}`,
    });

    expect(result.configPath).toBe(join(workspace, '.mcp.json'));
    expect(result.gitignoreUpdated).toBe(false);
    expect(readFileSync(join(workspace, '.gitignore'), 'utf-8')).toBe('node_modules/\n.mcp.json\n');
  });

  test('tightens permissions where POSIX modes exist and reports the observed mode', () => {
    const result = writeMcpConfig(workspace, 'patsnap_search', {
      type: 'streamableHttp',
      url: `https://connect.example/mcp?apikey=${SECRET}`,
    });

    expect(result.fileMode).not.toBeNull();
    const observed = statSync(result.configPath).mode & 0o777;
    expect(observed).toBe(result.fileMode);

    if (process.platform === 'win32') {
      // Windows accepts chmod() and keeps 0o666; the warning must say the mode
      // could not be tightened rather than implying it was.
      expect(result.warning).toMatch(/不支持 POSIX 权限|权限已收紧/);
    } else {
      expect(result.fileMode).toBe(0o600);
      expect(result.warning).toContain('0o600');
    }
  });

  test('the key is still on disk, which is exactly why the warning exists', () => {
    const result = writeMcpConfig(workspace, 'patsnap_search', {
      type: 'streamableHttp',
      url: `https://connect.example/mcp?apikey=${SECRET}`,
    });

    // Guards against anyone "fixing" the warning by assuming the key is redacted.
    expect(readFileSync(result.configPath, 'utf-8')).toContain(SECRET);
  });
});
