import { join } from 'node:path';
import { createProcessorUncached } from '@docusaurus/mdx-loader/lib/processor.js';
import type { Options as MdxLoaderOptions } from '@docusaurus/mdx-loader';
import type { LoadContext } from '@docusaurus/types';
import type { CompileMdx } from '../codegen/notesEmitter.js';

function resolveStaticDirs(siteDir: string, relative: readonly string[] | undefined) {
  return (relative ?? []).map(dir => join(siteDir, dir));
}

export async function createTooltipMdxCompiler(
  context: LoadContext
): Promise<CompileMdx> {
  const { siteDir, siteConfig } = context;
  type MarkdownHooksConfig = {
    hooks?: {
      onBrokenMarkdownLinks?: LoadContext['siteConfig']['onBrokenMarkdownLinks'];
      onBrokenMarkdownImages?: 'ignore' | 'log' | 'warn' | 'error';
    };
  };
  const markdownWithHooks =
    siteConfig.markdown as typeof siteConfig.markdown & MarkdownHooksConfig;
  const markdownConfig = {
    ...markdownWithHooks,
    hooks: {
      onBrokenMarkdownLinks:
        markdownWithHooks.hooks?.onBrokenMarkdownLinks ??
        siteConfig.onBrokenMarkdownLinks ??
        'warn',
      onBrokenMarkdownImages:
        markdownWithHooks.hooks?.onBrokenMarkdownImages ??
        'warn',
    },
  } satisfies typeof siteConfig.markdown & MarkdownHooksConfig;
  const mdxOptions: MdxLoaderOptions = {
    siteDir,
    staticDirs: resolveStaticDirs(siteDir, siteConfig.staticDirectories),
    markdownConfig,
    remarkPlugins: [],
    rehypePlugins: [],
    recmaPlugins: [],
    beforeDefaultRemarkPlugins: [],
    beforeDefaultRehypePlugins: [],
    admonitions: false,
  };

  const processor = await createProcessorUncached({
    options: mdxOptions,
    format: 'mdx',
  });

  let counter = 0;

  return async (value: string) => {
    counter += 1;
    const filePath = join(
      siteDir,
      '.docusaurus',
      'docusaurus-plugin-smartlinker',
      `tooltip-note-${counter}.mdx`
    );

    const result = await processor.process({
      content: value,
      filePath,
      frontMatter: {},
      compilerName: 'client',
    });

    return { value: result.content };
  };
}
