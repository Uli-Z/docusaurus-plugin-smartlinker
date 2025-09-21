import type { Transformer } from 'unified';
import { visit, SKIP } from 'unist-util-visit';
import { normalize } from 'node:path';
import type { Parent } from 'unist';
import type { Content, Root, Text, PhrasingContent } from 'mdast';
import { getIndexProvider as getRegisteredIndexProvider } from 'docusaurus-plugin-smartlinker';
import { buildMatcher, type AutoLinkEntry } from './matcher.js';

export interface TargetInfo {
  id: string;
  slug: string;
  icon?: string;
  sourcePath: string;
  terms: string[];
}

export interface IndexProvider {
  getAllTargets(): TargetInfo[];
  getCurrentFilePath(file: import('vfile').VFile): string;
}

export interface RemarkSmartlinkerOptions {
  index?: IndexProvider;
  componentName?: string;
  toAttr?: string;
  iconAttr?: string;
  tipKeyAttr?: string;
  matchAttr?: string;
  shortNoteComponentName?: string;
  shortNoteTipKeyAttr?: string;
  shortNotePlaceholder?: string;
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
  text?: string
): any {
  const attributes = Object.entries(attrs)
    .filter(([, v]) => typeof v === 'string' && v.length > 0)
    .map(([name, value]) => ({
      type: 'mdxJsxAttribute',
      name,
      value
    }));

  const children: PhrasingContent[] = [];
  if (typeof text === 'string' && text.length > 0) {
    children.push({
      type: 'text',
      value: text
    } as Text);
  }

  return {
    type: 'mdxJsxTextElement',
    name,
    attributes,
    children
  };
}

export default function remarkSmartlinker(opts?: RemarkSmartlinkerOptions): Transformer {
  const options = opts ?? {};

  const componentName = options.componentName ?? 'SmartLink';
  const toAttr = options.toAttr ?? 'to';
  const iconAttr = options.iconAttr ?? 'icon';
  const tipKeyAttr = options.tipKeyAttr ?? 'tipKey';
  const matchAttr = options.matchAttr ?? 'match';
  const shortNoteComponentName = options.shortNoteComponentName ?? 'LinkifyShortNote';
  const shortNoteTipKeyAttr = options.shortNoteTipKeyAttr ?? tipKeyAttr;
  const shortNotePlaceholder = options.shortNotePlaceholder ?? '%%SHORT_NOTICE%%';
  type PreparedIndex = {
    targets: TargetInfo[];
    matcher: ReturnType<typeof buildMatcher>;
    claimMap: Map<string, { id: string; slug: string; icon?: string }[]>;
    targetByPath: Map<string, TargetInfo>;
    targetById: Map<string, TargetInfo>;
    targetBySlug: Map<string, TargetInfo>;
  };

  let cachedProvider: IndexProvider | undefined;
  let prepared: PreparedIndex | undefined;

  function ensurePreparedIndex(): { index: IndexProvider } & PreparedIndex {
    const provider = options.index ?? getRegisteredIndexProvider();

    if (!provider) {
      throw new Error(
        '[docusaurus-plugin-smartlinker] No index provider configured. Pass `{ index }` explicitly or make sure the Docusaurus plugin runs before this remark transformer.'
      );
    }

    if (provider !== cachedProvider) {
      const targets = provider.getAllTargets();

      const termEntries: AutoLinkEntry[] = [];
      const claimMap = new Map<string, { id: string; slug: string; icon?: string }[]>();

      for (const t of targets) {
        for (const lit of t.terms) {
          const literal = String(lit ?? '').trim();
          if (!literal) continue;
          termEntries.push({ literal, key: `${t.id}::${t.slug}::${t.icon ?? ''}` });

          const ll = literal.toLocaleLowerCase();
          const arr = claimMap.get(ll) ?? [];
          arr.push({ id: t.id, slug: t.slug, icon: t.icon });
          claimMap.set(ll, arr);
        }
      }

      termEntries.sort((a, b) => b.literal.length - a.literal.length);
      for (const [, arr] of claimMap) arr.sort((a, b) => a.id.localeCompare(b.id));

      const matcher = buildMatcher(termEntries);

      const targetByPath = new Map<string, TargetInfo>();
      const targetById = new Map<string, TargetInfo>();
      const targetBySlug = new Map<string, TargetInfo>();

      for (const t of targets) {
        if (t.sourcePath) {
          const key = normalizePath(t.sourcePath);
          if (key) targetByPath.set(key, t);
        }
        if (t.id) targetById.set(t.id, t);
        if (t.slug) targetBySlug.set(t.slug, t);
      }

      prepared = { targets, matcher, claimMap, targetByPath, targetById, targetBySlug };
      cachedProvider = provider;
    }

    return { index: provider, ...(prepared as PreparedIndex) };
  }

  return (tree: any, file: any) => {
    const { index, matcher, claimMap, targetByPath, targetById, targetBySlug } = ensurePreparedIndex();

    const currentTarget = findCurrentTarget({
      file,
      index,
      targetByPath,
      targetById,
      targetBySlug,
    });

    visit(tree, (node, _index, parent: Parent | undefined) => {
      if (isSkippable(node as any)) return SKIP as any;
      if (!parent) return;
      if ((node as any).type !== 'text') return;

      const textNode = node as Text;
      const text = textNode.value ?? '';
      if (!text || !text.trim()) return;

      const result = transformText({
        text,
        matcher,
        claimMap,
        componentName,
        toAttr,
        tipKeyAttr,
        matchAttr,
        iconAttr,
        shortNoteComponentName,
        shortNoteTipKeyAttr,
        shortNotePlaceholder,
        currentTarget,
      });
      if (!result || !result.changed) return;

      const idx = (parent.children as Content[]).indexOf(node as any);
      if (idx >= 0) (parent.children as Content[]).splice(idx, 1, ...result.nodes);
    });

    return tree;
  };
}

