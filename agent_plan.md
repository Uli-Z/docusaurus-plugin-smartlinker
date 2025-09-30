# agent_plan.md — Smartlinker Packaging (B1 “Single-Bundle” via GitHub Release Tarball)

## Goal
A **single installable package** (`docusaurus-plugin-smartlinker`) that:
- exposes the **Remark transformer as a subpath** (`docusaurus-plugin-smartlinker/remark`),
- bundles **all internal code** (including Remark), but keeps **peers external**,
- works with **npm** or **pnpm** without any build step during install,
- can be installed from a **GitHub Release tarball**, and locally linked in the example site.

## Acceptance Criteria
1. Consumers can import the Remark plugin like this:
   ```ts
   import remarkSmartlinker from 'docusaurus-plugin-smartlinker/remark';
````

and use it in `remarkPlugins` (global or per preset/plugin).
2. Consumers install the package with **npm** or **pnpm**:

* `npm i https://github.com/<owner>/<repo>/releases/download/vX.Y.Z/docusaurus-plugin-smartlinker-X.Y.Z.tgz`
* `pnpm add https://github.com/<owner>/<repo>/releases/download/vX.Y.Z/docusaurus-plugin-smartlinker-X.Y.Z.tgz`

3. Both **CJS** and **ESM** outputs exist, including **.d.ts**:

   * `dist/index.{cjs,mjs,d.ts}` (plugin)
   * `dist/remark/index.{cjs,mjs,d.ts}` (remark subpath)
4. **No** `prepare` script in the publishable package. Build only happens on `pack/publish` via `prepack`.
5. Tarball includes only `dist`, `README.md`, and `LICENSE`. **No** `workspace:*` or `link:` leftovers.

---

## Assumptions (repo layout)

```
.
├─ packages/
│  ├─ docusaurus-plugin-smartlinker/    # publishable package
│  │  ├─ src/
│  │  │  ├─ index.ts                    # plugin entry
│  │  │  ├─ remark/                     # (new) wrapper entry for subpath
│  │  │  │  └─ index.ts
│  │  │  └─ theme/...                   # runtime/styles
│  │  ├─ package.json
│  │  ├─ tsup.config.ts
│  │  └─ scripts/... (optional)
│  └─ remark-smartlinker/               # source only, NOT published
│     ├─ src/index.ts
│     └─ package.json
└─ examples/site/                       # example site
```

---

## Ground Rules

* **Remark** remains **separately usable** via subpath export (`./remark`) so that it can be configured in specific areas.
* The **Remark source code** is bundled into the plugin package. The `remark-smartlinker` workspace package itself is never published.
* **Peers stay external**: `@docusaurus/core`, `react`, `react-dom`.
* **No** `workspace:*` in publishable manifests.
* **No** `prepare`. Only `prepack` runs the build.

---

## Implementation Steps

### 1) `packages/remark-smartlinker/package.json`

```json
{
  "name": "remark-smartlinker",
  "private": true,
  "type": "module"
}
```

### 2) `packages/docusaurus-plugin-smartlinker/tsup.config.ts`

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'remark/index': 'src/remark/index.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  bundle: true,
  external: [
    '@docusaurus/core',
    '@docusaurus/types',
    'react',
    'react-dom'
  ],
  treeshake: true,
  minify: false
});
```

### 3) `packages/docusaurus-plugin-smartlinker/src/remark/index.ts`

```ts
import * as src from '../../remark-smartlinker/src/index';

const attacher =
  (src as any).default ??
  (src as any).remarkSmartlinker ??
  (src as any);

export default attacher;
export * from '../../remark-smartlinker/src/index';
```

### 4) `packages/docusaurus-plugin-smartlinker/package.json`

```json
{
  "name": "docusaurus-plugin-smartlinker",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.cjs",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./remark": {
      "import": "./dist/remark/index.mjs",
      "require": "./dist/remark/index.cjs",
      "types": "./dist/remark/index.d.ts"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "clean": "rimraf dist",
    "build": "tsup",
    "prepack": "pnpm clean && pnpm build"
  },
  "peerDependencies": {
    "@docusaurus/core": "^3",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "unified": "^11.0.0",
    "@types/unist": "^3.0.0",
    "@types/mdast": "^4.0.0",
    "@types/vfile": "^5.0.0",
    "rimraf": "^5.0.0"
  },
  "engines": {
    "node": ">=18 <25"
  }
}
```

### 5) Example site (dev mode)

`examples/site/package.json`:

```json
{
  "dependencies": {
    "docusaurus-plugin-smartlinker": "link:../../packages/docusaurus-plugin-smartlinker"
  }
}
```

### 6) Consumer smoke test (like an external project)

```bash
pnpm -C packages/docusaurus-plugin-smartlinker clean
pnpm -C packages/docusaurus-plugin-smartlinker build
pnpm -C packages/docusaurus-plugin-smartlinker pack

pnpm -C examples/site remove docusaurus-plugin-smartlinker || true
pnpm -C examples/site add file:../../packages/docusaurus-plugin-smartlinker/docusaurus-plugin-smartlinker-0.1.0.tgz

pnpm -C examples/site run build
```

### 7) Consumer config (unchanged)

```ts
import type { Config } from '@docusaurus/types';
import remarkSmartlinker from 'docusaurus-plugin-smartlinker/remark';

const config: Config = {
  presets: [
    [
      'classic',
      {
        docs:  { remarkPlugins: [remarkSmartlinker] },
        pages: { remarkPlugins: [remarkSmartlinker] },
        blog: false
      }
    ]
  ],
  plugins: [
    ['docusaurus-plugin-smartlinker', { /* options */ }]
  ]
};
export default config;
```

### 8) Self-check

```bash
node -e "import('file://$PWD/packages/docusaurus-plugin-smartlinker/dist/remark/index.mjs').then(m=>console.log(typeof m.default))"
# expect "function"

node -e "console.log(typeof require('./packages/docusaurus-plugin-smartlinker/dist/remark/index.cjs').default)"
# expect "function"
```

### 9) Release tarball

```bash
pnpm -C packages/docusaurus-plugin-smartlinker version patch
pnpm -C packages/docusaurus-plugin-smartlinker clean && pnpm -C packages/docusaurus-plugin-smartlinker build && pnpm -C packages/docusaurus-plugin-smartlinker pack
```

Attach the generated `.tgz` to a GitHub Release.

Install snippet for README:

```bash
npm i https://github.com/<owner>/<repo>/releases/download/vX.Y.Z/docusaurus-plugin-smartlinker-X.Y.Z.tgz
```

---

## Troubleshooting

* Missing typings (`unified`, `mdast`, `unist`, `vfile`) → add to devDependencies.
* `workspace:*` in tarball → ensure only plugin package is packed, no workspace references in its `package.json`.
* Styles missing → import CSS in code or copy in `postbuild`.
* Install triggers build → remove `prepare`, use `prepack`.
* Node 22 Vitest crash → run tests under Node 20.

---

## CI (optional)

* Matrix: Node 18/20/22 × npm/pnpm.
* Steps:

  1. Install deps
  2. Build plugin
  3. Pack tarball
  4. Smoke test: install tarball into example site and run `docusaurus build`.

---

## Definition of Done

* Tarball includes `dist/index.*` and `dist/remark/index.*` with typings.
* Example site builds against tarball without local sources.
* README shows working `npm i <release-url>` snippet.
* No `workspace:*`, no `prepare`, peers correct, imports stable.


