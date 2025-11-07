# Smartlinker Refactor & Quality TODOs

This file consolidates concrete, actionable tasks to harden the codebase, based on the repository review. Each task lists the goal, affected files, implementation notes, acceptance criteria, and (where useful) commands for verification.

Notes & Conventions
- Node version: primarily 20.x (tests), target 22.x later (see CI tasks).
- Package manager: pnpm 9 via Corepack.
- Docusaurus v3, TypeScript 5.5+, tsup 8.
- Testing: `pnpm --filter docusaurus-plugin-smartlinker run test` (unit), `pnpm run site:build` (example), optional smoke: `pnpm run smoke:git-install`.
- Style: respect existing structure; small, focused PRs; no unrelated changes.

Milestone 1 — Decouple plugin entry (split)
- Goal: Reduce responsibilities of `packages/docusaurus-plugin-smartlinker/src/index.ts` and move concerns into dedicated modules.
- Files:
  - packages/docusaurus-plugin-smartlinker/src/index.ts
  - New: `src/plugin/paths.ts`, `src/plugin/watch.ts`, `src/plugin/state.ts`, `src/plugin/publish.ts`
- Implementation:
  - Extract utilities: `normalizeFsPath`, `formatSiteRelativePath`, `normalizeFolderId` into `paths.ts`.
  - Extract caching and diff logic (`refreshEntryCaches`, `diffEntryState`) into `state.ts` (pure functions, encapsulate caches in a class/instance owned by the plugin).
  - Extract watch/rebuild hooks (`getPathsToWatch`, potential `onFilesChange`) into `watch.ts`.
  - Extract `publishGlobalData` and `loadDocsContentFromGenerated` into `publish.ts` (see Milestone 2 for API refinement).
  - Keep index file focused on orchestration.
- Acceptance:
  - No behavioral change, tests green, example site builds successfully.
  - `index.ts` < 400 lines; helpers moved.

Milestone 2 — Make permalink resolution more robust
- Goal: Reduce reliance on `.docusaurus/**` JSON files; use a stable data source.
- Files:
  - packages/docusaurus-plugin-smartlinker/src/node/permalinkResolver.ts
  - packages/docusaurus-plugin-smartlinker/src/index.ts (orchestration only)
- Implementation:
  - Introduce `DocsLookupProvider` interface with implementation A: current JSON reader; implementation B: consume docs metadata via injected data (e.g., other plugins’ `setGlobalData`) when available.
  - Add clear warnings via `logger.child('permalink')` when no source found.
  - Document fallback strategy in README.
- Acceptance:
  - Unit tests cover lookups via `byDocId`, `bySource`, `byFrontmatterId`, `bySlug`, `byPermalink` (positive/negative).
  - If no data available: informative warning, no throw.

Milestone 3 — Stable entry signature (reduce rebuild noise)
- Goal: `computeEntrySignature` should produce content-driven stable signatures.
- Files: packages/docusaurus-plugin-smartlinker/src/index.ts
- Implementation:
  - Sort `terms` (case-insensitive) before serialization.
  - Optionally limit to relevant fields; normalize paths.
- Acceptance:
  - Terms array reordering does not mark entries as changed.
  - Tests: new case for signature stability.

Milestone 4 — Watch strategy without utimesSync
- Goal: Do not manipulate mtimes of external files.
- Files: packages/docusaurus-plugin-smartlinker/src/index.ts
- Implementation:
  - Remove `utimesSync` touching.
  - Prefer `onFilesChange` (if available) for targeted invalidation; otherwise, write a small marker file under `.docusaurus/docusaurus-plugin-smartlinker/` via `actions.createData` that changes on term updates (Docusaurus should pick this up).
- Acceptance:
  - Dev watch updates affected pages on term changes without touching MDX sources.

Milestone 5 — Faster file scanning
- Goal: Avoid loading file contents until necessary.
- Files: packages/docusaurus-plugin-smartlinker/src/node/fsScan.ts, src/frontmatter.ts
- Implementation:
  - `scanMdFiles` collects only paths (no `readFileSync`), early extension check.
  - Frontmatter parser loads file content on demand during parsing.
  - Optional: limited concurrency (e.g., p-limit) for parsing.
- Acceptance:
  - Smoke test across many files is faster; no behavior change.

Milestone 6 — Accessibility (Tooltip & SmartLink)
- Goal: Improve keyboard and screen reader support.
- Files: packages/docusaurus-plugin-smartlinker/src/theme/runtime/SmartLink.tsx, src/theme/runtime/Tooltip.tsx
- Implementation:
  - Add `aria-expanded`, `aria-controls`, stable `id`s on trigger; `role="tooltip"`, `aria-hidden` on content; no focus trap; Escape closes tooltip.
  - Preserve hover vs. tap logic; support keyboard (Enter/Space) on triggers/links.
