import { visit, SKIP } from 'unist-util-visit';
import { normalize } from 'path';
import { getDebugConfig, resolveDebugConfig, createLogger, PLUGIN_NAME, getIndexProvider } from 'docusaurus-plugin-smartlinker';

// ../remark-smartlinker/src/transform.ts

// ../remark-smartlinker/src/matcher.ts
function isWordChar(ch) {
  return /\p{L}|\p{N}|_/u.test(ch);
}
function buildTrie(entries) {
  const root = { children: /* @__PURE__ */ new Map() };
  for (const e of entries) {
    if (!e?.literal) continue;
    const lit = e.literal.toLocaleLowerCase();
    if (!lit) continue;
    let node = root;
    for (const ch of Array.from(lit)) {
      let next = node.children.get(ch);
      if (!next) {
        next = { children: /* @__PURE__ */ new Map() };
        node.children.set(ch, next);
      }
      node = next;
    }
    if (!node.terminals) node.terminals = [];
    node.terminals.push({ literal: e.literal, key: e.key });
  }
  return root;
}
function buildMatcher(entries) {
  const seen = /* @__PURE__ */ new Set();
  const uniq = [];
  for (const e of entries) {
    if (!e || typeof e.literal !== "string" || typeof e.key !== "string") continue;
    const lit = e.literal.trim();
    const key = e.key.trim();
    if (!lit || !key) continue;
    const k = `${key}::${lit.toLocaleLowerCase()}`;
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push({ literal: lit, key });
    }
  }
  const trie = buildTrie(uniq);
  function findAll(text) {
    const out = [];
    if (!text) return out;
    const lower = text.toLocaleLowerCase();
    const chars = Array.from(lower);
    const orig = Array.from(text);
    let i = 0;
    while (i < chars.length) {
      let node = trie;
      let j = i;
      let bestEnd = -1;
      let bestTerminal = null;
      while (node && j < chars.length) {
        const ch = chars[j];
        node = node.children.get(ch);
        if (!node) break;
        if (node.terminals && node.terminals.length) {
          let t = node.terminals[0];
          for (const cand of node.terminals) {
            if (Array.from(cand.literal).length > Array.from(t.literal).length) {
              t = cand;
            }
          }
          bestEnd = j + 1;
          bestTerminal = t;
        }
        j++;
      }
      if (bestEnd !== -1 && bestTerminal) {
        const leftOk = i === 0 || !isWordChar(orig[i - 1] ?? "");
        const rightOk = bestEnd === chars.length || !isWordChar(orig[bestEnd] ?? "");
        if (leftOk && rightOk) {
          const start = i;
          const end = bestEnd;
          const textSlice = orig.slice(start, end).join("");
          out.push({
            start,
            end,
            text: textSlice,
            key: bestTerminal.key,
            term: bestTerminal.literal
          });
          i = end;
          continue;
        }
      }
      i += 1;
    }
    return out;
  }
  return { findAll };
}

