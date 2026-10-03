# Actual 0.3.3 installation outputs

`0.3.3.json.br` contains Brotli-compressed UTF-8 JSON with the complete default adapter outputs from
baseline `fc40901943e2ffb742167ea4848de7a0c321b77e`, generated separately from LF and
CRLF source checkouts. Adapter-generated separators stay as emitted; converting an
entire output file to CRLF would not reproduce a Windows installation.

Regenerate the fixture and its exact-byte fingerprint allowlist with:

```sh
npm ci
node scripts/build-legacy-fixtures.mjs
npm test -- tests/skill-package/legacy-upgrade.test.ts
```

Generation needs the baseline Git object, Node, installed TypeScript and system tar.
The tests only read the fixture and require neither Git history nor network access.
They install each complete baseline, upgrade it, and roll back to the exact original
bytes; edited legacy files must still block the entire upgrade. Compression keeps
the six duplicate-heavy installation trees small without changing their bytes.
