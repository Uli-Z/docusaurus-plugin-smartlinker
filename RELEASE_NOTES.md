# Release Notes — v0.3.0

Smartlinker 0.3.0 completes the refactor milestones and streamlines packaging:

- Remark helper is consolidated into the plugin workspace under `src/remark`; legacy workspace removed. Tests migrated accordingly.
- Repository no longer commits `dist/**`; CI builds bundles and release tarballs include the dual-format outputs for the plugin and remark helper.
- CI matrix: Node 20 for full checks (typecheck, tests, plugin + example site), Node 22 for typecheck/build only pending Vitest stability.
- Watch flow avoids touching doc mtimes; a marker file is written when terms change to trigger downstream invalidation.
- Scanner performance: avoid reading file contents until frontmatter parsing, with early extension filtering.
- Accessibility improvements to tooltip/SmartLink ARIA wiring and keyboard/touch handling.
- Permalink resolution via a provider with improved fallbacks when docs metadata isn’t available.

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