function normalizePath(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return normalize(trimmed).replace(/\\/g, '/').toLowerCase();
  } catch {
    return trimmed.replace(/\\/g, '/').toLowerCase();
  }
}

interface TransformArgs {
  text: string;
  matcher: ReturnType<typeof buildMatcher>;
  claimMap: Map<string, { id: string; slug: string; icon?: string }[]>;
  componentName: string;
  toAttr: string;
  tipKeyAttr: string;
  matchAttr: string;
  iconAttr: string;
  shortNoteComponentName: string;
  shortNoteTipKeyAttr: string;
  shortNotePlaceholder: string;
  currentTarget?: TargetInfo;
}

type TransformResult = { nodes: PhrasingContent[]; changed: boolean } | null;

function transformText(args: TransformArgs): TransformResult {
  const {
    text,
    matcher,
    claimMap,
    componentName,
    toAttr,
    tipKeyAttr,
    matchAttr,
    iconAttr,
    shortNoteComponentName,
    shortNoteTipKeyAttr,
    shortNotePlaceholder,
    currentTarget,
  } = args;

  const placeholder = shortNotePlaceholder;
  const hasPlaceholder = placeholder && placeholder.length > 0 && text.includes(placeholder);

  if (hasPlaceholder && currentTarget) {
    const segments = text.split(placeholder);
    const nodes: PhrasingContent[] = [];
    let changed = false;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment) {
        const segRes = transformSegment({
          text: segment,
          matcher,
          claimMap,
          componentName,
          toAttr,
          tipKeyAttr,
          matchAttr,
          iconAttr,
          currentTarget,
        });
        nodes.push(...segRes.nodes);
        if (segRes.changed) changed = true;
      }

      if (i < segments.length - 1) {
        nodes.push(
          toMdxJsxTextElement(
            shortNoteComponentName,
            { [shortNoteTipKeyAttr]: currentTarget.id },
            undefined
          ) as any
        );
        changed = true;
      }
    }

    return { nodes, changed };
  }

  if (hasPlaceholder) {
    // Placeholder present but no current target – leave text untouched.
    return { nodes: [{ type: 'text', value: text } as Text], changed: false };
  }

  return transformSegment({
    text,
    matcher,
    claimMap,
    componentName,
    toAttr,
    tipKeyAttr,
    matchAttr,
    iconAttr,
    currentTarget,
  });
}

