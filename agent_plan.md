# Plan

## Goals
- Ensure the packages build, test, and pack correctly using **pnpm** only.
- Produce distributable artifacts (`dist/` JS + types + assets) for both plugin and remark helper, and guarantee they are published.
- Provide automated validation (unit + integration) and CI pipeline mirroring local workflow, including an example Docusaurus site smoke test.

## Implementation Outline
1. **Baseline & Analysis**
   - Record current Node/pnpm versions and run `pnpm install`, `pnpm build`, `pnpm test` to capture existing issues in `agent_log.md`.
   - Inspect existing build outputs and packaging rules to understand gaps (missing dist, tarball content, etc.).

2. **Tooling & Scripts**
   - Convert workspace scripts to `pnpm` equivalents (use recursive/filtered commands) and remove npm-specific scripts.
   - Introduce shared scripts (e.g., `pnpm run -r build`, `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm pack:verify`).
   - Ensure consistent TypeScript configs, incremental builds, and source maps; set up bundler (`tsc` + helper) as needed.

3. **Build Output Guarantees**
   - Standardize each package's build pipeline (likely `tsup` or `tsc` + copy assets) to emit `dist/` with both ESM & CJS (if required), and type declarations.
   - Add post-build checks ensuring expected files (JS, d.ts, CSS) exist; fail build otherwise.
   - Update `files`, `exports`, and supporting configs so `pnpm pack` includes dist outputs only (no src/tests).

4. **Integration Testing**
   - Author automated tests that:
     - Run the build and assert `dist/` contains required files.
     - Inspect `pnpm pack` tarball to verify packaged files.
     - Use a minimal example Docusaurus site that installs the tarball and runs a production build (headless) to confirm plugin integration.
     - Ensure assertions that validate built HTML (e.g., SmartLink hrefs) respect dynamic `baseUrl` configuration to keep tests portable across CI/local environments.
   - Update existing unit tests / vitest configuration to align with pnpm workspace.

5. **CI Pipeline**
   - Create `.github/workflows/ci.yml` using `actions/setup-node` + `pnpm/action-setup`, caching pnpm store.
   - CI steps: install, lint/typecheck (if applicable), build, test, pack verification, example site build.
   - Upload `dist/` and packed tarball as artifacts; ensure workflow fails if build outputs missing.

6. **Docs & Logs**
   - Update `README`, `CHANGELOG`, and `agent_log.md` with new workflow, commands, and findings.
   - Document usage instructions (pnpm only) and CI details.

## Test Plan
- `pnpm install`
- `pnpm build`
- `pnpm test`
- `pnpm test -- --runInBand packages/docusaurus-plugin-smartlinker/tests/example.build.e2e.test.ts` (when iterating on the example build expectations)
- `pnpm run lint` / `pnpm typecheck` (if added)
- `pnpm pack` (root) with custom verification script
- Example site build command (e.g., `pnpm --filter @examples/site build`)
- Any new integration test commands (e.g., `pnpm run verify:artifacts`, `pnpm run test:integration`)
