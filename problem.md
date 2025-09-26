# docusaurus-plugin-smartlinker – npm/pnpm interoperability log (2025-09-26)

## Repository snapshot
- **Branch**: `error-fix-branch`
- **HEAD**: `c52ee817` (commit message: `chore: restructure plugin packaging`)
- **Workspace layout**:
  - Root `package.json` renamed to `docusaurus-plugin-smartlinker-workspace`, `private: true`, workspaces `packages/*`, `examples/site`.
  - Publishable package lives at `packages/docusaurus-plugin-smartlinker`.
  - Remark helper remains a workspace package at `packages/remark-smartlinker` but is *not* intended to be published independently (name still `@internal/remark-smartlinker`).
  - A new build orchestrator (`packages/docusaurus-plugin-smartlinker/scripts/build.mjs`) and CJS tsconfig (`packages/remark-smartlinker/tsconfig.cjs.json`) were added to emit dual-format artifacts and copy the remark build output into `dist/remark/`.
  - `package-lock.json` is now present because `npm install` was executed from the workspace root.

## Timeline of key actions
| Time (UTC±0) | Step |
| --- | --- |
| 2025‑09‑25 18:50 | `npm install` in root fails (`EUNSUPPORTEDPROTOCOL`) because manifests use `workspace:*` ranges. |
| 2025‑09‑25 19:03 | Switching remark + example manifests to `file:` links allows `npm install`; `npm run build` passes. |
| 2025‑09‑25 19:39 | `pnpm run build`/`pnpm run site:build` succeed. |
| 2025‑09‑25 19:45 | Initial `npm run site:build` fails: `dist/remark/index.cjs` still contains ESM syntax (handrolled wrapper). |
| 2025‑09‑25 19:57 | Build pipeline revamped to produce real CJS (`tsconfig.cjs.json` + copy) — `pnpm run site:build` succeeds. |
| 2025‑09‑25 20:05 | `npm install` followed by `npm run site:build` fails: `Error: Can't resolve '@radix-ui/react-tooltip'` (dependency not present after npm install). |
| 2025‑09‑25 20:06 | Attempt to pin `zod@3.23.8` via root overrides; `npm install` warns about damaged lockfile but finishes. |
| 2025‑09‑25 20:08 | Retry `npm run site:build` still fails due to missing `@radix-ui/react-tooltip`. |
| 2025‑09‑25 20:09 | Further attempts to switch dependency specifiers between `workspace:*` and `file:` reintroduce `EUNSUPPORTEDPROTOCOL`. |
| 2025‑09‑26 08:02 | `npm install --workspace docusaurus-plugin-smartlinker` fails for the same reason (`workspace:*`). |
| 2025‑09‑26 08:10 | After cleaning `node_modules`, plain `npm run build` fails (`Cannot find module 'typescript/bin/tsc'`) because workspace dependency tree was never re-installed.

## Issue catalogue

### 1. `npm install` vs `workspace:*`
- **Symptoms**: running `npm install` at the repo root (npm v10.9.3) aborts with `EUNSUPPORTEDPROTOCOL` whenever a dependency string contains `workspace:*`.
- **Affected manifests**: `examples/site/package.json` and `packages/remark-smartlinker/package.json` currently depend on `docusaurus-plugin-smartlinker` via `"workspace:*"` (state at HEAD).
- **Workaround tested**: swapping to `file:../../packages/docusaurus-plugin-smartlinker` (example) and `file:../docusaurus-plugin-smartlinker` (remark) allows `npm install`, but breaks the workspace linkage semantics (see Issue 2).
- **Open question**: find a specifier pattern that keeps pnpm dev UX (workspace linking) while remaining acceptable to npm consumers. Options considered: publish a second package for remark, move remark into the same package at build time (current attempt), or rely on `npm workspaces` features (requires reworking install flow and dropping `workspace:*`).

### 2. Missing dependencies after `npm install`
- **Scenario**: On a clean checkout using the current file-spec approach (`file:…`), run `npm install` followed by `npm run site:build`.
- **Result**: Docusaurus build fails during webpack bundling:
  ```
  Module not found: Error: Can't resolve '@radix-ui/react-tooltip' in .../packages/docusaurus-plugin-smartlinker/dist/theme/runtime
  ```
- **Diagnosis**:
  - After `npm install`, `node_modules/@radix-ui/react-tooltip` does **not** exist at the repo root, and the workspace-local folder `packages/docusaurus-plugin-smartlinker/node_modules/@radix-ui/` is missing as well.
  - The plugin package lists `@radix-ui/react-tooltip@^1.2.8` as a dependency, but because the remark package references the plugin via `file:../docusaurus-plugin-smartlinker`, npm treats it as a file tarball copy rather than a workspace and skips dependency installation for nested packages.
  - pnpm succeeds because it honours the monorepo workspace graph; npm does not.
