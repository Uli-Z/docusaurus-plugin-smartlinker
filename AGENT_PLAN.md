# Linkify-Med (Docusaurus v3) — Agent Plan

> Goal: A Docusaurus plugin + Remark plugin that automatically turns antibiotic synonyms into links with tooltips (MDX from frontmatter). Rendered at build-time, SEO-friendly, with minimal coupling.

## Architecture (high-level)
- **remark-linkify-med**: Replaces text nodes during the Remark phase with `<SmartLink …>`.
- **docusaurus-plugin-linkify-med**: Builds the tooltip registry and theme components via `createData`, compiling `shortNote` (MDX in frontmatter) into SSR-ready TSX.
- **Theme**: `SmartLink`, `Tooltip`, `IconResolver`.

## Invariants
- Per-page frontmatter:  
  `id`, `slug`, `synonyms[]`, `linkify?: true`, `icon?: string`, `shortNote?: MDX string`.
- Matching: case-insensitive, Unicode-aware, word boundaries, **all occurrences**, longest-match, left-to-right, non-overlapping.
- Skip contexts: code blocks, inline code, already-linked text, image alt text, headings H1–H3.
- Collisions: **folder proximity** wins; equal distance → warning; tie-breaker: lexicographic slug.
- Desktop: Hover shows tooltip; click on text/icon navigates.  
  Mobile: Tap on **icon** shows tooltip; tap on **text** navigates.
- Icons are configured in plugin options (`id → /path.svg|png`). Default icon via `defaultIcon`. Icon is rendered **after** the link text.


## Milestones

### Milestone 0 — Skeleton & Tests ✅
- Set up pnpm monorepo:  
  - `packages/docusaurus-plugin-linkify-med`  
  - `packages/remark-linkify-med`  
  - `examples/site`
- Smoke tests for both packages.
- Fix Docusaurus build issue by removing `"type": "module"` in root + site.

---

### Milestone 1 — Frontmatter Loader ✅
- Parse frontmatter from MD/MDX with `gray-matter` + `zod`.
- Validate fields: `id`, `slug`, `synonyms[]`, `shortNote?`, `linkify?`, `icon?`.
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

### Milestone 7 — Synonym Matcher ✅
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

### Milestone 11 — Remark Plugin Integration 🚧
- Integrate `remark-linkify-med` into Docusaurus config (`docs` + `pages`).
- Use `IndexProvider` that proxies to generated registry.
- Smoke MDX page in example site proves SmartLink injection.

---

### Milestone 12 — Example Site as Full Docusaurus Docs Site 🚧
- Expand `examples/site` into a complete Docusaurus docs setup:
  - Configure `sidebars.ts` with categories (Antibiotics, Bacteria, Examples).
  - Add multiple `.mdx` doc files demonstrating SmartLink in context.
  - Ensure navigation via sidebar/Inhaltsverzeichnis works.
  - Provide one or two example pages where tooltips + icons are active.
- Goal: Allow users to click through a structured docs site and see linkify in action.
- Smoke test: build + manually verify sidebar navigation + SmartLink working.

---

### Milestone 13+ — Enhancements (planned)
- Proximity-based collision resolution (use Milestone 2).
- Styling refinements (icons, tooltip design).
- Persistence options (reset checklist, user interaction).
- Plugin configuration: glob patterns, opt-in/out sections.
- Documentation for plugin usage outside example site.

---

## Conventions
- Every milestone:
  - Cod


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
