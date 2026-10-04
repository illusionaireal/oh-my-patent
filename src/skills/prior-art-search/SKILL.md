---
name: prior-art-search
description: Use when searching patents and technical literature for prior art, novelty, or patentability assessment.
---

# Prior Art Search Skill

Search existing patents and technical literature to identify prior art for novelty and patentability assessment.

## Overview

This skill integrates with multiple MCP servers (Google Scholar, USPTO, Semantic Scholar) to conduct comprehensive prior art searches across patents, academic papers, and technical documentation.

## Usage

The skill is typically invoked by the `patent-landscape-analyst` agent during the RESEARCH stage of the patent workflow.

### Basic Usage Pattern

```typescript
// The skill is invoked through agent orchestration
// Agent: patent-landscape-analyst
// Input: topic keywords, technical domain
// Output: aggregated landscape report
```

## Input Parameters

### Required
- **query**: Search keywords and technical terms
  - Example: `"homomorphic encryption privacy-preserving computation"`

### Optional
- **searchScope**: Time range for results
  - Default: Last 5 years
  - Options: `1year`, `3years`, `5years`, `10years`, `all`

- **maxResultsPerSource**: Maximum results from each source
  - Default: 5
  - Range: 1-20

- **sources**: Which databases to query
  - Default: All enabled MCP servers
  - Options: `google_scholar`, `uspto_patent`, `semantic_scholar`, `cnipa_patent`, `patsnap_search`

- **jurisdiction**: Filter by patent jurisdiction
  - Default: All jurisdictions
  - Options: `CN`, `US`, `PCT`
  - `EP` / `JP` are **not supported** (REQ-017): if the user asks for them, say so
    explicitly, then proceed without a jurisdiction filter (or suggest `PCT` for
    international filings). Never pass an unsupported code downstream.

## Output Format

### Primary Output
**File**: `references/landscape_{topic_slug}.md`

Contains aggregated search results organized by:
- Patent references (with classification codes)
- Academic literature
- Technical standards
- Industry implementations

### Secondary Output
**Files**: `references/{source}_{id}.md`

Individual evidence cards for each finding:
- Full citation
- Abstract/summary
- Relevance score
- Key technical features
- Novelty comparison notes

## Examples

### Example 1: Basic Prior Art Search

```markdown
<!-- Invoked by patent-landscape-analyst -->

Input:
- Topic: "blockchain-based cross-border payment with privacy"
- Scope: Last 5 years
- Max results: 10 per source

Output:
references/landscape_blockchain-cross-border-payment.md
  - 8 relevant patents (USPTO, EPO, CNIPA)
  - 12 academic papers (Google Scholar, Semantic Scholar)
  - 3 technical standards (ISO, IEEE)

references/uspto_US10123456.md
references/cnipa_CN108234567.md
references/scholar_arxiv2023-12345.md
...
```

### Example 2: Targeted Patent Search

```markdown
Input:
- Query: "federated learning differential privacy medical data"
- Jurisdiction: CN
- Scope: 3 years
- Sources: uspto_patent, semantic_scholar

Output:
references/landscape_federated-learning-medical.md
  - 5 CN patents with IPC codes H04L29/06, G06N20/00
  - 8 academic papers from top conferences
  - Novelty gaps identified in medical-specific privacy
```

### Example 3: Comprehensive Technical Search

```markdown
Input:
- Query: "zero-knowledge proof identity authentication edge computing"
- Scope: All time
- Max results: 20

Output:
references/landscape_zkp-identity-edge.md
  Organized sections:
  1. Core patents (15 references)
  2. Academic foundations (25 papers)
  3. Implementation examples (8 systems)
  4. Novelty analysis summary
```

## MCP Server Dependencies

### Required MCP Servers

1. **google_scholar**
   - Academic literature search
   - Citation tracking
   - Conference/journal papers

2. **uspto_patent** (optional but recommended)
   - US patent database
   - Patent classification lookup
   - Full-text patent search

3. **semantic_scholar** (optional)
   - Academic paper search with AI-powered relevance
   - Citation graphs
   - Influence metrics

4. **cnipa_patent** (recommended, required for CN jurisdiction)
   - China National Intellectual Property Administration
   - CN patent database with IPC classification
   - Chinese patent full-text search

5. **patsnap_search** (recommended)
   - 智慧芽 (Patsnap) patent + literature fusion search
   - 2.1 billion+ global patent data across 174 patent offices
   - Includes legal status, patent family, and citation data
   - REST API + native MCP service (Streamable HTTP)

### Configuration

MCP servers should be configured in `.claude/settings.json`:

```json
{
  "mcpServers": {
    "google_scholar": {
      "command": "mcp-google-scholar",
      "args": []
    },
    "semantic_scholar": {
      "command": "mcp-semantic-scholar",
      "args": []
    },
    "patsnap_search": {
      "url": "https://connect.zhihuiya.com/mcp?apikey=YOUR_PATSNAP_MCP_KEY",
      "type": "streamableHttp"
    }
  }
}
```

**智慧芽 MCP Key 获取**：
1. 登录 https://open.zhihuiya.com/
2. 在 API 密钥页面创建新的 MCP Key（格式 `sk-xxxxxxxxxxxx`）
3. 将 Key 填入 `url` 的 `apikey` 参数中

**注意**：智慧芽 MCP 使用 Streamable HTTP transport，不是传统的 stdio MCP。配置时需使用 `url` + `type: "streamableHttp"` 格式，而非 `command` + `args`。

## Integration with Workflow

### Stage: RESEARCH
1. User provides patent topic
2. `archimedes` routes to `patent-landscape-analyst`
3. Analyst invokes `prior-art-search` skill
4. Results written to `references/landscape_{topic_slug}.md`
5. Feature matrix written to `references/feature-matrix_{topic_slug}.md`
6. Problem map written to `references/problem-map_{topic_slug}.md`
7. Workflow advances to BRAINSTORM_R1

### Outputs Used By
- `patentability-evaluator`: Assesses novelty against prior art
- `patent-innovation-architect`: Identifies gaps for innovation
- `patent-adversarial-examiner`: Challenges novelty claims

## Performance Notes

- Search time: 30-90 seconds per query (depends on sources)
- Network required: MCP servers make external API calls
- Rate limits: Respect source-specific rate limits (handled by MCP)
- Caching: Results cached per session to avoid redundant searches

## Error Handling

### Common Errors

1. **MCP Server Not Available**
   - Falls back to available sources
   - Logs warning in landscape report

2. **No Results Found**
   - Returns empty landscape with suggestions to broaden query
   - Recommends alternative keywords

3. **Rate Limit Exceeded**
   - Pauses and retries with exponential backoff
   - Notifies user of delay

## Best Practices

1. **Query Construction**
   - Use technical terms, not business descriptions
   - Include domain-specific keywords
   - Combine multiple concepts with proper connectors

2. **Scope Selection**
   - Start with 5 years for fast iteration
   - Expand to 10 years if few results
   - Use "all time" only for emerging technologies

3. **Result Validation**
   - Always review landscape_{topic_slug}.md before proceeding
   - Verify relevance of top 3 references manually
   - Cross-check patent classifications

## Related Skills

- `evidence-card`: Formats individual prior art entries
- `quality-gate`: Validates landscape report completeness
- `jurisdiction`: Filters by patent jurisdiction rules
