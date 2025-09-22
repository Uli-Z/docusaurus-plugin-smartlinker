import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, resolveDebugConfig } from '../src/logger.js';

describe('resolveDebugConfig', () => {
  it('returns defaults when no overrides are provided', () => {
    const result = resolveDebugConfig(undefined, {} as NodeJS.ProcessEnv);
    expect(result.config).toEqual({ enabled: false, level: 'warn' });
    expect(result.source).toBe('config');
    expect(result.appliedOverrides).toEqual({});
  });

  it('prefers environment overrides when present', () => {
    const env = {
      DOCUSAURUS_PLUGIN_DEBUG: '1',
      DOCUSAURUS_PLUGIN_DEBUG_LEVEL: 'debug',
    } as NodeJS.ProcessEnv;
    const result = resolveDebugConfig({ enabled: false, level: 'warn' }, env);
    expect(result.config).toEqual({ enabled: true, level: 'debug' });
    expect(result.source).toBe('env');
    expect(result.appliedOverrides).toEqual({ enabled: true, level: 'debug' });
  });

  it('records invalid environment level values without overriding config', () => {
    const env = {
      DOCUSAURUS_PLUGIN_DEBUG_LEVEL: 'verbose',
    } as NodeJS.ProcessEnv;
    const result = resolveDebugConfig({ enabled: true, level: 'info' }, env);
    expect(result.config).toEqual({ enabled: true, level: 'info' });
    expect(result.invalidLevel).toBe('verbose');
  });
});

describe('createLogger', () => {
  const pluginName = 'docusaurus-plugin-smartlinker';
  const now = () => new Date('2024-01-01T00:00:00.000Z');
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('short-circuits when disabled', () => {
    const logger = createLogger({
      pluginName,
      debug: { enabled: false, level: 'trace' },
      now,
      env: { CI: '1' } as NodeJS.ProcessEnv,
    });
    const loadLogger = logger.child('loadContent');
    loadLogger.info('This should not emit');
    loadLogger.warn('Nor should this');
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('respects level threshold and formats structured output', () => {
    const logger = createLogger({
      pluginName,
      debug: { enabled: true, level: 'debug' },
      now,
      env: { CI: '1' } as NodeJS.ProcessEnv,
    });
    const scanLogger = logger.child('scan');

    scanLogger.debug('Scanned SmartLink folders', { fileCount: 3 });
    scanLogger.trace('This trace should be filtered');

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [message] = logSpy.mock.calls[0]!;
    expect(message).toContain('2024-01-01T00:00:00.000Z');
    expect(message).toContain('[DEBUG]');
    expect(message).toContain(`[${pluginName}]`);
    expect(message).toContain('[scan]');
    expect(message).toContain('fileCount=3');
  });

  it('routes warnings and errors to the appropriate console methods', () => {
    const logger = createLogger({
      pluginName,
      debug: { enabled: true, level: 'warn' },
      now,
      env: { CI: '1' } as NodeJS.ProcessEnv,
    });
    const optLogger = logger.child('options');
    optLogger.warn('Configuration warning', { code: 'TEST' });
    optLogger.error('Configuration error');

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const warnMessage = warnSpy.mock.calls[0]![0];
    const errorMessage = errorSpy.mock.calls[0]![0];
    expect(warnMessage).toContain('[WARN]');
    expect(errorMessage).toContain('[ERROR]');
  });
});
