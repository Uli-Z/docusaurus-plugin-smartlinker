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
- Action: Reviewed repository root instructions (agent_plan.md) and confirmed no AGENTS.md present.
- Decision: Proceed to craft updated plan focused on npm-only packaging per user request before executing further changes.
- Plan:
  1. Baseline analysis of current monorepo layout, build scripts, and package exports to identify workspace link usages.
  2. Clone reference repository `docusaurus-plugin-resistogram` to study its npm packaging approach (package.json, build scripts, exports, smoke tests).
  3. Design revised packaging strategy (module format, peer deps, files list, build tooling) informed by baseline and reference findings.
  4. Implement repo changes: restructure packages, update build pipeline, adjust imports/exports, and ensure remark helper integration.
  5. Update documentation, examples, and changelog; script npm smoke tests and CI workflows; verify tarball integrity.
  6. Run full verification matrix (npm build, pack, smoke test, lint/tests) and iterate until green.
- Planned Tests:
  * `npm ci`
  * `npm run build`
  * `npm pack`
  * Custom npm smoke test script for fresh Docusaurus site build
  * `npm test` (if available)
  * Tarball verification script (ensure no workspace/file specifiers)
  * GitHub Actions workflow lint via `npm run lint` or equivalent if present
- Action: Inspected workspace structure (packages, root package.json, plugin build scripts) to capture current architecture details.
- Observation: Plugin depends on separate `@internal/remark-smartlinker` workspace built via tsc and copied into plugin dist; remark package depends on plugin via `workspace:*`, causing npm packaging issues.
- Observation: Root workspace pinned to pnpm (packageManager) with scripts targeting workspaces; build relies on Typescript's CLI resolved from plugin devDependencies.
- Action: Cloned reference repository `docusaurus-plugin-resistogram` into /tmp for comparative analysis.
- Action: Reviewed reference package.json for `docusaurus-plugin-resistogram` to understand packaging strategy.
- Observation: Single-package repo with tsup build emitting ESM outputs, remark helper colocated under src with subpath export, `files` limited to dist, dependencies include runtime libs with peerDeps for platform packages, and build triggered via `prepare` (npm friendly).
- Decision: Consolidate repository into a single publishable package by folding remark sources/tests into `packages/docusaurus-plugin-smartlinker/src/remark` and retiring the separate workspace. Adopt a dual-build tsc pipeline emitting ESM to `dist` and CJS companions (renamed `.cjs`) copied alongside, mirroring the prior remark script but generalized.
- Decision: Update package metadata to npm-friendly defaults (`packageManager: npm@...`, peerDependencies limited to platform libs, dependencies kept runtime). Remove pnpm-specific files (pnpm-lock, workspace manifest) and ensure scripts run under npm workspaces.
- Decision: Add prepack script that runs build + tarball verification (ensuring no `workspace:`/`file:` strings) and create smoke test harness that packs the plugin and installs it into a freshly scaffolded Docusaurus site via npm.
- Action: Moved remark source and test files into the plugin package (`src/remark`, `tests/remark`) and removed the standalone `packages/remark-smartlinker` workspace to simplify npm packaging.
- Action: Updated plugin package metadata for dual ESM/CJS exports, added tarball verification prepack hook, and imported remark dev dependencies from the retired workspace.
- Action: Rebuilt build pipeline via `scripts/build.mjs` using twin tsc runs with `.cjs` emit + verification, created `tsconfig.cjs.json`, and enhanced postbuild checks for the new artifacts.
- Action: Added tarball verification script to guard against `workspace:`/`file:` strings and switched workspace root tooling to npm (packageManager/npm scripts), removing pnpm manifests.
- Action: Added automated npm smoke test (`scripts/npm-smoke.mjs`) that scaffolds a fresh Docusaurus site, installs the packed plugin via npm, and runs a production build; wired into root scripts.
- Error: `npm install` failed with `EUNSUPPORTEDPROTOCOL` due to `workspace:*` specifier remaining in `examples/site/package.json`.
- Action: Pointed example site dependency to `file:../../packages/docusaurus-plugin-smartlinker` to satisfy npm.
- Action: Re-ran `npm install` after dependency fix; installation completed successfully under npm.
- Action: Updated documentation (`README.md`, `problem.md`, `RELEASE_NOTES.md`) to reflect the npm-only installation flow, new smoke test, and consolidated packaging layout.
- Action: Adjusted `OptionsSchema` Zod definitions to satisfy stricter typings under TypeScript 5.5 by explicitly declaring string keys and annotating tooltip component entries.
- Action: Added runtime-compatible module directory helper in `src/index.ts` to support both ESM (import.meta) and CJS builds, guarded with a ts-ignore for the CJS compile.
- Action: Replaced tarball verifier to inspect built dist files directly (avoids recursive `npm pack` invocation during prepack).
- Action: Smoke-tested npm flow via `scripts/npm-smoke.mjs`; script now packs the plugin, scaffolds a fresh site, installs, and builds successfully.
- Changelog: consolidated remark helper into plugin package, replaced pnpm tooling with npm (new scripts and smoke test), implemented dual-format builds with `.cjs` outputs, and updated docs/examples for npm installation.

