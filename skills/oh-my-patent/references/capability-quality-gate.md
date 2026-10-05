
# Quality Gate Skill

Validates patent disclosure completeness and quality.

## Usage

Import from `../skills/quality-gate.ts`:

```typescript
import { QualityChecker } from '../skills/quality-gate';

const checker = new QualityChecker();
const issues = checker.check(content);
const score = checker.getScore(content);
```

## Checks

### Required (ERROR)
- Title (发明名称)
- Technical Field (技术领域)
- Background (背景技术)
- Summary (发明内容)
- Embodiments (具体实施方式)
- Claims (权利要求书)

### Recommended (WARNING)
- Abstract (摘要)
- Drawings Description (附图说明)

### Informational (INFO)
- Claim count recommendation

## Score Calculation

- ERROR: -20 points
- WARNING: -5 points
- INFO: -2 points
- Base: 100 points
