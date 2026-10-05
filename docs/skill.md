# Installation modes (0.4.0)

The original Archimedes plugin remains the default, with all **14 agents, 6 skills,
and 9 commands**. The portable Agent Skill is an additional installation option.
Neither mode replaces the other. Node.js >=22 is required.

The release version is `0.4.0`. First-wave host installation and workflow acceptance
was confirmed by the maintainer on 2026-10-05. Wave-two hosts, paid image providers,
combined plugin/Skill host activation and marketplace submission remain unverified. See
[compatibility](compatibility.md) and the [verification ledger](../specs/002-skill-first/verification.md).

## Original Archimedes plugin

From a source checkout:

```sh
npm ci
npm run build
node dist/cli.js adapt install --tool codex --workspace-dir <workspace>
```

The command retains the original multi-entry plugin workflow. `--mode plugin` is an
explicit equivalent; `--legacy` remains a compatibility alias. Plugin adapters support
Claude Code, Codex and OpenCode. Omitting `--tool` retains the original all-adapters
behavior. Use the host-specific Archimedes entry and commands described in the
[usage guide](usage-en.md). The original plugin prompts remain in `src/agents` and
`src/skills`; portable runtime instructions have separate source overrides.

```sh
node dist/cli.js adapt uninstall --mode plugin --tool codex --workspace-dir <workspace>
```

Plugin uninstall and `--prune` preserve the optional portable Skill. `--dry-run` is a
Skill-mode option; plugin mode rejects it before writing rather than implying a preview.

## Additional portable Skill

Build the checkout as above, then select one host and inspect the dry-run:

```sh
node dist/cli.js adapt install --mode skill --tool codex --workspace-dir <workspace> --dry-run
node dist/cli.js adapt install --mode skill --tool codex --workspace-dir <workspace>
```

Skill mode requires an explicit `--tool`. It adds one complete portable package,
with bundled role resources and runtime. It leaves original plugin agents, skills,
commands, customizations, AGENTS.md, CLAUDE.md, MCP and marketplace settings intact.
It does not migrate existing project state or require uninstalling the plugin.

Claude Code uses `.claude/skills/oh-my-patent`. Codex and OpenCode use one shared
`.agents/skills/oh-my-patent` copy with reference-counted ownership. The six candidate
host locations are in [distribution/targets.json](../distribution/targets.json).
Do not duplicate the portable Skill across shared and host-specific discovery roots.
These duplicate checks concern copies of the portable Skill, not the original plugin.

Choose the plugin or Skill entry when starting work. Filesystem coexistence is covered
by automated tests; host discovery and activation of both entry types together are
unverified. The original Codex plugin includes an overview Skill named `oh-my-patent`,
so resolution of that name alongside the portable entry needs host acceptance.
Use a separate workspace when evaluating the Skill independently.

Alternatively extract the complete `oh-my-patent` folder from the generated Skill ZIP
into the selected host's skill directory. Keep references/assets/scripts together.
The copied package needs no repository, global CLI, node_modules, provider SDK or
remote renderer. `node <installed-skill>/scripts/runtime.mjs --doctor` checks only
the local runtime, not host discovery. The format follows the
[Agent Skills specification](https://agentskills.io/specification).

Fixed-version third-party installer and native marketplace commands remain unverified.
Ancestor/user portable scopes are inspected, never rewritten. Filesystem checks are
not proof of host deduplication.

## Skill updates, removal and rollback

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
continue using their original CLI path functions. To use the versioned Skill runtime
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
These portable instructions do not replace the original plugin's role prompts.

## Maintainer checks

```sh
npm run lint
npm test
npm run package:skill
npm run verify:artifacts
```

The builder emits a Skill ZIP, the original plugin npm tarball, an independent
`oh-my-patent-skill` npm tarball, a release manifest and SHA256SUMS. CI checks deterministic generated Skill files and
actual packed artifacts. Publication uses the verified tarball with `--ignore-scripts`;
stable versions use npm's `latest` tag; prereleases use `next`.
Verification scripts do not publish anything.


## Independent npm Skill publication

The original `oh-my-patent` npm package and its release workflow remain available.
The new **Publish standalone Skill** workflow (`.github/workflows/npm-publish-skill.yml`)
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
It does not rebuild the package or trigger the original plugin publication workflow.

Local checks (the final command performs an npm dry-run):

```sh
npm run package:skill
npm run verify:artifacts
npm run publish:skill -- --dry-run
```

After publication, `npm install --save-dev --ignore-scripts oh-my-patent-skill@0.4.0`
downloads the standalone package. npm installation alone does not register the Skill
with a host. Keep the complete directory together and use the selected host's Skill
location or a third-party installer's local-directory input. See the generated package
[README](../distribution/skill-package-README.md) for an example based on the
[skills CLI's documented local-path support](https://github.com/vercel-labs/skills).
That third-party installer path remains unverified; do not infer additional host
certification from npm publication.

## Release 0.4.0

Merge the release PR after CI passes, then publish a GitHub Release tagged `v0.4.0`
at the resulting merge commit using the [bilingual release notes](releases/0.4.0.md).
The original package workflow listens to `release.published`, including publication
of a draft Release. The standalone Skill workflow remains independently dispatched;
select the same tag, run with `dry_run` enabled, then disable it for publication.
Both workflows retain their first-wave host acceptance checks.
