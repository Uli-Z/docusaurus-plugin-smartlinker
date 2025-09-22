const LOG_LEVELS = ['error', 'warn', 'info', 'debug', 'trace'];
const LEVEL_RANK = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4,
};
const LEVEL_COLORS = {
    error: '\u001b[31m',
    warn: '\u001b[33m',
    info: '\u001b[36m',
    debug: '\u001b[35m',
    trace: '\u001b[90m',
};
const COLOR_RESET = '\u001b[0m';
function normalizeBoolean(value) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return false;
    }
    if (['0', 'false', 'no', 'off', 'disable', 'disabled'].includes(normalized)) {
        return false;
    }
    if (['1', 'true', 'yes', 'on', 'enable', 'enabled'].includes(normalized)) {
        return true;
    }
    return true;
}
function normalizeLevel(value) {
    const normalized = value.trim().toLowerCase();
    if (LOG_LEVELS.includes(normalized)) {
        return normalized;
    }
    return undefined;
}
function shouldUseColor(env) {
    if (typeof process === 'undefined') {
        return false;
    }
    const stdout = process.stdout;
    if (!stdout || typeof stdout.isTTY !== 'boolean') {
        return false;
    }
    if (!stdout.isTTY) {
        return false;
    }
    const ci = env?.CI ?? process.env?.CI;
    if (typeof ci === 'string' && ci !== '' && ci !== '0' && ci.toLowerCase() !== 'false') {
        return false;
    }
    return true;
}
function getConsoleMethod(level) {
    if (level === 'error' && typeof console.error === 'function') {
        return console.error.bind(console);
    }
    if (level === 'warn' && typeof console.warn === 'function') {
        return console.warn.bind(console);
    }
    return typeof console.log === 'function' ? console.log.bind(console) : () => { };
}
function formatFieldValue(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return 'null';
    }
    if (typeof value === 'string') {
        if (!value) {
            return "''";
        }
        if (/\s/.test(value) || /["'\\]/.test(value)) {
            return JSON.stringify(value);
        }
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return String(value);
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    try {
        return JSON.stringify(value);
    }
    catch {
        return String(value);
    }
}
function formatDetails(details) {
    if (!details) {
        return '';
    }
    const parts = [];
    for (const [key, rawValue] of Object.entries(details)) {
        const formatted = formatFieldValue(rawValue);
        if (formatted === undefined)
            continue;
        parts.push(`${key}=${formatted}`);
    }
    return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}
function resolveDetails(details) {
    if (!details) {
        return undefined;
    }
    if (typeof details === 'function') {
        try {
            return details();
        }
        catch {
            return undefined;
        }
    }
    return details;
}
export function resolveDebugConfig(base, env = process.env) {
    const fallback = base ?? { enabled: false, level: 'warn' };
    let enabled = fallback.enabled ?? false;
    let level = fallback.level ?? 'warn';
    let source = 'config';
    const appliedOverrides = {};
    let invalidLevel;
    const envEnabledRaw = env?.DOCUSAURUS_PLUGIN_DEBUG;
    if (typeof envEnabledRaw === 'string') {
        enabled = normalizeBoolean(envEnabledRaw);
        appliedOverrides.enabled = enabled;
        source = 'env';
    }
    const envLevelRaw = env?.DOCUSAURUS_PLUGIN_DEBUG_LEVEL;
    if (typeof envLevelRaw === 'string') {
        const normalized = normalizeLevel(envLevelRaw);
        if (normalized) {
            level = normalized;
            appliedOverrides.level = normalized;
            source = 'env';
        }
        else {
            invalidLevel = envLevelRaw;
        }
    }
    if (!LOG_LEVELS.includes(level)) {
        level = 'warn';
    }
    return {
        config: { enabled, level },
        source,
        appliedOverrides,
        invalidLevel,
    };
}
export function createLogger(init) {
    const { pluginName, debug } = init;
    const env = init.env ?? process.env;
    const now = init.now ?? (() => new Date());
    const active = Boolean(debug?.enabled);
    const thresholdLevel = debug?.level ?? 'warn';
    const threshold = LEVEL_RANK[thresholdLevel] ?? LEVEL_RANK.warn;
    const colorize = shouldUseColor(env);
    const isLevelEnabled = (level) => {
        if (!active)
            return false;
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
        const pluginTag = `[${pluginName}]`;
        const contextTag = context ? ` [${context}]` : '';
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
            error: makeScoped('error'),
            warn: makeScoped('warn'),
            info: makeScoped('info'),
            debug: makeScoped('debug'),
            trace: makeScoped('trace'),
        };
    };
    return {
        level: thresholdLevel,
        isLevelEnabled,
        log,
        error: makeLevelLogger('error'),
        warn: makeLevelLogger('warn'),
        info: makeLevelLogger('info'),
        debug: makeLevelLogger('debug'),
        trace: makeLevelLogger('trace'),
        child,
    };
}
//# sourceMappingURL=logger.js.map