- Acceptance:
  - Manual check: tab order, Escape closes, labels present.
  - No regression for desktop hover behavior.

Milestone 7 — Matcher: word boundaries & internationalization
- Goal: More robust boundaries without significant perf cost.
- Files: packages/remark-smartlinker/src/matcher.ts, tests/matcher.test.ts
- Implementation:
  - Extend `isWordChar` and boundary logic for apostrophes/hyphens and common punctuation; model boundaries via Unicode categories (e.g., `\p{P}`) where feasible.
  - New tests: French/Italian (e.g., l’amoxicilline), German (Umlauts/ß), compound words, sentence ends.
- Acceptance:
  - Existing tests green; new cases green; perf smoke stays <3s.

Milestone 8 — MDX compilation: better error diagnostics
- Goal: Easier debugging when short notes fail to compile.
- Files: packages/docusaurus-plugin-smartlinker/src/codegen/notesEmitter.ts
- Implementation:
  - In catch path: use a `notes`-scoped logger; include error message and a truncated snippet of the short note.
  - Optionally gate detail via `PluginOptions.debug.enabled`.
- Acceptance:
  - With an intentional MDX error, a helpful log appears; fallback to `react-markdown` remains.

Milestone 9 — Consolidate remark workspace
- Goal: Single source of truth, remove legacy workspace.
- Files:
  - packages/remark-smartlinker/** (migrate/remove)
  - packages/docusaurus-plugin-smartlinker/src/remark/** (keep)
- Implementation:
  - Move tests from `packages/remark-smartlinker/tests` into plugin workspace; fix imports.
  - Deprecate/remove `packages/remark-smartlinker` (separate PR), update README/AGENTS.
- Acceptance:
  - All tests run under the plugin workspace; no duplicate bundles; CI green.

Milestone 10 — Do not commit build artifacts
- Goal: Clean VCS, reproducible builds.
- Files: .gitignore, packages/*/dist/**
- Implementation:
  - Remove `dist/**` and generated files from git; adjust `.gitignore`.
  - CI/Release produce artifacts at build time; keep `postbuild-verify.mjs`.
- Acceptance:
  - Repo diffs free of dist churn; release tarballs complete.

Milestone 11 — Update CI (version matrix)
- Goal: Run CI across multiple supported Node.js versions.
- Files: .github/workflows/ci.yml
- Implementation:
  - Use a Node.js version matrix with typecheck, tests, build, and smoke steps.
- Acceptance:
  - Workflows green, clear separation of checks by Node version.

Milestone 12 — Expand tests
- Goal: Better coverage of critical paths.
- Files: packages/docusaurus-plugin-smartlinker/tests/**, packages/remark-smartlinker/tests/**
- Implementation:
  - Permalink resolver: positive/negative, collisions, slug vs. permalink precedence.
  - Watch: unit-like test for diff/invalidation without `utimesSync`.
  - A11y: basic render/snapshot tests (SSR hidden tooltip markup).
- Acceptance:
  - New tests pass; no flakes locally/CI.

Milestone 13 — Documentation
- Goal: Guide consumers and document migration paths.
- Files: README.md, AGENTS.md, RELEASE_NOTES.md
- Implementation:
  - README: debug levels, tooltip components, short note scope, A11y notes.
  - AGENTS: update build/release flows (no dist commits), new module layout.
- Acceptance:
  - Docs up to date; links validated.

Milestone 14 — Versioning & release
- Goal: Clean SemVer release.
- Implementation:
  - Bump version in plugin package; update CHANGELOG.
  - Run `pnpm run pack:ci` and `pnpm run smoke:git-install`.
  - Publish to npm (manual) and GitHub Release with tarball.
- Acceptance:
  - Example site builds/serves with new tarball.

Milestone 15 — Document security/trust boundaries
- Goal: Make short note MDX risks explicit.
- Implementation:
  - README “Security” section: short notes are MDX/JSX; only trusted content; no untrusted sources.
- Acceptance:
  - Section present and clear.

Recommended execution order
1) M1 (split) → 2) M3 (signature) → 3) M5 (scanner) → 4) M4 (watch) → 5) M8 (MDX logs) → 6) M7 (matcher) → 7) M6 (A11y) → 8) M2 (permalink API) → 9) M12 (tests) → 10) M10 (no dist) → 11) M11 (CI) → 12) M13–15 (docs/release/security).

Useful commands
- Install: `pnpm install`
- Build: `pnpm run build`
- Tests: `pnpm --filter docusaurus-plugin-smartlinker run test`
- Example dev: `pnpm run site:dev`
- Example build: `pnpm run site:build`
- Pack: `pnpm run pack:ci`
- Smoke: `pnpm run smoke:git-install`