// ../remark-smartlinker/src/transform.ts
function isSkippable(node, mdxComponentNamesToSkip) {
  const t = node.type;
  if (t === "code" || t === "inlineCode") return true;
  if (t === "link" || t === "linkReference") return true;
  if (t === "image" || t === "imageReference") return true;
  if (t === "heading" && node.depth <= 3) return true;
  if (t === "mdxJsxFlowElement" || t === "mdxJsxTextElement") {
    const name = node.name;
    if (typeof name === "string" && mdxComponentNamesToSkip.has(name)) return true;
    return false;
  }
  return false;
}
function toMdxJsxTextElement(name, attrs, text) {
  const attributes = Object.entries(attrs).filter(([, v]) => typeof v === "string" && v.length > 0).map(([name2, value]) => ({
    type: "mdxJsxAttribute",
    name: name2,
    value
  }));
  const children = [];
  if (typeof text === "string" && text.length > 0) {
    children.push({
      type: "text",
      value: text
    });
  }
  return {
    type: "mdxJsxTextElement",
    name,
    attributes,
    children
  };
}
function normalizeFolderKey(value) {
  const trimmed = value.trim();
  const withoutBackslashes = trimmed.replace(/\\/g, "/");
  const withoutTrailing = withoutBackslashes.replace(/\/+$/, "");
  return withoutTrailing || ".";
}
function remarkSmartlinker(opts) {
  const options = opts ?? {};
  const sharedDebug = typeof getDebugConfig === "function" ? getDebugConfig() : void 0;
  const debugInput = options.debug ?? sharedDebug;
  const debugResolution = resolveDebugConfig(debugInput);
  const baseLogger = createLogger({ pluginName: PLUGIN_NAME, debug: debugResolution.config });
  const initLogger = baseLogger.child("remark:init");
  const prepareLogger = baseLogger.child("remark:prepare");
  const transformLogger = baseLogger.child("remark:transform");
  if (debugResolution.invalidLevel && typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(
      `[${PLUGIN_NAME}] Ignoring DOCUSAURUS_PLUGIN_DEBUG_LEVEL="${debugResolution.invalidLevel}" (expected one of: error, warn, info, debug, trace).`
    );
  }
  const componentName = options.componentName ?? "SmartLink";
  const toAttr = options.toAttr ?? "to";
  const iconAttr = options.iconAttr ?? "icon";
  const tipKeyAttr = options.tipKeyAttr ?? "tipKey";
  const matchAttr = options.matchAttr ?? "match";
  const shortNoteComponentName = options.shortNoteComponentName ?? "LinkifyShortNote";
  const shortNoteTipKeyAttr = options.shortNoteTipKeyAttr ?? tipKeyAttr;
  const shortNotePlaceholder = options.shortNotePlaceholder ?? "%%SHORT_NOTICE%%";
  const restrictInput = options.restrictToFolders;
  const restrictArray = Array.isArray(restrictInput) ? restrictInput : restrictInput ? [restrictInput] : [];
  const folderFilter = new Set(
    restrictArray.map((value) => typeof value === "string" ? normalizeFolderKey(value) : null).filter((value) => !!value)
  );
  const mdxComponentNamesToSkip = /* @__PURE__ */ new Set([
    componentName,
    shortNoteComponentName
  ]);
  if (initLogger.isLevelEnabled("debug")) {
    initLogger.debug("Remark transformer initialized", () => ({
      componentName,
      shortNoteComponentName,
      restrictFilterCount: folderFilter.size,
      debugLevel: debugResolution.config.level,
      debugEnabled: debugResolution.config.enabled
    }));
  }
  let cachedProvider;
  let cachedFilterSignature = "";
  let prepared;
  function ensurePreparedIndex() {
    const provider = options.index ?? getIndexProvider();
    if (!provider) {
      throw new Error(
        "[docusaurus-plugin-smartlinker] No index provider configured. Pass `{ index }` explicitly or make sure the Docusaurus plugin runs before this remark transformer."
      );
    }
    const filterSignature = folderFilter.size ? Array.from(folderFilter).sort().join("|") : "ALL";
    if (provider !== cachedProvider || filterSignature !== cachedFilterSignature) {
      const allTargets = provider.getAllTargets();
      const targets = folderFilter.size ? allTargets.filter((target) => {
        const id = typeof target.folderId === "string" ? normalizeFolderKey(target.folderId) : null;
        if (!id) return false;
        return folderFilter.has(id);
      }) : allTargets;
      const termEntries = [];
      const claimMap = /* @__PURE__ */ new Map();
      for (const t of targets) {
        for (const lit of t.terms) {
          const literal = String(lit ?? "").trim();
          if (!literal) continue;
          termEntries.push({ literal, key: `${t.id}::${t.slug}::${t.icon ?? ""}` });
          const ll = literal.toLocaleLowerCase();
          const arr = claimMap.get(ll) ?? [];
          arr.push({ id: t.id, slug: t.slug, icon: t.icon });
          claimMap.set(ll, arr);
        }
      }
      termEntries.sort((a, b) => b.literal.length - a.literal.length);
      for (const [, arr] of claimMap) arr.sort((a, b) => a.id.localeCompare(b.id));
      const matcher = buildMatcher(termEntries);
      const targetByPath = /* @__PURE__ */ new Map();
      const targetById = /* @__PURE__ */ new Map();
      const targetBySlug = /* @__PURE__ */ new Map();
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
      cachedFilterSignature = filterSignature;
      if (prepareLogger.isLevelEnabled("debug")) {
        prepareLogger.debug("Prepared SmartLink term matcher", {
          targetCount: targets.length,
          termCount: termEntries.length,
          filteredByFolders: folderFilter.size > 0
        });
      }
      if (prepareLogger.isLevelEnabled("trace")) {
        const folders = Array.from(folderFilter.values());
        if (folders.length > 0) {
          prepareLogger.trace("Active folder filters", () => ({ folders }));
        }
      }
    }
    return { index: provider, ...prepared };
  }
  return (tree, file) => {
    const { index, matcher, claimMap, targetByPath, targetById, targetBySlug } = ensurePreparedIndex();
    const currentTarget = findCurrentTarget({
      file,
      index,
      targetByPath,
      targetById,
      targetBySlug
    });
    const filePath = typeof file?.path === "string" ? file.path : void 0;
    if (transformLogger.isLevelEnabled("info")) {
      transformLogger.info("Processing file", () => ({
        filePath: filePath ?? null,
        currentTargetId: currentTarget?.id ?? null,
        currentTargetSlug: currentTarget?.slug ?? null
      }));
    }
    const onLinkInserted = (args) => {
      if (!transformLogger.isLevelEnabled("debug")) return;
      transformLogger.debug("Smartlink inserted", () => ({
        filePath: filePath ?? null,
        text: args.text,
        to: args.slug,
        tipKey: args.id,
        icon: args.icon ?? null
      }));
    };
    const onShortNoteInserted = (args) => {
      if (!transformLogger.isLevelEnabled("debug")) return;
      transformLogger.debug("Short-note placeholder replaced", () => ({
        filePath: filePath ?? null,
        tipKey: args.id
      }));
    };
    visit(tree, (node, _index, parent) => {
      if (isSkippable(node, mdxComponentNamesToSkip)) return SKIP;
      if (!parent) return;
      if (node.type !== "text") return;
      const textNode = node;
      const text = textNode.value ?? "";
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
        onLinkInserted,
        onShortNoteInserted
      });
      if (!result || !result.changed) return;
      const idx = parent.children.indexOf(node);
      if (idx >= 0) parent.children.splice(idx, 1, ...result.nodes);
    });
    return tree;
  };
}
function normalizePath(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return normalize(trimmed).replace(/\\/g, "/").toLowerCase();
  } catch {
    return trimmed.replace(/\\/g, "/").toLowerCase();
  }
}
function transformText(args) {
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
    onLinkInserted,
    onShortNoteInserted
  } = args;
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
          currentTarget
        });
        nodes.push(...segRes.nodes);
        if (segRes.changed) changed = true;
      }
      if (i < segments.length - 1) {
        nodes.push(
          toMdxJsxTextElement(
            shortNoteComponentName,
            { [shortNoteTipKeyAttr]: currentTarget.id },
            void 0
          )
        );
        if (onShortNoteInserted) onShortNoteInserted({ id: currentTarget.id });
        changed = true;
      }
    }
    return { nodes, changed };
  }
  if (hasPlaceholder) {
    return { nodes: [{ type: "text", value: text }], changed: false };
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
    onLinkInserted
  });
}
function transformSegment(args) {
  const { text, matcher, claimMap, componentName, toAttr, tipKeyAttr, matchAttr, iconAttr, currentTarget, onLinkInserted } = args;
  if (!text) return { nodes: [], changed: false };
  const matches = matcher.findAll(text);
  if (!matches.length) {
    return { nodes: [{ type: "text", value: text }], changed: false };
  }
  const newChildren = [];
  let cursor = 0;
  let anyLinkInserted = false;
  for (const m of matches) {
    const start = m.start;
    const end = m.end;
    if (start > cursor) newChildren.push({ type: "text", value: text.slice(cursor, start) });
    let id = "";
    let slug = "";
    let icon = void 0;
    {
      const parts = m.key.split("::");
      id = parts[0] ?? "";
      slug = parts[1] ?? "";
      icon = parts[2] || void 0;
      const claimers = claimMap.get(m.term.toLocaleLowerCase());
      if (claimers && claimers.length > 1) {
        const chosen = claimers[0];
        id = chosen.id;
        slug = chosen.slug;
        icon = chosen.icon;
      }
    }
    if (currentTarget && id && currentTarget.id === id) {
      newChildren.push({ type: "text", value: text.slice(start, end) });
    } else {
      const element = toMdxJsxTextElement(
        componentName,
        { [toAttr]: slug, [tipKeyAttr]: id, [matchAttr]: m.text, [iconAttr]: icon },
        m.text
      );
      newChildren.push(element);
      anyLinkInserted = true;
      if (onLinkInserted) onLinkInserted({ text: m.text, slug, id, icon });
    }
    cursor = end;
  }
  if (cursor < text.length) newChildren.push({ type: "text", value: text.slice(cursor) });
  if (!anyLinkInserted) {
    return { nodes: [{ type: "text", value: text }], changed: false };
  }
  return { nodes: newChildren, changed: true };
}
function findCurrentTarget(args) {
  const { file, index, targetByPath, targetById, targetBySlug } = args;
  const pathCandidates = /* @__PURE__ */ new Set();
  const viaIndex = index.getCurrentFilePath(file);
  if (typeof viaIndex === "string") pathCandidates.add(viaIndex);
  if (typeof file?.path === "string") pathCandidates.add(file.path);
  if (Array.isArray(file?.history)) {
    for (const entry of file.history) {
      if (typeof entry === "string") pathCandidates.add(entry);
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
  const idCandidates = /* @__PURE__ */ new Set();
  const slugCandidates = /* @__PURE__ */ new Set();
  const pushId = (value) => {
    if (typeof value === "string" && value.trim()) idCandidates.add(value.trim());
  };
  const pushSlug = (value) => {
    if (typeof value === "string" && value.trim()) slugCandidates.add(value.trim());
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
    if (target) return target;
  }
  for (const slug of slugCandidates) {
    const target = targetBySlug.get(slug);
    if (target) return target;
  }
  return void 0;
}

// ../remark-smartlinker/src/index.ts
var src_default = remarkSmartlinker;

// src/remark/index.ts
var attacher = src_default;
var remark_default = attacher;

export { buildMatcher, remark_default as default };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map