interface TransformSegmentArgs {
  text: string;
  matcher: ReturnType<typeof buildMatcher>;
  claimMap: Map<string, { id: string; slug: string; icon?: string }[]>;
  componentName: string;
  toAttr: string;
  tipKeyAttr: string;
  matchAttr: string;
  iconAttr: string;
  currentTarget?: TargetInfo;
}

function transformSegment(args: TransformSegmentArgs): { nodes: PhrasingContent[]; changed: boolean } {
  const { text, matcher, claimMap, componentName, toAttr, tipKeyAttr, matchAttr, iconAttr, currentTarget } = args;

  if (!text) return { nodes: [], changed: false };

  const matches = matcher.findAll(text);
  if (!matches.length) {
    return { nodes: [{ type: 'text', value: text } as Text], changed: false };
  }

  const newChildren: PhrasingContent[] = [];
  let cursor = 0;
  let anyLinkInserted = false;

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
      const claimers = claimMap.get(m.term.toLocaleLowerCase());
      if (claimers && claimers.length > 1) {
        const chosen = claimers[0];
        id = chosen.id;
        slug = chosen.slug;
        icon = chosen.icon;
      }
    }

    if (currentTarget && id && currentTarget.id === id) {
      newChildren.push({ type: 'text', value: text.slice(start, end) } as Text);
    } else {
      const element = toMdxJsxTextElement(
        componentName,
        { [toAttr]: slug, [tipKeyAttr]: id, [matchAttr]: m.text, [iconAttr]: icon },
        m.text
      );
      newChildren.push(element as any);
      anyLinkInserted = true;
    }

    cursor = end;
  }

  if (cursor < text.length) newChildren.push({ type: 'text', value: text.slice(cursor) } as Text);

  if (!anyLinkInserted) {
    return { nodes: [{ type: 'text', value: text } as Text], changed: false };
  }

  return { nodes: newChildren, changed: true };
}

interface FindCurrentTargetArgs {
  file: any;
  index: IndexProvider;
  targetByPath: Map<string, TargetInfo>;
  targetById: Map<string, TargetInfo>;
  targetBySlug: Map<string, TargetInfo>;
}

function findCurrentTarget(args: FindCurrentTargetArgs): TargetInfo | undefined {
  const { file, index, targetByPath, targetById, targetBySlug } = args;

  const pathCandidates = new Set<string>();
  const viaIndex = index.getCurrentFilePath(file as any);
  if (typeof viaIndex === 'string') pathCandidates.add(viaIndex);
  if (typeof file?.path === 'string') pathCandidates.add(file.path);
  if (Array.isArray(file?.history)) {
    for (const entry of file.history) {
      if (typeof entry === 'string') pathCandidates.add(entry);
    }
  }

  for (const candidate of pathCandidates) {
    const key = normalizePath(candidate);
    if (!key) continue;
    const direct = targetByPath.get(key);
    if (direct) return direct;
    for (const [pathKey, target] of targetByPath) {
      if (pathKey.endsWith(key) || key.endsWith(pathKey)) {
        return target;
      }
    }
  }

  const data = file?.data ?? {};
  const idCandidates = new Set<string>();
  const slugCandidates = new Set<string>();

  const pushId = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) idCandidates.add(value.trim());
  };
  const pushSlug = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) slugCandidates.add(value.trim());
  };

  pushId((data as any).id);
  pushId((data as any).docId);
  pushId((data as any).unversionedId);
  pushSlug((data as any).slug);
  pushSlug((data as any).permalink);

  const frontMatter = (data as any).frontMatter ?? {};
  pushId(frontMatter?.id);
  pushSlug(frontMatter?.slug);
  pushSlug(frontMatter?.permalink);

  for (const id of idCandidates) {
    const target = targetById.get(id);
    if (target) return target;
  }

  for (const slug of slugCandidates) {
    const target = targetBySlug.get(slug);
    if (target) return target;
  }

  return undefined;
}
