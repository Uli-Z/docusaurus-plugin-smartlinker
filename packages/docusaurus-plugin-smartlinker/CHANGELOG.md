# Changelog

## Unreleased

- _Nothing yet._

## 0.2.0-alpha — Dual-format packaging & tooling

- Aligned SmartLink tooltip/link styling with Infima tokens and exposed `--lm-*` overrides while documenting bespoke defaults.
- Switched workspace scripts and integration tests to pnpm, introduced tarball smoke coverage, and aliased the remark helper to the plugin dist.
- Bundled both CJS and ESM outputs (plus declarations) for the plugin and `./remark` subpath via `tsup`, added a workspace `pack:ci` script, and ensured release tarballs include dual-format dist assets.
- Simplified CI to typecheck/test/build the plugin and example site while deferring heavy smoke tests to manual workflows.

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
