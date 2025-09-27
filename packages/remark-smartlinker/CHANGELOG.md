# Changelog

## 0.1.0 — Initial preview

First, provisional release of the remark helper used by Smartlinker.

Highlights
- Unicode‑aware matcher (longest, non‑overlapping matches; word‑boundary aware).
- Remark transform that injects `<SmartLink/>` nodes, while skipping code, inline code, existing links/images, and top‑level headings.
- Pairs out‑of‑the‑box with the Docusaurus plugin; can also be used in Docusaurus classic preset pipelines.

Unreleased

- Vitest now resolves `docusaurus-plugin-smartlinker` to the built dist, keeping remark tests green after pnpm-based build steps.

Notes
- Interfaces and configuration may change during 0.1.x as the plugin stabilizes.
