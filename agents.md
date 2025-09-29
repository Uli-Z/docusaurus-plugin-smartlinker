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

Smartlinker is a Docusaurus v3 plugin that turns documented terms into context-aware links with tooltip previews. The repository is a Node.js workspace that produces the `docusaurus-plugin-smartlinker` npm package, an example Docusaurus site, and automation around build, packaging, and smoke verification.

Primary deliverables:
- `docusaurus-plugin-smartlinker` npm package (plugin + remark helper + runtime theme assets).
- Example site under `examples/site` showcasing integration and serving as a smoke test subject.
- CI pipelines that run builds, tests, packaging verification, and smoke installs across Node 18/20/22 with npm and pnpm.
- GitHub Pages deployment of the example site on pushes to `main`/`work`.

## System Architecture

Smartlinker operates in three phases:
1. **Build-time indexing** (`packages/docusaurus-plugin-smartlinker/src/node`): scans configured folders, parses front matter, and compiles tooltip MDX via the pipeline in `buildPipeline.ts`.
2. **Remark transform** (`packages/docusaurus-plugin-smartlinker/src/remark`): rewrites Markdown/MDX nodes to inject SmartLink references, reusing the same debug configuration set by the plugin entry point.
3. **Runtime/theme layer** (`packages/docusaurus-plugin-smartlinker/src/theme`): renders the tooltip component tree, pulls registry data from Docusaurus global data, and exposes CSS variables aligned with Infima tokens.

Generated artifacts are emitted to `packages/docusaurus-plugin-smartlinker/dist/`, where they are consumed by both the Docusaurus plugin hook and the remark helper. The remark CommonJS build is created via `scripts/remark-build-cjs.mjs` to support Node-based bundlers.

A shared debug store (`src/debugStore.ts`) keeps browser and remark logging in sync, while the registry store (`src/indexProviderStore.ts`) allows the plugin and remark transforms to share computed indices.

## Components & Repositories

- [`package.json`](package.json): root workspace definition targeting Node `>=18 <25`, exposing npm scripts that proxy to the plugin workspace and to example-site helpers.
- [`packages/docusaurus-plugin-smartlinker`](packages/docusaurus-plugin-smartlinker): publishable package with TypeScript sources, build scripts (`scripts/build.mjs`, `scripts/verify-pack.mjs`), Vitest configuration, and tracked `dist/` artifacts.
- [`packages/remark-smartlinker`](packages/remark-smartlinker): legacy staging directory that currently only stores generated `dist/` output during builds. It is not published separately; retain until the layout is simplified.
- [`examples/site`](examples/site): Docusaurus project consuming the plugin via a relative `file:` dependency. Commands are proxied through root `site:*` scripts.
- [`scripts`](scripts): node-based smoke helpers for npm, pnpm, and tarball-from-git install flows.
- [`.github/workflows`](.github/workflows): CI matrix runner (`ci.yml`) and GitHub Pages deploy (`deploy-example-site.yml`).
- [`README.md`](README.md) and [`RELEASE_NOTES.md`](RELEASE_NOTES.md): user-facing quick start and release history.

## Dependencies & Tooling

Core prerequisites:
- Node.js `^18.18 || ^20 || ^22` (see `engines` in `package.json`).
- npm (bundled with Node) and pnpm 9 (activated via Corepack).
- TypeScript 5.5+ (local dependency for builds).
- Vitest 2.x for unit tests (configured in `packages/docusaurus-plugin-smartlinker/vitest.config.ts`).
- Docusaurus v3 peer dependencies (`@docusaurus/core`, `react`, `react-dom`, `unified`) for consumers and the example site.
- GNU `tar` for tarball inspection in `scripts/verify-pack.mjs` and smoke tests.

Helpful utilities:
- `corepack enable && corepack prepare pnpm@9.0.0 --activate` to align pnpm version with CI.
- `npm_config_loglevel=error` is set automatically in scripts to keep output concise.

## Local Development Setup

1. **Install toolchain**
   ```bash
   corepack enable
   corepack prepare pnpm@9.0.0 --activate
   ```

2. **Install dependencies** (choose one, matching CI coverage):
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Build the plugin**
 ```bash
 npm run build
 ```
  This invokes `scripts/build.mjs`, which cleans `packages/docusaurus-plugin-smartlinker/dist`, runs `tsc` for plugin + remark targets, generates CommonJS bundles, and copies theme CSS.
   If TypeScript reports missing modules such as `unified`, `mdast`, `unist`, or `vfile`, install them into the plugin workspace as a temporary workaround:
  ```bash
  npm install --workspace docusaurus-plugin-smartlinker --save-dev unified @types/unist @types/mdast @types/vfile
  ```
  (TODO: promote these to committed dev dependencies.)

4. **Run validation scripts**
   ```bash
   npm run verify:pack
   npm run smoke:npm
   npm run smoke:pnpm
   ```
   These pack the plugin, install it into a temp copy of the example site, assert import/require entry points, and execute `docusaurus build`.

