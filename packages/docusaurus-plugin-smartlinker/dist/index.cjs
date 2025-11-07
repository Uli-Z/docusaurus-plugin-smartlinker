'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');
var fs = require('fs');
var url = require('url');
var zod = require('zod');
var matter = require('gray-matter');
var processor_js = require('@docusaurus/mdx-loader/lib/processor.js');
var perf_hooks = require('perf_hooks');
var buffer = require('buffer');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var matter__default = /*#__PURE__*/_interopDefault(matter);

// src/index.ts

// src/pluginName.ts
var PLUGIN_NAME = "docusaurus-plugin-smartlinker";

// src/options.ts
var TrimmedString = zod.z.string().transform((value) => value.trim()).refine((value) => value.length > 0, {
  message: "Expected a non-empty string"
});
var TooltipComponentSchema = zod.z.union([
  TrimmedString,
  zod.z.object({
    path: TrimmedString,
    export: TrimmedString.optional()
  })
]);
var DebugLevelSchema = zod.z.enum(["error", "warn", "info", "debug", "trace"]);
var DebugOptionsSchema = zod.z.object({
  enabled: zod.z.boolean().default(false),
  level: DebugLevelSchema.default("warn")
}).default({ enabled: false, level: "warn" });
var TooltipComponentsRecord = zod.z.record(TooltipComponentSchema).default({}).transform((value) => {
  const out = {};
  for (const [alias, spec] of Object.entries(value)) {
    const key = alias.trim();
    if (!key) continue;
    if (typeof spec === "string") {
      out[key] = { importPath: spec };
    } else {
      out[key] = {
        importPath: spec.path,
        exportName: spec.export ?? void 0
      };
    }
  }
  return out;
});
var FolderSchema = zod.z.object({
  path: TrimmedString,
  defaultIcon: TrimmedString.optional(),
  tooltipComponents: TooltipComponentsRecord
});
var OptionsSchema = zod.z.object({
  icons: zod.z.record(TrimmedString).default({}),
  darkModeIcons: zod.z.record(TrimmedString).optional(),
  iconProps: zod.z.record(zod.z.unknown()).optional(),
  folders: zod.z.array(FolderSchema).default([]),
  debug: DebugOptionsSchema
}).transform((value) => {
  const aggregated = {};
  for (const folder of value.folders) {
    for (const [alias, spec] of Object.entries(folder.tooltipComponents)) {
      if (aggregated[alias]) continue;
      aggregated[alias] = spec;
    }
  }
  return { ...value, tooltipComponents: aggregated };
});
function validateOptions(input) {
  const parsed = OptionsSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return {
      options: {
        icons: {},
        tooltipComponents: {},
        folders: [],
        debug: { enabled: false, level: "warn" }
      },
      warnings: [{
        code: "EMPTY_ICONS_OBJECT",
        message: "Invalid options; falling back to empty configuration.",
        details: { issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) }
      }]
    };
  }
  const options = parsed.data;
  const rawFoldersInput = Array.isArray(input?.folders) ? input.folders : [];
  const warnings = [];
  if (!options.icons || Object.keys(options.icons).length === 0) {
    warnings.push({
      code: "EMPTY_ICONS_OBJECT",
      message: "`icons` is empty; links will render without icons unless pages specify one later and a default is set."
    });
  }
  if (options.darkModeIcons) {
    for (const id of Object.keys(options.darkModeIcons)) {
      if (!options.icons[id]) {
        warnings.push({
          code: "DARK_MODE_ICON_UNKNOWN",
          message: "darkModeIcons contains an id not present in `icons`.",
          details: { id }
        });
      }
    }
  }
  for (const id of Object.keys(options.icons)) {
    if (!id.trim()) {
      warnings.push({
        code: "ICON_ID_EMPTY",
        message: "An icon id is an empty string."
      });
    }
  }
  if (options.folders.length === 0) {
    warnings.push({
      code: "FOLDERS_REQUIRED",
      message: "`folders` must list at least one directory to scan."
    });
  }
  const seenFolderPaths = /* @__PURE__ */ new Map();
  options.folders.forEach((folder, index) => {
    const normalizedPathRaw = folder.path.replace(/\\/g, "/").replace(/\/+$/, "");
    const normalizedPath = normalizedPathRaw || ".";
    const seenCount = seenFolderPaths.get(normalizedPath) ?? 0;
    if (seenCount > 0) {
      warnings.push({
        code: "FOLDER_PATH_DUPLICATE",
        message: "Duplicate folder configuration detected.",
        details: { path: normalizedPath }
      });
    }
    seenFolderPaths.set(normalizedPath, seenCount + 1);
    if (folder.defaultIcon && !options.icons[folder.defaultIcon]) {
      warnings.push({
        code: "FOLDER_DEFAULT_ICON_UNKNOWN",
        message: "`defaultIcon` refers to an unknown icon id.",
        details: { path: normalizedPath, defaultIcon: folder.defaultIcon }
      });
    }
    const rawFolder = rawFoldersInput[index];
    const rawTooltip = rawFolder && typeof rawFolder === "object" ? rawFolder.tooltipComponents : void 0;
    if (rawTooltip && typeof rawTooltip === "object") {
      for (const alias of Object.keys(rawTooltip)) {
        if (!String(alias).trim()) {
          warnings.push({
            code: "FOLDER_TOOLTIP_COMPONENT_ALIAS_EMPTY",
            message: "`tooltipComponents` contains a component key that is empty.",
            details: { path: normalizedPath }
          });
        }
      }
    }
  });
  return { options, warnings };
}
var SupportedExt = /* @__PURE__ */ new Set([".md", ".mdx"]);
var FM = zod.z.object({
  id: zod.z.string().optional(),
  slug: zod.z.string().optional(),
  title: zod.z.string().optional(),
  "smartlink-terms": zod.z.array(zod.z.string()).optional(),
  linkify: zod.z.boolean().optional(),
  "smartlink-icon": zod.z.string().optional(),
  "smartlink-short-note": zod.z.string().optional()
});
function isSupportedExt(path, extOverride) {
  const ext = (extOverride ?? path.slice(path.lastIndexOf("."))).toLowerCase();
  return SupportedExt.has(ext);
}
function normalizeSmartlinkTerms(list) {
  const seen = /* @__PURE__ */ new Set();
  const terms = [];
  for (const value of list) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(trimmed);
  }
  return terms;
}
function pickRelativeCandidate(file) {
  if (typeof file.relativePath === "string" && file.relativePath.trim()) {
    return file.relativePath.trim();
  }
  if (typeof file.path === "string" && file.path.trim()) {
    const normalized = file.path.replace(/\\/g, "/");
    const idx = normalized.lastIndexOf("/");
    return idx >= 0 ? normalized.slice(idx + 1) : normalized;
  }
  return null;
}
function inferDefaultSlug(file) {
  const candidate = pickRelativeCandidate(file);
  if (!candidate) return null;
  const normalized = candidate.replace(/\\/g, "/");
  const withoutLeading = normalized.replace(/^\.+\/+/, "").replace(/^\/+/, "");
  const collapsed = withoutLeading.replace(/\/+/g, "/");
  const withoutExt = collapsed.replace(/\.[^./]+$/, "");
  const trimmed = withoutExt.replace(/\/+$/, "");
  if (!trimmed) return null;
  return `/${trimmed}`;
}
function parseFrontmatter(files) {
  const entries = [];
  const warnings = [];
  for (const file of files) {
    if (!isSupportedExt(file.path, file.ext)) {
      warnings.push({
        path: file.path,
        code: "UNSUPPORTED_EXT",
        message: "Unsupported extension (only .md/.mdx are processed)."
      });
      continue;
    }
    try {
      const { data } = matter__default.default(file.content ?? "");
      const res = FM.safeParse(data ?? {});
      if (!res.success) {
        warnings.push({
          path: file.path,
          code: "INVALID_TYPE",
          message: "Frontmatter has invalid shape.",
          details: { issues: res.error.issues.map((i) => ({ path: i.path, message: i.message })) }
        });
        continue;
      }
      const fm = res.data;
      const linkify = fm.linkify ?? true;
      if (!linkify) {
        warnings.push({
          path: file.path,
          code: "LINKIFY_FALSE",
          message: "`linkify:false` \u2013 skipped from index."
        });
        continue;
      }
      const hasSmartlinkTermsField = Object.prototype.hasOwnProperty.call(fm, "smartlink-terms");
      const smartlinkTermsRaw = fm["smartlink-terms"];
      if (!hasSmartlinkTermsField || typeof smartlinkTermsRaw === "undefined") {
        continue;
      }
      if (!Array.isArray(smartlinkTermsRaw)) {
        warnings.push({
          path: file.path,
          code: "INVALID_TYPE",
          message: "`smartlink-terms` must be an array of strings."
        });
        continue;
      }
      const terms = normalizeSmartlinkTerms(smartlinkTermsRaw);
      if (terms.length === 0) {
        warnings.push({
          path: file.path,
          code: "EMPTY_SMARTLINK_TERMS",
          message: "`smartlink-terms` must include at least one non-empty string."
        });
        continue;
      }
      const id = (fm.id ?? "").trim();
      if (!id) {
        warnings.push({
          path: file.path,
          code: "EMPTY_ID",
          message: "Missing required `id`."
        });
        continue;
      }
      let slug = (fm.slug ?? "").trim();
      if (!slug) {
        slug = inferDefaultSlug(file) ?? "";
      }
      if (!slug) {
        warnings.push({
          path: file.path,
          code: "MISSING_REQUIRED",
          message: "Unable to determine slug \u2013 please add a `slug` or ensure file path can be inferred."
        });
        continue;
      }
      if (!slug.startsWith("/")) {
        warnings.push({
          path: file.path,
          code: "INVALID_TYPE",
          message: "`slug` must start with `/`.",
          details: { slug }
        });
        continue;
      }
      const shortRaw = typeof fm["smartlink-short-note"] === "string" ? fm["smartlink-short-note"].trim() : "";
      const shortNote = shortRaw ? shortRaw : void 0;
      const iconRaw = typeof fm["smartlink-icon"] === "string" ? fm["smartlink-icon"].trim() : "";
      const icon = iconRaw ? iconRaw : void 0;
      entries.push({
        id,
        slug,
        terms,
        linkify: true,
        icon,
        shortNote,
        sourcePath: file.path,
        folderId: file.folderId
      });
    } catch (err) {
      warnings.push({
        path: file.path,
        code: "INVALID_TYPE",
        message: "Failed to parse frontmatter.",
        details: { error: String(err?.message ?? err) }
      });
      continue;
    }
  }
  return { entries, warnings };
}

