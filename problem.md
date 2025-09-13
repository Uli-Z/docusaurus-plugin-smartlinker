# Build Failure: `ERR_PACKAGE_PATH_NOT_EXPORTED` for `estree-walker`

## Overview
This monorepo integrates a custom remark plugin (`remark-linkify-med`) with a Docusaurus v3 example site. The plugin scans Markdown/MDX files for medical terms and wraps matches in a `SmartLink` React component that displays tooltips. The example site fails to build due to a missing ESM export in the `estree-walker` dependency chain.

## Environment
- Node.js version: v20.19.4
- Package manager: pnpm@9.0.0
- Docusaurus packages: `@docusaurus/core` and `@docusaurus/preset-classic` v3.0.0

## Reproduction Steps
1. `pnpm install`
2. `pnpm -r --filter './packages/**' run build`
3. `pnpm site:build`

## Observed Error
```
ERR_PACKAGE_PATH_NOT_EXPORTED: No "exports" main defined in /workspace/docusaurus-plugin-auto-link-abx/node_modules/.pnpm/estree-util-build-jsx@3.0.1/node_modules/estree-walker/package.json
```

## Relevant Configuration and Code
### root `package.json`
```json
{
  "pnpm": {
    "overrides": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "estree-walker": "^3.0.3",
      "estree-util-build-jsx": "^3.0.1",
      "recma-build-jsx": "^1.0.0"
    }
  }
}
```

### Example Site `docusaurus.config.ts`
```ts
const linkifyIndex = createFsIndexProvider({
  roots: [join(__dirname, 'docs'), join(__dirname, 'src/pages')],
});

const config: Config = {
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
  plugins: ['@linkify-med/docusaurus-plugin'],
};
```

### Plugin `MDXComponents.tsx`
```tsx
import MDXComponents from '@theme-original/MDXComponents';
import SmartLink from '@theme/SmartLink';

export default {
  ...MDXComponents,
  SmartLink,
};
```

### File-system Index Provider
```ts
export function createFsIndexProvider(opts: FsIndexProviderOptions): IndexProvider {
  const files = scanMdFiles({ roots: opts.roots });
  const { entries } = loadIndexFromFiles(files);

  const targets: TargetInfo[] = entries.map(e => ({
    id: e.id,
    slug: e.slug,
    icon: e.icon,
    sourcePath: e.sourcePath,
    synonyms: e.synonyms,
  }));

  return {
    getAllTargets() {
      return targets;
    },
    getCurrentFilePath(file) {
      return file.path || '';
    },
  };
}
```

## Notes for Expert
- `SmartLink` is globally mapped in both the plugin and the example site’s MDX components.
- The build failure originates from the MDX/ESM dependency chain; updating `estree-walker`, `estree-util-build-jsx`, and `recma-build-jsx` versions via `pnpm.overrides` may resolve the missing export.
- Ensure all packages involved in MDX processing provide proper `exports` fields compatible with Node’s ESM resolution.
