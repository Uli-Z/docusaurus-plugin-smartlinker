# docusaurus-plugin-auto-link-abx

This monorepo provides the Linkify-Med Docusaurus plugin and an accompanying remark plugin used by the example site.

## Publishing from `dist`

The Docusaurus theme now ships from the compiled `dist/theme` directory.  All runtime imports have explicit `.js` extensions so no postbuild rewrites are required.  Consumers point to the published package and Docusaurus resolves the compiled theme automatically.

## SmartLink availability

`@linkify-med/docusaurus-plugin` wires its providers in `@theme/Root`.  The plugin injects `<SmartLink>` into the global `MDXProvider`, so MDX content can use `<SmartLink>` without local imports or swizzle overrides.

## CSS loading

The plugin exposes its CSS via `getClientModules()`.  When the plugin is enabled Docusaurus automatically loads `dist/theme/styles.css`, no manual stylesheet import is required.

## Styling

The runtime styles expose CSS custom properties that inherit from Docusaurus' Infima tokens, so they automatically adapt to the active theme.  Override any variable in your site's stylesheet to tweak spacing or tooltip appearance without swizzling components.

### SmartLink variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `--lm-smartlink-gap` | ``calc(var(--ifm-spacing-horizontal, 1.5rem) / 6)`` | Gap between the link text and the trailing icon. |
| `--lm-smartlink-icon-gap` | ``calc(var(--ifm-spacing-horizontal, 1.5rem) / 10)`` | Left margin applied to the icon wrapper to create breathing room. |

### Tooltip variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `--lm-tooltip-transition-duration` | ``var(--ifm-transition-fast, 150ms)`` | Duration for the fade/slide transition. |
| `--lm-tooltip-z-index` | ``var(--ifm-z-index-overlay, 400)`` | Stacking context used for the tooltip portal. |
| `--lm-tooltip-offset-rest` | ``calc(var(--ifm-spacing-vertical, 1rem) / 4)`` | Downward translation applied while the tooltip is hidden. |
| `--lm-tooltip-offset-active` | ``calc(var(--ifm-spacing-vertical, 1rem) * -0.1)`` | Upward translation applied when the tooltip is visible. |
| `--lm-tooltip-bg` | ``var(--ifm-tooltip-background-color, var(--ifm-color-emphasis-800))`` | Tooltip background color. |
| `--lm-tooltip-color` | ``var(--ifm-tooltip-color, var(--ifm-color-emphasis-0))`` | Foreground/text color. |
| `--lm-tooltip-padding` | ``calc(var(--ifm-spacing-vertical, 1rem) / 2) calc(var(--ifm-spacing-horizontal, 1.5rem) / 2)`` | Inner padding around the short note content. |
| `--lm-tooltip-radius` | ``var(--ifm-global-radius, 0.4rem)`` | Corner radius for the tooltip surface. |
| `--lm-tooltip-shadow` | ``var(--ifm-global-shadow-md)`` | Drop shadow that frames the tooltip. |
| `--lm-tooltip-font-size` | ``var(--ifm-font-size-sm, 0.875rem)`` | Font size for tooltip content. |
| `--lm-tooltip-arrow-color` | ``var(--lm-tooltip-bg)`` | Fill color for the Radix arrow element. |

For example, a site can round the surface and brighten the tooltip background by adding the following snippet to `src/css/custom.css`:

```css
:root {
  --lm-tooltip-bg: var(--ifm-color-primary);
  --lm-tooltip-radius: 0.75rem;
  --lm-tooltip-padding: 0.75rem 1rem;
}
```

## Swizzle notes

Consumers can still swizzle `@theme/SmartLink` or `@theme/Tooltip` for custom behaviour.  The plugin’s context providers live in `@theme/Root`; swizzled components should read from `IconConfigContext` and `LinkifyRegistryContext` to stay aligned with the generated registry.