// src/codegen/notesEmitter.ts
function safeId(id) {
  return id.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
}
async function emitShortNoteModule(id, shortNote, compileMdx) {
  const sn = (shortNote ?? "").trim();
  if (!sn) return null;
  try {
    const compile = compileMdx ?? (await import('@mdx-js/mdx')).compile;
    const compiled = await compile(sn, {
      // Important: keep ESM output (string), we will wrap it into our TSX module.
      // We do not inject provider import source here; we pass components via props.
      development: false,
      // Ensure we output a full "program" so we can wrap/re-export cleanly.
      outputFormat: "program"
    });
    const esm = String(compiled.value);
    const mod = `
/* AUTO-GENERATED: do not edit by hand */
import * as React from 'react';

// The MDX compiler output:
${esm}

// Stable wrapper API expected by the theme:
export function ShortNote(props) {
  const { components, ...rest } = props ?? {};
  const mdxProps = components ? { components, ...rest } : rest;
  // MDXContent is the default export from the compiled MDX above
  return React.createElement(MDXContent, mdxProps);
}
`.trimStart();
    const filename = `notes/${safeId(id)}.js`;
    return { filename, contents: mod };
  } catch {
    const text = JSON.stringify(sn);
    const mod = `
/* AUTO-GENERATED: fallback markdown note */
import * as React from 'react';
import ReactMarkdown from 'react-markdown';

export function ShortNote(props) {
  const { components, ...rest } = props ?? {};
  return React.createElement(
    ReactMarkdown,
    components ? { components, ...rest } : rest,
    ${text}
  );
}
`.trimStart();
    const filename = `notes/${safeId(id)}.js`;
    return { filename, contents: mod };
  }
}

// src/codegen/registryEmitter.ts
function emitRegistry(entries, noteModules) {
  const imports = [];
  const records = [];
  const noteById = /* @__PURE__ */ new Map();
  for (const m of noteModules) {
    const base = m.filename.replace(/^notes\//, "").replace(/\.js$/, "");
    noteById.set(base, m);
  }
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  for (const e of sorted) {
    const safeId2 = e.id.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
    const note = noteById.get(safeId2);
    let shortNoteField = "";
    if (note) {
      const importName = `ShortNote_${safeId2.replace(/-/g, "_")}`;
      imports.push(`import { ShortNote as ${importName} } from './${note.filename}';`);
      shortNoteField = `ShortNote: ${importName},`;
    }
    const iconField = e.icon ? `    icon: "${e.icon}",
` : "";
    const permalinkField = `    permalink: "${e.slug}",
`;
    const shortField = shortNoteField ? `    ${shortNoteField}
` : "";
    records.push(`  "${e.id}": {
    id: "${e.id}",
    slug: "${e.slug}",
${permalinkField}${iconField}${shortField}  }`);
  }
  const mod = `
/* AUTO-GENERATED REGISTRY */
import * as React from 'react';
${imports.join("\n")}

export const registry = {
${records.join(",\n")}
};
`.trimStart();
  return { filename: "registry.js", contents: mod };
}

// src/node/buildPipeline.ts
async function buildArtifacts(files, options) {
  const { entries } = parseFrontmatter(files);
  const notes = [];
  const compile = options?.compileMdx;
  for (const e of entries) {
    if (e.shortNote) {
      const mod = await emitShortNoteModule(e.id, e.shortNote, compile);
      if (mod) notes.push(mod);
    }
  }
  const registry = emitRegistry(entries, notes);
  return { entries, notes, registry };
}

// src/codegen/tooltipComponentsEmitter.ts
function emitTooltipComponentsModule(components) {
  const entries = Object.entries(components);
  const imports = [];
  const assignments = [];
  for (const [idx, [alias, spec]] of entries.entries()) {
    const localName = `TooltipComponent_${idx}`;
    if (spec.exportName) {
      imports.push(
        `import { ${spec.exportName} as ${localName} } from '${spec.importPath}';`
      );
    } else {
      imports.push(`import ${localName} from '${spec.importPath}';`);
    }
    assignments.push(`  ${JSON.stringify(alias)}: ${localName}`);
  }
  const importBlock = imports.length > 0 ? `${imports.join("\n")}

` : "";
  const recordsBlock = assignments.length > 0 ? `${assignments.join(",\n")}
` : "";
  const contents = `
/* AUTO-GENERATED: tooltip component registry */
${importBlock}export const tooltipComponents = {
${recordsBlock}};
`.trimStart();
  return { filename: "tooltipComponents.js", contents };
}
function resolveStaticDirs(siteDir, relative7) {
  return (relative7 ?? []).map((dir) => path.join(siteDir, dir));
}
async function createTooltipMdxCompiler(context) {
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
    admonitions: false
  };
  const processor = await processor_js.createProcessorUncached({
    options: mdxOptions,
    format: "mdx"
  });
  let counter = 0;
  return async (value) => {
    counter += 1;
    const filePath = path.join(
      siteDir,
      ".docusaurus",
      "docusaurus-plugin-smartlinker",
      `tooltip-note-${counter}.mdx`
    );
    const result = await processor.process({
      content: value,
      filePath,
      frontMatter: {},
      compilerName: "client"
    });
    return { value: result.content };
  };
}

