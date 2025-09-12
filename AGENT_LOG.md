# Milestone 0: Skeleton + Tests

## Summary

Successfully created the pnpm workspaces monorepo with the following structure:

- `/packages/docusaurus-plugin-linkify-med`
- `/packages/remark-linkify-med`
- `/examples/site`

## Created Files

- `package.json` (root)
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `.editorconfig`
- `.gitignore`
- `AGENT_LOG.md`
- `packages/docusaurus-plugin-linkify-med/package.json`
- `packages/docusaurus-plugin-linkify-med/tsconfig.json`
- `packages/docusaurus-plugin-linkify-med/scripts/build-cjs.js`
- `packages/docusaurus-plugin-linkify-med/src/index.ts`
- `packages/docusaurus-plugin-linkify-med/src/theme/SmartLink.tsx`
- `packages/docusaurus-plugin-linkify-med/src/theme/Tooltip.tsx`
- `packages/docusaurus-plugin-linkify-med/src/theme/IconResolver.tsx`
- `packages/docusaurus-plugin-linkify-med/tests/smoke.test.ts`
- `packages/remark-linkify-med/package.json`
- `packages/remark-linkify-med/tsconfig.json`
- `packages/remark-linkify-med/scripts/build-cjs.js`
- `packages/remark-linkify-med/src/index.ts`
- `packages/remark-linkify-med/tests/smoke.test.ts`
- `examples/site/package.json`
- `examples/site/tsconfig.json`
- `examples/site/docusaurus.config.ts`
- `examples/site/sidebars.ts`
- `examples/site/src/pages/index.md`
- `examples/site/static/.gitkeep`

## Scripts and Verification

- `pnpm install`: Succeeded.
- `pnpm build`: Succeeded. Both packages (`@linkify-med/docusaurus-plugin` and `remark-linkify-med`) build successfully.
- `pnpm test`: Succeeded. Vitest smoke tests for both packages passed.
- `pnpm site:build`: **Failed.**

## Blockers

The example Docusaurus site fails to build with the following error:
`TypeError: require.resolveWeak is not a function`

This appears to be an issue with Docusaurus v3's build process in this environment, possibly related to webpack or dependency resolution.

### Attempts to fix:
- Ensured all required peer dependencies and types are installed.
- Corrected a typo in the `build-cjs.js` scripts.
- Aligned React versions using `pnpm.overrides`.
- Performed a clean install by removing `node_modules` and `pnpm-lock.yaml`.

None of these attempts resolved the issue.

## TODOs / Next Steps

- The Docusaurus build issue needs further investigation. It might be a version-specific bug or a conflict with the local environment.
- For now, we can proceed with the next milestones, as the core packages are building and testing correctly. The example site is not strictly required for the development of the plugins' core logic.

# Milestone 0.1: Docusaurus Build Fix

## Summary of Changes

- Removed `"type": "module"` from the following files:
  - `/package.json` (root)
  - `/examples/site/package.json`

## Rationale

This change was made to unblock the Docusaurus v3 build. Docusaurus expects an "ambiguous" module mode, and having `"type": "module"` at the repository or site root can interfere with its Webpack configuration for Server-Side Rendering (SSR).

## Script Verification

- `pnpm install`: Succeeded.
- `pnpm -r run build`: Succeeded.
- `pnpm -r run test`: Succeeded.
- `pnpm site:build`: **Succeeded.**

The Docusaurus example site now builds successfully.