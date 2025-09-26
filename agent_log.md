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

### 2025-09-29 Session
- Initialized container, reviewed agent_plan instructions, and confirmed absence of nested AGENTS guidance.
- Reconfirmed working plan from agent_plan.md (6 steps) and associated test suite to run (unit, verify, smoke, build).
- Ran `npm install --loglevel error` in repo root; npm 11 crashed with "Cannot read properties of null (reading 'name')" (log: /root/.npm/_logs/2025-09-26T10_38_40_672Z-debug-0.log). Investigation required.
- Inspected root `package.json` and plugin package manifest to check for lingering `workspace:` specifiers or misdeclared fields; none found, but npm crash persists.
- Reviewed example site `package.json`; plugin consumed via `file:` link which may confuse npm when combined with workspaces.
- Confirmed pnpm workspace includes examples/*; suspect npm workspace example site referencing plugin via file path triggers npm bug causing crash.
- Read npm crash log: arborist fails while deduping `@examples/site` workspace (treated as file dep). Conclusion: remove `examples/site` from npm-managed workspaces and adjust scripts to target it via `npm --prefix` to avoid Arborist bug.
- Plan: update root workspace config to exclude example site, add explicit `site:prepare` helper invoked by site scripts, and document the flow. Will ensure smoke harness handles example installs explicitly.
- Updated root `package.json`: dropped `examples/site` from npm workspaces, added `site:prepare` helper, rewired site scripts to install via `npm --prefix`, and pointed `reset` to the new flow.
- Cleaned workspace (`rm -rf node_modules examples/site/node_modules packages/*/node_modules`) ahead of npm install retest.
- Retested `npm install --loglevel error`; now succeeds after workspace adjustment (audited 1334 packages, 5 moderate advisories).
- Ran `npm run site:build`; `site:prepare` installed example dependencies but Docusaurus build failed (missing `dist/remark/index.cjs`) because plugin was not built before linking.
- Extended `site:prepare` to build the plugin before installing the example site so `dist/*` exists prior to Docusaurus execution.
- Wiped example site artifacts (`node_modules`, `.docusaurus`, `build`) prior to rerunning `site:build`.
- Re-ran `npm run site:build`; with the plugin build included in `site:prepare`, the example installs dependencies and Docusaurus build completes successfully (trace logs verbose but expected under debug config).
- Documented the new `site:prepare` flow in README so contributors know to build the plugin before running the example site commands.
- Updated CHANGELOG Unreleased section to mention the workspace reconfiguration and new site helper workflow.
- Ran `pnpm install`; pnpm restored workspace deps (warned about npm-managed example deps, moved to .ignored) in ~7s.
- Ran `pnpm --filter docusaurus-plugin-smartlinker test`; Vitest still fails on tooltip-controlled/uncontrolled cases (`SmartLink` hover & markdown render, root provider hydrate). Run produced large Docusaurus logs (debug trace) causing terminal truncation after the e2e build kicked in, but failures are unchanged from prior sessions.
- `pnpm --filter docusaurus-plugin-smartlinker run verify:pack` passes (packs tarball, inspects exports successfully).
- `pnpm run smoke:npm` passes end-to-end (builds plugin, packs tarball, installs into temp site, verifies entrypoints, Docusaurus build succeeds).
- Fixed `scripts/smoke-pnpm.mjs` to mirror the npm path: after stripping workspace specifiers, explicitly replace the dependency with the packed tarball so pnpm add doesn't look for the original `file:` link.
- `pnpm run smoke:pnpm` now passes after tarball injection fix (pnpm add installs tarball, entrypoint checks pass, Docusaurus build succeeds).
- `pnpm build` runs cleanly (plugin build script completes post-verification).
- `pnpm run site:build` mirrors the npm path (builds plugin, reinstalls example dependencies, Docusaurus build succeeds).

## Changelog
- Removed the example site from npm-managed workspaces, introduced a `site:prepare` helper that builds the plugin and installs example deps, and updated scripts/docs to reflect the workflow.
- Updated the pnpm smoke harness to rewrite the example dependency to the packed tarball so pnpm installs succeed.
