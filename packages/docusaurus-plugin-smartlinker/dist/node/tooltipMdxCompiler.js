import { join } from 'node:path';
import { createProcessorUncached } from '@docusaurus/mdx-loader/lib/processor.js';
function resolveStaticDirs(siteDir, relative) {
    return (relative ?? []).map(dir => join(siteDir, dir));
}
export async function createTooltipMdxCompiler(context) {
    const { siteDir, siteConfig } = context;
    const mdxOptions = {
        siteDir,
        staticDirs: resolveStaticDirs(siteDir, siteConfig.staticDirectories),
        markdownConfig: siteConfig.markdown,
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
    return async (value) => {
        counter += 1;
        const filePath = join(siteDir, '.docusaurus', 'docusaurus-plugin-smartlinker', `tooltip-note-${counter}.mdx`);
        const result = await processor.process({
            content: value,
            filePath,
            frontMatter: {},
            compilerName: 'client',
        });
        return { value: result.content };
    };
}
//# sourceMappingURL=tooltipMdxCompiler.js.map