// src/indexProviderStore.ts
var GLOBAL_KEY = Symbol.for("docusaurus-plugin-smartlinker.indexProvider");
var currentProvider;
function readGlobalProvider() {
  const store = globalThis;
  const value = store[GLOBAL_KEY];
  if (value && typeof value === "object") {
    return value;
  }
  return void 0;
}
function writeGlobalProvider(provider) {
  const store = globalThis;
  if (!provider) {
    delete store[GLOBAL_KEY];
  } else {
    store[GLOBAL_KEY] = provider;
  }
}
function toTargets(entries) {
  return entries.map((entry) => ({
    id: entry.id,
    slug: entry.slug,
    icon: entry.icon,
    sourcePath: entry.sourcePath,
    terms: entry.terms,
    folderId: entry.folderId ?? null
  }));
}
function setIndexEntries(entries) {
  const targets = toTargets(entries);
  currentProvider = {
    getAllTargets() {
      return targets;
    },
    getCurrentFilePath(file) {
      if (file && typeof file.path === "string") {
        return file.path;
      }
      return "";
    }
  };
  writeGlobalProvider(currentProvider);
}
function getIndexProvider() {
  return currentProvider ?? readGlobalProvider();
}

// src/frontmatterAdapter.ts
function loadIndexFromFiles(files) {
  return parseFrontmatter(files);
}