5. **Example site workflows** (see [Example Site Integration](#example-site-integration)):
   ```bash
   npm run site:prepare   # builds plugin + installs example deps
   npm run site:dev       # starts local dev server
   npm run site:build     # produces static build in examples/site/build
   ```

6. **Testing**
   ```bash
   npm run test
   ```
   **Note:** As of 2025-09-29, Vitest crashes under Node 22 due to tinypool worker errors. Run with Node 20 or skip until the suites are stabilized (tracked under [Known Issues](#known-issues--limitations)).

## Build & Packaging

### Build outputs
- `packages/docusaurus-plugin-smartlinker/dist/index.{js,d.ts}` — plugin entry point.
- `packages/docusaurus-plugin-smartlinker/dist/theme/**/*` — runtime components and CSS copied from `src/theme/styles.css`.
- `packages/docusaurus-plugin-smartlinker/dist/remark/index.{js,cjs,d.ts}` — remark helper targeting both ESM and CJS consumers.
- Tarballs generated via `npm pack` are inspected for stray `workspace:`/`link:` specifiers and required artifacts through `scripts/verify-pack.mjs`.

### Commands
```bash
npm run build                     # clean + compile + postbuild verification
npm run verify:pack               # npm pack + tarball integrity checks
npm run smoke:npm                 # npm install smoke against example site
npm run smoke:pnpm                # pnpm install smoke against example site
npm run smoke:git-install         # optional: simulate install directly from the Git repo
```
Each smoke script builds the plugin first via `ensureBuilt()`, writes the packed tarball as a `file:` dependency, installs dependencies, asserts both ESM/CJS entry points with Node, and runs `docusaurus build` with debug disabled.

### Versioning strategy
- The plugin follows semantic versioning; current version is `0.1.0` (`packages/docusaurus-plugin-smartlinker/package.json`).
- Keep `CHANGELOG.md` up to date per release. Update `RELEASE_NOTES.md` with highlights for user-facing communication.
- Align npm tags (`latest` vs `next`) manually when publishing (see [Release Process](#release-process)).

### Containerization & Distribution
- No container images are produced today. Distribution is via the npm registry (`docusaurus-plugin-smartlinker` package).
- If containerization becomes necessary (e.g., for deterministic smoke runs), document the image build steps here (TODO: no container strategy defined).

## Deployment

### Environments
| Environment | Purpose | Entry point | Notes |
|-------------|---------|-------------|-------|
| Local dev | Develop plugin and run example site | Developer workstation | Use `npm run site:dev` after `site:prepare` |
| CI | Validate builds/tests/smoke | GitHub Actions (`ci.yml`) | Matrix across Node 18/20/22 and npm/pnpm |
| Production docs | Publish example site | GitHub Pages (`deploy-example-site.yml`) | Triggered on push to `main`/`work` |
| Package distribution | Publish npm releases | npm registry | Manual `npm publish` from package dir |

### Example site deployment (GitHub Pages)
1. Workflow: `.github/workflows/deploy-example-site.yml` installs with pnpm, runs `pnpm run build`, `pnpm run site:build`, uploads `examples/site/build`, and deploys via `actions/deploy-pages@v4`.
2. Infrastructure: GitHub-managed Pages environment (`github-pages`). No additional provisioning required.
3. Secrets: uses the repository-provided `GITHUB_TOKEN`; no custom secrets are needed.
4. Migrations: none. Changes to routing/content ship with new commits.
5. Rollout strategy: workflow is idempotent; verify by visiting the URL from the deployment summary (`steps.deployment.outputs.page_url`).
6. Rollback: re-run the workflow on an earlier commit or redeploy via the Pages history.

### Package publishing
1. Ensure working tree is clean and `npm run build`, `npm run verify:pack`, and smoke tests pass.
2. Bump version inside `packages/docusaurus-plugin-smartlinker/package.json` (`npm version <major|minor|patch>` run from that directory).
3. Publish:
   ```bash
   cd packages/docusaurus-plugin-smartlinker
   npm publish --access public
   ```
4. Tag the release in git and push tags.
5. Post-release verification: install freshly published version in a sample project or rerun a smoke test pointing at the registry tarball.
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
  - Triggered on pull requests and manual dispatch.
  - Matrix: Node 18/20/22 × npm/pnpm.
  - Steps: checkout → setup node/corepack → (if pnpm) `corepack prepare` → install (`pnpm install --frozen-lockfile` or `npm install`) → run `build`, `test`, `site:build`, `verify:pack`, smoke scripts via chosen package manager.
- **Pages Deploy**: [`.github/workflows/deploy-example-site.yml`](.github/workflows/deploy-example-site.yml)
  - Triggered on push to `main` and `work`, plus manual dispatch.
  - Builds packages and example site with pnpm before uploading to GitHub Pages.
- **Status checks**: Ensure both workflows stay green before merging or tagging releases.

## Observability & Troubleshooting

- **Debug logging**: Set `DOCUSAURUS_PLUGIN_DEBUG=1` and optionally `DOCUSAURUS_PLUGIN_DEBUG_LEVEL=trace` when running Docusaurus builds to surface structured logs from `src/logger.ts`.
- **Smoke artifacts**: Each smoke script prints the location of the generated site (`<tmp>/site/build`). Inspect `.docusaurus` output for failing builds.
- **CI logs**: GitHub Actions logs capture npm/pnpm output with `--loglevel error`; re-run jobs with debug logging enabled if necessary (`ACTIONS_STEP_DEBUG=true`).
- **Common failures**:
  - Vitest tinypool crash on Node 22 (`npm run test`); workaround: use Node 20 (`nvm use 20`) until tinypool issue is fixed.
  - Example site install missing `dist/remark/index.cjs`: ensure `npm run site:prepare` ran to build the plugin before invoking `site:build`.
  - Tarball verification failures: check for lingering `workspace:` references in `package.json` or missing `dist/remark` artifacts.

## Security & Compliance

- License: MIT (`LICENSE`).
- Dependency overrides: root `package.json` enforces patched versions of React, estree utilities, and `zod`. Review periodically for updates.
- npm audit: CI does not currently run `npm audit`; run manually if needed (`npm audit` / `pnpm audit`).
- Secrets management: no secrets stored locally. Future secrets should use GitHub Actions Encrypted Secrets with least privilege.

## Example Site Integration

- Managed under [`examples/site`](examples/site) with scripts proxied via root `package.json`:
  ```bash
  npm run site:prepare   # builds plugin + installs site deps via npm --prefix
  npm run site:dev       # docusaurus start
  npm run site:build     # docusaurus build
  npm run site:serve     # serves build output
  ```
- `site:prepare` ensures the plugin is freshly built (`npm run build`) and installs dependencies into `examples/site/node_modules`.
- The site depends on the plugin through `file:../../packages/docusaurus-plugin-smartlinker` (`examples/site/package.json`). During smoke tests this dependency is replaced with a packed tarball to simulate registry installs.
- Configuration references the remark helper via `remarkSmartlinker` import and registers tooltip components (see `examples/site/docusaurus.config.ts`).
- Environment toggles (`SITE_URL`, `SITE_BASE_URL`) control deployment paths for GitHub Pages vs local dev.

## Release Process

1. Update documentation (`README.md`, `agents.md`) and changelog entries (`packages/docusaurus-plugin-smartlinker/CHANGELOG.md`, root `CHANGELOG.md`).
2. Verify CI is green or replicate locally:
   ```bash
   npm run build
   npm run test   # prefer Node 20 until tinypool issue resolved
   npm run verify:pack
   npm run smoke:npm
   npm run smoke:pnpm
   npm run site:build
   ```
3. Bump version (`npm version patch` etc.) in `packages/docusaurus-plugin-smartlinker`.
4. Publish to npm (`npm publish --access public`).
5. Tag commit and push: `git push origin main --tags`.
6. Draft release notes referencing `RELEASE_NOTES.md`; announce new npm version and regenerate the example site (automatic via Pages workflow).
7. Post-release: run smoke tests against the published package by installing from npm instead of the local tarball (TODO: add helper script).

## Known Issues & Limitations

- `npm run test` fails under Node 22 due to tinypool worker crashes. Workaround: switch to Node 20 (`nvm use 20`) until upstream fix lands.
- Fresh `npm run build` runs can fail with missing `unified`/`mdast`/`unist`/`vfile` typings; install the packages via `npm install --workspace docusaurus-plugin-smartlinker --save-dev unified @types/unist @types/mdast @types/vfile` until the dependency list is formalized.
- Vitest suites still emit verbose Docusaurus debug output; consider toggling `DOCUSAURUS_PLUGIN_DEBUG=0` inside tests when stabilizing.
- `packages/remark-smartlinker` is a placeholder directory; remove once the build no longer stages files there (TODO).
- No automated link checker exists for this documentation; review links manually during updates.

## Roadmap & Backlog

- Track issues and enhancements on GitHub: <https://github.com/Uli-Z/docusaurus-plugin-smartlinker/issues>.
- See `RELEASE_NOTES.md` for historical context and upcoming maintenance notes.
- Future ideas (capture as GitHub issues): stabilize Vitest suites, introduce registry-based smoke tests, and formalize container-based CI (assumptions noted as TODOs above).

## Glossary

- **SmartLink**: React component that renders link + tooltip for a documented term.
- **Short Note**: MDX snippet compiled into tooltip content via `smartlink-short-note` front matter.
- **Registry**: Generated dataset mapping term IDs to metadata, emitted under `dist/registry` and loaded via Docusaurus global data.
- **Smoke Test**: Automated end-to-end check that packs the plugin, installs it into a fresh example site, and runs `docusaurus build` (`scripts/smoke-*.mjs`).
- **Tarball Verification**: Scripted inspection ensuring `npm pack` output contains required files and no workspace protocols (`packages/docusaurus-plugin-smartlinker/scripts/verify-pack.mjs`).
- **Example Site**: Docusaurus project in `examples/site` used for demos and smoke coverage.
- **DOCUSAURUS_PLUGIN_DEBUG**: Environment flag enabling plugin debug logging with levels defined in `src/logger.ts`.
