# Release Notes — v0.1.0

Smartlinker 0.1.0 packages the end-to-end tooltip linking pipeline so projects can drop a single dependency into their Docusaurus v3 sites and gain consistent SmartLink rendering across Markdown and MDX.

## Highlights

- **Docusaurus plugin.** Builds a SmartLink registry from annotated front matter, compiles optional MDX tooltip notes at build time, and wires the theme runtime so links render with icons and accessible hover/tap tooltips out of the box.
- **Remark integration.** Bundles a remark transform that replaces matching text nodes with `<SmartLink>` elements, skipping code, existing links, and top-level headings to avoid unwanted replacements.
- **Filesystem index helpers.** Exposes `createFsIndexProvider` so consumers can drive remark from scanned Markdown/MDX files, with optional slug prefixing for docs served from a sub-route.
- **Example site.** Includes an example Docusaurus workspace demonstrating SmartLinks in practice and serving as a manual QA surface.

## Installation

Install directly from GitHub; the root `prepare` script builds the bundled workspaces so the distributable artifacts ship with the install:

```bash
npm install github:Uli-Z/docusaurus-plugin-smartlinker
```

Update `docusaurus.config.ts` to register both the plugin and remark helper. A typical configuration looks like:

```ts
import remarkSmartlinker from 'docusaurus-plugin-smartlinker/remark';
import {
  createFsIndexProvider,
  type PluginOptions,
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
      } satisfies PluginOptions,
    ],
  ],
};
```

See the package-level changelog entries for detailed implementation notes: `packages/docusaurus-plugin-smartlinker/CHANGELOG.md` and `packages/remark-linkify-med/CHANGELOG.md`.

## Release checklist

- [x] `npm run build`
- [x] `npm test`
- [x] `npm run site:build`
- [x] `npm run smoke:git-install`
- [ ] Tag the repository: `git tag v0.1.0 && git push origin v0.1.0`
- [ ] Draft the GitHub release using the highlights above and attach the package changelog links.

## Verification summary

All release sanity commands succeeded in a clean workspace.

- `npm run build`
- `npm test`
- `npm run site:build`
- `npm run smoke:git-install`