// src/logger.ts
var LOG_LEVELS = ["error", "warn", "info", "debug", "trace"];
var LEVEL_RANK = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
};
var LEVEL_COLORS = {
  error: "\x1B[31m",
  warn: "\x1B[33m",
  info: "\x1B[36m",
  debug: "\x1B[35m",
  trace: "\x1B[90m"
};
var COLOR_RESET = "\x1B[0m";
function normalizeBoolean(value) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (["0", "false", "no", "off", "disable", "disabled"].includes(normalized)) {
    return false;
  }
  if (["1", "true", "yes", "on", "enable", "enabled"].includes(normalized)) {
    return true;
  }
  return true;
}
function normalizeLevel(value) {
  const normalized = value.trim().toLowerCase();
  if (LOG_LEVELS.includes(normalized)) {
    return normalized;
  }
  return void 0;
}
function shouldUseColor(env) {
  if (typeof process === "undefined") {
    return false;
  }
  const stdout = process.stdout;
  if (!stdout || typeof stdout.isTTY !== "boolean") {
    return false;
  }
  if (!stdout.isTTY) {
    return false;
  }
  const ci = env?.CI ?? process.env?.CI;
  if (typeof ci === "string" && ci !== "" && ci !== "0" && ci.toLowerCase() !== "false") {
    return false;
  }
  return true;
}
function getConsoleMethod(level) {
  if (level === "error" && typeof console.error === "function") {
    return console.error.bind(console);
  }
  if (level === "warn" && typeof console.warn === "function") {
    return console.warn.bind(console);
  }
  return typeof console.log === "function" ? console.log.bind(console) : () => {
  };
}
function formatFieldValue(value) {
  if (value === void 0) {
    return void 0;
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    if (!value) {
      return "''";
    }
    if (/\s/.test(value) || /["'\\]/.test(value)) {
      return JSON.stringify(value);
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
function formatDetails(details) {
  if (!details) {
    return "";
  }
  const parts = [];
  for (const [key, rawValue] of Object.entries(details)) {
    const formatted = formatFieldValue(rawValue);
    if (formatted === void 0) continue;
    parts.push(`${key}=${formatted}`);
  }
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}
function resolveDetails(details) {
  if (!details) {
    return void 0;
  }
  if (typeof details === "function") {
    try {
      return details();
    } catch {
      return void 0;
    }
  }
  return details;
}
function resolveDebugConfig(base, env = process.env) {
  const fallback = base ?? { enabled: false, level: "warn" };
  let enabled = fallback.enabled ?? false;
  let level = fallback.level ?? "warn";
  let source = "config";
  const appliedOverrides = {};
  let invalidLevel;
  const envEnabledRaw = env?.DOCUSAURUS_PLUGIN_DEBUG;
  if (typeof envEnabledRaw === "string") {
    enabled = normalizeBoolean(envEnabledRaw);
    appliedOverrides.enabled = enabled;
    source = "env";
  }
  const envLevelRaw = env?.DOCUSAURUS_PLUGIN_DEBUG_LEVEL;
  if (typeof envLevelRaw === "string") {
    const normalized = normalizeLevel(envLevelRaw);
    if (normalized) {
      level = normalized;
      appliedOverrides.level = normalized;
      source = "env";
    } else {
      invalidLevel = envLevelRaw;
    }
  }
  if (!LOG_LEVELS.includes(level)) {
    level = "warn";
  }
  return {
    config: { enabled, level },
    source,
    appliedOverrides,
    invalidLevel
  };
}
function createLogger(init) {
  const { pluginName: pluginName2, debug } = init;
  const env = init.env ?? process.env;
  const now = init.now ?? (() => /* @__PURE__ */ new Date());
  const active = Boolean(debug?.enabled);
  const thresholdLevel = debug?.level ?? "warn";
  const threshold = LEVEL_RANK[thresholdLevel] ?? LEVEL_RANK.warn;
  const colorize = shouldUseColor(env);
  const isLevelEnabled = (level) => {
    if (!active) return false;
    return LEVEL_RANK[level] <= threshold;
  };
  const write = (level, context, message, details) => {
    if (!isLevelEnabled(level)) {
      return;
    }
    const consoleMethod = getConsoleMethod(level);
    const timestamp = now().toISOString();
    const levelTag = `[${level.toUpperCase()}]`;
    const coloredLevel = colorize ? `${LEVEL_COLORS[level]}${levelTag}${COLOR_RESET}` : levelTag;
    const pluginTag = `[${pluginName2}]`;
    const contextTag = context ? ` [${context}]` : "";
    const resolvedDetails = resolveDetails(details);
    const detailStr = formatDetails(resolvedDetails);
    const line = `${timestamp} ${coloredLevel} ${pluginTag}${contextTag} ${message}${detailStr}`.trimEnd();
    consoleMethod(line);
  };
  const log = (level, context, message, details) => {
    write(level, context, message, details);
  };
  const makeLevelLogger = (level) => {
    return (context, message, details) => {
      log(level, context, message, details);
    };
  };
  const child = (context) => {
    const scopedLog = (level, message, details) => {
      log(level, context, message, details);
    };
    const makeScoped = (level) => {
      return (message, details) => {
        scopedLog(level, message, details);
      };
    };
    return {
      context,
      level: thresholdLevel,
      isLevelEnabled,
      log: scopedLog,
      error: makeScoped("error"),
      warn: makeScoped("warn"),
      info: makeScoped("info"),
      debug: makeScoped("debug"),
      trace: makeScoped("trace")
    };
  };
  return {
    level: thresholdLevel,
    isLevelEnabled,
    log,
    error: makeLevelLogger("error"),
    warn: makeLevelLogger("warn"),
    info: makeLevelLogger("info"),
    debug: makeLevelLogger("debug"),
    trace: makeLevelLogger("trace"),
    child
  };
}

// src/debugStore.ts
var GLOBAL_KEY2 = Symbol.for("docusaurus-plugin-smartlinker.debug");
function setDebugConfig(config) {
  const store = globalThis;
  if (!config) {
    delete store[GLOBAL_KEY2];
  } else {
    store[GLOBAL_KEY2] = config;
  }
}
function getDebugConfig() {
  const store = globalThis;
  const value = store[GLOBAL_KEY2];
  if (value && typeof value === "object") return value;
  return void 0;
}

// src/metricsStore.ts
var termProcessingMs = 0;
var indexBuildMs = 0;
function normalizeDuration(value) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Number(value.toFixed(2));
}
function recordTermProcessingMs(durationMs) {
  const normalized = normalizeDuration(durationMs);
  if (normalized <= 0) {
    return;
  }
  termProcessingMs += normalized;
}
function getTermProcessingMs() {
  return Number(termProcessingMs.toFixed(2));
}
function consumeTermProcessingMs() {
  const total = getTermProcessingMs();
  termProcessingMs = 0;
  return total;
}
function resetTermProcessingMs() {
  termProcessingMs = 0;
}
function recordIndexBuildMs(durationMs) {
  const normalized = normalizeDuration(durationMs);
  if (normalized <= 0) {
    return;
  }
  indexBuildMs += normalized;
}
function getIndexBuildMs() {
  return Number(indexBuildMs.toFixed(2));
}
function consumeIndexBuildMs() {
  const total = getIndexBuildMs();
  indexBuildMs = 0;
  return total;
}
function resetIndexBuildMs() {
  indexBuildMs = 0;
}
function resetMetrics() {
  resetTermProcessingMs();
  resetIndexBuildMs();
}
var GLOBAL_KEY3 = Symbol.for("docusaurus-plugin-smartlinker.termUsage");
function getState() {
  const store = globalThis;
  const existing = store[GLOBAL_KEY3];
  if (existing && typeof existing === "object" && existing instanceof Object && "byTerm" in existing && "byDoc" in existing) {
    const candidate = existing;
    if (candidate.byTerm instanceof Map && candidate.byDoc instanceof Map) {
      return candidate;
    }
  }
  const fresh = {
    byTerm: /* @__PURE__ */ new Map(),
    byDoc: /* @__PURE__ */ new Map()
  };
  store[GLOBAL_KEY3] = fresh;
  return fresh;
}
function normalizeDocPath(docPath) {
  if (!docPath || typeof docPath !== "string") return null;
  const trimmed = docPath.trim();
  if (!trimmed) return null;
  const abs = path.isAbsolute(trimmed) ? trimmed : path.resolve(trimmed);
  try {
    return path.normalize(abs).replace(/\\/g, "/");
  } catch {
    return abs.replace(/\\/g, "/");
  }
}
function updateTermBindings(state, docPath, nextTerms) {
  const prevTerms = state.byDoc.get(docPath);
  if (prevTerms) {
    for (const term of prevTerms) {
      const docs = state.byTerm.get(term);
      if (!docs) continue;
      docs.delete(docPath);
      if (docs.size === 0) {
        state.byTerm.delete(term);
      }
    }
  }
  if (nextTerms.size === 0) {
    state.byDoc.delete(docPath);
    return;
  }
  state.byDoc.set(docPath, nextTerms);
  for (const term of nextTerms) {
    const docs = state.byTerm.get(term) ?? /* @__PURE__ */ new Set();
    docs.add(docPath);
    state.byTerm.set(term, docs);
  }
}
function updateDocTermUsage(docPath, termIds) {
  const normalizedPath = normalizeDocPath(docPath);
  if (!normalizedPath) return;
  const terms = /* @__PURE__ */ new Set();
  for (const id of termIds) {
    if (!id) continue;
    const trimmed = `${id}`.trim();
    if (!trimmed) continue;
    terms.add(trimmed);
  }
  const state = getState();
  updateTermBindings(state, normalizedPath, terms);
}
function removeDocTermUsage(docPath) {
  updateDocTermUsage(docPath, []);
}
function getDocsReferencingTerms(termIds) {
  const state = getState();
  const docs = /* @__PURE__ */ new Set();
  for (const id of termIds) {
    if (!id) continue;
    const trimmed = `${id}`.trim();
    if (!trimmed) continue;
    const registered = state.byTerm.get(trimmed);
    if (!registered) continue;
    for (const doc of registered) {
      docs.add(doc);
    }
  }
  return Array.from(docs);
}
function resetTermUsage() {
  const state = getState();
  state.byTerm.clear();
  state.byDoc.clear();
}
function normalizeFolderId(siteDir, absPath) {
  const relPath = path.relative(siteDir, absPath);
  const useRelative = relPath && !relPath.startsWith("..") && !path.isAbsolute(relPath);
  const candidate = useRelative ? relPath : absPath;
  const normalized = candidate.replace(/\\/g, "/").replace(/\/+$/, "");
  return normalized || ".";
}
function normalizeFsPath(siteDir, filePath) {
  if (!filePath) {
    return siteDir.replace(/\\/g, "/");
  }
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(siteDir, filePath);
  return abs.replace(/\\/g, "/");
}
function formatSiteRelativePath(siteDir, absPath) {
  const relPath = path.relative(siteDir, absPath);
  const useRel = relPath && !relPath.startsWith("..") && !path.isAbsolute(relPath);
  const normalized = (useRel ? relPath : absPath).replace(/\\/g, "/");
  return normalized || ".";
}

// src/plugin/state.ts
var EntryStateCache = class {
  constructor(siteDir) {
    this.siteDir = siteDir;
  }
  cachedEntries = [];
  cachedEntrySignatures = /* @__PURE__ */ new Map();
  cachedEntriesBySource = /* @__PURE__ */ new Map();
  computeEntrySignature(entry) {
    return JSON.stringify({
      slug: entry.slug,
      terms: [...entry.terms],
      icon: entry.icon ?? null,
      shortNote: entry.shortNote ?? null,
      folderId: entry.folderId ?? null,
      sourcePath: normalizeFsPath(this.siteDir, entry.sourcePath ?? "")
    });
  }
  refresh(entries) {
    this.cachedEntries = entries.map((e) => ({ ...e }));
    const signatures = /* @__PURE__ */ new Map();
    const bySource = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      signatures.set(entry.id, this.computeEntrySignature(entry));
      const key = normalizeFsPath(this.siteDir, entry.sourcePath ?? "");
      const list = bySource.get(key);
      if (list) list.push(entry);
      else bySource.set(key, [entry]);
    }
    this.cachedEntrySignatures = signatures;
    this.cachedEntriesBySource = bySource;
  }
  diff(nextEntries, impactedPaths) {
    const impactedTermIds = /* @__PURE__ */ new Set();
    const nextBySource = /* @__PURE__ */ new Map();
    const nextSignatures = /* @__PURE__ */ new Map();
    for (const entry of nextEntries) {
      const sourceKey = normalizeFsPath(this.siteDir, entry.sourcePath ?? "");
      const arr = nextBySource.get(sourceKey);
      if (arr) arr.push(entry);
      else nextBySource.set(sourceKey, [entry]);
      nextSignatures.set(entry.id, this.computeEntrySignature(entry));
    }
    for (const path of impactedPaths) {
      const prevEntries = this.cachedEntriesBySource.get(path);
      if (prevEntries) {
        for (const entry of prevEntries) impactedTermIds.add(entry.id);
      }
      const nextEntriesForPath = nextBySource.get(path);
      if (nextEntriesForPath) {
        for (const entry of nextEntriesForPath) impactedTermIds.add(entry.id);
      }
    }
    const addedTermIds = /* @__PURE__ */ new Set();
    const removedTermIds = /* @__PURE__ */ new Set();
    const changedTermIds = /* @__PURE__ */ new Set();
    for (const [id, signature] of nextSignatures) {
      const previous = this.cachedEntrySignatures.get(id);
      if (previous === void 0) {
        addedTermIds.add(id);
        changedTermIds.add(id);
      } else if (previous !== signature) {
        changedTermIds.add(id);
      }
    }
    for (const [id] of this.cachedEntrySignatures) {
      if (!nextSignatures.has(id)) {
        removedTermIds.add(id);
        changedTermIds.add(id);
      }
    }
    return { impactedTermIds, addedTermIds, removedTermIds, changedTermIds };
  }
};
function buildWatchPattern(siteDir, absPath) {
  const normalized = normalizeFsPath(siteDir, absPath).replace(/\/+$/, "");
  return `${normalized}/**/*.{md,mdx}`;
}
function getPathsToWatch(siteDir, resolvedFolders) {
  const patterns = /* @__PURE__ */ new Set();
  for (const folder of resolvedFolders) {
    patterns.add(buildWatchPattern(siteDir, folder.absPath));
  }
  return Array.from(patterns);
}
function isPathWithinFolder(absPath, resolvedFolders) {
  for (const folder of resolvedFolders) {
    const relPath = path.relative(folder.absPath, absPath);
    if (!relPath || !relPath.startsWith("..") && !path.isAbsolute(relPath)) {
      return true;
    }
  }
  return false;
}
function filterRelevantPaths(siteDir, paths, resolvedFolders) {
  const relevant = /* @__PURE__ */ new Set();
  for (const candidate of paths) {
    if (!candidate) continue;
    const absPath = normalizeFsPath(siteDir, candidate);
    if (isPathWithinFolder(absPath, resolvedFolders)) {
      relevant.add(absPath);
    }
  }
  return relevant;
}
function createOnFilesChangeHandler(deps) {
  return async function onFilesChange({ changedFiles, deletedFiles }) {
    const candidates = [...changedFiles ?? [], ...deletedFiles ?? []];
    const relevantPaths = filterRelevantPaths(deps.siteDir, candidates, deps.resolvedFolders);
    if (relevantPaths.size === 0) {
      if (deps.watchLogger.isLevelEnabled("trace")) {
        deps.watchLogger.trace("No SmartLink folders affected by file change", () => ({
          changedFiles: changedFiles ?? [],
          deletedFiles: deletedFiles ?? []
        }));
      }
      return;
    }
    const start = deps.startTimer(deps.watchLogger, "info", "debug");
    const files = deps.collectFiles();
    deps.stats.scannedFileCount = files.length;
    const indexBuildStart = Date.now();
    const { entries } = deps.loadIndexFromFiles(files);
    deps.applyFolderDefaults(entries);
    deps.recordIndexBuildMs(Date.now() - indexBuildStart);
    const { impactedTermIds, addedTermIds, removedTermIds, changedTermIds } = deps.entryState.diff(
      entries,
      relevantPaths
    );
    deps.setIndexEntries(entries);
    deps.entryState.refresh(entries);
    deps.stats.entryCount = entries.length;
    const docsForReload = new Set(deps.getDocsReferencingTerms(changedTermIds));
    const touchedDocs = [];
    if (docsForReload.size > 0) {
      const now = /* @__PURE__ */ new Date();
      for (const docPath of docsForReload) {
        const absDocPath = deps.normalizePath(docPath);
        if (!deps.existsSync(absDocPath)) continue;
        try {
          deps.utimesSync(absDocPath, now, now);
          touchedDocs.push(absDocPath);
        } catch (error) {
          if (deps.watchLogger.isLevelEnabled("warn")) {
            deps.watchLogger.warn("Failed to mark SmartLink consumer for rebuild", () => ({
              file: deps.toSiteRel(absDocPath),
              error: error instanceof Error ? error.message : String(error)
            }));
          }
        }
      }
    }
    if (deps.watchLogger.isLevelEnabled("info")) {
      deps.watchLogger.info("SmartLink watch rebuild complete", {
        scannedFileCount: files.length,
        changedTermCount: changedTermIds.size,
        addedTermCount: addedTermIds.size,
        removedTermCount: removedTermIds.size,
        rebuiltDocCount: touchedDocs.length,
        durationMs: deps.endTimer(start)
      });
    }
    if (deps.watchLogger.isLevelEnabled("debug")) {
      deps.watchLogger.debug("SmartLink watch diff", () => ({
        triggeredBy: Array.from(relevantPaths).map((p) => deps.toSiteRel(p)),
        impactedTermIds: Array.from(impactedTermIds),
        changedTermIds: Array.from(changedTermIds),
        addedTermIds: Array.from(addedTermIds),
        removedTermIds: Array.from(removedTermIds),
        rebuiltDocs: touchedDocs.map((p) => deps.toSiteRel(p))
      }));
    }
  };
}
function toAliasedSitePath(siteDir, absPath) {
  if (!absPath) return null;
  const rel = path.relative(siteDir, absPath);
  if (!rel || rel.startsWith("..")) return null;
  return `@site/${rel.replace(/\\/g, "/")}`;
}
function buildDocLookups(docsContent) {
  const byDocId = /* @__PURE__ */ new Map();
  const bySource = /* @__PURE__ */ new Map();
  const byFrontmatterId = /* @__PURE__ */ new Map();
  const bySlug = /* @__PURE__ */ new Map();
  const byPermalink = /* @__PURE__ */ new Map();
  if (!docsContent) {
    return { byDocId, bySource, byFrontmatterId, bySlug, byPermalink };
  }
  const register = (doc) => {
    if (!doc) return;
    if (doc.id && !byDocId.has(doc.id)) byDocId.set(doc.id, doc);
    if (doc.source) {
      const normalized = doc.source.replace(/\\/g, "/");
      if (!bySource.has(normalized)) bySource.set(normalized, doc);
    }
    const fmId = doc?.frontMatter?.id;
    if (typeof fmId === "string" && fmId.trim() && !byFrontmatterId.has(fmId.trim())) {
      byFrontmatterId.set(fmId.trim(), doc);
    }
    if (doc.slug && doc.slug.trim() && !bySlug.has(doc.slug.trim())) {
      bySlug.set(doc.slug.trim(), doc);
    }
    if (doc.permalink && doc.permalink.trim() && !byPermalink.has(doc.permalink.trim())) {
      byPermalink.set(doc.permalink.trim(), doc);
    }
  };
  for (const content of Object.values(docsContent)) {
    if (!content) continue;
    const versions = content.loadedVersions ?? [];
    for (const version of versions) {
      const docs = version.docs ?? [];
      for (const doc of docs) register(doc);
    }
  }
  return { byDocId, bySource, byFrontmatterId, bySlug, byPermalink };
}
function resolveEntryPermalinks(options) {
  const { entries, siteDir, docsContent } = options;
  const lookups = buildDocLookups(docsContent);
  return entries.map((entry) => {
    const alias = toAliasedSitePath(siteDir, entry.sourcePath);
    let doc;
    if (entry.docId) {
      doc = lookups.byDocId.get(entry.docId);
    }
    if (!doc && alias) {
      doc = lookups.bySource.get(alias);
    }
    if (!doc) {
      doc = lookups.byFrontmatterId.get(entry.id);
    }
    if (!doc && entry.slug) {
      doc = lookups.bySlug.get(entry.slug) ?? lookups.byPermalink.get(entry.slug);
    }
    const permalink = doc?.permalink ? doc.permalink.trim() : void 0;
    const docId = entry.docId ?? doc?.id ?? null;
    return {
      id: entry.id,
      slug: entry.slug,
      icon: entry.icon,
      folderId: entry.folderId,
      docId,
      permalink
    };
  });
}

// src/plugin/publish.ts
function publishGlobalData(actions, opts, entries) {
  const registryMeta = entries.map(({ id, slug, icon, folderId, docId, permalink }) => ({
    id,
    slug,
    icon: icon ?? null,
    folderId: folderId ?? null,
    docId: docId ?? null,
    permalink: permalink ?? null
  }));
  actions.setGlobalData({ options: opts, entries: registryMeta });
}
function loadDocsContentFromGenerated(generatedFilesDir) {
  const root = path.join(generatedFilesDir, "docusaurus-plugin-content-docs");
  const result = {};
  let pluginIds = [];
  try {
    pluginIds = fs.readdirSync(root);
  } catch {
    return result;
  }
  for (const pluginId of pluginIds) {
    const pluginDir = path.join(root, pluginId);
    let stats;
    try {
      stats = fs.statSync(pluginDir);
    } catch {
      continue;
    }
    if (!stats.isDirectory()) continue;
    const docs = [];
    for (const file of fs.readdirSync(pluginDir)) {
      if (!file.endsWith(".json")) continue;
      if (file.startsWith("__")) continue;
      const abs = path.join(pluginDir, file);
      try {
        const parsed = JSON.parse(fs.readFileSync(abs, "utf8"));
        if (parsed && typeof parsed === "object" && typeof parsed.permalink === "string") {
          docs.push(parsed);
        }
      } catch {
        continue;
      }
    }
    result[pluginId] = {
      loadedVersions: [
        {
          docs
        }
      ]
    };
  }
  return result;
}
async function resolveAndPublish(args) {
  const { context, actions, opts, entries, computeDocIdForEntry, stats, contentLogger, endTimer: endTimer2, startTime } = args;
  const enrichedEntries = entries.map((entry) => ({
    ...entry,
    docId: entry.docId ?? computeDocIdForEntry(entry)
  }));
  const docsContent = loadDocsContentFromGenerated(context.generatedFilesDir);
  const resolved = resolveEntryPermalinks({
    siteDir: context.siteDir,
    entries: enrichedEntries,
    docsContent
  });
  stats.resolvedCount = resolved.length;
  publishGlobalData(actions, opts, resolved);
  if (contentLogger.isLevelEnabled("info")) {
    contentLogger.info("Published SmartLink global data", {
      entryCount: resolved.length,
      durationMs: endTimer2(startTime)
    });
  }
  if (contentLogger.isLevelEnabled("trace") && resolved.length > 0) {
    contentLogger.trace("Resolved SmartLink permalinks", () => ({
      permalinks: resolved.map((entry) => entry.permalink ?? null)
    }));
  }
}
async function writeGeneratedModules(args) {
  const { actions, notes, registry, tooltipComponentsModule, contentLogger } = args;
  if (contentLogger.isLevelEnabled("debug")) {
    contentLogger.debug("Writing SmartLink generated modules", {
      noteCount: notes.length,
      registryModule: registry.filename
    });
  }
  for (const note of notes) {
    await actions.createData(note.filename, note.contents);
  }
  await actions.createData(registry.filename, registry.contents);
  await actions.createData(tooltipComponentsModule.filename, tooltipComponentsModule.contents);
}
var shouldMeasure = (log, ...levels) => levels.some((level) => log.isLevelEnabled(level));
var startTimer = (log, ...levels) => shouldMeasure(log, ...levels) ? perf_hooks.performance.now() : null;
var endTimer = (start) => {
  if (start === null) return void 0;
  return Number((perf_hooks.performance.now() - start).toFixed(2));
};
var IGNORE = /* @__PURE__ */ new Set(["node_modules", ".docusaurus", "build", ".git"]);
function scanMdFiles(opts) {
  const exts = new Set(opts.exts ?? [".md", ".mdx"]);
  const files = [];
  for (const root of opts.roots) {
    walk(root, root);
  }
  return files;
  function walk(dir, root) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (IGNORE.has(name)) continue;
      const p = path.join(dir, name);
      let s;
      try {
        s = fs.statSync(p);
      } catch {
        continue;
      }
      if (s.isDirectory()) {
        walk(p, root);
      } else {
        const low = name.toLowerCase();
        const dot = low.lastIndexOf(".");
        const ext = dot >= 0 ? low.slice(dot) : "";
        if (exts.has(ext)) {
          const content = fs.readFileSync(p, "utf8");
          const rel = path.relative(root, p).replace(/\\/g, "/");
          files.push({ path: p, content, relativePath: rel });
        }
      }
    }
  }
}

