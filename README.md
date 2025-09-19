# docusaurus-plugin-smartlinker

Smartlinker brings tooltip-powered cross-linking to Docusaurus v3. The root package bundles both the Docusaurus plugin and the accompanying remark plugin so projects can install a single dependency and get consistent SmartLink rendering across Markdown and MDX content.

## Packages

This repository publishes a single installable package:

- `docusaurus-plugin-smartlinker` – the Docusaurus plugin itself, including the SmartLink theme components, filesystem-based index provider utilities, and a remark helper exposed from `docusaurus-plugin-smartlinker/remark`.

The workspaces in `packages/` house the source code for the plugin and the remark transform. They build into `dist/` and are included in the published tarball via the root `prepare` script.

## Features

- Scan Markdown and MDX front matter (`id`, `slug`, `smartlink-terms`, optional `smartlink-icon`, optional `smartlink-short-note`).
- Compile optional `smartlink-short-note` strings from inline MDX to ready-to-render React components.
- Generate a tooltip registry with proximity-aware collision handling and icon metadata.
- Inject a shared `<SmartLink/>` component so linked terms render consistently in docs, pages, admonitions, and tables.
- Display optional icons (including emoji) and MDX tooltips with dark-mode aware styling.
- Provide a remark plugin so Markdown content processed by Docusaurus receives the same SmartLink treatment.

## Installation

The package can be consumed directly from GitHub; the `prepare` script builds the bundled workspaces so the `dist/` artifacts ship with the install:

```bash
npm install github:Uli-Z/docusaurus-plugin-smartlinker
```

### Docusaurus configuration

```ts
import remarkSmartlinker from 'docusaurus-plugin-smartlinker/remark';
import {
  createFsIndexProvider,
  type SmartlinkerPluginOptions,
} from 'docusaurus-plugin-smartlinker';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SmartlinkerIndex = createFsIndexProvider({
  roots: [join(__dirname, 'docs')],
  slugPrefix: '/docs',
});

const config = {
  presets: [
    [
      'classic',
      {
        docs: {
          remarkPlugins: [[remarkSmartlinker, { index: SmartlinkerIndex }]],
        },
        pages: {
          remarkPlugins: [[remarkSmartlinker, { index: SmartlinkerIndex }]],
        },
      },
    ],
  ],
  plugins: [
    [
      'docusaurus-plugin-smartlinker',
      {
        icons: {
          pill: 'emoji:💊',
          bug: '/img/bug.svg',
        },
        defaultIcon: 'pill',
        tooltipComponents: {
          DrugTip: '@site/src/components/DrugTip',
        },
      } satisfies SmartlinkerPluginOptions,
    ],
  ],
};
```

Annotate each Markdown or MDX document you want to index with SmartLink metadata:

```mdx
---
id: amoxicillin
slug: /antibiotics/amoxicillin
smartlink-terms:
  - Amoxi
  - Amoxicillin
smartlink-icon: pill
smartlink-short-note: |
  **Aminopenicillin.** Offers good oral bioavailability.
  <DrugTip note="Take with food" />
---
```

Smartlinker builds a registry from these front matter fields, injects `<SmartLink/>` nodes during the remark phase, and renders hover/tap tooltips at runtime.

## Verification scripts

- `npm run smoke:git-install` packs the repository, installs it into a temporary copy of the example site using `npm install <tarball>`, and runs `npm run build` to verify the Git install path succeeds end to end.
- `npm run site:build` (from the repo root) builds the included example site in `examples/site`.

## Example site

The `examples/site` workspace is a small Docusaurus project that exercises the SmartLink pipeline. It can be used for manual QA:

```bash
npm install
npm run build --workspace @examples/site
npm run serve --workspace @examples/site
```

## License

Released under the [MIT License](./LICENSE).
