# Installation modes (0.4.0)

oh-my-patent provides plugin and portable Skill installation modes. Plugin mode
is the default, with **14 agents, 6 skills and 9 commands**. Node.js >=22 is required.

For installation into a host workspace, use the [quick start](../README.md#quick-start).
The sections below cover Skills CLI, ZIP and npm packages, source builds and lifecycle operations.

See [compatibility](compatibility.md) for host support and operating constraints.
Acceptance provenance is recorded in the [verification ledger](../specs/002-skill-first/verification.md).

## Skills CLI installation

The [Skills CLI](https://github.com/vercel-labs/skills) installs the portable package
without installing the oh-my-patent CLI. It requires Git and Node.js >=22.20.
Run this in your patent workspace (Codex example):

```sh
npx skills@latest add https://github.com/illusionaireal/oh-my-patent/tree/master/skills/oh-my-patent --skill oh-my-patent --agent codex --copy
```

Use `--agent claude-code` or `--agent opencode` for the other first-wave hosts.
The explicit `skills/oh-my-patent` source selects the built portable package;
the repository also contains plugin capabilities and Skill source templates.
`--copy` installs real files. Installation is project-local by default; `--global`
selects the host's user-level scope. The source URL follows `master`; replace
`master` with an existing tag or commit for a fixed revision.

For this installation method, use the Skills CLI for updates and removal:

```sh
npx skills@latest update oh-my-patent
npx skills@latest remove oh-my-patent --agent codex
```

The oh-my-patent CLI's ownership records, backups and rollback apply to its own
installations. Choose one manager for each installed copy.

## ZIP installation

Download the [repository ZIP](https://github.com/illusionaireal/oh-my-patent/archive/refs/heads/master.zip),
extract it and copy its complete `skills/oh-my-patent` directory into one host
location below. This checked-in package already contains the runtime.

| Host | Destination in the workspace |
| --- | --- |
| Claude Code | `.claude/skills/oh-my-patent` |
| Codex | `.agents/skills/oh-my-patent` |
| OpenCode | `.agents/skills/oh-my-patent` |

Keep all files together, open the workspace in the host and select `oh-my-patent`.
Back up customizations before replacing a manually installed directory; delete that
directory to remove it. A standalone ZIP produced by `npm run package:skill` contains
an `oh-my-patent` folder with the same resources. Repository ZIP downloads and
standalone build ZIPs have different outer directory layouts.

## Plugin mode from source

From a source checkout:

```sh
npm ci
npm run build
node dist/cli.js adapt install --tool codex --workspace-dir <workspace>
```

The command installs the multi-entry plugin workflow. `--mode plugin` is an
explicit equivalent; `--legacy` remains a compatibility alias. Plugin adapters support
Claude Code, Codex and OpenCode. Omitting `--tool` selects all adapters.
Use the host-specific Archimedes entry and commands described in the
[usage guide](usage-en.md). Plugin prompts are in `src/agents` and
`src/skills`; portable runtime instructions have separate source overrides.

```sh
node dist/cli.js adapt uninstall --mode plugin --tool codex --workspace-dir <workspace>
```

Plugin uninstall and `--prune` preserve the optional portable Skill. `--dry-run` is a
Skill-mode option; plugin mode rejects it before writing rather than implying a preview.

## Skill mode from source

Build the checkout as above, then select one host and inspect the dry-run:

```sh
node dist/cli.js adapt install --mode skill --tool codex --workspace-dir <workspace> --dry-run
node dist/cli.js adapt install --mode skill --tool codex --workspace-dir <workspace>
```

Skill mode requires an explicit `--tool`. It adds one complete portable package,
with bundled role resources and runtime. It leaves plugin agents, skills,
commands, customizations, AGENTS.md, CLAUDE.md, MCP and marketplace settings intact.
It does not migrate existing project state or require uninstalling the plugin.

Claude Code uses `.claude/skills/oh-my-patent`. Codex and OpenCode use one shared
`.agents/skills/oh-my-patent` copy with reference-counted ownership. The six candidate
host locations are in [distribution/targets.json](../distribution/targets.json).
Do not duplicate the portable Skill across shared and host-specific discovery roots.
These duplicate checks concern copies of the portable Skill, not the plugin.

Choose the plugin or Skill entry when starting work. Filesystem coexistence is covered
by automated tests; host discovery and activation of both entry types together are
unverified. The Codex plugin includes an overview Skill named `oh-my-patent`,
so resolution of that name alongside the portable entry needs host acceptance.
Use a separate workspace when evaluating the Skill independently.

Alternatively extract the complete `oh-my-patent` folder from the generated Skill ZIP
into the selected host's skill directory. Keep references/assets/scripts together.
The copied package needs no repository, global CLI, node_modules, provider SDK or
remote renderer. `node <installed-skill>/scripts/runtime.mjs --doctor` checks only
the local runtime, not host discovery. The format follows the
[Agent Skills specification](https://agentskills.io/specification).

Skills CLI installation checks are recorded in [compatibility](compatibility.md#skills-cli-installation-checks).
Native marketplace submission and activation are outside those checks.
Ancestor/user portable scopes are inspected, never rewritten. Filesystem checks are
not proof of host deduplication.

## Standalone Skill package installation

This method is for users who want the portable package without installing the CLI.
Downloading the npm package and registering it with a host are separate steps.
Use a temporary directory outside your patent workspace to obtain the package:

```sh
npm pack oh-my-patent-skill --ignore-scripts
```

Extract the resulting `.tgz` archive with your archive tool. Copy its complete
`package` directory to one destination in your patent workspace:

| Host | Destination |
| --- | --- |
| Claude Code | `.claude/skills/oh-my-patent` |
| Codex | `.agents/skills/oh-my-patent` |
| OpenCode | `.agents/skills/oh-my-patent` |

Open that workspace in the host and select `oh-my-patent`. Keep all references,
assets and scripts together. Before replacing a manually installed copy, back up
any customizations; remove that copy manually when uninstalling. CLI-managed backups,
updates and rollback apply to installations made through `adapt install`.

For troubleshooting only, check the copied runtime:

```sh
node <installed-skill>/scripts/runtime.mjs --doctor
```

The check diagnoses the local runtime; selecting the Skill in the host completes
the activation step. For a reproducible download, use `oh-my-patent-skill@<version>` in the `npm pack` command.

## Skill updates, removal and rollback with the project CLI

Re-run install with `--mode skill` to update only that Skill. Modified Skill files
cause a conflict before mutation; modified plugin files do not block installation.
Shared removal retains the copy while another selected host owns it.

```sh
node dist/cli.js adapt uninstall --mode skill --tool codex --workspace-dir <workspace> --dry-run
node dist/cli.js adapt uninstall --mode skill --tool codex --workspace-dir <workspace>
node dist/cli.js adapt rollback --mode skill --backup <id> --workspace-dir <workspace>
```

Install/uninstall returns `backup_id`. Rollback restores exact previous bytes unless
later user edits conflict. Backups live outside discovery roots under
`.oh-my-patent/backups/` as JSON. An interrupted installation blocks new changes until
its backup is rolled back. If a process left `.oh-my-patent/install.lock`, inspect its
owner first. `adapt recover-lock --mode skill --owner-token <token> --workspace-dir
<workspace>` requires a verified dead owner on this host. Recovery never uses lock
age; rollback shares the lock and preserves later user edits.

Plugin generation defaults to `plugins/<tool>/` (custom output: `<dir>/<tool>/`).
Skill generation requires `--mode skill` and defaults to `skill-installations/<tool>/`
(custom `--output` is the exact destination). Generated outputs do not overwrite
one another.

## Optional project migration

Installing either mode leaves project state unchanged. Existing plugin projects can
continue using their CLI path functions. To use the versioned Skill runtime
with an existing project, explicitly dry-run and review `project.migrate` before
migration. Migrated projects use the bundled JSON runtime or CLI runtime bridge
(`oh-my-patent runtime --input request.json`); old writers reject their schema.
Unmodified older binaries cannot be remotely constrained. Do not mix runtimes in a
migrated project or remove version fields to bypass a guard.

## Skill confidentiality and figures

Shared runtime rendering has no public PlantUML fallback. A URL alone does not authorize
disclosure. Its remote calls require exact content/recipient/purpose consent and a
local audit; redirects and automatic retries are disabled. Host search and image tools
without verified interception remain instruction-only; Skill confidential mode disables
them. Model-provider processing is a separate boundary, not fully local processing.

Direct SVG needs no remote renderer. Define a figure spec, validate self-contained SVG
before preview, review technical and visual consistency, then register current input
hashes. Changes invalidate prior review. Image generation remains optional and unverified.
These portable instructions do not replace the plugin's role prompts.

## Maintainer checks

```sh
npm run lint
npm test
npm run package:skill
npm run verify:artifacts
```

The builder emits a Skill ZIP, the plugin npm tarball, an independent
`oh-my-patent-skill` npm tarball, a release manifest and SHA256SUMS. CI checks deterministic generated Skill files and
actual packed artifacts. Publication uses the verified tarball with `--ignore-scripts`;
stable versions use npm's `latest` tag; prereleases use `next`.
Verification scripts do not publish anything.


## Independent npm Skill publication

The `oh-my-patent` npm package has its own release workflow.
The **Publish standalone Skill** workflow (`.github/workflows/npm-publish-skill.yml`)
publishes only `oh-my-patent-skill`, built from the generated portable package.
The standalone archive has its own package.json/README and the exact same 44 Skill
resources; it contains no plugin CLI/source tree or runtime npm dependencies.

The independent package inherits the repository version, currently `0.4.0`.
Its metadata is in `distribution/skill-package.json`. Stable releases use `latest`;
prereleases use `next`. Stable publication checks first-wave host installation and
workflow verification in `distribution/targets.json`; the 0.4.0 acceptance source is
the maintainer's confirmation. Publication does not mark a host verified or submit a marketplace entry.

Open GitHub Actions → **Publish
standalone Skill** → **Run workflow**, select the intended branch/tag, and leave
`dry_run` enabled for a trial. Disable it to publish the verified tarball. The workflow
reuses the existing `PRE` environment and `NPM_TOKEN` secret; that token must be
allowed to create/publish `oh-my-patent-skill`. Registry ownership and actual
publication are not established by a dry-run.

The build job checks/tests/packages the selected commit and uploads immutable
artifacts. The publish job verifies commit identity, selected package, dist-tag and
SHA-256, then publishes only the standalone tarball with `--ignore-scripts`.
It does not rebuild the package or trigger the plugin publication workflow.

Local checks (the final command performs an npm dry-run):

```sh
npm run package:skill
npm run verify:artifacts
npm run publish:skill -- --dry-run
```

## Release 0.4.0

Merge the release PR after CI passes, then publish a GitHub Release tagged `v0.4.0`
at the resulting merge commit using the [bilingual release notes](releases/0.4.0.md).
The plugin package workflow listens to `release.published`, including publication
of a draft Release. The standalone Skill workflow remains independently dispatched;
select the same tag, run with `dry_run` enabled, then disable it for publication.
Both workflows retain their first-wave host acceptance checks.