// src/plugin/files.ts
function createCollectFiles(resolvedFolders, scanLogger, startTimer2, endTimer2, toSiteRel, setScannedCount) {
  return () => {
    const start = startTimer2(scanLogger, "debug", "info");
    const files = [];
    for (const folder of resolvedFolders) {
      const scanned = scanMdFiles({ roots: [folder.absPath] });
      for (const file of scanned) {
        files.push({ ...file, folderId: folder.id });
      }
    }
    setScannedCount(files.length);
    if (scanLogger.isLevelEnabled("debug")) {
      scanLogger.debug("Scanned SmartLink folders", {
        folderCount: resolvedFolders.length,
        fileCount: files.length,
        durationMs: endTimer2(start)
      });
    }
    if (scanLogger.isLevelEnabled("trace") && files.length > 0) {
      scanLogger.trace("Collected SmartLink files", () => ({
        files: files.map((file) => toSiteRel(file.path))
      }));
    }
    return files;
  };
}
function createApplyFolderDefaults(folderById, icons) {
  return (entries) => {
    for (const entry of entries) {
      const folder = entry.folderId ? folderById.get(entry.folderId) : void 0;
      if (!folder) continue;
      if (!entry.icon && folder.defaultIcon && icons[folder.defaultIcon]) {
        entry.icon = folder.defaultIcon;
      }
    }
  };
}
function createComputeDocIdForEntry(folderById) {
  return (entry) => {
    const folder = entry.folderId ? folderById.get(entry.folderId) : void 0;
    if (!folder) return void 0;
    return deriveDocId(folder.absPath, entry.sourcePath);
  };
}
function deriveDocId(folderAbsPath, sourcePath) {
  if (!sourcePath) return void 0;
  const rel = path.relative(folderAbsPath, sourcePath);
  if (!rel || rel.startsWith("..")) return void 0;
  const normalized = rel.replace(/\\/g, "/");
  const withoutExt = normalized.replace(/\.[^./]+$/u, "");
  return withoutExt || void 0;
}

