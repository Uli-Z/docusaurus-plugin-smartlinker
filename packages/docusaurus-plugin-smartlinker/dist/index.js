import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateOptions, } from './options.js';
import { scanMdFiles } from './node/fsScan.js';
import { buildArtifacts } from './node/buildPipeline.js';
import { emitTooltipComponentsModule } from './codegen/tooltipComponentsEmitter.js';
import { PLUGIN_NAME } from './pluginName.js';
import { createTooltipMdxCompiler } from './node/tooltipMdxCompiler.js';
import { setIndexEntries } from './indexProviderStore.js';
import { loadIndexFromFiles } from './frontmatterAdapter.js';
import { resolveEntryPermalinks } from './node/permalinkResolver.js';
export { createFsIndexProvider } from './fsIndexProvider.js';
export { PLUGIN_NAME } from './pluginName.js';
export { getIndexProvider } from './indexProviderStore.js';
function normalizeFolderId(siteDir, absPath) {
    const relPath = relative(siteDir, absPath);
    const useRelative = relPath &&
        !relPath.startsWith('..') &&
        !isAbsolute(relPath);
    const candidate = useRelative ? relPath : absPath;
    const normalized = candidate.replace(/\\/g, '/').replace(/\/+$/, '');
    return normalized || '.';
}
const moduleDir = dirname(fileURLToPath(import.meta.url));
const pluginName = PLUGIN_NAME;
function publishGlobalData(actions, opts, entries) {
    const registryMeta = entries.map(({ id, slug, icon, folderId, docId, permalink }) => ({
        id,
        slug,
        icon: icon ?? null,
        folderId: folderId ?? null,
        docId: docId ?? null,
        permalink: permalink ?? null,
    }));
    actions.setGlobalData({ options: opts, entries: registryMeta });
}
export default function smartlinkerPlugin(_context, optsIn) {
    const { options: normOpts } = validateOptions(optsIn);
    if (normOpts.folders.length === 0) {
        throw new Error(`[${pluginName}] Configure at least one folder via the \`folders\` option.`);
    }
    const resolvedFolders = normOpts.folders.map((folder) => {
        const absPath = resolve(_context.siteDir, folder.path);
        return {
            ...folder,
            absPath,
            id: normalizeFolderId(_context.siteDir, absPath),
        };
    });
    const folderById = new Map();
    for (const folder of resolvedFolders) {
        folderById.set(folder.id, folder);
    }
    let primedFiles = null;
    const collectFiles = () => {
        const files = [];
        for (const folder of resolvedFolders) {
            const scanned = scanMdFiles({ roots: [folder.absPath] });
            for (const file of scanned) {
                files.push({ ...file, folderId: folder.id });
            }
        }
        return files;
    };
    const applyFolderDefaults = (entries) => {
        for (const entry of entries) {
            const folder = entry.folderId ? folderById.get(entry.folderId) : undefined;
            if (!folder)
                continue;
            if (!entry.icon && folder.defaultIcon && normOpts.icons[folder.defaultIcon]) {
                entry.icon = folder.defaultIcon;
            }
        }
    };
    const computeDocIdForEntry = (entry) => {
        const folder = entry.folderId ? folderById.get(entry.folderId) : undefined;
        if (!folder)
            return undefined;
        return deriveDocId(folder.absPath, entry.sourcePath);
    };
    const primeIndexProvider = () => {
        primedFiles = collectFiles();
        const { entries } = loadIndexFromFiles(primedFiles);
        applyFolderDefaults(entries);
        setIndexEntries(entries);
    };
    primeIndexProvider();
    return {
        name: pluginName,
        async loadContent() {
            const files = primedFiles ?? collectFiles();
            primedFiles = null;
            const compileMdx = await createTooltipMdxCompiler(_context);
            const { entries, notes, registry } = await buildArtifacts(files, {
                compileMdx,
            });
            applyFolderDefaults(entries);
            setIndexEntries(entries);
            return {
                entries,
                notes,
                registry,
                opts: normOpts,
            };
        },
        async contentLoaded({ content, actions }) {
            if (!content)
                return;
            const { notes, registry, entries, opts } = content;
            for (const note of notes) {
                await actions.createData(note.filename, note.contents);
            }
            await actions.createData(registry.filename, registry.contents);
            const tooltipComponentsModule = emitTooltipComponentsModule(opts.tooltipComponents ?? {});
            await actions.createData(tooltipComponentsModule.filename, tooltipComponentsModule.contents);
            const enrichedEntries = entries.map((entry) => ({
                ...entry,
                docId: entry.docId ?? computeDocIdForEntry(entry),
            }));
            const docsContent = loadDocsContentFromGenerated(_context.generatedFilesDir);
            const resolved = resolveEntryPermalinks({
                siteDir: _context.siteDir,
                entries: enrichedEntries,
                docsContent,
            });
            publishGlobalData(actions, opts, resolved);
        },
        getThemePath() {
            return join(moduleDir, 'theme', 'runtime');
        },
        getTypeScriptThemePath() {
            return join(moduleDir, 'theme');
        },
        getClientModules() {
            return [join(moduleDir, 'theme/styles.css')];
        },
    };
}
function deriveDocId(folderAbsPath, sourcePath) {
    if (!sourcePath)
        return undefined;
    const rel = relative(folderAbsPath, sourcePath);
    if (!rel || rel.startsWith('..'))
        return undefined;
    const normalized = rel.replace(/\\/g, '/');
    const withoutExt = normalized.replace(/\.[^./]+$/u, '');
    return withoutExt || undefined;
}
function loadDocsContentFromGenerated(generatedFilesDir) {
    const root = join(generatedFilesDir, 'docusaurus-plugin-content-docs');
    const result = {};
    let pluginIds = [];
    try {
        pluginIds = readdirSync(root);
    }
    catch {
        return result;
    }
    for (const pluginId of pluginIds) {
        const pluginDir = join(root, pluginId);
        let stats;
        try {
            stats = statSync(pluginDir);
        }
        catch {
            continue;
        }
        if (!stats.isDirectory())
            continue;
        const docs = [];
        for (const file of readdirSync(pluginDir)) {
            if (!file.endsWith('.json'))
                continue;
            if (file.startsWith('__'))
                continue;
            const abs = join(pluginDir, file);
            try {
                const parsed = JSON.parse(readFileSync(abs, 'utf8'));
                if (parsed && typeof parsed === 'object' && typeof parsed.permalink === 'string') {
                    docs.push(parsed);
                }
            }
            catch {
                continue;
            }
        }
        result[pluginId] = {
            loadedVersions: [
                {
                    docs,
                },
            ],
        };
    }
    return result;
}
//# sourceMappingURL=index.js.map