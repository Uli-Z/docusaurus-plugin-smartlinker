import { describe, it, expect } from 'vitest';
import { createTooltipMdxCompiler } from '../src/node/tooltipMdxCompiler.js';
import type { LoadContext } from '@docusaurus/types';

const markdownConfig = {
  format: 'mdx' as const,
  parseFrontMatter: async ({
    fileContent,
  }: {
    fileContent: string;
    defaultParseFrontMatter: (
      params: { fileContent: string; filePath: string }
    ) => Promise<{ frontMatter: Record<string, unknown>; content: string }>;
  }) => ({
    frontMatter: {},
    content: fileContent,
  }),
  mermaid: false,
  preprocessor: undefined,
  mdx1Compat: {
    comments: false,
    admonitions: false,
    headingIds: true,
  },
  remarkRehypeOptions: {},
  anchors: {
    maintainCase: false,
  },
};

const context = {
  siteDir: process.cwd(),
  siteConfig: {
    markdown: markdownConfig,
    staticDirectories: [],
    themeConfig: {},
  },
} as unknown as LoadContext;

describe('createTooltipMdxCompiler', () => {
  it('compiles markdown + jsx into runnable ESM', async () => {
    const compile = await createTooltipMdxCompiler(context);
    const result = await compile('**Hello** <strong>World</strong>');
    const code = String(result.value);
    expect(code).toContain('export default function MDXContent');
    expect(code).toContain('jsx as _jsx');
  });
});