// src/plugin/prime.ts
function createPrimeIndexProvider(deps) {
  const {
    indexLogger,
    collectFiles,
    loadIndexFromFiles: loadIndexFromFiles2,
    applyFolderDefaults,
    setIndexEntries: setIndexEntries2,
    entryState,
    stats,
    recordIndexBuildMs: recordIndexBuildMs2,
    startTimer: startTimer2,
    endTimer: endTimer2
  } = deps;
  return () => {
    const start = startTimer2(indexLogger, "debug", "info");
    const files = collectFiles();
    const indexBuildStart = Date.now();
    const { entries } = loadIndexFromFiles2(files);
    applyFolderDefaults(entries);
    setIndexEntries2(entries);
    entryState.refresh(entries);
    stats.entryCount = entries.length;
    recordIndexBuildMs2(Date.now() - indexBuildStart);
    if (indexLogger.isLevelEnabled("debug")) {
      indexLogger.debug("Primed SmartLink index provider", {
        entryCount: entries.length,
        durationMs: endTimer2(start)
      });
    }
    if (indexLogger.isLevelEnabled("trace") && entries.length > 0) {
      indexLogger.trace("Primed entry identifiers", () => ({
        entryIds: entries.map((entry) => entry.id)
      }));
    }
    return files;
  };
}
function createLoadContent(deps) {
  const {
    context,
    normOpts,
    loadLogger,
    watchLogger,
    collectFiles,
    createTooltipMdxCompiler: createTooltipMdxCompiler2,
    buildArtifacts: buildArtifacts2,
    recordIndexBuildMs: recordIndexBuildMs2,
    applyFolderDefaults,
    setIndexEntries: setIndexEntries2,
    entryState,
    getDocsReferencingTerms: getDocsReferencingTerms2,
    normalizePath,
    existsSync: existsSync2,
    utimesSync: utimesSync2,
    toSiteRel,
    stats,
    startTimer: startTimer2,
    endTimer: endTimer2,
    primedRef
  } = deps;
  return async () => {
    const usingPrimed = primedRef.current !== null;
    const start = startTimer2(loadLogger, "info", "debug");
    const files = primedRef.current ?? collectFiles();
    primedRef.current = null;
    stats.reusedPrimedFiles = usingPrimed;
    stats.scannedFileCount = files.length;
    if (loadLogger.isLevelEnabled("debug")) {
      loadLogger.debug("Building SmartLink artifacts", {
        fileCount: files.length,
        reusedPrimedFiles: usingPrimed
      });
    }
    if (loadLogger.isLevelEnabled("trace") && files.length > 0) {
      loadLogger.trace("Processing SmartLink files", () => ({
        files: files.map((file) => toSiteRel(file.path))
      }));
    }
    const compileMdx = await createTooltipMdxCompiler2(context);
    const indexBuildStart = Date.now();
    const { entries, notes, registry } = await buildArtifacts2(files, {
      compileMdx
    });
    recordIndexBuildMs2(Date.now() - indexBuildStart);
    stats.entryCount = entries.length;
    stats.noteCount = notes.length;
    stats.registryBytes = buffer.Buffer.byteLength(registry.contents, "utf8");
    applyFolderDefaults(entries);
    setIndexEntries2(entries);
    try {
      const { changedTermIds, addedTermIds, removedTermIds } = entryState.diff(
        entries,
        /* @__PURE__ */ new Set()
      );
      if (changedTermIds.size > 0) {
        const docsForReload = new Set(getDocsReferencingTerms2(changedTermIds));
        const touchedDocs = [];
        if (docsForReload.size > 0) {
          const now = /* @__PURE__ */ new Date();
          for (const docPath of docsForReload) {
            const absDocPath = normalizePath(docPath);
            if (!existsSync2(absDocPath)) continue;
            try {
              utimesSync2(absDocPath, now, now);
              touchedDocs.push(absDocPath);
            } catch (error) {
              if (watchLogger.isLevelEnabled("warn")) {
                watchLogger.warn("Failed to mark SmartLink consumer for rebuild", () => ({
                  file: toSiteRel(absDocPath),
                  error: error instanceof Error ? error.message : String(error)
                }));
              }
            }
          }
        }
        if (watchLogger.isLevelEnabled("info")) {
          watchLogger.info("Detected SmartLink term changes", {
            changedTermCount: changedTermIds.size,
            addedTermCount: addedTermIds.size,
            removedTermCount: removedTermIds.size,
            rebuiltDocCount: touchedDocs.length
          });
        }
        if (watchLogger.isLevelEnabled("debug")) {
          watchLogger.debug("SmartLink change details", () => ({
            changedTermIds: Array.from(changedTermIds),
            addedTermIds: Array.from(addedTermIds),
            removedTermIds: Array.from(removedTermIds),
            rebuiltDocs: touchedDocs.map((p) => toSiteRel(p))
          }));
        }
      }
    } catch (err) {
      if (watchLogger.isLevelEnabled("warn")) {
        watchLogger.warn("SmartLink change detection failed", () => ({
          error: err instanceof Error ? err.message : String(err)
        }));
      }
    }
    entryState.refresh(entries);
    if (loadLogger.isLevelEnabled("info")) {
      loadLogger.info("Completed SmartLink artifact build", {
        entryCount: entries.length,
        noteCount: notes.length,
        durationMs: endTimer2(start)
      });
    }
    if (loadLogger.isLevelEnabled("debug")) {
      loadLogger.debug("Registry artifacts prepared", {
        registryBytes: stats.registryBytes
      });
    }
    if (loadLogger.isLevelEnabled("trace") && entries.length > 0) {
      loadLogger.trace("Generated SmartLink entries", () => ({
        entryIds: entries.map((entry) => entry.id),
        noteFiles: notes.map((note) => note.filename)
      }));
    }
    return { entries, notes, registry, opts: normOpts };
  };
}

