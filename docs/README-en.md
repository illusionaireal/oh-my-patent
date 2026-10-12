# oh-my-patent documentation

[Project home](../README.md) · [中文](./README.md)

## Usage and development

| Guide | Contents |
|---|---|
| [Installation modes](./skill.md) | Plugin and Skill installation, updates, removal and migration |
| [Release notes](./releases/0.4.2.md) | Version changes and upgrade guidance |
| [Sentinel and capabilities](./sentinel.md) | Retrieval gates, drawing defaults, deadlines and review requirements |
| [Usage and CLI](./usage-en.md) | Installation, platform differences, checks, path and diagram commands, uninstall |
| [Workflow](./workflow-diagram-en.md) | Ten stages, allowed transitions, scoring decisions, and recovery |
| [Agents and collaboration](./agents-en.md) | 14 agents, 6 skills, 9 commands, and five collaboration patterns |
| [Architecture and development](./architecture-en.md) | Four layers, repository and project files, development commands |
| [Contributing](../CONTRIBUTING.md) | Coding style, tests, and contribution conventions |
| [Brand guide](../assets/brand/README.md) | Archimedes identity and brand assets |

## Design and planning references

Current specifications live in repository-root [`specs/`](../specs/), including
the [review remediation specification and verification ledger](../specs/001-review-remediation/).
The [constitution](../CONSTITUTION.md) defines this convention.
`docs/specs/` is a frozen v0.1.0 snapshot; do not add new specifications there.

These documents retain product design context and plans. They are not, by themselves,
a list of shipped features. Use the guides above and their linked source code for
current behavior. Some design references are in Chinese.

- [Specification index](./specs/README.md): [product requirements](./specs/PRD.md),
  [technical design](./specs/TECHNICAL-DESIGN.md), and [API design](./specs/API-DESIGN.md).
- Retrieval improvements: [requirements](./RETRIEVAL_PRD.md), [specification](./RETRIEVAL_SPEC.md),
  and [development plan](./RETRIEVAL_DEV_PLAN.md).
- [Progress-output design](./specs/PROGRESS-OUTPUT-ENHANCEMENT.md).

Keep the workflow reference's Mermaid diagram aligned with the implementation;
`images/` retains other diagram assets. Update both languages when behavior changes.
Avoid manually maintained version labels or passing-test counts in documentation entry points.

For help, [open an issue](https://github.com/illusionaireal/oh-my-patent/issues).
