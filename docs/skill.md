# Portable oh-my-patent Skill (0.4.0 alpha)

Archimedes is now available as a self-contained Agent Skill. Node.js >=22 is required
for persisted projects. The package does not need this repository, a global CLI,
node_modules, a provider SDK or a remote renderer after installation.

This is an implementation preview. Real host discovery/workflow certification, paid
image-provider validation and marketplace submission remain pending. See
[compatibility](compatibility.md) and the [verification ledger](../specs/002-skill-first/verification.md).
The format follows the [Agent Skills specification](https://agentskills.io/specification).

## Local installation verified by automated tests

From a built checkout or installed npm package, first inspect the dry-run:

```sh
npm ci
npm run build
node dist/cli.js adapt install --tool codex --workspace-dir <workspace> --dry-run
node dist/cli.js adapt install --tool codex --workspace-dir <workspace>
```

Select one tool. The installer does not default to installing every host. Claude Code
uses an isolated `.claude/skills/oh-my-patent` directory. Codex and OpenCode use one
shared `.agents/skills/oh-my-patent` copy with reference-counted ownership. Do not install
Claude alongside that shared copy until the isolated plugin-discovery route is tested.
No new AGENTS.md, CLAUDE.md, MCP settings or global copies are installed.

Alternatively extract the complete `oh-my-patent` folder from the generated Skill ZIP
into the selected host's skill directory. Keep all references/assets/scripts together.
`node <installed-skill>/scripts/runtime.mjs --doctor` verifies the local runtime only;
it does not establish that the host discovers or activates the Skill.

The six candidate locations are in [distribution/targets.json](../distribution/targets.json).
Fixed-version `skills` installer and native marketplace instructions are deliberately
not published as verified commands before clean-environment host tests run.

## Upgrade, removal and rollback

Re-run install to update only this Skill. Local modifications cause a conflict before
any mutation. Shared package removal retains the copy while another selected host owns
it. Use `adapt uninstall --tool <host> --workspace-dir <workspace> --dry-run` first.
An install/uninstall result includes backup_id; `adapt rollback --backup <id>
--workspace-dir <workspace>` restores exact previous bytes unless subsequent user edits
conflict. Backups live outside discovery roots under `.oh-my-patent/backups/` as JSON.
An interrupted installation blocks new changes until its backup is rolled back. If a
process left `.oh-my-patent/install.lock`, inspect its owner first. Use
`adapt recover-lock --owner-token <token> --workspace-dir <workspace>` only for a
verified dead owner on this host, then roll back the interrupted backup. Recovery
never uses lock age. Rollback shares the installer lock and preserves later user edits.

Old generated entries are matched against 0.3.3 baseline hashes, backed up and removed.
The allowlist covers exact outputs from both LF and CRLF source checkouts; it does not
normalize installed files or treat arbitrary whitespace changes as unmodified content.
A marker or filename alone does not justify deletion. Modified or unknown old entries
remain in place and block migration; review dry-run conflicts and resolve explicitly.
Ancestor/user scopes are inspected, never rewritten. Arbitrary plugin discovery scopes
still require host-level inspection; filesystem checks are not host deduplication proof.

`--legacy` preserves the old adapter generation path for compatibility work. It creates
the old multi-entry layout and must not coexist with the portable package. Existing
legacy projects retain their CLI path functions. Migrated projects use the shared JSON
runtime (`oh-my-patent runtime --input request.json`); old writers reject them. Unmodified
older binaries cannot be remotely constrained by this release.

## Confidentiality and figures

No public PlantUML fallback remains. Configuring a URL does not authorize disclosure.
Remote calls through the shared renderer require exact content/recipient/purpose consent
and a durable local audit. Redirects and automatic retries are disabled. Host search and
image tools without a verified interception layer remain instruction-only; confidential
mode disables them. The cloud model provider's handling of the session is a separate
boundary, so this package is not a promise of fully local processing.

Direct SVG requires no remote renderer. Define a figure spec, validate self-contained SVG
before preview, review technical and visual consistency, then register current input
hashes. Changes invalidate prior review. Image generation is optional and unverified.

## Maintainer checks

```sh
npm run lint
npm test
npm run package:skill
npm run verify:artifacts
```

The package builder emits a ZIP, npm tarball, release manifest and SHA256SUMS. CI rebuilds
the committed generated Skill and compares it, then exercises actual packed artifacts.
Publishing uses the verified tarball with --ignore-scripts. Alpha versions use npm's
`next` tag. These scripts do not publish anything during local verification.
