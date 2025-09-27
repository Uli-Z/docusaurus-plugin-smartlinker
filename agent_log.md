# Log

## Summary
- Replaced npm-based workspace scripts with pnpm equivalents, including new `typecheck`, `ci`, and `pack:ci` flows.
- Updated integration tests to package the plugin tarball, install it into a copied example site via pnpm, and assert dist contents and site build success with reduced progress noise.
- Added a Vitest alias so remark tests resolve the built plugin dist, and documented the pnpm-first workflow (README, release notes, changelog).
- Adjusted the example site build assertion to derive expected SmartLink hrefs from the normalized `baseUrl`, matching the Docusaurus config logic so CI and local environments share expectations.

## Verification
- pnpm typecheck
- CI=1 pnpm test
- pnpm run pack:ci
- pnpm build
- CI=1 pnpm --filter @internal/docusaurus-plugin-smartlinker run test -- --runInBand tests/example.build.e2e.test.ts --reporter=basic
