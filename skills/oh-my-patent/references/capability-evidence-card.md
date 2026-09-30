
# Evidence Card Skill

Generate standardized evidence cards for prior art references.

## Usage

Creates structured evidence cards in `references/` directory.

## Card Format

```markdown
# Evidence Card: {ID}

## Source
- Database: {source}
- ID: {identifier}
- URL: {url}
- Type: patent | paper | standard

## Content
- Title: {title}
- Abstract: {abstract}
- Claims Summary: {claims_summary}

## Relevance
- Key Features: {key_features}
- Differences: {differences}

## Legal Status
- Status: granted | pending | lapsed | withdrawn
- Jurisdiction: CN | US | EP | JP
- Expiration: YYYY-MM-DD (if known)

## Patent Family
| Jurisdiction | Patent Number | Status |
|-------------|-------------|--------|
| CN | CN108234567A | granted |
| US | US10123456B2 | granted |
| EP | EP3456789A1 | pending |

## Citations

### Forward Citations (cited by)
- [R3] Title (2023) - cited Claim 1
- [R5] Title (2022) - cited Claim 1, 3
(max 10, sorted by relevance)

### Backward Citations (cites)
- [D1] Title (2018) - cited by this patent
- [D2] Title (2019) - cited by this patent
(max 10, sorted by relevance)
```

## Field Requirements

| Field | Required for | Notes |
|-------|-------------|-------|
| Source | All entries | Database name |
| Content | All entries | Title + abstract minimum |
| Relevance | All entries | Key features + differences |
| Legal Status | Patents with relevance >= 4 stars | Required for high-relevance patents |
| Patent Family | All patent entries | Even if only self (1 row) |
| Forward Citations | Patents with relevance >= 4 stars | Max 10, skip if unavailable |
| Backward Citations | Patents with relevance >= 4 stars | Max 10, skip if unavailable |

If deep information (legal status, family, citations) is not available from MCP servers, mark the section as "Information not available" rather than omitting it.

## Output

- `references/{source}_{id}.md`: Individual evidence card
