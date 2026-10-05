
# Jurisdiction Rules Skill

Provides patent jurisdiction rules for CN, US, and PCT: examination type and default
timeline, fee schedule, jurisdiction-specific requirements, claim format, and the
examination timeline range.

> This file documents the **actual** exports of `src/skills/jurisdiction.ts`.
> Every symbol, field name and number below is taken from that file. If you change
> the implementation, change this document in the same commit — this document used
> to describe an API that never existed, which is worse than having none.

## Usage

The implementation is `src/skills/jurisdiction.ts`. From inside this skill's
directory the relative import is `../jurisdiction.js`; consumers outside the
package should import from the package entry, which re-exports all seven symbols
(`src/index.ts`).

```typescript
import { getJurisdictionRules, JurisdictionCode } from '../jurisdiction.js';

const rules = getJurisdictionRules(JurisdictionCode.CN);
```

## Exports

| Export | Kind | Notes |
| --- | --- | --- |
| `JurisdictionCode` | enum | `CN` / `US` / `PCT` — the only supported values |
| `JurisdictionRules` | interface | see Output Types |
| `ClaimFormat` | interface | see Output Types |
| `ExaminationTimeline` | interface | see Output Types |
| `getJurisdictionRules(code)` | function | throws on an unsupported code |
| `getClaimFormat(code)` | function | throws on an unsupported code |
| `getExaminationTimeline(code)` | function | throws on an unsupported code |

## Supported Jurisdictions

### CN (中国)
- **Country**: 中国
- **Examination Type**: 实质审查
- **Default Timeline**: 24 months
- **Examination Timeline**: 18–36 months (typical 24)
- **Claim Format**: `一种[产品/方法]，其特征在于，包括：[技术特征]`
- **Dependent Claim Prefix**: `根据权利要求[N]所述的[产品/方法]，其特征在于`
- **Multiple Dependent Claims**: not allowed; max 10 claims
- **Fees**: filing 950 / examination 2500 / grant 200 / maintenance 900
- **Special Requirements**: Chinese language required / National phase entry required for PCT / Grace period: 6 months for disclosure

### US (United States)
- **Country**: United States
- **Examination Type**: Substantive Examination
- **Default Timeline**: 36 months
- **Examination Timeline**: 24–48 months (typical 36)
- **Claim Format**: `A [product/method] comprising: [technical features]`
- **Dependent Claim Prefix**: `The [product/method] of claim [N], wherein`
- **Multiple Dependent Claims**: allowed; max 20 claims
- **Fees**: filing 300 / examination 700 / grant 1000 / maintenance 12000
- **Special Requirements**: First to file system / 12-month grace period / Provisional applications available

### PCT (Patent Cooperation Treaty)
- **Country**: PCT International
- **Examination Type**: International Search and Examination
- **Default Timeline**: 30 months
- **Examination Timeline**: 12–30 months (typical 18)
- **Claim Format**: `A [product/method] comprising: [technical features]`
- **Dependent Claim Prefix**: `The [product/method] of claim [N], wherein`
- **Multiple Dependent Claims**: allowed; max 10 claims
- **Fees**: filing 2500 / examination 2200 / grant 0 / maintenance 0
- **Special Requirements**: 30-month national phase entry / International Search Report included / International Preliminary Examination optional

## Examples

### Example 1: jurisdiction rules

```typescript
import { getJurisdictionRules, JurisdictionCode } from '../jurisdiction.js';

const cnRules = getJurisdictionRules(JurisdictionCode.CN);

console.log(cnRules.code);             // "CN"
console.log(cnRules.country);          // "中国"
console.log(cnRules.examinationType);  // "实质审查"
console.log(cnRules.defaultTimeline);  // 24
console.log(cnRules.fees.filing);      // 950
console.log(cnRules.specialRequirements);
// ["Chinese language required", "National phase entry required for PCT", "Grace period: 6 months for disclosure"]
```

