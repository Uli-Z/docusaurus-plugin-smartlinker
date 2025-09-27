# Plan
1. Baseline assessment
   - Record current toolchain versions, install dependencies with pnpm, and capture existing build/test status for the log.
   - Inventory current package outputs and publishing configuration to understand gaps.
2. Build pipeline design
   - Decide on TypeScript compilation/bundling approach (likely tsup) to emit ESM/CJS + types into dist/.
   - Define final dist layout, entrypoints, and package.json exports/files so the plugin is consumable by Docusaurus.
3. Implementation
   - Enforce pnpm usage via packageManager/engines fields and refresh the lockfile.
   - Add/adjust build scripts, tsconfig, and tooling configuration so pnpm build/typecheck/pack produce the desired dist outputs.
   - Ensure dist artifacts and type declarations are included via files/.npmignore updates.
4. Testing and verification
   - Author automated checks covering pnpm build success, dist file existence, pack contents, and a Docusaurus example that consumes the packed plugin.
   - Provide convenient scripts to run these validations locally and in CI.
5. CI pipeline
   - Create GitHub Actions workflow using pnpm with caching to run install, lint/test/build, example site build, and pack verification.
   - Upload dist/ and pack artifacts from CI for inspection.
6. Documentation & logging
   - Update CHANGELOG.md and agent_log.md with findings, plan execution, and outcomes.

## Tests
1. `pnpm install`
2. `pnpm build`
3. `pnpm test`
