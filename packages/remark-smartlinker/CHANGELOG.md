# Changelog

## Unreleased

- Added Vitest configuration and pnpm-driven scripts to keep tests green against the plugin source during packaging verification.

## 0.1.0 — Initial preview

First, provisional release of the remark helper used by Smartlinker.

Highlights
- Unicode‑aware matcher (longest, non‑overlapping matches; word‑boundary aware).
- Remark transform that injects `<SmartLink/>` nodes, while skipping code, inline code, existing links/images, and top‑level headings.
- Pairs out‑of‑the‑box with the Docusaurus plugin; can also be used in Docusaurus classic preset pipelines.

Notes
- Interfaces and configuration may change during 0.1.x as the plugin stabilizes.
