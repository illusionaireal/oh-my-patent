/** Merge generated defaults without replacing user-owned MCP servers. */
export function mergeMcpConfig(existing: string, generated: string): string {
  const current = JSON.parse(existing) as Record<string, unknown>;
  const defaults = JSON.parse(generated) as { mcpServers: Record<string, unknown> };
  if (!current || typeof current !== 'object' || Array.isArray(current)
    || (current.mcpServers !== undefined && (!current.mcpServers
      || typeof current.mcpServers !== 'object' || Array.isArray(current.mcpServers)))) {
    throw new Error('Invalid .mcp.json: expected an object with an mcpServers object');
  }
  return JSON.stringify({
    ...current,
    mcpServers: { ...defaults.mcpServers, ...current.mcpServers as Record<string, unknown> },
  }, null, 2);
}