// src/plugin/postBuild.ts
function handlePostBuild(args) {
  const { postBuildLogger, stats, consumeTermProcessingMs: consumeTermProcessingMs2, consumeIndexBuildMs: consumeIndexBuildMs2 } = args;
  const termProcessingMs2 = consumeTermProcessingMs2();
  const indexBuildMs2 = consumeIndexBuildMs2();
  stats.termProcessingMs = termProcessingMs2;
  stats.indexBuildMs = indexBuildMs2;
  if (postBuildLogger.isLevelEnabled("info")) {
    postBuildLogger.info("SmartLink build complete", {
      entryCount: stats.resolvedCount,
      noteCount: stats.noteCount,
      filesScanned: stats.scannedFileCount,
      reusedPrimedFiles: stats.reusedPrimedFiles,
      registryBytes: stats.registryBytes,
      indexBuildMs: stats.indexBuildMs,
      termProcessingMs: stats.termProcessingMs
    });
  }
  if (postBuildLogger.isLevelEnabled("debug")) {
    postBuildLogger.debug("Term processing duration", {
      termProcessingMs: termProcessingMs2
    });
    postBuildLogger.debug("Index build duration", {
      indexBuildMs: indexBuildMs2
    });
  }
}

// src/fsIndexProvider.ts
function createFsIndexProvider(opts) {
  const resolvedRoots = (opts.roots ?? []).map((root) => {
    const normalized = root.replace(/\\/g, "/").replace(/\/+$/, "");
    return { path: root, id: normalized || "." };
  });
  const files = resolvedRoots.flatMap((root) => {
    const scanned = scanMdFiles({ roots: [root.path] });
    return scanned.map((file) => ({ ...file, folderId: root.id }));
  });
  const { entries } = loadIndexFromFiles(files);
  const targets = entries.map((e) => ({
    id: e.id,
    slug: e.slug,
    icon: e.icon,
    sourcePath: e.sourcePath,
    terms: e.terms,
    folderId: e.folderId ?? null
  }));
  return {
    getAllTargets() {
      return targets;
    },
    getCurrentFilePath(file) {
      return file.path || "";
    }
  };
}

