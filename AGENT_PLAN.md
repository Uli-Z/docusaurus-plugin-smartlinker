# Smartlinker (Docusaurus v3) — Agent Plan

> Goal: A Docusaurus plugin + Remark plugin that automatically turns explicitly-listed smartlink terms into links with tooltips (MDX from frontmatter). Rendered at build-time, SEO-friendly, with minimal coupling.

## Architecture (high-level)
- **Root package (`docusaurus-plugin-smartlinker`)**: Publishes the plugin + remark workspaces behind a single install (`.`, `./remark`, `./theme`). The root `prepare` script builds both workspaces so Git installs have ready-to-use `dist/` artifacts.
- **Plugin workspace (`packages/docusaurus-plugin-smartlinker`)**: Builds the tooltip registry and theme components via `createData`, compiling `shortNote` (MDX in frontmatter) into SSR-ready TSX.
- **Remark workspace (`packages/remark-linkify-med`, exposed via `docusaurus-plugin-smartlinker/remark`)**: Replaces text nodes during the Remark phase with `<SmartLink …>`.
- **Theme**: `SmartLink`, `Tooltip`, `IconResolver`.

## Invariants
- Per-page frontmatter:
  `id`, `slug`, `smartlink-terms[]`, `linkify?: true`, `smartlink-icon?: string`, `smartlink-short-note?: MDX string`.
- Matching: case-insensitive, Unicode-aware, word boundaries, **all occurrences**, longest-match, left-to-right, non-overlapping.
- Skip contexts: code blocks, inline code, already-linked text, image alt text, headings H1–H3.
- Collisions: **folder proximity** wins; equal distance → warning; tie-breaker: lexicographic slug.
- Desktop: Hover shows tooltip; click on text/icon navigates.  
  Mobile: Tap on **icon** shows tooltip; tap on **text** navigates.
- Icons are configured in plugin options (`id → /path.svg|png`). Default icon via `defaultIcon`. Icon is rendered **after** the link text.


## Milestones

### Milestone 0 — Skeleton & Tests ✅
- Set up pnpm monorepo:  
  - `packages/docusaurus-plugin-smartlinker`  
  - `packages/remark-linkify-med`  
  - `examples/site`
- Smoke tests for both packages.
- Fix Docusaurus build issue by removing `"type": "module"` in root + site.

---

### Milestone 1 — Frontmatter Loader ✅
- Parse frontmatter from MD/MDX with `gray-matter` + `zod`.
- Validate fields: `id`, `slug`, `smartlink-terms[]`, `smartlink-short-note?`, `linkify?`, `smartlink-icon?`.
- Unit tests with fixtures.

---

### Milestone 2 — Path Distance & Collision Resolver ✅
- Pure functions to measure path proximity between source files.
- Collision resolution: choose nearest by folder; tie-break by deterministic rules.
- Unit tests for folder structures + tie-breaking.

---

### Milestone 4 — Icon Configuration & Resolver ✅
- Plugin options schema (`icons`, `darkModeIcons`, `defaultIcon`, `iconProps`).
- Validator with structured warnings.
- Pure resolver API: `resolveIconId`, `resolveIconSrc`.
- Unit tests for validation + dark-mode overrides.

---

### Milestone 5 — MDX→TSX ShortNote Compiler ✅
- Compile `shortNote` (MDX string) into TSX modules exporting `ShortNote`.
- Deterministic filenames under `notes/<id>.tsx`.
- TypeScript transpilation test ensures output compiles.
- Unit tests: markdown-only, JSX with custom tags, empty notes → null.

---

### Milestone 6 — Tooltip Registry Codegen ✅
- Emit `registry.tsx` mapping `id → { slug, icon?, ShortNote? }`.
- Import note modules automatically.
- Deterministic order by `id`.
- Unit tests for with/without shortNote, tie-breaking, deterministic sort.

---

### Milestone 7 — Auto-link Matcher ✅
- Trie-based matcher, Unicode-aware, case-insensitive.
- Word boundaries enforced (`\p{L}\p{N}_`).
- Longest non-overlapping matches, left-to-right.
- Unit + performance tests.

---

### Milestone 8 — Remark Transform ✅
- Remark plugin replaces text matches with `<SmartLink>` MDX JSX elements.
- Skip contexts: code blocks, inline code, links, images, H1–H3, MDX JSX.
- Deterministic tie-breaking (temporary: smallest `id`).
- E2E tests with remark-parse/mdx/stringify.

---

### Milestone 9 — Theme Components (Radix Tooltip) ✅
- Contexts: `LinkifyRegistryProvider`, `IconConfigProvider`.
- Components:
  - `Tooltip` (Radix wrapper).
  - `IconResolver` (resolves light/dark icons).
  - `SmartLink`: hover tooltips (desktop), icon-tap toggle (mobile), icon after text.
