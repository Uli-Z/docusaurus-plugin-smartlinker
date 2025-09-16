import type { Transformer } from 'unified';
import { visit, SKIP } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Parent } from 'unist';
import type { Content, Root, Text, PhrasingContent } from 'mdast';
import { buildMatcher, type SynonymEntry } from './matcher.js';

export interface TargetInfo {
  id: string;
  slug: string;
  icon?: string;
  sourcePath: string;
  synonyms: string[];
}

export interface IndexProvider {
  getAllTargets(): TargetInfo[];
  getCurrentFilePath(file: import('vfile').VFile): string;
}

export interface RemarkLinkifyMedOptions {
  index: IndexProvider;
  componentName?: string;
  toAttr?: string;
  iconAttr?: string;
  tipKeyAttr?: string;
  matchAttr?: string;
}

type MdastNode = Content | Root;

function isSkippable(node: MdastNode): boolean {
  const t = (node as any).type;
  if (t === 'code' || t === 'inlineCode') return true;
  if (t === 'link' || t === 'linkReference') return true;
  if (t === 'image' || t === 'imageReference') return true;
  if (t === 'heading' && (node as any).depth <= 3) return true;
  if (t === 'mdxJsxFlowElement' || t === 'mdxJsxTextElement') return true;
  return false;
}

function toMdxJsxTextElement(
  name: string,
  attrs: Record<string, string | undefined>,
  text: string
): any {
  const attributes = Object.entries(attrs)
    .filter(([, v]) => typeof v === 'string' && v.length > 0)
    .map(([name, value]) => ({
      type: 'mdxJsxAttribute',
      name,
      value
    }));

  return {
    type: 'mdxJsxTextElement',
    name,
    attributes,
    children: [
      {
        type: 'text',
        value: text
      }
    ]
  };
}

export default function remarkLinkifyMed(opts: RemarkLinkifyMedOptions): Transformer {
  const componentName = opts.componentName ?? 'SmartLink';
  const toAttr = opts.toAttr ?? 'to';
  const iconAttr = opts.iconAttr ?? 'icon';
  const tipKeyAttr = opts.tipKeyAttr ?? 'tipKey';
  const matchAttr = opts.matchAttr ?? 'match';

  const targets = opts.index.getAllTargets();

  const synEntries: SynonymEntry[] = [];
  for (const t of targets) {
    for (const lit of t.synonyms) {
      const literal = String(lit ?? '').trim();
      if (!literal) continue;
      synEntries.push({ literal, key: `${t.id}::${t.slug}::${t.icon ?? ''}` });
    }
  }

  synEntries.sort((a, b) => b.literal.length - a.literal.length);

  const claimMap = new Map<string, { id: string; slug: string; icon?: string }[]>();
  for (const t of targets) {
    for (const lit of t.synonyms) {
      const ll = String(lit).toLocaleLowerCase();
      const arr = claimMap.get(ll) ?? [];
      arr.push({ id: t.id, slug: t.slug, icon: t.icon });
      claimMap.set(ll, arr);
    }
  }
  for (const [, arr] of claimMap) arr.sort((a, b) => a.id.localeCompare(b.id));

  const matcher = buildMatcher(synEntries);

  return (tree: any, file: any) => {
    const _currentPath = opts.index.getCurrentFilePath(file as any);

    visit(tree, (node, _index, parent: Parent | undefined) => {
      if (isSkippable(node as any)) return SKIP as any;
      if (!parent) return;
      if ((node as any).type !== 'text') return;

      const textNode = node as Text;
      const text = textNode.value ?? '';
      if (!text || !text.trim()) return;

      const matches = matcher.findAll(text);
      if (!matches.length) return;

      const newChildren: PhrasingContent[] = [];
      let cursor = 0;

      for (const m of matches) {
        const start = m.start;
        const end = m.end;
        if (start > cursor) newChildren.push({ type: 'text', value: text.slice(cursor, start) } as Text);

        let id = '';
        let slug = '';
        let icon: string | undefined = undefined;
        {
          const parts = m.key.split('::');
          id = parts[0] ?? '';
          slug = parts[1] ?? '';
          icon = parts[2] || undefined;
          const claimers = claimMap.get(m.synonym.toLocaleLowerCase());
          if (claimers && claimers.length > 1) {
            const chosen = claimers[0];
            id = chosen.id;
            slug = chosen.slug;
            icon = chosen.icon;
          }
        }

        const element = toMdxJsxTextElement(
          componentName,
          { [toAttr]: slug, [tipKeyAttr]: id, [matchAttr]: m.text, [iconAttr]: icon },
          m.text
        );
        newChildren.push(element as any);
        cursor = end;
      }

      if (cursor < text.length) newChildren.push({ type: 'text', value: text.slice(cursor) } as Text);

      const idx = (parent.children as Content[]).indexOf(node as any);
      if (idx >= 0) (parent.children as Content[]).splice(idx, 1, ...newChildren);
    });

    return tree;
  };
}