### 2025-09-27 Session (Follow-up)
- Action: Reviewed repository layout and instructions (`agent_plan.md`) to align with outstanding packaging/test tasks noted in the memento.
- Action: Confirmed absence of nested `AGENTS.md` files to ensure no additional scope-specific requirements before making changes.
- Decision: Focus this iteration on resolving the known failing Vitest suites to achieve a clean `npm test` run while preserving the npm-only packaging setup.
- Plan:
  1. Analyze each failing test (`theme.smartlink`, `theme.root`, `plugin.debug`, `tooltipMdxCompiler`) to understand regressions from the packaging merge.
  2. Implement code fixes or test adjustments necessary to restore intended behavior across tooltip rendering, debug logging, and MDX compiler integration.
  3. Re-run `npm test` to confirm all suites pass; follow with `npm run build` and `npm run smoke:npm` if source changes could affect packaging.
- Planned Tests: `npm test`, `npm run build`, `npm run smoke:npm`.
- Action: Updated `.github/workflows/ci.yml` to drop pnpm setup, adopt an npm-based Node matrix (18/20/22), and ensure the smoke test + example build execute on Node 20.
- Action: Replaced pnpm bootstrap steps in `.github/workflows/deploy-example-site.yml` with npm cache/install/build equivalents referencing the npm lockfile.
- Observation: TypeScript build failed referencing `siteConfig.markdown.hooks` due to stricter typings in `MarkdownConfig`.
- Action: Relaxed `createTooltipMdxCompiler` typing by introducing a local `MarkdownHooksConfig` extension and fallback severities, satisfying TypeScript.
- Action: Removed stale pnpm-installed dependencies (`node_modules` folders) and reinstalled via `npm ci` to align the workspace with the new npm manifest and avoid pnpm symlinks during tests.
- Action: Re-ran validation commands: `CI=1 npm test`, `npm run build`, and `npm run smoke:npm` to confirm unit tests, packaging, and smoke flow succeed under npm tooling.
- Action: Ran `npm test`; confirmed failures in tooltip/theme suites, debug logging, tooltip MDX compiler, and example site build due to missing `dist/remark/index.cjs` when consumed via npm-installed dependency.
- Decision: Update SmartLink hover detection to avoid treating jsdom as touch-only, which suppressed tooltip rendering and caused controlled/uncontrolled warnings.
- Action: Refined `SmartLink` hover detection to derive the initial `matchMedia('(hover: hover)')` state synchronously and fall back to hover-capable when unavailable, ensuring the tooltip remains uncontrolled on desktop and accessible on mobile.
- Decision: Harden tooltip MDX compiler inputs so Docusaurus markdown hooks default to safe fallbacks when omitted by tests or custom configs.
- Action: Normalized markdown hook defaults inside `createTooltipMdxCompiler` so `onBrokenMarkdownLinks`/`onBrokenMarkdownImages` always exist, preventing runtime errors during processor creation.
- Decision: Ensure example site builds trigger a fresh plugin build so packaged artifacts (including CommonJS remark entry) exist before Docusaurus consumes the dependency.
- Action: Updated the workspace `site:build` npm script to invoke the plugin build prior to building the example site.
- Action: Added jsdom guard around mobile navigation fallback so SmartLink prevents default taps and only calls `window.location.assign` outside of tests, eliminating jsdom navigation errors during Vitest runs.
- Decision: Restore desktop hover detection during tests by resetting `window.matchMedia` after each suite, since the mobile test stubs it to simulate touch devices.
- Action: Captured the original `matchMedia` descriptor in `theme.smartlink.test.tsx` and re-applied it after each test while marking the mobile stub configurable, ensuring subsequent tests regain hover behavior.
- Action: Removed debugging helpers and reran the targeted tooltip suite to confirm markdown tooltips render correctly under hover conditions.
- Action: Executed full `npm test` (covering Vitest unit suites + example site build) and `npm run build` to verify the npm package outputs.
- Changelog: tooltip + hover fixes, markdown compiler hardening, and npm tooling stabilization with smoke tests.

### 2025-09-28 Session (Follow-up)
- Action: Reviewed `agent_plan.md` to confirm standing objectives before addressing CI feedback.
- Action: Checked repository root for scoped `AGENTS.md` instructions (none found) to validate operating constraints.
- Action: Listed workspace contents to locate workflow configurations and supporting scripts related to CI failures.
- Observation: GitHub Actions run fails at `pnpm/action-setup@v4` due to mismatch with `packageManager: npm@10.8.2` in `package.json`, indicating workflows still assume pnpm.
- Decision: Update CI workflows to adopt npm tooling, mirroring local scripts, and ensure tests cover CI parity.
- Plan:
  1. Modify `.github/workflows/ci.yml` (and other workflows if needed) to use npm tooling, removing pnpm setup and aligning cache/install/build steps with npm commands.
  2. Review repository scripts/tests to ensure CI exercises npm smoke test and other relevant checks mirroring local expectations.
  3. Update tests or add new npm-focused validation in CI configuration and, if necessary, adjust local scripts to catch mismatches.
- Planned Tests: `npm test`, `npm run build`, `npm run smoke:npm`.
