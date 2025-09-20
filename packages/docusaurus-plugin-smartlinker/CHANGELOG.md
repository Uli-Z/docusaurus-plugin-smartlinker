# Changelog

## Unreleased

- Allow React 19 as a peer dependency so installing the plugin in Docusaurus projects using React 19 no longer fails.

## 0.1.0

- Publish the theme runtime from `dist/theme` with explicit `.js` specifiers and validate artifacts via `scripts/postbuild-verify.mjs`.
- Wire the plugin’s providers through `@theme/Root` and register `<SmartLink>` globally via `MDXProvider` so tooltips are available during SSR.
- Expose tooltip markup and icon data at SSR by adding `data-tipkey` attributes and a hidden `.lm-tooltip-content` fallback.
- Load `styles.css` through `getClientModules()` so consumers do not need manual stylesheet imports.
- Render SmartLink text and icon as separate anchors so emphasis styling can target each element independently.
- Provide filesystem index helpers and remark integration docs via the bundled root package.
