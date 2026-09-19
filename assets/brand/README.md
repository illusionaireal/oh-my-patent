# oh-my-patent — Brand system

**Meet Archimedes. Turn your “Eureka!” into a patent disclosure.**

oh-my-patent is an AI patent plugin for **Claude Code, Codex, and OpenCode**.
Archimedes is both the project's recognizable character and the orchestrator
behind the `/archimedes` entry point. The existing artwork shows him raising a
patent document with a **WOW!** expression; **Eureka!** connects that image to the
moment of discovery. Keep these names and roles consistent across surfaces.

## Canonical description

Use the following English text for GitHub About and `package.json.description`:

> Archimedes, your Eureka-to-patent guide. An AI patent plugin for Claude Code, Codex, and OpenCode that turns technical ideas into patent disclosures with traceable, forkable decision paths.

Chinese equivalent:

> Archimedes（阿基米德），让灵光一现成为专利交底书。面向 Claude Code、Codex、OpenCode 的 AI 专利插件，以多智能体协作将技术构想转化为交底文档，并保留可追溯、可分叉的决策路径。

Describe the CLI in installation and technical sections. Lead with the plugin,
the supported platforms, and its concrete output: a patent disclosure. Avoid
fixed agent-count claims until the documentation and runtime definitions agree.

## Brand decision

- **Primary:** the existing blue Archimedes / Eureka mark.
- **Secondary:** the existing black monochrome version for one-color or print use.
- **Dark theme:** the existing primary mark and light wordmark on a navy field.

Do not redraw, recolor, stretch, rotate, crop, or substitute the Archimedes artwork.
Keep the character, raised document, WOW! lettering, and proportions intact.
Use CSS or layout around an unchanged asset to create promotional compositions.

## Assets and destinations

| File relative to this directory | Purpose |
|---|---|
| `png/logo-primary.png` | 1900×600 horizontal lockup for light README backgrounds |
| `png/logo-on-dark.png` | 1900×600 horizontal lockup for dark README backgrounds |
| `png/mark-primary-512.png` | 512×512 square mark; source image used in the social card |
| `png/favicon.ico` | Existing favicon with 16/32/64/128/256 px images; for websites |
| `social/github-social-preview.png` | 1280×640 repository link-sharing card |
| `source/github-social-preview.svg` | Editable SVG layout for the social card |
| `source/render-social-preview.cjs` | Reproducible PNG export utility |
| `source/manifest.json` | Asset checksums and source provenance |
| `source/README.md` | Source-bundle location policy and export instructions |
| `README-snippet.md` | Copyable English and Chinese root README snippets |

Brand assets belong here. Technical diagrams remain in `docs/images/`. Keep
heavy source artwork outside the Git repository. `package.json` includes
`assets/brand/png/` plus this brand guide from this directory in the npm package,
so the READMEs retain their images and guide link without shipping the social
card and design sources.

## README usage

Both root READMEs use the same assets. `<picture>` selects the dark lockup when
supported; the primary PNG is the fallback. Use `./assets/brand/` in a root README
and `../assets/brand/` in a README directly inside `docs/`.

Copy the examples in [README-snippet.md](./README-snippet.md). GitHub does not
automatically include a snippet file, so update both READMEs when changing the
shared header. The snippet code is relative to the destination README.

## GitHub settings — separate from file commits

Committing these files does not update repository settings automatically.

| Setting | Required action |
|---|---|
| Repository About | Paste the canonical English description using the About edit control |
| Repository Social preview | In Settings → General → Social preview, upload `social/github-social-preview.png` |
| Account or organization avatar | Optional separate identity decision; use `png/mark-primary-512.png` only if intended |

GitHub has no per-repository avatar. Do not change a personal account avatar as
part of this repository-only brand rollout. A favicon in this directory likewise
does not change GitHub's favicon.

The sharing image follows GitHub's recommended 1280×640 size and is under 1 MB.
See [GitHub's social preview documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview).

## Source artwork and variants

The maintainer-provided `oh-my-patent-logo-assets-final.zip` is the confirmed
original bundle. It contains other sizes, monochrome variants, a brand board,
and the untouched generated image. Ask the maintainer for that bundle when a
new use case requires it; do not substitute an earlier visual approximation.

Its SVG files contain embedded raster artwork. They are SVG wrappers, not true
editable vector masters; do not describe them as resolution-independent vector
logos. See [source/README.md](./source/README.md) for provenance and reproduction.
