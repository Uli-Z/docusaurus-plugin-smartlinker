# Plan

## Goals
- **PNPM-first** workflows: all workspace packages and the example site build, test, and smoke using pnpm (`pnpm install`, `pnpm run build`, `pnpm run site:build`).
- Ship a **prebuilt `dist/`** (ESM, CJS if required, `.d.ts`, source maps, CSS assets) with the published npm package so consumers never run a build step or require pnpm.
- Maintain npm compatibility: `package.json` metadata (`name`, `version`, `main`, `module`, `types`, `exports`, `files`, `engines`) must reference `dist/` outputs and support npm-and-Node-based installs.
- Provide a verification strategy proving that a fresh Docusaurus project created with npm can install and use the plugin without pnpm or local compilation.

## Specification Outline
1. **Problem Statement & Objectives**
   - Restate PNPM-first build expectation for repo contributors.
   - Define the requirement for prebuilt artifacts in `dist/` distributed via npm, eliminating consumer build steps.
   - Emphasize npm consumer success: installers using npm must be supported without pnpm tooling leakage.

2. **Build & Packaging Requirements**
   - Detail required `dist/` contents: `index.js`, optional `index.cjs`, `.d.ts`, `.map`, `theme/` assets, remark helper outputs.
   - Specify build scripts: pnpm-driven commands (`pnpm run build`, `pnpm run verify:pack`, etc.).
   - Document `package.json` fields: `main`, `module`, `types`, `exports`, `files`, `type`, `scripts`, `publishConfig` (if needed), ensuring artifacts resolve to `dist/`.
   - Confirm publish-time inclusion: `npm pack` tarball must contain `dist/` outputs and exclude sources/tests, with no `postinstall` build hooks.

3. **Compatibility & Constraints**
   - Supported Node.js versions and Docusaurus peer ranges.
   - Platform support (Linux/macOS/Windows) considerations.
   - Workspace layout: pnpm monorepo, lockfile policy (`pnpm-lock.yaml` authoritative), no npm lock.
   - Decision on tracking `dist/`: typically committed in package directory for quicker installs or generated during release but bundled in tarball; clarify expected practice.

4. **Verification & Test Specification**
   - **Pnpm workspace tests**: `pnpm install`, `pnpm run build`, `pnpm run site:build` to confirm plugin + example site coverage.
   - **Tarball verification**: run `pnpm run build` then `npm pack` (or workspace script) and inspect tarball for required `dist/` artifacts and metadata.
   - **Npm consumer scenario**: using npm, scaffold `npm create docusaurus@latest`, install the plugin from the packed tarball/registry, run `npm run build` and optionally `npm run start`, assert Smartlinker components render (e.g., check HTML output or CLI logs).
   - Ensure npm consumer tests forbid pnpm usage and fail if the plugin attempts a build or requires pnpm.
   - Map each requirement to corresponding tests with pass/fail signals (commands + expected outcomes).

5. **Process & Logging Expectations**
   - All actions logged in `agent_log.md`; include changelog notes for documentation/spec updates.
   - Iterative loop: plan → document tests → later implement/tests/fix (not part of this spec task).

## Test Plan
- **Workspace validation**: `pnpm install`, `pnpm run build`, `pnpm run site:build`, `pnpm run smoke:pnpm`.
- **Packaging audit**: `pnpm run verify:pack`, `npm pack` + inspect contents (`tar -tf`/script) to ensure `dist/` completeness and absence of build scripts in `postinstall`.
- **Npm consumer scenario**: `npm create docusaurus@latest`, `npm install docusaurus-plugin-smartlinker-<version>.tgz`, `npm run build`, `npm run start`; validate SmartLink rendering or registry logs.
- **Metadata checks**: script/assertion that `package.json` fields resolve to `dist/` (e.g., Node `require`/`import` smoke tests).
- **Traceability matrix**: document mapping between requirements and verification steps to guarantee full coverage before implementation begins.
