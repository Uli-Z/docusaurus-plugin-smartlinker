import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import smartlinkerPlugin from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const markdownConfig = {
  format: 'mdx' as const,
  parseFrontMatter: async ({
    fileContent,
  }: {
    fileContent: string;
    defaultParseFrontMatter: (
      params: { fileContent: string; filePath: string }
    ) => Promise<{ frontMatter: Record<string, unknown>; content: string }>;
  }) => ({
    frontMatter: {},
    content: fileContent,
  }),
  mermaid: false,
  preprocessor: undefined,
  mdx1Compat: {
    comments: false,
    admonitions: false,
    headingIds: true,
  },
  remarkRehypeOptions: {},
  anchors: {
    maintainCase: false,
  },
};

describe('smartlinker plugin debug logging', () => {
  const siteDir = join(__dirname, 'fixtures');
  let generatedRoot: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    generatedRoot = mkdtempSync(join(tmpdir(), 'smartlinker-debug-'));
    mkdirSync(join(generatedRoot, '.docusaurus'), { recursive: true });
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    rmSync(generatedRoot, { recursive: true, force: true });
  });

  it('emits lifecycle logs when debug mode is enabled', async () => {
    const plugin = smartlinkerPlugin(
      {
        siteDir,
        generatedFilesDir: join(generatedRoot, '.docusaurus'),
        siteConfig: {
          staticDirectories: [],
          markdown: markdownConfig,
          themeConfig: {},
        },
      } as any,
      {
        icons: { pill: 'emoji:💊' },
        folders: [{ path: 'docs' }],
        debug: { enabled: true, level: 'debug' },
      }
    );

    plugin.configureWebpack?.();

    const content = await plugin.loadContent?.();
    expect(content).toBeTruthy();

    await plugin.contentLoaded?.({
      content: content!,
      actions: {
        createData: vi.fn().mockResolvedValue(undefined),
        setGlobalData: vi.fn(),
      } as any,
    });

    await plugin.postBuild?.();

    const logMessages = logSpy.mock.calls
      .map(([message]) => String(message))
      .filter((line) => line.includes('[docusaurus-plugin-smartlinker]'));

    expect(logMessages.some((line) => line.includes('[scan]'))).toBe(true);
    expect(logMessages.some((line) => line.includes('[loadContent]'))).toBe(true);
    expect(logMessages.some((line) => line.includes('[contentLoaded]'))).toBe(true);
    expect(logMessages.some((line) => line.includes('[postBuild]'))).toBe(true);
  });
});
