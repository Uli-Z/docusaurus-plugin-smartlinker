# Release Notes — v0.1.0 (Initial preview)

# Release Notes — v0.1.0 (Initial preview)

# Maintenance — Post v0.1.0 cleanup

- Remove legacy linkify-med artifacts and stale lockfile entries.
- Drop npm lockfile in favor of pnpm.
- Keep package dist directories tracked.

This is the first, provisional release of Smartlinker for Docusaurus v3. It ships the core experience: annotate docs via front matter, and Smartlinker turns matching terms across your site into links with contextual MDX tooltips and icons.

Highlights
- Front matter–driven auto‑linking across Markdown/MDX with a single `<SmartLink/>` component.
- MDX short notes compiled at build time and rendered in accessible hover/tap tooltips (supports emoji/SVG icons; dark‑mode aware).
- Context‑aware transforms with sensible defaults (skip code/links/images and H1–H3; no self‑links on the target page; deterministic disambiguation).
- Seamless Docusaurus integration: SSR‑friendly theme runtime, injected CSS, global data, and docs permalink resolution.
- Example site included for quick exploration and manual QA.

Getting started
- See the README for a minimal setup and a live demo link.

Stability
- Expect small API and option refinements during 0.1.x while we incorporate feedback.

Verification
- Built and tested locally, example site builds cleanly, and a smoke “git‑install” run succeeds.
