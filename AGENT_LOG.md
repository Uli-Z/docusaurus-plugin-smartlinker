# Milestone 0: Skeleton + Tests

## Summary

Successfully created the pnpm workspaces monorepo with the following structure:

- `/packages/docusaurus-plugin-linkify-med`
- `/packages/remark-linkify-med`
- `/examples/site`

## Created Files

- `package.json` (root)
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `.editorconfig`
- `.gitignore`
- `AGENT_LOG.md`
- `packages/docusaurus-plugin-linkify-med/package.json`
- `packages/docusaurus-plugin-linkify-med/tsconfig.json`
- `packages/docusaurus-plugin-linkify-med/scripts/build-cjs.js`
- `packages/docusaurus-plugin-linkify-med/src/index.ts`
- `packages/docusaurus-plugin-linkify-med/src/theme/SmartLink.tsx`
- `packages/docusaurus-plugin-linkify-med/src/theme/Tooltip.tsx`
- `packages/docusaurus-plugin-linkify-med/src/theme/IconResolver.tsx`
- `packages/docusaurus-plugin-linkify-med/tests/smoke.test.ts`
- `packages/remark-linkify-med/package.json`
- `packages/remark-linkify-med/tsconfig.json`
- `packages/remark-linkify-med/scripts/build-cjs.js`
- `packages/remark-linkify-med/src/index.ts`
- `packages/remark-linkify-med/tests/smoke.test.ts`
- `examples/site/package.json`
- `examples/site/tsconfig.json`
- `examples/site/docusaurus.config.ts`
- `examples/site/sidebars.ts`
- `examples/site/src/pages/index.md`
- `examples/site/static/.gitkeep`

## Scripts and Verification

- `pnpm install`: Succeeded.
- `pnpm build`: Succeeded. Both packages (`@linkify-med/docusaurus-plugin` and `remark-linkify-med`) build successfully.
- `pnpm test`: Succeeded. Vitest smoke tests for both packages passed.
- `pnpm site:build`: **Failed.**

## Blockers

The example Docusaurus site fails to build with the following error:
`TypeError: require.resolveWeak is not a function`

This appears to be an issue with Docusaurus v3's build process in this environment, possibly related to webpack or dependency resolution.

### Attempts to fix:
- Ensured all required peer dependencies and types are installed.
- Corrected a typo in the `build-cjs.js` scripts.
- Aligned React versions using `pnpm.overrides`.
- Performed a clean install by removing `node_modules` and `pnpm-lock.yaml`.

None of these attempts resolved the issue.

## TODOs / Next Steps

- The Docusaurus build issue needs further investigation. It might be a version-specific bug or a conflict with the local environment.
- For now, we can proceed with the next milestones, as the core packages are building and testing correctly. The example site is not strictly required for the development of the plugins' core logic.

# Milestone 0.1: Docusaurus Build Fix

## Summary of Changes

- Removed `"type": "module"` from the following files:
  - `/package.json` (root)
  - `/examples/site/package.json`

## Rationale

This change was made to unblock the Docusaurus v3 build. Docusaurus expects an "ambiguous" module mode, and having `"type": "module"` at the repository or site root can interfere with its Webpack configuration for Server-Side Rendering (SSR).

## Script Verification

- `pnpm install`: Succeeded.
- `pnpm -r run build`: Succeeded.
- `pnpm -r run test`: Succeeded.
- `pnpm site:build`: **Succeeded.**

The Docusaurus example site now builds successfully.

---

# Milestone 1: Frontmatter Loader (raw)

## Summary

Implemented a pure frontmatter loader for `@linkify-med/docusaurus-plugin` that parses MD/MDX files with `gray-matter`, validates shape with `zod`, and returns normalized `IndexRawEntry[]` with structured warnings. Added fixtures and Vitest tests.

## Changes

- Added `gray-matter` and `zod` to `@linkify-med/docusaurus-plugin`.
- Created core files:
  - `packages/docusaurus-plugin-linkify-med/src/types.ts`
  - `packages/docusaurus-plugin-linkify-med/src/frontmatter.ts`
  - `packages/docusaurus-plugin-linkify-med/src/frontmatterAdapter.ts`
- Added test fixtures under `packages/docusaurus-plugin-linkify-med/tests/fixtures/docs/`:
  - `ok-amoxicillin.mdx`, `ok-vancomycin.md`, `skip-linkify-false.mdx`,
    `bad-missing-id.mdx`, `bad-empty-synonyms.mdx`, `bad-slug.mdx`, `bad-notarray-synonyms.mdx`
- Added unit tests: `packages/docusaurus-plugin-linkify-med/tests/frontmatter.test.ts`.

## Test Results

