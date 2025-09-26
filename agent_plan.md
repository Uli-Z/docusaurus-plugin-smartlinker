# Plan
1. Review existing smoke scripts, build tooling, and failure context from logs to understand npm smoke instability.
2. Implement dedicated npm smoke script that uses the bundled npm CLI reliably, ensuring cleanup of temporary sites and tarballs.
3. Add a pnpm smoke script leveraging corepack, mirroring npm coverage; adjust shared helpers to minimise duplication.
4. Introduce a pack verification script that inspects the generated tarball for required exports/assets and forbidden workspace protocols.
5. Wire new verification + smoke scripts into package and workspace npm scripts, and expand CI to a Node/npm matrix covering installs, builds, unit tests, and smoke flows.
6. Update documentation, changelog, and agent log with the new workflows, then rerun the full test suite to validate changes.
