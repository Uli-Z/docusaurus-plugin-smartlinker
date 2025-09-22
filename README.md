# docusaurus-plugin-smartlinker

Smartlinker is a Docusaurus v3 plugin (with an accompanying remark helper) that turns frontmatter metadata into automatic cross-links. By indexing each document's `id`, `slug`, synonyms, icon, and short note, it renders consistent SmartLinks with contextual tooltips wherever those terms appear in Markdown or MDX.

## Features at a glance

- **Frontmatter-driven linking.** Scan `id`, `slug`, `smartlink-terms`, optional `smartlink-icon`, and optional `smartlink-short-note` fields and keep the registry in sync with your filesystem.
- **Tooltip notes compiled from MDX.** Convert `smartlink-short-note` snippets into ready-to-render React components so domain tips appear inline in the tooltip.
- **Collision-aware registry generation.** Build a tooltip registry that resolves slug collisions based on folder proximity while preserving deterministic output.
- **Single `<SmartLink/>` component everywhere.** Inject the runtime so docs, pages, admonitions, and tables all share the same tooltip behavior (including emoji or SVG icons and dark-mode styling).
- **Remark plugin parity.** Bundle a remark transformer so Markdown handled outside of the Docusaurus plugin (e.g., classic preset docs/pages) receives identical SmartLink treatment.

## Quick start

1. **Install the package** (ships prebuilt via the root `prepare` script):

   ```bash
   npm install github:Uli-Z/docusaurus-plugin-smartlinker
   ```

2. **Register the plugins** in your `docusaurus.config.js`. The Docusaurus plugin now publishes its index automatically, so the remark transformer can be added without extra wiring:

   ```js
   import remarkSmartlinker from 'docusaurus-plugin-smartlinker/remark';

   export default {
     presets: [
       [
         'classic',
         {
           docs: {
             remarkPlugins: [remarkSmartlinker],
           },
           pages: {
             remarkPlugins: [remarkSmartlinker],
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
          darkModeIcons: {
            bug: '/img/bug-dark.svg',
          },
          folders: [
            {
              path: 'docs',
              defaultIcon: 'pill',
              tooltipComponents: {
                DrugTip: '@site/src/components/DrugTip',
              },
            },
          ],
          debug: {
            enabled: process.env.DOCUSAURUS_PLUGIN_DEBUG === '1',
            level: process.env.DOCUSAURUS_PLUGIN_DEBUG_LEVEL ?? 'warn',
          },
        },
      ],
    ],
   };
   ```

   Debug mode is disabled by default. When you set `debug.enabled: true`, Smartlinker emits structured lifecycle logs during `docusaurus build`. Levels cascade just like most logging systems—`debug` includes `info`, `warn`, and `error`, while `trace` adds the most verbose diagnostics. You can also override the behavior per build by exporting `DOCUSAURUS_PLUGIN_DEBUG=1` and (optionally) `DOCUSAURUS_PLUGIN_DEBUG_LEVEL=trace` in your environment.

   ### Using the remark helper from CommonJS

   When your `docusaurus.config.js` relies on CommonJS `require`, make sure to access the default export of the remark helper:

   ```js
   const remarkSmartlinker = require('docusaurus-plugin-smartlinker/remark').default;
   ```
   
   ESM projects can continue using `import remarkSmartlinker from 'docusaurus-plugin-smartlinker/remark';` as shown above.

   Each entry under `folders` is scanned relative to your site directory.
   You can set a `defaultIcon` and `tooltipComponents` map for each folder
   independently. Slugs are never rewritten — define the final permalink in
   your frontmatter and Smartlinker will preserve it.

3. **Annotate your docs** with SmartLink metadata so the index provider can pick up synonyms, icons, and tooltip notes:

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
     <DrugTip note="Take with food" />
   ---
   ```

If you're processing Markdown outside of the Docusaurus lifecycle, you can still create and pass a manual index provider via `createFsIndexProvider({ roots })` when calling the remark transformer. The helper automatically tags each root so folder-aware features remain available.

When you need the remark transformer to focus on a subset of SmartLink targets,
pass `restrictToFolders: ['docs']` (or any configured folder id) so it limits
itself to those entries.

Smartlinker builds a registry from these front matter fields, injects `<SmartLink/>` nodes during the remark phase, and renders hover/tap tooltips at runtime.

### Frontmatter requirements

To ensure a document participates in SmartLinking, the frontmatter must include:

- `id`: a stable identifier for the document.
- `slug`: the permalink that the SmartLink should point to. The slug must start with `/`; entries without a valid slug are skipped during indexing.
- `smartlink-terms`: a non-empty array of synonyms that should be linkified elsewhere.

Optional fields such as `smartlink-icon` and `smartlink-short-note` continue to work as before. If a page fails to produce SmartLinks, double-check that these required fields are present and that the slug uses the expected `/path` format.

## Packages

This repository publishes a single installable package:

- `docusaurus-plugin-smartlinker` – the Docusaurus plugin itself, including the SmartLink theme components, filesystem-based index provider utilities, and a remark helper exposed from `docusaurus-plugin-smartlinker/remark`.

The workspaces in `packages/` house the source code for the plugin and the remark transform. They build into `dist/` and are included in the published tarball via the root `prepare` script.

## Solved coding challenges

Smartlinker tackles the tricky pieces required for automatic cross-linking in Docusaurus:

- **Robust frontmatter loader.** Uses `gray-matter` plus `zod` validation to normalize metadata and emit actionable warnings instead of crashing on malformed content.
- **Path distance & collision resolution.** Computes proximity scores between files so the closest document wins when multiple entries expose the same synonym.
- **Deterministic tooltip codegen.** Compiles MDX `smartlink-short-note` blocks into SSR-safe TSX modules and materializes a registry that can be imported by both the plugin runtime and the remark transformer.
- **Icon resolver with dark-mode awareness.** Validates configuration, applies defaults, and maps emoji or SVG assets consistently across the build outputs.
- **Synonym-aware remark transform.** Walks Markdown/MDX ASTs to replace matched text with `<SmartLink/>` nodes while preserving existing formatting.
- **Docusaurus SSR compatibility.** Keeps the build pipeline compatible with Webpack's server rendering requirements (e.g., avoiding root-level `"type": "module"`) so the example site and plugin compile cleanly.

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