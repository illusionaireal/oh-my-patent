# Brand source and export provenance

## Confirmed original bundle

The maintainer-provided source archive is `oh-my-patent-logo-assets-final.zip`.
The maintainer keeps the full bundle outside this repository; contact them for
access. Do not commit private storage links or the multi-megabyte source archive.
The archive SHA-256 and committed image hashes are recorded in `manifest.json`.

The following files are copied without transformation from its
`assets/brand/png/` directory:

- `../png/logo-primary.png`
- `../png/logo-on-dark.png`
- `../png/mark-primary-512.png`
- `../png/favicon.ico`

The primary logo, square mark, and favicon match their pre-rollout repository
bytes. The dark lockup comes from that same confirmed archive. No redraw or
generative substitution was used for this rollout.

The archive also contains `png/MASTER-original-generated.png`, additional PNG
sizes/backgrounds, `preview/logo-system-final.png`, and SVG wrappers containing
embedded raster data. Those wrappers are not editable vector masters. Preserve
the original archive when producing future exports.

## Social preview

`github-social-preview.svg` is the editable composition. It references the
unchanged `../png/mark-primary-512.png`, uses system fonts, and needs no external
images or network resources. The layout is SVG; the existing character remains
raster artwork. This is not a new vector master of the character.

`render-social-preview.cjs` resolves the local image in memory and renders a
**1280×640** PNG to `../social/github-social-preview.png` with Sharp. Sharp is an
optional design utility, not an oh-my-patent runtime dependency.

With Sharp available to Node.js, run from the repository root:

```bash
node assets/brand/source/render-social-preview.cjs
```

If needed, install Sharp temporarily in a design checkout without changing the
package manifest or lockfile:

```bash
npm install --no-save --package-lock=false sharp
```

The renderer prints the output SHA-256, checks dimensions, and enforces a file
size under 1 MB. Open the PNG before committing. Check for clipping, readable
platform names, unchanged artwork, and a solid background. System-font or Sharp
version differences can change output bytes; update `manifest.json` after an
intentional regeneration. The SVG file is source material; use the generated
PNG for sharing platforms, which may not load external images in SVG files.

## npm packaging

The package's `files` allowlist includes `assets/brand/png/` and the brand guide
`assets/brand/README.md`. The social preview and this source directory remain
repository documentation assets. Verify
the final package with `npm pack --dry-run --json` before publishing.