- **Impact**: Any downstream project that installs the published tarball via npm will hit the same missing dependency unless the package ships a bundled version that inlines Radix or marks it as peer dependency.

### 3. Build orchestration and CJS output
- **Current solution**: `packages/docusaurus-plugin-smartlinker/scripts/build.mjs` performs the following:
  1. `tsc -p packages/docusaurus-plugin-smartlinker/tsconfig.json`
  2. `tsc -p packages/remark-smartlinker/tsconfig.json`
  3. `tsc -p packages/remark-smartlinker/tsconfig.cjs.json` (new)
  4. `packages/remark-smartlinker/scripts/build-cjs.js` rewrites `dist-cjs/*.js` to `.cjs` files and adjusts extension references.
  5. Copies the remark dist into `packages/docusaurus-plugin-smartlinker/dist/remark`
  6. Runs `postbuild-verify.mjs`
- **Status**: CJS parse errors are resolved; `npm pack packages/docusaurus-plugin-smartlinker` now includes `dist/remark/index.{js,cjs,d.ts}`. No further action needed here.

### 4. Vitest failures
- `pnpm run test` still reports three failing tests in `packages/docusaurus-plugin-smartlinker/tests/theme.*.test.tsx` (tooltips tests). Output excerpts show missing `[data-testid="shortnote"]` and uncontrolled tooltip warnings. These failures predate the packaging work and remain unresolved.

### 5. Post-clean build failure (`Cannot find module 'typescript/bin/tsc'`)
- After deleting all `node_modules` directories and running `npm run build` **without** a prior `npm install` that succeeds, the build script attempts to resolve `typescript/bin/tsc` via `require.resolve`.
- Because the root `npm install` currently fails (Issue 1) or skips workspace dependencies (Issue 2), `typescript` is absent, resulting in:
  ```
  Error: Cannot find module 'typescript/bin/tsc'
  ```
- Any resolution must ensure workspace dependencies are actually present before `build.mjs` runs.

## Current reproduction matrix
| Step | pnpm | npm |
| --- | --- | --- |
| `install` | ✅ `pnpm install` | ❌ (`workspace:*`), ✅ (with `file:`) but missing deps |
| `run build` | ✅ | ❌ (`typescript/bin/tsc` missing after failed install) |
| `run site:build` | ✅ | ❌ `@radix-ui/react-tooltip` unresolved |
| `run test` | ⚠️ 3 failing tooltip specs | n/a |

## Notable files added/modified in this branch
- `packages/docusaurus-plugin-smartlinker/scripts/build.mjs` – orchestrates multi-target build.
- `packages/remark-smartlinker/tsconfig.cjs.json` – dedicated CommonJS compiler configuration.
- `packages/remark-smartlinker/scripts/build-cjs.js` – rewritten to consume `dist-cjs` output and emit `.cjs` files.
- `package-lock.json` – generated by `npm install`; currently represents a mixed state due to failed installs/warnings.
- `agent_log.md` – extended with the session summary.

## Open questions / next steps for an expert
1. **Dependency specifiers**: What is the recommended approach to keep convenient local workspace linking while ensuring npm consumers receive a tarball with all runtime dependencies? Should the remark helper become part of the plugin’s published bundle (no workspace dependency), or should it remain a separate package published under its own name?
2. **npm workspace install flow**: Can the project rely on npm’s native workspaces (dropping `file:` indirections) without reintroducing `EUNSUPPORTEDPROTOCOL`? Are there npm configuration flags that allow `workspace:*` when the package is not published from root?
3. **Packaging of `@radix-ui/react-tooltip` and friends**: Would bundling radial UI into the plugin, or declaring it as a peer dependency, be more appropriate for npm consumers?
4. **Automation**: Once dependency resolution is fixed, ensure CI (`pnpm install --frozen-lockfile`, `pnpm run build`, `pnpm run site:build`) and npm-based smoke tests (`scripts/git-install-smoke.mjs`) cover both package managers.
5. **Legacy test failures**: Investigate and fix the remaining Vitest tooltip assertions to keep regression coverage intact.

## Quick reproduction script (current state)
```bash
# clean workspace
rm -rf node_modules packages/*/node_modules examples/site/node_modules package-lock.json

# pnpm path – works
pnpm install
pnpm run build
pnpm run site:build

# npm path – fails
npm install            # fails immediately (workspace:*)
# —or—
sed -i 's/workspace:\*/file:..\/..\//g' examples/site/package.json
sed -i 's/workspace:\*/file:..\/docusaurus-plugin-smartlinker/' packages/remark-smartlinker/package.json
npm install            # succeeds
npm run site:build     # fails: Can't resolve '@radix-ui/react-tooltip'
```
