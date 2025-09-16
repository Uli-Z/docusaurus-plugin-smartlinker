# docusaurus-plugin-auto-link-abx

This monorepo provides the Linkify-Med Docusaurus plugin and an accompanying remark plugin used by the example site.

## Publishing from `dist`

The Docusaurus theme now ships from the compiled `dist/theme` directory.  All runtime imports have explicit `.js` extensions so no postbuild rewrites are required.  Consumers point to the published package and Docusaurus resolves the compiled theme automatically.

## SmartLink availability

`@linkify-med/docusaurus-plugin` wires its providers in `@theme/Root`.  The plugin injects `<SmartLink>` into the global `MDXProvider`, so MDX content can use `<SmartLink>` without local imports or swizzle overrides.

## Tooltip content

Short notes defined in frontmatter are compiled as MDX. This enables Markdown formatting inside the tooltip (for example `**bold**`, lists, and links) and supports custom React components. Register tooltip components in the plugin options so they are available while rendering MDX:

```ts
plugins: [
  [
    '@linkify-med/docusaurus-plugin',
    {
      icons: { pill: 'emoji:💊' },
      tooltipComponents: {
        DrugTip: '@site/src/components/DrugTip',
      },
    },
  ],
];
```

With this configuration a short note can use `<DrugTip note="Take with food" />` alongside Markdown syntax and the tooltip will render the component.

## CSS loading

The plugin exposes its CSS via `getClientModules()`.  When the plugin is enabled Docusaurus automatically loads `dist/theme/styles.css`, no manual stylesheet import is required.

## Swizzle notes

Consumers can still swizzle `@theme/SmartLink` or `@theme/Tooltip` for custom behaviour.  The plugin’s context providers live in `@theme/Root`; swizzled components should read from `IconConfigContext` and `LinkifyRegistryContext` to stay aligned with the generated registry.
