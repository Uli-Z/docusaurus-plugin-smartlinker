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

### Milestone A — Core Smartlinker pipeline ✅
- Monorepo structure in place with the plugin, remark helper, and example site workspaces.
- Frontmatter parsing, proximity-aware collision handling, MDX short-note compilation, registry codegen, and icon resolution are all implemented and covered by unit tests.
- Remark transformer, Docusaurus theme components, and plugin wiring are integrated end to end; the example site builds with SmartLinks injected throughout.
- Root package bundles both workspaces, exposes public entry points, and includes smoke tests for Git-based installs.
- GitHub Pages deployment workflow for the example site lives in the repo (`.github/workflows/deploy-example-site.yml`).

### Milestone B — Publishable 0.1.0 ✅
- [x] Run the release sanity suite in a clean clone (`npm run build`, `npm test`, `npm run site:build`, `npm run smoke:git-install`) and confirm `dist/` artifacts are up to date.
- [x] Double-check README usage docs and exported API names against the built outputs; adjust wording or examples if anything drifted.
- [x] Draft final release notes and prep the `v0.1.0` GitHub release (tag + changelog) — no npm publish.

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
