# Log

## Summary
- Replaced SmartLink/Tooltip base styles with Infima-backed variables and state rules, dropping bespoke inheritance overrides.
- Updated tooltip runtime to push the max-width through a CSS custom property so the stylesheet can control it via Infima tokens.
- Documented the new token mapping and kept CHANGELOG notes for the alignment work.

### 2025-09-26 Session
- Restructured repository into a private root workspace (`package.json`) and a single publishable package `packages/docusaurus-plugin-smartlinker` with subpath export `./remark` pointing to `dist/remark/*`.
- Added build orchestrator (`packages/docusaurus-plugin-smartlinker/scripts/build.mjs`) to compile plugin ESM output, remark ESM+CJS builds (via new `tsconfig.cjs.json` and updated `scripts/build-cjs.js`), and copy remark artifacts into the plugin dist.
- Swapped example site / remark workspace dependencies from `file:../../` style links to the new package layout and updated smoke-test script to pack only the plugin package.
- Verified `pnpm install`, `pnpm run build`, and `pnpm run site:build`; `npm run site:build` still fails due to missing `@radix-ui/react-tooltip` after `npm install` (workspace dependency not hoisted).
- Multiple iterations toggling dependency specifiers (`workspace:*` vs. `file:`) to satisfy both pnpm development and npm consumers; latest state reverted to `file:` specifiers but npm build currently breaks because the workspace-local `node_modules` were wiped and not reinstalled.

## Verification
- pnpm build
- pnpm test
- pnpm run site:build (passes)
- npm run site:build (fails: missing workspace dependency @radix-ui/react-tooltip after npm install)

### 2025-09-27 Session
- Added shared smoke harness plus dedicated npm/pnpm scripts that pack the plugin, copy the example site, install from the tarball, assert both entrypoints, and run Docusaurus builds with debug disabled to keep logs lean.
- Implemented a tarball verification script inside the plugin package and wired new scripts into root/package manifests alongside CI matrix coverage (Node 18/20/22 × npm|pnpm).
- Updated README/CHANGELOG documentation, removed the committed `package-lock.json`, and ignored future lockfile generation.
- Commands: `pnpm install`; `pnpm --filter docusaurus-plugin-smartlinker test` (fails on existing tooltip specs & example build dependency on prebuilt remark); `pnpm run build`; `pnpm --filter docusaurus-plugin-smartlinker run verify:pack`; `pnpm run smoke:npm`; `pnpm run smoke:pnpm`.
- Noted Vitest tooltip suites still require follow-up stabilization; smoke + packaging checks succeed with the new tooling.

### 2025-09-28 Session
- Collapsed the `@internal/remark-smartlinker` workspace into the publishable package by moving `src` and tests under `packages/docusaurus-plugin-smartlinker/src/remark` and `tests/remark` with dedicated TS configs for ESM and CJS outputs.
- Simplified the build orchestrator to compile the plugin plus remark targets in-place and generate CommonJS bundles via an internal `remark-build-cjs.mjs` helper.
- Updated the example site's dependency to a `file:` link, pruned remaining `workspace:*` specifiers, and confirmed `npm install` now succeeds without `EUNSUPPORTEDPROTOCOL` while still producing valid tarball contents.
- Commands: `rm -rf node_modules …`; `npm install`; `pnpm install`; `pnpm run smoke:npm`.