- RTL tests: hover, mobile, dark mode, no ShortNote fallback.

---

### Milestone 10 — Docusaurus Wiring ✅
- Plugin lifecycles:
  - `loadContent`: scan MD/MDX files, parse, compile notes, prepare registry.
  - `contentLoaded`: emit generated note modules + registry via `createData`.
  - `setGlobalData`: provide validated icon options.
- Theme `Root.tsx`: wraps site in providers with registry + icon resolver.
- Example site enabled with plugin.
- Smoke test for pipeline.

---

### Milestone 11 — Remark Plugin Integration ✅
- Integrate `remark-linkify-med` into Docusaurus config (`docs` + `pages`).
- Use FS-based IndexProvider that scans docs/page frontmatter (no generated registry dependency).
- Smoke MDX page in example site proves SmartLink injection end-to-end.

---

### Milestone 12 — Example Site as Full Docusaurus Docs Site 🚧
- **Current status**: Sidebar is still autogenerated with three docs (demo, antibiotics/amoxicillin, bacteria/cdiff). Need curated categories and richer content to showcase SmartLinks.
- **Next steps**:
  - [ ] Replace the autogenerated sidebar with explicit categories (Antibiotics, Bacteria, Examples) and ordering.
  - [ ] Flesh out additional docs/pages so each category has multiple SmartLink targets and cross-links.
  - [ ] Add a manual verification checklist (tooltip + icon sanity checks) to run after `npm run site:build`.

---

### Milestone 13 — Git Install & Package Hardening ✅
- **Current status**: Root `docusaurus-plugin-smartlinker` package now bundles the plugin and remark helper, exposes the `remark` export, updates the README/install snippets, and adds a root `prepare` script so `npm install github:Uli-Z/docusaurus-plugin-smartlinker` builds the internal workspaces.
- **Done**:
  - [x] Combine the plugin and remark helper under the root package with explicit `files` exports.
  - [x] Update the example site and documentation to import via public entry points (`docusaurus-plugin-smartlinker`, `./remark`).
  - [x] Document Git installs in the README and ensure the root `prepare` script builds both workspaces when installed from Git.
- **Todo**:
  - [x] Remove `examples/site/build` from git and ignore it (`examples/site/.gitignore`).
  - [x] Add a `LICENSE` and fill out `description`, `repository`, `bugs`, `homepage`, `author`, and `license` metadata (root + internal package.json files). Bump versions to a public starting point (e.g., `0.1.0`).
  - [x] Review package-level READMEs/CHANGELOGs so release notes match the packaged entry points.
  - [x] Decide whether to keep `AGENT_LOG.md` / `AGENT_PLAN.md` in the public repository or move them elsewhere (keeping them checked in for now).
  - [x] Automate a smoke test that installs from the Git URL and performs a minimal Docusaurus build (script or CI).

---

### Milestone 14 — GitHub Pages Deployment 🚧
- **Current status**: `docusaurus.config.ts` now derives `url`/`baseUrl` from the repo environment and the `deploy-example-site` workflow builds + deploys the site with npm.
- **Todo**:
  - [ ] Add a root-level `site:deploy` (or similar) script that mirrors the GitHub Pages workflow locally.
  - [ ] Document the deployment process in the README (required env vars, workflow invocation, branch settings).
  - [ ] Optional: configure a `CNAME` if a custom domain is chosen.

---

### Milestone 15 — Quality Assurance & Release Automation 🚧
- **Todo**:
  - [ ] Introduce a CI workflow that runs `npm test`, `npm run build`, and `npm run site:build`.
  - [ ] Add automated release checks (`npm pack`, dependency audits, linting) to catch regressions before tagging.
  - [ ] Decide on additional safety checks (ESLint, stricter TS config) before shipping a public release.

---

### Milestone 16+ — Enhancements (backlog)
- Proximity-based collision resolution (use Milestone 2).
- Styling refinements (icons, tooltip design).
- Persistence options (reset checklist, user interaction).
- Plugin configuration: glob patterns, opt-in/out sections.
- Documentation for plugin usage outside example site.

---

## Conventions
- Every milestone:
  - Code + tests + docs updates should land together when possible.


## Agent Checklist (for each run)
- [ ] **Load context**: This file + `/packages/*` + `/examples/site`.
- [ ] **Assess status**: Which milestones are green/red?
- [ ] **Pick next task** (smallest increment).
- [ ] **Propose/patch changes** (small commits, clear messages).
- [ ] **Write/update tests**.
- [ ] **Build example site**; check logs.
- [ ] **Append short progress report** to `AGENT_LOG.md`.

## Project Instructions for Codex (short)
- **Strictly follow this plan.**
- Work task-by-task with tests.
- Prefer small, traceable commits.
- Report deviations/blockers in `AGENT_LOG.md` (bullet points).
