# Changelog

## Unreleased

- publish the theme exclusively from `dist/theme` with explicit `.js` specifiers and verify artifacts via `scripts/postbuild-verify.mjs`
- wire the plugin’s contexts through `@theme/Root` and register `<SmartLink>` globally via `MDXProvider`
- expose tooltip markup and icon data at SSR by adding `data-tipkey` attributes and a hidden `lm-tooltip-content` fallback
- load `styles.css` through `getClientModules()` so consumers do not need manual stylesheet imports
- render SmartLink text and icon as separate anchors so emphasis styling can target each element independently
