# docusaurus-plugin-auto-link-abx

This monorepo provides the Linkify-Med Docusaurus plugin and an accompanying remark plugin used by the example site.

## Publishing from `dist`

The Docusaurus theme now ships from the compiled `dist/theme` directory.  All runtime imports have explicit `.js` extensions so no postbuild rewrites are required.  Consumers point to the published package and Docusaurus resolves the compiled theme automatically.

## SmartLink availability

`@linkify-med/docusaurus-plugin` wires its providers in `@theme/Root`.  The plugin injects `<SmartLink>` into the global `MDXProvider`, so MDX content can use `<SmartLink>` without local imports or swizzle overrides.

## CSS loading

The plugin exposes its CSS via `getClientModules()`.  When the plugin is enabled Docusaurus automatically loads `dist/theme/styles.css`, no manual stylesheet import is required.

## Swizzle notes

Consumers can still swizzle `@theme/SmartLink` or `@theme/Tooltip` for custom behaviour.  The plugin’s context providers live in `@theme/Root`; swizzled components should read from `IconConfigContext` and `LinkifyRegistryContext` to stay aligned with the generated registry.
