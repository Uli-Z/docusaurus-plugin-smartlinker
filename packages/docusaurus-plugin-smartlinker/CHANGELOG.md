# Changelog

## Unreleased

- Align SmartLink tooltip/link styling with Infima tokens and expose `--lm-*` overrides while documenting the remaining bespoke defaults.
- Added automated packaging verification that packs the plugin, inspects exported entrypoints, and guards against stray `workspace:` links.
- Introduced npm and pnpm smoke scripts that install the packed tarball into a fresh Docusaurus example and confirm both import/require usage before building.
- Folded the remark transformer into the published package build so npm installs no longer encounter `workspace:*` protocols while keeping the `./remark` export intact.

## 0.1.0 — Initial preview

This is the first, provisional release of docusaurus-plugin-smartlinker. It delivers the end‑to‑end SmartLink experience for Docusaurus v3 sites: front matter → auto‑links with MDX tooltips at runtime.

Highlights
- Front matter–driven auto‑linking across docs/pages/MDX, using a unified `<SmartLink/>` theme component.
- MDX short notes compiled at build time and rendered in accessible hover/tap tooltips (emoji/SVG icons supported, incl. dark‑mode overrides).
- Sensible defaults and guardrails: skips code/links/images and H1–H3; avoids self‑linking on the target page; deterministic disambiguation.
- Global data + permalink resolution integrated with `@docusaurus/plugin-content-docs` so links point to the final site routes.
- Built‑in CSS and a minimal runtime injected via `getClientModules()` and `@theme/Root` for SSR compatibility.
- Quality‑of‑life: debug logger (level + env overrides), React 19 peer support, and baseUrl‑aware hrefs for subdirectory deployments.

Notes
- The API and options may evolve based on feedback; treat 0.1.x as a preview line.