- Package builds: OK
- `pnpm -r --filter @linkify-med/docusaurus-plugin run test`: 2 files, 4 tests passed.
- Repo-wide: `pnpm -r --filter './packages/**' run test`: all package tests passed.
- Example site: `pnpm site:build`: success (unchanged behavior).

## Notes

- Fixtures were adjusted to remove stray leading `mdx`/`md` lines so frontmatter is at the file start.
- Minor test string fix for an inline YAML block literal to avoid a syntax error.

# Milestone 2: Path Distance & Collision Resolver

## Files added

- `packages/docusaurus-plugin-linkify-med/src/proximity.ts`
- `packages/docusaurus-plugin-linkify-med/tests/proximity.test.ts`

## Test results

- `pnpm -r --filter @linkify-med/docusaurus-plugin run test`: All 11 tests in 3 files passed.
- `pnpm test`: All project tests passed.
- `pnpm site:build`: Succeeded.

## Notes

The `distance` and `resolveCollision` functions were implemented as pure functions with no side effects. Unit tests cover same-folder, ancestor, and sibling path distances, as well as collision resolution logic for single candidates, nearest candidates, and tie-breaking scenarios.

# Milestone 4: Icon Configuration & Resolver

## Files added

- `packages/docusaurus-plugin-linkify-med/src/options.ts`
- `packages/docusaurus-plugin-linkify-med/tests/options.test.ts`

## Test results

- `pnpm -r --filter @linkify-med/docusaurus-plugin run build`: Succeeded.
- `pnpm -r --filter @linkify-med/docusaurus-plugin run test`: All 18 tests in 4 files passed.
- `pnpm test`: All project tests passed.
- `pnpm site:build`: Succeeded.

## Notes

The `zod` dependency was updated from `^4.1.8` to `^3.23.0` to resolve build and test failures. The icon configuration and resolver functions (`validateOptions` and `createIconResolver`) were implemented and tested. They handle options validation, structured warnings, and icon resolution with dark-mode overrides and default fallbacks.

# Milestone 5: MDX→TSX Compiler & Emitter

## Files added

- `packages/docusaurus-plugin-linkify-med/src/codegen/notesEmitter.ts`
- `packages/docusaurus-plugin-linkify-med/tests/notesEmitter.test.ts`

## Test results

- `pnpm -r --filter @linkify-med/docusaurus-plugin run build`: Succeeded.
- `pnpm -r --filter @linkify-med/docusaurus-plugin run test`: All 22 tests in 5 files passed.
- `pnpm test`: All project tests passed.
- `pnpm site:build`: Succeeded.

## Notes

Added `@mdx-js/mdx` as a dependency. Implemented the `emitShortNoteModule` function to compile MDX strings into SSR-ready TSX modules, including a `ShortNote` React component that accepts `components` props for custom JSX tags. The emitter generates deterministic filenames. Unit tests confirm correct compilation for markdown-only and MDX with custom components, and verify the generated TSX is valid via TypeScript's `transpileModule`.

# Milestone 6: Tooltip Registry Codegen

## Files added

- `packages/docusaurus-plugin-linkify-med/src/codegen/registryEmitter.ts`
- `packages/docusaurus-plugin-linkify-med/tests/registryEmitter.test.ts`

## Test results

- `pnpm -r --filter @linkify-med/docusaurus-plugin run build`: Succeeded.
- `pnpm -r --filter @linkify-med/docusaurus-plugin run test`: All tests passed, including new registry emitter tests.
- `pnpm test`: All workspace package tests passed.
- `pnpm site:build`: Succeeded (example site unchanged).

## Notes

- `emitRegistry` generates a deterministic TSX module `registry.tsx` exporting `registry: Record<string, TooltipEntry>`.
- Only entries with a corresponding `NoteModule` get an imported `ShortNote` component; others omit the field.
- Always includes `id`, `slug`, and optional `icon` fields.
- Small fix: adjusted the unit test regex to correctly match across newlines when asserting presence of `ShortNote` inside the `amoxicillin` entry.

# Milestone 7: Synonym Matcher

## Files added

- `packages/remark-linkify-med/src/matcher.ts`
- `packages/remark-linkify-med/tests/matcher.test.ts`

## Test results

- `pnpm -r --filter remark-linkify-med run build`: Succeeded.
- `pnpm -r --filter remark-linkify-med run test`: Passed (2 files, 7 tests).
- `pnpm test`: All workspace package tests passed.
- `pnpm site:build`: Succeeded (site unchanged).

## Notes

- Unicode-aware, case-insensitive matcher using a trie for performance.
- Enforces word-boundaries (Unicode letters/digits or underscore) on both sides.
- Longest-match preference at each start index; non-overlapping, left-to-right.
- Performance smoke test included with a loose 3s threshold.
