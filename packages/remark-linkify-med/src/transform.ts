import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';

interface Target {
  id: string;
  slug: string;
  icon?: string;
  sourcePath: string;
  synonyms: string[];
}

export interface IndexProvider {
  getAllTargets(): Target[];
  getCurrentFilePath(file: VFile): string;
}

interface Options {
  index: IndexProvider;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const makeRemarkPlugin: Plugin<[Options]> = (options) => {
  return (tree, file) => {
    const targets = options.index.getAllTargets();
    const synonymMap = new Map<string, Target>();
    for (const target of targets) {
      for (const syn of target.synonyms) {
        synonymMap.set(syn.toLowerCase(), target);
      }
    }

    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof (node as any).value !== 'string') return;
      const value: string = (node as any).value;
      for (const [synLower, target] of synonymMap) {
        const regex = new RegExp(`\\b${escapeRegExp(synLower)}\\b`, 'gi');
        if (regex.test(value)) {
          const parts = value.split(regex);
          const matches = value.match(regex) || [];
          const children: any[] = [];
          for (let i = 0; i < parts.length; i++) {
            if (parts[i]) children.push({ type: 'text', value: parts[i] });
            if (i < matches.length) {
              children.push({
                type: 'mdxJsxTextElement',
                name: 'SmartLink',
                attributes: [
                  { type: 'mdxJsxAttribute', name: 'to', value: target.slug },
                ],
                children: [{ type: 'text', value: matches[i] }],
              });
            }
          }
          (parent as any).children.splice(index as number, 1, ...children);
          return index + children.length;
        }
      }
    });
  };
};

export default makeRemarkPlugin;
