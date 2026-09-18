import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseArgs, isDangerousKey } from '../../src/core/cli-args';
import { loadPortableDef } from '../../src/adapters/loader';

const TMP_DIR = join(__dirname, '..', 'fixtures', 'tmp-pollution');

describe('Prototype pollution prevention - production code', () => {
  beforeEach(() => {
    mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
    // Ensure no pollution leaked
    expect(({} as any).polluted).toBeUndefined();
  });

  it('parseArgs from production module prevents __proto__ pollution', () => {
    const opts = parseArgs(['--__proto__', 'polluted', '--constructor', 'evil', '--prototype', 'evil2', '--normal', 'value']);
    // Should not pollute Object.prototype
    expect(({} as any).polluted).toBeUndefined();
    expect(({} as any).evil).toBeUndefined();
    // Dangerous keys filtered
    expect(opts['__proto__']).toBeUndefined();
    expect(opts['constructor']).toBeUndefined();
    expect(opts['prototype']).toBeUndefined();
    // Normal key preserved
    expect(opts['normal']).toBe('value');
    // opts is null-prototype, so hasOwnProperty check via Object.prototype
    expect(Object.getPrototypeOf(opts)).toBeNull();
  });

  it('parseArgs null-prototype prevents pollution via direct assignment', () => {
    const opts: Record<string, string> = parseArgs(['--safe', 'ok']);
    // Even if we try to assign __proto__ via bracket, it should be filtered and not pollute
    expect((opts as any)['__proto__']).toBeUndefined();
    // Verify prototype chain is null
    expect(Object.getPrototypeOf(opts)).toBeNull();
    expect(({} as any).polluted).toBeUndefined();
  });

  it('isDangerousKey correctly identifies dangerous keys', () => {
    expect(isDangerousKey('__proto__')).toBe(true);
    expect(isDangerousKey('constructor')).toBe(true);
    expect(isDangerousKey('prototype')).toBe(true);
    expect(isDangerousKey('normalKey')).toBe(false);
    expect(isDangerousKey('tool')).toBe(false);
  });

  it('loader loadPortableDef filters dangerous config keys and prevents pollution', async () => {
    // Create a minimal plugin.jsonc with dangerous keys in config
    const pluginJsonc = `{
      // comment
      "name": "test",
      "version": "0.0.0",
      "agents": [],
      "skills": [],
      "commands": [],
      "config": {
        "__proto__": { "default": "polluted", "type": "string", "description": "evil" },
        "constructor": { "default": "polluted", "type": "string", "description": "evil" },
        "prototype": { "default": "polluted", "type": "string", "description": "evil" },
        "jurisdiction": { "default": "CN", "type": "string", "description": "safe" }
      }
    }`;
    writeFileSync(join(TMP_DIR, 'plugin.jsonc'), pluginJsonc, 'utf-8');

    const def = await loadPortableDef({ pluginDir: TMP_DIR, workspaceDir: TMP_DIR });

    // Dangerous keys should be filtered
    expect((def.config as any)['__proto__']).toBeUndefined();
    expect((def.config as any)['constructor']).toBeUndefined();
    expect((def.config as any)['prototype']).toBeUndefined();
    // Safe key should be present
    expect((def.config as any)['jurisdiction']).toBeDefined();
    expect((def.config as any)['jurisdiction'].default).toBe('CN');
    // No pollution
    expect(({} as any).polluted).toBeUndefined();
    // Config should be null-prototype
    expect(Object.getPrototypeOf(def.config)).toBeNull();
  });

  it('loader filters dangerous MCP server ids', async () => {
    // Create plugin.jsonc and opencode.jsonc with dangerous mcp ids
    const pluginJsonc = `{
      "name": "test",
      "version": "0.0.0",
      "agents": [],
      "skills": [],
      "commands": [],
      "config": {}
    }`;
    writeFileSync(join(TMP_DIR, 'plugin.jsonc'), pluginJsonc, 'utf-8');

    const opencodeJsonc = `{
      // comment
      "mcp": {
        "__proto__": { "command": ["evil"] },
        "constructor": { "command": ["evil"] },
        "safe_server": { "command": ["node", "server.js"] }
      }
    }`;
    writeFileSync(join(TMP_DIR, 'opencode.jsonc'), opencodeJsonc, 'utf-8');

    const def = await loadPortableDef({ pluginDir: TMP_DIR, workspaceDir: TMP_DIR });

    const ids = def.mcpServers.map(s => s.id);
    expect(ids).not.toContain('__proto__');
    expect(ids).not.toContain('constructor');
    expect(ids).toContain('safe_server');
    expect(({} as any).polluted).toBeUndefined();
  });

  it('Object.create(null) prevents pollution even if filtered logic removed - regression guard', () => {
    // Demonstrate classic pollution via __proto__ accessor
    const vulnerable: Record<string, any> = {};
    // Accessing __proto__ returns Object.prototype, then setting polluted on it pollutes all objects
    (vulnerable as any)['__proto__']['polluted'] = true;
    const isVulnerable = ({} as any).polluted === true;
    // Clean up
    if (isVulnerable) {
      delete (Object.prototype as any).polluted;
    }
    // This classic pattern DOES pollute when using plain {}
    expect(isVulnerable).toBe(true);

    // Fixed code with null-prototype does NOT have __proto__ accessor, so no pollution
    const fixed: Record<string, any> = Object.create(null);
    // On null-prototype object, __proto__ is just a normal key, not accessor
    expect((fixed as any)['__proto__']).toBeUndefined();
    (fixed as any)['__proto__'] = { polluted: true };
    // Should NOT pollute Object.prototype
    expect(({} as any).polluted).toBeUndefined();
    // Own property exists
    expect(fixed['__proto__']).toEqual({ polluted: true });
    // Ensure null-prototype still
    expect(Object.getPrototypeOf(fixed)).toBeNull();
  });
});
