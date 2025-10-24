# Changelog

## Unreleased
- _Nothing yet._

## 0.2.1 — Metrics instrumentation
- Published shared SmartLink processing metrics so build-time durations aggregate in the plugin and remark transformer.

## 0.2.0 — Packaging refresh
- Documented PNPM-first build policy and npm-compatible packaging specification in `agent_plan.md`.
- Streamlined CI to cover typechecking plus plugin/example builds, moving pack/smoke checks to manual workflows.
- Added a GitHub Release workflow that publishes both versioned and `-latest` tarballs on every `v*` tag.