### Example 2: examination timeline

The timeline is **not** a field of `JurisdictionRules` — it has its own getter.

```typescript
import { getExaminationTimeline, JurisdictionCode } from '../jurisdiction.js';

const cn = getExaminationTimeline(JurisdictionCode.CN);
console.log(cn.minMonths, cn.maxMonths, cn.typical); // 18 36 24

const us = getExaminationTimeline(JurisdictionCode.US);
console.log(us.minMonths, us.maxMonths, us.typical); // 24 48 36

const pct = getExaminationTimeline(JurisdictionCode.PCT);
console.log(pct.minMonths, pct.maxMonths, pct.typical); // 12 30 18
```

### Example 3: claim format

```typescript
import { getClaimFormat, JurisdictionCode } from '../jurisdiction.js';

const cn = getClaimFormat(JurisdictionCode.CN);
console.log(cn.independentClaimTemplate);
// "一种[产品/方法]，其特征在于，包括：[技术特征]"
console.log(cn.dependentClaimPrefix);
// "根据权利要求[N]所述的[产品/方法]，其特征在于"
console.log(cn.multipleDependentClaims, cn.maxClaims); // false 10

const us = getClaimFormat(JurisdictionCode.US);
console.log(us.multipleDependentClaims, us.maxClaims); // true 20
```

### Example 4: validating a jurisdiction code

There is **no** `isValidJurisdiction()` helper. The getters throw on an unsupported
value, so validation means checking membership before calling them:

```typescript
import { JurisdictionCode, getJurisdictionRules } from '../jurisdiction.js';

const SUPPORTED = Object.values(JurisdictionCode) as string[];

function isValidJurisdiction(value: string): value is JurisdictionCode {
  return SUPPORTED.includes(value);
}

isValidJurisdiction('CN');  // true
isValidJurisdiction('XX');  // false

// Unsupported codes throw rather than returning a default:
// getJurisdictionRules('XX' as JurisdictionCode)  ->  Error: Unsupported jurisdiction: XX
```

Note that this skill covers CN, US and PCT only. These are the workflow's only
supported jurisdictions: the single definition is the `JurisdictionCode` enum in
`src/skills/jurisdiction.ts` (exported as `SUPPORTED_JURISDICTIONS` / guarded by
`isValidJurisdiction`), from which `state.ts` and `plugin.jsonc` derive their
lists. Since REQ-017 the intent router no longer emits unsupported codes
(`EP` / `JP` are recognized but dropped), so "routed as A, rejected as A" can no
longer happen; unsupported requests are answered with an explicit
"not supported" instead.

## Output Types

### JurisdictionRules
- `code`: `JurisdictionCode`
- `country`: display name (`中国` / `United States` / `PCT International`)
- `examinationType`: examination procedure name
- `defaultTimeline`: **number of months** (not an object)
- `fees`: `{ filing, examination, grant, maintenance }` — all four are always present, `0` where not applicable
- `specialRequirements?`: optional list of jurisdiction-specific constraints

### ClaimFormat
- `independentClaimTemplate`: template for an independent claim
- `dependentClaimPrefix`: prefix for a dependent claim, `[N]` marking the parent claim number
- `multipleDependentClaims`: whether multiple-dependent claims are permitted
- `maxClaims`: claim-count ceiling

### ExaminationTimeline
- `minMonths`: fastest realistic examination
- `maxMonths`: slowest realistic examination
- `typical`: the value to use when a single estimate is needed

## Notes

- All three getters **throw** on an unsupported code; they never return `undefined`.
- `JurisdictionRules` deliberately carries no `claimFormat` and no `timeline`: those are
  separate types fetched with `getClaimFormat()` and `getExaminationTimeline()`.
- CN requires the filing to be in Chinese; PCT covers the international phase only —
  national-phase rules apply afterwards.
- Timeline ranges are estimates and vary with backlog.