// src/index.ts
var moduleDir = path.dirname(url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href))));
var pluginName = PLUGIN_NAME;
function smartlinkerPlugin(_context, optsIn) {
  const { options: validatedOptions, warnings } = validateOptions(optsIn);
  const debugResolution = resolveDebugConfig(validatedOptions.debug);
  const normOpts = {
    ...validatedOptions,
    debug: debugResolution.config
  };
  setDebugConfig(normOpts.debug);
  resetMetrics();
  if (normOpts.folders.length === 0) {
    throw new Error(
      `[${pluginName}] Configure at least one folder via the \`folders\` option.`
    );
  }
  const logger = createLogger({ pluginName, debug: normOpts.debug });
  const initLogger = logger.child("init");
  const optionsLogger = logger.child("options");
  const scanLogger = logger.child("scan");
  const indexLogger = logger.child("index");
  const loadLogger = logger.child("loadContent");
  const contentLogger = logger.child("contentLoaded");
  const webpackLogger = logger.child("configureWebpack");
  const postBuildLogger = logger.child("postBuild");
  const watchLogger = logger.child("watch");
  const stats = {
    scannedFileCount: 0,
    entryCount: 0,
    noteCount: 0,
    resolvedCount: 0,
    reusedPrimedFiles: false,
    registryBytes: 0,
    indexBuildMs: 0,
    termProcessingMs: 0
  };
  const toSiteRel = (absPath) => formatSiteRelativePath(_context.siteDir, absPath);
  if (debugResolution.invalidLevel && typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(
      `[${pluginName}] Ignoring DOCUSAURUS_PLUGIN_DEBUG_LEVEL="${debugResolution.invalidLevel}" (expected one of: error, warn, info, debug, trace).`
    );
  }
  if (normOpts.debug.enabled && initLogger.isLevelEnabled("info")) {
    initLogger.info("Debug mode enabled", {
      level: normOpts.debug.level,
      source: debugResolution.source
    });
  }
  if (initLogger.isLevelEnabled("debug")) {
    initLogger.debug("Smartlinker plugin initialized", {
      folderCount: normOpts.folders.length,
      iconCount: Object.keys(normOpts.icons ?? {}).length
    });
  }
  const resolvedFolders = normOpts.folders.map((folder) => {
    const absPath = path.resolve(_context.siteDir, folder.path);
    return {
      ...folder,
      absPath,
      id: normalizeFolderId(_context.siteDir, absPath)
    };
  });
  if (initLogger.isLevelEnabled("trace") && resolvedFolders.length > 0) {
    initLogger.trace("Resolved SmartLink folders", () => ({
      folders: resolvedFolders.map(
        (folder) => `${folder.id}:${toSiteRel(folder.absPath)}`
      )
    }));
  }
  const folderById = /* @__PURE__ */ new Map();
  for (const folder of resolvedFolders) {
    folderById.set(folder.id, folder);
  }
  if (warnings.length > 0 && optionsLogger.isLevelEnabled("warn")) {
    for (const warning of warnings) {
      optionsLogger.warn(warning.message, () => ({
        code: warning.code,
        ...warning.details ?? {}
      }));
    }
  }
  let primedFiles = null;
  const normalizePath = (p) => normalizeFsPath(_context.siteDir, p);
  const collectFiles = createCollectFiles(
    resolvedFolders,
    scanLogger,
    startTimer,
    endTimer,
    toSiteRel,
    (n) => {
      stats.scannedFileCount = n;
    }
  );
  const entryState = new EntryStateCache(_context.siteDir);
  const applyFolderDefaults = createApplyFolderDefaults(folderById, normOpts.icons);
  const computeDocIdForEntry = createComputeDocIdForEntry(folderById);
  const primeIndexProvider = createPrimeIndexProvider({
    indexLogger,
    collectFiles,
    loadIndexFromFiles,
    applyFolderDefaults,
    setIndexEntries,
    entryState,
    stats,
    recordIndexBuildMs,
    startTimer,
    endTimer
  });
  primedFiles = primeIndexProvider();
  const onFilesChangeImpl = createOnFilesChangeHandler({
    siteDir: _context.siteDir,
    resolvedFolders,
    watchLogger,
    collectFiles,
    loadIndexFromFiles,
    applyFolderDefaults,
    recordIndexBuildMs,
    setIndexEntries,
    entryState,
    getDocsReferencingTerms,
    existsSync: fs.existsSync,
    utimesSync: fs.utimesSync,
    toSiteRel,
    normalizePath,
    startTimer,
    endTimer,
    stats
  });
  createLoadContent({
    context: _context,
    normOpts,
    loadLogger,
    watchLogger,
    collectFiles,
    createTooltipMdxCompiler,
    buildArtifacts,
    recordIndexBuildMs,
    applyFolderDefaults,
    setIndexEntries,
    entryState,
    getDocsReferencingTerms,
    normalizePath,
    existsSync: fs.existsSync,
    utimesSync: fs.utimesSync,
    toSiteRel,
    stats,
    startTimer,
    endTimer,
    primedRef: { current: primedFiles }
  });
  const plugin = {
    name: pluginName,
    getPathsToWatch() {
      return getPathsToWatch(_context.siteDir, resolvedFolders);
    },
    configureWebpack() {
      if (webpackLogger.isLevelEnabled("debug")) {
        webpackLogger.debug("configureWebpack invoked", {
          tooltipComponentCount: Object.keys(normOpts.tooltipComponents ?? {}).length
        });
      }
      return {};
    },
    async loadContent() {
      const result = await createLoadContent({
        context: _context,
        normOpts,
        loadLogger,
        watchLogger,
        collectFiles,
        createTooltipMdxCompiler,
        buildArtifacts,
        recordIndexBuildMs,
        applyFolderDefaults,
        setIndexEntries,
        entryState,
        getDocsReferencingTerms,
        normalizePath,
        existsSync: fs.existsSync,
        utimesSync: fs.utimesSync,
        toSiteRel,
        stats,
        startTimer,
        endTimer,
        primedRef: { current: primedFiles }
      })();
      primedFiles = null;
      return result;
    },
    async onFilesChange(params) {
      const candidates = [...params.changedFiles ?? [], ...params.deletedFiles ?? []];
      const relevantPaths = filterRelevantPaths(_context.siteDir, candidates, resolvedFolders);
      if (relevantPaths.size === 0) {
        if (watchLogger.isLevelEnabled("trace")) {
          watchLogger.trace("No SmartLink folders affected by file change", () => ({
            changedFiles: params.changedFiles ?? [],
            deletedFiles: params.deletedFiles ?? []
          }));
        }
        return;
      }
      await onFilesChangeImpl(params);
      primedFiles = collectFiles();
    },
    async contentLoaded({ content, actions }) {
      if (!content) return;
      const { notes, registry, entries, opts } = content;
      const start = startTimer(contentLogger, "info", "debug");
      const tooltipComponentsModule = emitTooltipComponentsModule(opts.tooltipComponents ?? {});
      await writeGeneratedModules({
        actions,
        notes,
        registry,
        tooltipComponentsModule,
        contentLogger
      });
      await resolveAndPublish({
        context: { siteDir: _context.siteDir, generatedFilesDir: _context.generatedFilesDir },
        actions,
        opts,
        entries,
        computeDocIdForEntry,
        stats,
        contentLogger,
        endTimer,
        startTime: start
      });
    },
    async postBuild() {
      handlePostBuild({
        postBuildLogger,
        stats,
        consumeTermProcessingMs,
        consumeIndexBuildMs
      });
    },
    getThemePath() {
      return path.join(moduleDir, "theme", "runtime");
    },
    getTypeScriptThemePath() {
      return path.join(moduleDir, "theme");
    },
    getClientModules() {
      return [path.join(moduleDir, "theme/styles.css")];
    }
  };
  return plugin;
}

exports.PLUGIN_NAME = PLUGIN_NAME;
exports.consumeIndexBuildMs = consumeIndexBuildMs;
exports.consumeTermProcessingMs = consumeTermProcessingMs;
exports.createFsIndexProvider = createFsIndexProvider;
exports.createLogger = createLogger;
exports.default = smartlinkerPlugin;
exports.getDebugConfig = getDebugConfig;
exports.getIndexBuildMs = getIndexBuildMs;
exports.getIndexProvider = getIndexProvider;
exports.getTermProcessingMs = getTermProcessingMs;
exports.recordIndexBuildMs = recordIndexBuildMs;
exports.recordTermProcessingMs = recordTermProcessingMs;
exports.removeDocTermUsage = removeDocTermUsage;
exports.resetIndexBuildMs = resetIndexBuildMs;
exports.resetMetrics = resetMetrics;
exports.resetTermProcessingMs = resetTermProcessingMs;
exports.resetTermUsage = resetTermUsage;
exports.resolveDebugConfig = resolveDebugConfig;
exports.setDebugConfig = setDebugConfig;
exports.updateDocTermUsage = updateDocTermUsage;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map