# docusaurus-plugin-smartlinker

Try it live: https://uli-z.github.io/docusaurus-plugin-smartlinker/docs/demo

Smartlinker is a Docusaurus v3 plugin (with an optional remark helper) that turns front matter into automatic cross-links with contextual tooltips. Define an `id`, synonyms, an optional icon, and a short MDX note in your docs; Smartlinker links matching terms across your site and shows the note on hover/tap.

## Features

- Front matter–driven auto-links: finds synonyms and replaces them with a unified `<SmartLink/>` component across docs/pages/MDX.
- MDX tooltips: `smartlink-short-note` is compiled to React content (supports your own components via a mapping).
- Icons incl. dark mode: emoji (`emoji:…`) or SVG, optional per-folder default icon.
- Deterministic disambiguation: prefers nearby matches by folder proximity; stable tie-breaker when equal.
- Context-aware linking: skips code, inline code, links/images, and H1–H3; does not link terms on their own page.
- Mobile-friendly: text click navigates; icon tap opens/closes tooltip.

## Quick start

1) Install

```bash
npm install github:Uli-Z/docusaurus-plugin-smartlinker
```

2) Register (plugin + remark) in `docusaurus.config`

```js
import remarkSmartlinker from 'docusaurus-plugin-smartlinker/remark';

export default {
  presets: [
    [
      'classic',
      {
        docs: { remarkPlugins: [remarkSmartlinker] },
        pages: { remarkPlugins: [remarkSmartlinker] },
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
        darkModeIcons: { bug: '/img/bug-dark.svg' },
        folders: [
          {
            path: 'docs',
            defaultIcon: 'pill',
            // Map your own MDX components for use inside short notes (tooltips)
            // tooltipComponents: {
            //   MyTip: '@site/src/components/MyTip',
            // },
          },
        ],
        // Optional: enable debug logs per build
        debug: {
          enabled: process.env.DOCUSAURUS_PLUGIN_DEBUG === '1',
          level: process.env.DOCUSAURUS_PLUGIN_DEBUG_LEVEL ?? 'warn',
        },
      },
    ],
  ],
};
```

CommonJS config: `const remarkSmartlinker = require('docusaurus-plugin-smartlinker/remark').default;`

3) Annotate front matter

```mdx
---
id: amoxicillin
slug: /docs/antibiotics/amoxicillin
smartlink-terms:
  - Amoxi
  - Amoxicillin
smartlink-icon: pill
smartlink-short-note: |
  **Aminopenicillin.** Offers good oral bioavailability.
  {/* Insert your React components to render inside the tooltip here */}
---
```

Smartlinker builds a registry from this front matter, injects `<SmartLink/>` during remark, and renders tooltips at runtime.

### Inline short note

Render the page’s own short note inline anywhere in its body:

```md
%%SHORT_NOTICE%%
```

This only renders on the page whose `id` matches the current document.

## Configuration (compact)

- `icons`/`darkModeIcons`: map of icon ids to paths or `emoji:…`.
- `folders[{ path, defaultIcon, tooltipComponents }]`: scan root(s), optional default icon, and mapping of custom tooltip components.
- `debug`: optional logging; can also be enabled via env: `DOCUSAURUS_PLUGIN_DEBUG=1`, level via `DOCUSAURUS_PLUGIN_DEBUG_LEVEL=trace|debug|…`.

## Styling

The plugin ships CSS (`theme/styles.css`) that now leans on Infima design tokens:

- SmartLink spacing is driven by `--ifm-spacing-horizontal` with overrides via `--lm-smartlink-gap`/`--lm-smartlink-icon-gap`.
- Text and icon anchors use Infima link variables (`--ifm-link-color`, `--ifm-link-hover-color`, `--ifm-link-decoration`) for hover/focus/visited states and can be tuned with `--lm-smartlink-link-*` variables.
- Tooltip motion inherits `--ifm-transition-fast`, `--ifm-transition-timing-default`, and `--ifm-z-index-overlay` so it tracks the site’s easing and overlay stack.
- Tooltip surfaces adopt Infima’s color, spacing, radius, and shadow tokens (`--ifm-color-emphasis-*`, `--ifm-spacing-*`, `--ifm-global-radius`, `--ifm-global-shadow-md`).

Override any of the `--lm-*` variables in your site CSS to customize appearances while staying aligned with Infima. The only bespoke defaults that remain are the entry/exit scale (0.97 → 1) and the tooltip max width (`--lm-tooltip-max-width-default: 22.5rem`) because Infima does not expose dedicated tokens for those values.

## Examples

- Live demo: https://uli-z.github.io/docusaurus-plugin-smartlinker/docs/demo
- Example site in this repo under `examples/site`.

## License

MIT — see [LICENSE](./LICENSE).
