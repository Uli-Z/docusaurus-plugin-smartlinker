# Changelog

## Unreleased
- _Nothing yet._

## 0.3.0 — Refactor, remark consolidation, CI matrix
- Consolidated remark sources/tests into the main plugin and removed the auxiliary `packages/remark-smartlinker` workspace.
- Cleaned repository by excluding `dist/**` from version control; CI builds bundles and attaches them to releases.
- CI now runs on Node 20 (full) and Node 22 (typecheck/build only) to prep for Node 22.

## 0.2.1 — Metrics instrumentation
- Published shared SmartLink processing metrics so build-time durations aggregate in the plugin and remark transformer.

## 0.2.0 — Packaging refresh
- Documented PNPM-first build policy and npm-compatible packaging specification in `agent_plan.md`.
- Streamlined CI to cover typechecking plus plugin/example builds, moving pack/smoke checks to manual workflows.
- Added a GitHub Release workflow that publishes both versioned and `-latest` tarballs on every `v*` tag.
