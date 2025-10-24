# Release Notes — v0.2.1

Smartlinker 0.2.1 introduces shared metrics instrumentation:

- New metrics store aggregates SmartLink term processing durations for reuse across modules.
- Plugin initialization resets timing data and `postBuild` now emits aggregated timing (info + debug scope).
- Remark transformer visit pass is instrumented to report elapsed time into the common store.

# Release Notes — v0.2.0

Smartlinker 0.2.0 focuses on packaging and automation:

- Dual-format bundles (`index.cjs`/`index.mjs` plus declarations) for both the plugin entry and the `./remark` subpath.
- Workspace `pack:ci` script + manual smoke workflow; default CI now runs typechecking, plugin tests/builds, and the example-site build.
- GitHub Actions release workflow publishes versioned tarballs and a `docusaurus-plugin-smartlinker-latest.tgz` alias for each tag.
- README installation instructions now reference the `latest` tarball download.

The 0.1.x preview highlights remain available below for historical context.

# Release Notes — v0.1.0 (Initial preview)

This is the first, provisional release of Smartlinker for Docusaurus v3. It ships the core experience: annotate docs via front matter, and Smartlinker turns matching terms across your site into links with contextual MDX tooltips and icons.

Highlights
- Front matter–driven auto-linking across Markdown/MDX with a single `<SmartLink/>` component.
- MDX short notes compiled at build time and rendered in accessible hover/tap tooltips (supports emoji/SVG icons; dark-mode aware).
- Context-aware transforms with sensible defaults (skip code/links/images and H1–H3; no self-links on the target page; deterministic disambiguation).
- Seamless Docusaurus integration: SSR-friendly theme runtime, injected CSS, global data, and docs permalink resolution.
- Example site included for quick exploration and manual QA.

Stability
- Expect small API and option refinements during 0.1.x while we incorporate feedback.
