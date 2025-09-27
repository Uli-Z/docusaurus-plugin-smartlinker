# Log

## Summary
- Replaced SmartLink/Tooltip base styles with Infima-backed variables and state rules, dropping bespoke inheritance overrides.
- Updated tooltip runtime to push the max-width through a CSS custom property so the stylesheet can control it via Infima tokens.
- Documented the new token mapping and kept CHANGELOG notes for the alignment work.
- Migrated the workspace to pnpm-only tooling, added automation to verify dist/tarball artifacts plus the example site build, refreshed CI, and logged the baseline build/test failures that motivated the change.

## Verification
- pnpm install
- pnpm build
- pnpm test

## Details (2025-09-27)
- Node v20.19.4 / pnpm v9.0.0 in container.
- Baseline `pnpm test` failed: plugin tests could not open tooltips under jsdom and example site build crashed because the packed workspace lacked `dist/` files; remark tests could not resolve the published entry.
- Added `scripts/utils/package-verifier.mjs` to verify dist layout, tarball contents, and build a tarball-backed copy of the example Docusaurus site via pnpm.
- Updated CI to run the pnpm build/test flow and upload both dist directories and the generated tarball as workflow artifacts.
