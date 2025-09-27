import { describe, it, beforeAll, afterAll, expect } from 'vitest';

interface VerificationContext {
  dist: Array<{ path: string; size: number }>;
  tarEntries: string[];
  exampleHtml: string;
  cleanup: () => void;
}

let verificationModule: any;
let context: VerificationContext;

beforeAll(async () => {
  verificationModule = await import('../../../scripts/utils/package-verifier.mjs');
  context = verificationModule.createVerificationContext();
}, 360_000);

afterAll(() => {
  context?.cleanup?.();
});

describe('package build artifacts', () => {
  it('includes required dist outputs', () => {
    const produced = new Set(context.dist.map((item) => item.path));
    const missing = (verificationModule.REQUIRED_DIST_PATHS as string[]).filter(
      (expected: string) => !produced.has(expected)
    );
    expect(missing).toHaveLength(0);
  });

  it('packs dist files into the tarball', () => {
    const entries = new Set(context.tarEntries);
    const missing = (verificationModule.REQUIRED_TARBALL_ENTRIES as string[]).filter(
      (expected: string) => !entries.has(expected)
    );
    expect(missing).toHaveLength(0);
  });
});

describe('example site build', () => {
  it('renders SmartLinks when installed from the packed tarball', () => {
    for (const snippet of verificationModule.EXAMPLE_HTML_ASSERTIONS as string[]) {
      expect(context.exampleHtml).toContain(snippet);
    }
  });
});
