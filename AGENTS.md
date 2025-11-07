# Smartlinker Agent Operations Guide

This guide is the single-source reference for maintaining, packaging, deploying, and extending the Smartlinker project. It assumes familiarity with Node.js tooling and Docusaurus, and it links directly to the code, scripts, and workflows that underpin each activity.

## Table of Contents
- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Components & Repositories](#components--repositories)
- [Dependencies & Tooling](#dependencies--tooling)
- [Local Development Setup](#local-development-setup)
- [Build & Packaging](#build--packaging)
- [Deployment](#deployment)
- [Configuration & Secrets](#configuration--secrets)
- [CI/CD](#cicd)
- [Observability & Troubleshooting](#observability--troubleshooting)
- [Security & Compliance](#security--compliance)
- [Example Site Integration](#example-site-integration)
- [Release Process](#release-process)
- [Known Issues & Limitations](#known-issues--limitations)
- [Roadmap & Backlog](#roadmap--backlog)
- [Glossary](#glossary)

## Overview

Smartlinker is a Docusaurus v3 plugin that turns documented terms into context-aware links with tooltip previews. The repository is a pnpm workspace that produces the `docusaurus-plugin-smartlinker` npm package, an example Docusaurus site, and automation around build, packaging, and smoke verification. Packaging is driven by a single tsup configuration that emits both ESM and CJS bundles plus type declarations (including the remark helper) from the plugin workspace.

Primary deliverables:
- `docusaurus-plugin-smartlinker` npm package (plugin + remark helper + runtime theme assets bundled via tsup).
- Example site under `examples/site` showcasing integration and serving as a smoke test subject.
- CI pipelines that run builds, tests, packing, and site verification on Node 20 with pnpm.
- GitHub Pages deployment of the example site on pushes to `main`/`work`.
- Release tarballs attached to GitHub Releases for consumers that install directly from `.tgz` artifacts.

## System Architecture

Smartlinker operates in three phases:
1. **Build-time indexing** (`packages/docusaurus-plugin-smartlinker/src/node`): scans configured folders, parses front matter, and compiles tooltip MDX via the pipeline in `buildPipeline.ts`.
2. **Remark transform** (`packages/docusaurus-plugin-smartlinker/src/remark`): rewrites Markdown/MDX nodes to inject SmartLink references, reusing the same debug configuration set by the plugin entry point.
3. **Runtime/theme layer** (`packages/docusaurus-plugin-smartlinker/src/theme`): renders the tooltip component tree, pulls registry data from Docusaurus global data, and exposes CSS variables aligned with Infima tokens.

Generated artifacts are emitted to `packages/docusaurus-plugin-smartlinker/dist/`, where the tsup bundle produces `index.{mjs,cjs}` for the plugin and `remark/index.{mjs,cjs}` for the remark helper alongside declaration files and the compiled theme runtime.

## Components & Repositories

- [`package.json`](package.json): private workspace root targeting Node `>=18 <25`, configured with pnpm 9. Scripts proxy to the plugin workspace (`build`, `test`, `typecheck`), example site helpers (`site:*`), packaging (`pack:ci` which repacks the plugin tarball into `build-artifacts/`), and the tarball smoke harness (`smoke:git-install`).
- [`packages/docusaurus-plugin-smartlinker`](packages/docusaurus-plugin-smartlinker): publishable package with TypeScript sources, `tsup.config.ts` for dual-format bundling, `scripts/postbuild-verify.mjs` to enforce dist integrity, Vitest configuration, and tracked `dist/` artifacts. The workspace now owns its README and MIT license so the published tarball is self-contained. Its `pack:ci` script chains `pnpm clean && pnpm build && pnpm pack --silent` to produce a deterministic tarball that the root script can delegate to.
- [`packages/remark-smartlinker`](packages/remark-smartlinker): legacy workspace retained temporarily. The remark sources and tests are being consolidated under `packages/docusaurus-plugin-smartlinker/src/remark` and `packages/docusaurus-plugin-smartlinker/tests`. Plan to remove this workspace once all consumers/tests migrate.
- [`examples/site`](examples/site): Docusaurus project consuming the plugin via a workspace `link:` dependency. Commands are proxied through root `site:*` scripts.
- [`scripts`](scripts): currently houses `git-install-smoke.mjs`, which packs the repository, rewrites the example site dependency to the generated tarball, installs, and triggers `docusaurus build`.
- [`.github/workflows`](.github/workflows): CI workflow (`ci.yml`) performing pnpm-based validation on Node 20 and Pages deployment (`deploy-example-site.yml`).
- [`README.md`](README.md), [`AGENTS.md`](AGENTS.md), and [`RELEASE_NOTES.md`](RELEASE_NOTES.md): user-facing quick start, operations guide, and release history.

## Dependencies & Tooling

Core prerequisites:
- Node.js `^18.18 || ^20 || ^22` (see `engines` in `package.json`).
- pnpm 9 (activated via Corepack); npm remains a supported consumer path for published tarballs.
- TypeScript 5.5+ (local dependency for builds).
- tsup 8.x for bundle generation (`packages/docusaurus-plugin-smartlinker/tsup.config.ts`).
- Vitest 2.x for unit tests (configured in `packages/docusaurus-plugin-smartlinker/vitest.config.ts`).
- Docusaurus v3 peer dependencies (`@docusaurus/core`, `react`, `react-dom`, `unified`) for consumers and the example site.

Helpful utilities:
- `corepack enable && corepack prepare pnpm@9.0.0 --activate` to align pnpm version with the repo and CI.
- `pnpm pack` (wrapped by `pnpm run pack:ci` and the smoke script) to generate distributable tarballs.
- `rimraf` is bundled in the plugin workspace for cross-platform cleanups during builds.

## Local Development Setup

1. **Install toolchain**
   ```bash
   corepack enable
   corepack prepare pnpm@9.0.0 --activate
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```
   This bootstraps all workspaces, including the example site.

3. **Build the plugin**
   ```bash
   pnpm run build
   ```
   The root script delegates to `packages/docusaurus-plugin-smartlinker`, which cleans previous artifacts, runs `tsc` into `dist-tsc`, bundles `index` and `remark/index` with tsup (producing `.mjs`/`.cjs` plus declarations), copies the theme assets, and removes transient outputs via `scripts/postbuild-verify.mjs`.

4. **Run validation scripts**
   ```bash
   pnpm run pack:ci          # packs the plugin workspace into build-artifacts/*.tgz
   pnpm run smoke:git-install # optional: tarball smoke test against a temp copy of the example site
   ```

5. **Example site workflows**
   ```bash
   pnpm run site:dev       # docusaurus start (requires a recent pnpm run build)
   pnpm run site:build     # docusaurus build
   pnpm run site:serve     # serves build output
   ```
   The example site depends on the plugin through `link:../../packages/docusaurus-plugin-smartlinker`, so ensure the plugin has been built before running `site:build` or `site:dev`.

6. **Testing**
   ```bash
   pnpm test                 # rebuilds and executes the plugin Vitest suite
   pnpm --filter docusaurus-plugin-smartlinker run test   # run tests without the root pre-build if needed
   ```
   **Note:** Vitest still crashes under Node 22 due to tinypool worker errors. Use Node 20 until upstream fixes land.

## Build & Packaging

### Build outputs
- `packages/docusaurus-plugin-smartlinker/dist/index.{mjs,cjs}` — plugin entry points for ESM/CJS consumers.
- `packages/docusaurus-plugin-smartlinker/dist/index.d.ts` (and `.d.cts`) — bundled type declarations for the plugin entry.
- `packages/docusaurus-plugin-smartlinker/dist/remark/index.{mjs,cjs}` — remark helper entry points emitted from the same workspace.
- `packages/docusaurus-plugin-smartlinker/dist/remark/index.d.ts` (and `.d.cts`) — remark helper declarations.
- `packages/docusaurus-plugin-smartlinker/dist/theme/**/*` — runtime components and CSS copied from `src/theme/styles.css`.
- Tarballs generated via `pnpm pack` (root or plugin workspace) contain README, LICENSE, and the dist assets required by consumers.

Note: `dist/**` is not committed to git. CI and releases produce artifacts at build time.

The plugin TypeScript project is configured with `moduleResolution: "nodenext"` so the shared remark sources (which live in `packages/remark-smartlinker`) can be re-exported with explicit `.js` extensions while still producing `.d.ts` bundles for both entrypoints.

`postbuild-verify.mjs` ensures the required files exist, copies theme assets, enforces explicit relative import extensions, and removes legacy single-format outputs (`dist/index.js`, `dist/remark/index.js`) before cleaning the `dist-tsc` staging directory.

### Commands
```bash
pnpm -C packages/docusaurus-plugin-smartlinker run build      # clean + TypeScript compile + tsup bundle + postbuild verification
pnpm -C packages/docusaurus-plugin-smartlinker run pack:ci    # clean build + pnpm pack -> workspace tarball
pnpm run pack:ci                                               # root proxy: wipes build-artifacts/ and calls workspace pack:ci
pnpm run smoke:git-install                                      # packs repository and runs a Docusaurus build from the tarball
pnpm --filter docusaurus-plugin-smartlinker pack                # direct pack for ad-hoc tarball creation
```

The root README recommends installing the published `.tgz` directly from GitHub Releases (matching the versioned tarballs produced by these commands).

### Versioning strategy
- The plugin follows semantic versioning; current version is `0.1.0` (`packages/docusaurus-plugin-smartlinker/package.json`). Update the workspace version before publishing.
- Keep `CHANGELOG.md` up to date per release. Update `RELEASE_NOTES.md` with highlights for user-facing communication.
- Align npm tags (`latest` vs `next`) manually when publishing (see [Release Process](#release-process)).

### Containerization & Distribution
- No container images are produced today. Distribution is via the npm registry (`docusaurus-plugin-smartlinker` package) and GitHub-release tarballs.
- Document container strategies here if future smoke or CI flows require them (TODO).

## Deployment

### Environments
| Environment | Purpose | Entry point | Notes |
|-------------|---------|-------------|-------|
| Local dev | Develop plugin and run example site | Developer workstation | Run `pnpm run build` before `site:*` commands |
| CI | Validate builds/tests/smoke | GitHub Actions (`ci.yml`) | Node 20 + pnpm; runs typecheck, tests, build, site build, pack:ci |
| Production docs | Publish example site | GitHub Pages (`deploy-example-site.yml`) | Triggered on push to `main`/`work` |
| Package distribution | Publish npm releases | npm registry | Manual `npm publish` from the package directory |

### Example site deployment (GitHub Pages)
1. Workflow `.github/workflows/deploy-example-site.yml` installs with pnpm, runs `pnpm run build`, `pnpm run site:build`, uploads `examples/site/build`, and deploys via `actions/deploy-pages@v4`.
2. Infrastructure: GitHub-managed Pages environment (`github-pages`). No additional provisioning required.
3. Secrets: uses the repository-provided `GITHUB_TOKEN`; no custom secrets are needed.
4. Migrations: none. Changes to routing/content ship with new commits.
5. Rollout strategy: workflow is idempotent; verify by visiting the URL from the deployment summary (`steps.deployment.outputs.page_url`).
6. Rollback: re-run the workflow on an earlier commit or redeploy via the Pages history.

### Package publishing
1. Ensure working tree is clean and `pnpm run build`, `pnpm test`, `pnpm run pack:ci`, and the smoke harness pass.
2. Bump the version inside `packages/docusaurus-plugin-smartlinker/package.json` (`pnpm --filter docusaurus-plugin-smartlinker version <major|minor|patch>` or edit manually).
3. Publish:
   ```bash
   cd packages/docusaurus-plugin-smartlinker
   npm publish --access public
   ```
4. Tag the release in git and push tags.
5. Post-release verification: install the freshly published version in a sample project or rerun the tarball smoke script against the registry tarball.
6. Rollback plan: if a critical issue ships, deprecate the npm version (`npm deprecate`) and publish a patched release.

## Configuration & Secrets

- **Plugin options**: Configured inside consumer `docusaurus.config.*`. Reference implementation in the README `Quick start` block and `examples/site/docusaurus.config.ts`.
- **Environment variables**:
  - `DOCUSAURUS_PLUGIN_DEBUG` / `DOCUSAURUS_PLUGIN_DEBUG_LEVEL` control logging verbosity (see `README.md`).
  - Example site honors `SITE_URL` and `SITE_BASE_URL` to customize deployment base paths (`examples/site/docusaurus.config.ts`).
  - GitHub Actions supply `GITHUB_REPOSITORY` and `GITHUB_ACTIONS` for dynamic config during Pages deploys.
- **Secrets**: None stored in-repo. GitHub Pages uses built-in OIDC + `GITHUB_TOKEN`. Document any future secrets here.
- **Tooltip component overrides**: Provide module paths via `tooltipComponents` entries in plugin options; aggregated in `src/options.ts`.

## CI/CD

- **Workflow**: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
  - Triggered on pushes to `main`, pull requests targeting `main`, and manual dispatch.
  - Build job runs on Node 20 and 22 (matrix):
    - Node 20: full run — typecheck, tests, plugin build, example site build.
    - Node 22: typecheck + plugin build (tests omitted until Vitest is stable).
  - `ci / pack-ci`: depends on `build`, re-installs dependencies, runs `pnpm -C packages/docusaurus-plugin-smartlinker run pack:ci`, asserts the tarball only contains `dist/**`, `README.md`, `LICENSE`, `package.json`, then replaces the example site's dependency with the tarball and rebuilds before resetting manifests.
  - Both jobs run under Corepack-enabled pnpm 9 with frozen lockfile installs.
- **Pages Deploy**: [`.github/workflows/deploy-example-site.yml`](.github/workflows/deploy-example-site.yml)
  - Triggered on push to `main` and `work`, plus manual dispatch.
  - Builds packages and example site with pnpm before uploading to GitHub Pages.
- **Release Tarball**: [`.github/workflows/release-tarball.yml`](.github/workflows/release-tarball.yml)
  - Triggered on version tags (`v*`) or manual dispatch.
  - Installs with pnpm 9, builds the plugin workspace, runs `pnpm pack`, and uploads the generated tarball (plus a `-latest` alias) to the GitHub Release created for the tag.
- **Status checks**: Ensure both workflows stay green before merging or tagging releases.

## Observability & Troubleshooting

- **Debug logging**: Set `DOCUSAURUS_PLUGIN_DEBUG=1` and optionally `DOCUSAURUS_PLUGIN_DEBUG_LEVEL=trace` when running Docusaurus builds to surface structured logs from `src/logger.ts`.
- **Smoke artifacts**: `pnpm run smoke:git-install` logs the temporary workspace paths during execution; capture the console output if you need to inspect the generated site.
- **CI logs**: GitHub Actions logs capture pnpm output. Re-run jobs with debug logging enabled if necessary (`ACTIONS_STEP_DEBUG=true`).
- **Common failures**:
  - Vitest tinypool crash on Node 22 (`pnpm test`); workaround: use Node 20.
  - Example site build failing with missing `dist` assets: run `pnpm run build` before invoking `pnpm run site:build`.
  - Tarball verification issues: ensure `pnpm run pack:ci` completed after a fresh build so the bundle includes the remark helper and theme assets.
  - Mobile tooltip: SmartLink listens for bubble-phase `pointerdown` events and ignores taps that land inside the trigger or the portal content node exposed via `Tooltip`'s `onContentNode` prop. Regressions usually stem from removing that ref wiring or reinstating capture-phase listeners that close before Radix links can fire.

## Security & Compliance

- License: MIT (`LICENSE` and `packages/docusaurus-plugin-smartlinker/LICENSE`).
- Dependency overrides: root `package.json` enforces patched versions of React, estree utilities, and `zod`. Review periodically for updates.
- npm audit: CI does not currently run `npm audit`; run manually if needed (`pnpm audit` / `npm audit`).
- Secrets management: no secrets stored locally. Future secrets should use GitHub Actions Encrypted Secrets with least privilege.
- Short note trust: `smartlink-short-note` strings are MDX/JSX compiled to React at build time. Only include trusted content. Do not compile untrusted user input into short notes or tooltip component modules.

## Example Site Integration

- Managed under [`examples/site`](examples/site) with scripts proxied via root `package.json`:
  ```bash
  pnpm run site:dev       # docusaurus start
  pnpm run site:build     # docusaurus build
  pnpm run site:serve     # serves build output
  ```
- The workspace dependency uses `link:../../packages/docusaurus-plugin-smartlinker`, so `pnpm install` keeps it in sync. Rebuild the plugin (`pnpm run build`) whenever source changes before starting dev or build commands.
- Configuration references the remark helper via `remarkSmartlinker` import and registers tooltip components (see `examples/site/docusaurus.config.ts`).
- Environment toggles (`SITE_URL`, `SITE_BASE_URL`) control deployment paths for GitHub Pages vs local dev.

## Release Process

1. Update documentation (`README.md`, `AGENTS.md`) and changelog entries (`packages/docusaurus-plugin-smartlinker/CHANGELOG.md`, root `CHANGELOG.md`).
2. Verify CI is green or replicate locally:
   ```bash
   pnpm run build
   pnpm test        # prefer Node 20 until tinypool issue resolved
   pnpm run pack:ci
   pnpm run smoke:git-install
   pnpm run site:build
   ```
3. Bump version (`pnpm --filter docusaurus-plugin-smartlinker version patch` etc.) in `packages/docusaurus-plugin-smartlinker`.
4. Publish to npm (`npm publish --access public` from the package directory).
5. Tag commit and push: `git push origin main --tags`.
6. Draft release notes referencing `RELEASE_NOTES.md`; upload the tarball to the GitHub Release if publishing outside npm.
7. Post-release: run the smoke script against the published package or install the registry tarball in a demo project.

## Known Issues & Limitations

- `pnpm test` fails under Node 22 due to tinypool worker crashes. Workaround: switch to Node 20 (`nvm use 20`) until upstream fix lands.
- Vitest suites still emit verbose Docusaurus debug output; consider toggling `DOCUSAURUS_PLUGIN_DEBUG=0` inside tests when stabilizing.
- `packages/remark-smartlinker` has been consolidated into the main plugin workspace; tests and sources now live under `packages/docusaurus-plugin-smartlinker`. The legacy workspace has been removed.
- No automated link checker exists for this documentation; review links manually during updates.

## Roadmap & Backlog

- Track issues and enhancements on GitHub: <https://github.com/Uli-Z/docusaurus-plugin-smartlinker/issues>.
- See `RELEASE_NOTES.md` for historical context and upcoming maintenance notes.
- Future ideas (capture as GitHub issues): stabilize Vitest suites, introduce registry-based smoke tests, and formalize container-based CI.

## Glossary

- **SmartLink**: React component that renders link + tooltip for a documented term.
- **Short Note**: MDX snippet compiled into tooltip content via `smartlink-short-note` front matter.
- **Registry**: Generated dataset mapping term IDs to metadata, emitted under `dist/registry` and loaded via Docusaurus global data.
- **Smoke Test**: Automated end-to-end check that packs the plugin, installs it into a fresh example site, and runs `docusaurus build` (`scripts/git-install-smoke.mjs`).
- **Tarball Verification**: `pnpm pack`-based inspection ensuring the generated package contains required files and no workspace protocols (enforced indirectly by `postbuild-verify.mjs` and smoke tests).
- **Example Site**: Docusaurus project in `examples/site` used for demos and smoke coverage.
- **DOCUSAURUS_PLUGIN_DEBUG**: Environment flag enabling plugin debug logging with levels defined in `src/logger.ts`.
