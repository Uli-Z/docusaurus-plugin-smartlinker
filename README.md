# docusaurus-plugin-auto-link-abx

*Working draft for the Smartlinker auto-linking tooling.*

This monorepo hosts the Docusaurus plugin and remark helper used by the example site in `examples/site`. The intent is to turn guideline-style documentation into a modestly connected set of articles with hover notes.

## Status

- Early experiment. Interfaces and package names may still change.
- Lightly smoke-tested against the bundled example site only.
- Documentation and automated tests are incomplete.

## Current capabilities

- Build an index from Markdown/MDX front matter (`id`, `slug`, `auto-link` terms) and resolve matching text to the referenced document.
- Inject a shared `<SmartLink>` component through the MDX provider so matches render consistently across pages, admonitions, and tables.
- Show optional icons per entry, including a default icon and dark-mode overrides.
- Render hover notes as MDX, allowing Markdown and registered React components inside the tooltip.
- Ship a remark plugin so Markdown strings processed by Docusaurus receive the same auto-linking as MDX content.

## Getting started

### 1. Install the packages

```bash
pnpm add docusaurus-plugin-smartlinker remark-linkify-med
```

Use your preferred package manager; pnpm is shown because the example site relies on it.

### 2. Configure Docusaurus

```ts
import remarkLinkifyMed from 'remark-linkify-med';
import { createFsIndexProvider } from 'docusaurus-plugin-smartlinker';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const linkifyIndex = createFsIndexProvider({
  roots: [join(__dirname, 'docs')],
  slugPrefix: '/docs',
});

const config = {
  presets: [
    [
      'classic',
      {
        docs: {
          remarkPlugins: [[remarkLinkifyMed, { index: linkifyIndex }]],
        },
        pages: {
          remarkPlugins: [[remarkLinkifyMed, { index: linkifyIndex }]],
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
      },
    ],
  ],
};
```

The plugin loads its CSS bundle through `getClientModules()`, so no manual stylesheet imports are required.

### 3. Annotate your documents

Add front matter to each Markdown/MDX file you want to index:

```mdx
---
id: amoxicillin
slug: /antibiotics/amoxicillin
auto-link:
  - Amoxi
  - Amoxicillin
auto-link-icon: pill
auto-link-short-note: |
  **Aminopenicillin.** Offers good oral bioavailability.
  <DrugTip note="Take with food" />
---
```

Key fields:

| Field | Purpose |
| --- | --- |
| `auto-link` | Array of terms and abbreviations that should resolve to the document. |
| `auto-link-icon` | Optional icon id defined in the plugin options. |
| `auto-link-short-note` | Optional MDX snippet displayed inside the tooltip. |
| `linkify` | Set to `false` on a document to skip indexing it. |

Tooltip content is rendered as MDX, so inline Markdown and any components registered under `tooltipComponents` are allowed.

## Example site

The `examples/site` directory contains a small Docusaurus project that exercises the current feature set. It also serves as the primary regression test, so expect rough edges until we broaden coverage.
