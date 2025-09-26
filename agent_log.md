# Log

## Summary
- Replaced SmartLink/Tooltip base styles with Infima-backed variables and state rules, dropping bespoke inheritance overrides.
- Updated tooltip runtime to push the max-width through a CSS custom property so the stylesheet can control it via Infima tokens.
- Documented the new token mapping and kept CHANGELOG notes for the alignment work.

### 2025-09-26 Session
- Restructured repository into a private root workspace (`package.json`) and a single publishable package `packages/docusaurus-plugin-smartlinker` with subpath export `./remark` pointing to `dist/remark/*`.
- Added build orchestrator (`packages/docusaurus-plugin-smartlinker/scripts/build.mjs`) to compile plugin ESM output, remark ESM+CJS builds (via new `tsconfig.cjs.json` and updated `scripts/build-cjs.js`), and copy remark artifacts into the plugin dist.
- Swapped example site / remark workspace dependencies from `file:../../` style links to the new package layout and updated smoke-test script to pack only the plugin package.
- Verified `pnpm install`, `pnpm run build`, and `pnpm run site:build`; `npm run site:build` still fails due to missing `@radix-ui/react-tooltip` after `npm install` (workspace dependency not hoisted).
- Multiple iterations toggling dependency specifiers (`workspace:*` vs. `file:`) to satisfy both pnpm development and npm consumers; latest state reverted to `file:` specifiers but npm build currently breaks because the workspace-local `node_modules` were wiped and not reinstalled.

## Verification
- pnpm build
- pnpm test
- pnpm run site:build (passes)
- npm run site:build (fails: missing workspace dependency @radix-ui/react-tooltip after npm install)
