# docusaurus-plugin-smartlinker – npm packaging notes (2025-09-27)

## Repository snapshot
- **Branch**: `error-fix-branch`
- **HEAD**: `c52ee817` (commit message: `chore: restructure plugin packaging`)
- **Workspace layout**:
  - Root `package.json` remains a private workspace orchestrator with npm workspaces for `packages/*` and `examples/site`.
  - Publishable code lives solely at `packages/docusaurus-plugin-smartlinker` with the remark helper colocated under `src/remark`.
  - pnpm manifests (`pnpm-lock.yaml`, `pnpm-workspace.yaml`) have been removed in favor of npm as the canonical tooling.
  - `package-lock.json` is now up-to-date from an npm install on the consolidated workspace.

## Timeline of key actions
| Time (UTC±0) | Step |
| --- | --- |
| 2025‑09‑27 09:40 | Folded remark helper into plugin package; removed workspace cross-deps. |
| 2025‑09‑27 09:55 | npm build pipeline emits dual ESM/CJS artifacts with tarball verification. |
| 2025‑09‑27 10:20 | Root `npm install` succeeds after pointing example dependency at `file:../../packages/docusaurus-plugin-smartlinker`. |
| 2025‑09‑27 10:45 | npm smoke test (`scripts/npm-smoke.mjs`) scaffolds and builds a fresh site from the packed tarball. |

## Packaging strategy
- Consolidated to a single published package (`packages/docusaurus-plugin-smartlinker`) housing both the plugin and remark helper under `src/remark`.
- npm (v10) is now the authoritative package manager; pnpm manifests removed.
- Example site consumes the plugin via `file:../../packages/docusaurus-plugin-smartlinker` for local development while published installs use the npm tarball.

## Build pipeline & artifact layout
- `scripts/build.mjs` runs two TypeScript builds (ESM + CJS) and rewrites `.cjs` siblings in place, keeping theme runtime and remark helper together.
- `scripts/postbuild-verify.mjs` checks for `.cjs` artifacts, enforces explicit relative extensions, and smoke-loads CommonJS entry points.
- `scripts/verify-tarball.mjs` ensures packed contents have no `workspace:`/`file:` strings.

## Tests & automation
- Remark tests live under `packages/docusaurus-plugin-smartlinker/tests/remark` and run as part of the unified Vitest suite.
- `npm run smoke:npm` scaffolds a vanilla Docusaurus site with npm, installs the packed tarball, and builds it.
- Existing git-based smoke test remains for regression coverage.

## npm verification recipe
```
npm install
npm run build
npm test
npm pack
npm run smoke:npm
```
