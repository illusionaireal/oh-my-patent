# Technical plan

Base: master `d7f17e951d8792e826e9991142871049e0cd928d` (merged #13).

1. Change only version fields in package.json/package-lock.json/plugin.jsonc.
2. Update both READMEs, installation and package README, documentation indexes and changelog.
   Keep fixed release download URLs out of the general quick start and label release notes as preparation.
3. Rebuild the generated Skill using the existing scripts; do not hand-edit generated output.
4. Run lint, full tests/build, deterministic generation check, real archive checks and
   all three publication dry-runs. Check local documentation links and short-source discovery.
5. Submit a separate PR targeting master and verify Ubuntu/Windows CI.

Retain existing dependency resolutions and all runtime/human decision gates.
