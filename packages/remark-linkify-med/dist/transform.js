import { visit, SKIP } from 'unist-util-visit';
import { normalize } from 'node:path';
import { buildMatcher } from './matcher.js';
function isSkippable(node, mdxComponentNamesToSkip) {
    const t = node.type;
    if (t === 'code' || t === 'inlineCode')
        return true;
    if (t === 'link' || t === 'linkReference')
        return true;
    if (t === 'image' || t === 'imageReference')
        return true;
    if (t === 'heading' && node.depth <= 3)
        return true;
    if (t === 'mdxJsxFlowElement' || t === 'mdxJsxTextElement') {
        const name = node.name;
        if (typeof name === 'string' && mdxComponentNamesToSkip.has(name))
            return true;
        return false;
    }
    return false;
}
function toMdxJsxTextElement(name, attrs, text) {
    const attributes = Object.entries(attrs)
        .filter(([, v]) => typeof v === 'string' && v.length > 0)
        .map(([name, value]) => ({
        type: 'mdxJsxAttribute',
        name,
        value
    }));
    const children = [];
    if (typeof text === 'string' && text.length > 0) {
        children.push({
            type: 'text',
            value: text
        });
    }
    return {
        type: 'mdxJsxTextElement',
        name,
        attributes,
        children
    };
}
export default function remarkSmartlinker(opts) {
    const componentName = opts.componentName ?? 'SmartLink';
    const toAttr = opts.toAttr ?? 'to';
    const iconAttr = opts.iconAttr ?? 'icon';
    const tipKeyAttr = opts.tipKeyAttr ?? 'tipKey';
    const matchAttr = opts.matchAttr ?? 'match';
    const shortNoteComponentName = opts.shortNoteComponentName ?? 'LinkifyShortNote';
    const shortNoteTipKeyAttr = opts.shortNoteTipKeyAttr ?? tipKeyAttr;
    const shortNotePlaceholder = opts.shortNotePlaceholder ?? '%%SHORT_NOTICE%%';
    const targets = opts.index.getAllTargets();
    const mdxComponentNamesToSkip = new Set([
        componentName,
        shortNoteComponentName,
    ]);
    const termEntries = [];
    for (const t of targets) {
        for (const lit of t.terms) {
            const literal = String(lit ?? '').trim();
            if (!literal)
                continue;
            termEntries.push({ literal, key: `${t.id}::${t.slug}::${t.icon ?? ''}` });
        }
    }
    termEntries.sort((a, b) => b.literal.length - a.literal.length);
    const claimMap = new Map();
    for (const t of targets) {
        for (const lit of t.terms) {
            const ll = String(lit).toLocaleLowerCase();
            const arr = claimMap.get(ll) ?? [];
            arr.push({ id: t.id, slug: t.slug, icon: t.icon });
            claimMap.set(ll, arr);
        }
    }
    for (const [, arr] of claimMap)
        arr.sort((a, b) => a.id.localeCompare(b.id));
    const matcher = buildMatcher(termEntries);
    const targetByPath = new Map();
    const targetById = new Map();
    const targetBySlug = new Map();
    for (const t of targets) {
        if (t.sourcePath) {
            const key = normalizePath(t.sourcePath);
            if (key)
                targetByPath.set(key, t);
        }
        if (t.id)
            targetById.set(t.id, t);
        if (t.slug)
            targetBySlug.set(t.slug, t);
    }
    return (tree, file) => {
        const currentTarget = findCurrentTarget({
            file,
            index: opts.index,
            targetByPath,
            targetById,
            targetBySlug,
        });
        visit(tree, (node, _index, parent) => {
            if (isSkippable(node, mdxComponentNamesToSkip))
                return SKIP;
            if (!parent)
                return;
            if (node.type !== 'text')
                return;
            const textNode = node;
            const text = textNode.value ?? '';
            if (!text || !text.trim())
                return;
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
            if (!result || !result.changed)
                return;
            const idx = parent.children.indexOf(node);
            if (idx >= 0)
                parent.children.splice(idx, 1, ...result.nodes);
        });
        return tree;
    };
}
function normalizePath(value) {
    if (!value || typeof value !== 'string')
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    try {
        return normalize(trimmed).replace(/\\/g, '/').toLowerCase();
    }
    catch {
        return trimmed.replace(/\\/g, '/').toLowerCase();
    }
}
function transformText(args) {
    const { text, matcher, claimMap, componentName, toAttr, tipKeyAttr, matchAttr, iconAttr, shortNoteComponentName, shortNoteTipKeyAttr, shortNotePlaceholder, currentTarget, } = args;
    const placeholder = shortNotePlaceholder;
    const hasPlaceholder = placeholder && placeholder.length > 0 && text.includes(placeholder);
    if (hasPlaceholder && currentTarget) {
        const segments = text.split(placeholder);
        const nodes = [];
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
                if (segRes.changed)
                    changed = true;
            }
            if (i < segments.length - 1) {
                nodes.push(toMdxJsxTextElement(shortNoteComponentName, { [shortNoteTipKeyAttr]: currentTarget.id }, undefined));
                changed = true;
            }
        }
        return { nodes, changed };
    }
    if (hasPlaceholder) {
        // Placeholder present but no current target – leave text untouched.
        return { nodes: [{ type: 'text', value: text }], changed: false };
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
function transformSegment(args) {
    const { text, matcher, claimMap, componentName, toAttr, tipKeyAttr, matchAttr, iconAttr, currentTarget } = args;
    if (!text)
        return { nodes: [], changed: false };
    const matches = matcher.findAll(text);
    if (!matches.length) {
        return { nodes: [{ type: 'text', value: text }], changed: false };
    }
    const newChildren = [];
    let cursor = 0;
    let anyLinkInserted = false;
    for (const m of matches) {
        const start = m.start;
        const end = m.end;
        if (start > cursor)
            newChildren.push({ type: 'text', value: text.slice(cursor, start) });
        let id = '';
        let slug = '';
        let icon = undefined;
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
            newChildren.push({ type: 'text', value: text.slice(start, end) });
        }
        else {
            const element = toMdxJsxTextElement(componentName, { [toAttr]: slug, [tipKeyAttr]: id, [matchAttr]: m.text, [iconAttr]: icon }, m.text);
            newChildren.push(element);
            anyLinkInserted = true;
        }
        cursor = end;
    }
    if (cursor < text.length)
        newChildren.push({ type: 'text', value: text.slice(cursor) });
    if (!anyLinkInserted) {
        return { nodes: [{ type: 'text', value: text }], changed: false };
    }
    return { nodes: newChildren, changed: true };
}
function findCurrentTarget(args) {
    const { file, index, targetByPath, targetById, targetBySlug } = args;
    const pathCandidates = new Set();
    const viaIndex = index.getCurrentFilePath(file);
    if (typeof viaIndex === 'string')
        pathCandidates.add(viaIndex);
    if (typeof file?.path === 'string')
        pathCandidates.add(file.path);
    if (Array.isArray(file?.history)) {
        for (const entry of file.history) {
            if (typeof entry === 'string')
                pathCandidates.add(entry);
        }
    }
    for (const candidate of pathCandidates) {
        const key = normalizePath(candidate);
        if (!key)
            continue;
        const direct = targetByPath.get(key);
        if (direct)
            return direct;
        for (const [pathKey, target] of targetByPath) {
            if (pathKey.endsWith(key) || key.endsWith(pathKey)) {
                return target;
            }
        }
    }
    const data = file?.data ?? {};
    const idCandidates = new Set();
    const slugCandidates = new Set();
    const pushId = (value) => {
        if (typeof value === 'string' && value.trim())
            idCandidates.add(value.trim());
    };
    const pushSlug = (value) => {
        if (typeof value === 'string' && value.trim())
            slugCandidates.add(value.trim());
    };
    pushId(data.id);
    pushId(data.docId);
    pushId(data.unversionedId);
    pushSlug(data.slug);
    pushSlug(data.permalink);
    const frontMatter = data.frontMatter ?? {};
    pushId(frontMatter?.id);
    pushSlug(frontMatter?.slug);
    pushSlug(frontMatter?.permalink);
    for (const id of idCandidates) {
        const target = targetById.get(id);
        if (target)
            return target;
    }
    for (const slug of slugCandidates) {
        const target = targetBySlug.get(slug);
        if (target)
            return target;
    }
    return undefined;
}
//# sourceMappingURL=transform.js.map