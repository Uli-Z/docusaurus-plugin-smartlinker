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

## Milestones (with DoD)
1. **Skeleton + Tests**  
   - `/packages/docusaurus-plugin-linkify-med/` + `/packages/remark-linkify-med/`  
   - `/examples/site/` minimal.  
   - DoD: Example site builds, test runner runs.

2. **Frontmatter Loader (raw)**  
   - Parse: `id, slug, synonyms[], linkify, icon, shortNote`.  
   - DoD: Unit tests (missing fields → skip; `linkify:false` → skip).

3. **Path Distance & Resolver**  
   - `distance(from, to)` + collision resolution + warn logger.  
   - DoD: Unit tests with folder matrix; deterministic tie-breaker.

4. **Icon Config**  
   - Options: `icons`, `defaultIcon`, `iconProps`, optional `darkModeIcons`.  
   - DoD: Unit tests (ID mapping, fallback).

5. **MDX→TSX Compiler for `shortNote`**  
   - MDX string → SSR-ready TSX via `@mdx-js/mdx`; `createData` → `@generated/linkify/notes/<id>.tsx`.  
   - Component scope: `src/theme/LinkifyComponents.ts`.  
   - DoD: Markdown & JSX (e.g. `<DrugTip/>`) compile; missing component → clear build error.

6. **Tooltip Registry Codegen**  
   - `@generated/linkify/registry.ts`: `tipKey → { kind: "mdx"|"html", Component|html, icon, slug }`.  
   - DoD: Only entries with non-empty `shortNote`; stable keys.

7. **Synonym Matcher**  
   - Trie/Aho-Corasick, word boundaries, all occurrences, longest-match.  
   - DoD: Unit tests (multi-word > single-word, umlauts/ß, overlaps, performance smoke test).

8. **Remark Transform**  
   - Replace text outside skip contexts with `<SmartLink to icon tipKey match>`.  
   - DoD: Snapshot tests on sample MDX; all occurrences replaced; skips correct.

9. **Theme Components**  
   - `SmartLink`, `Tooltip`, `IconResolver` (SSR-friendly).  
   - DoD: RTL tests for a11y & props; icon after text; desktop/mobile behavior.

10. **Wiring in Docusaurus**  
    - `plugins: ['docusaurus-plugin-linkify-med']`  
    - `docs/blog/pages.beforeDefaultRemarkPlugins: [require('remark-linkify-med')]`  
    - DoD: Example site with real antibiotic pages builds & renders as specified.

11. **Performance & DX**  
    - Benchmark script (large texts, many synonyms).  
    - Error handling with clear messages (missing `slug`, duplicate synonyms, unknown icon ID).  
    - DoD: Benchmarks below threshold X; unit tests for error cases.

12. **Docs & Release**  
    - `README.md`, `docs/usage.md`, examples.  
    - tsup/tsc build, types, ESM/CJS.  
    - DoD: Fresh example site installs the package → build succeeds.

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
