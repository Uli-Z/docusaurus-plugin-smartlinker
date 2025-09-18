import { describe, it, expect } from 'vitest';
import { emitTooltipComponentsModule } from '../src/codegen/tooltipComponentsEmitter.js';

describe('emitTooltipComponentsModule', () => {
  it('returns empty registry module when no components are provided', () => {
    const mod = emitTooltipComponentsModule({});
    expect(mod.filename).toBe('tooltipComponents.js');
    expect(mod.contents).toContain('export const tooltipComponents = {');
    expect(mod.contents).toContain('};');
    expect(mod.contents).not.toContain('import ');
  });

  it('emits default and named imports with stable aliases', () => {
    const mod = emitTooltipComponentsModule({
      DrugTip: { importPath: '@site/src/components/DrugTip' },
      Alert: { importPath: '@site/src/components/Alert', exportName: 'AlertTip' },
    });

    expect(mod.filename).toBe('tooltipComponents.js');

    expect(mod.contents).toContain(
      "import TooltipComponent_0 from '@site/src/components/DrugTip';"
    );
    expect(mod.contents).toContain(
      "import { AlertTip as TooltipComponent_1 } from '@site/src/components/Alert';"
    );

    const registryBlock = `export const tooltipComponents = {\n  "DrugTip": TooltipComponent_0,\n  "Alert": TooltipComponent_1\n};`;
    expect(mod.contents).toContain(registryBlock);

    const firstAlias = mod.contents.indexOf('TooltipComponent_0');
    const secondAlias = mod.contents.indexOf('TooltipComponent_1');
    expect(firstAlias).toBeGreaterThanOrEqual(0);
    expect(secondAlias).toBeGreaterThan(firstAlias);
  });

  it('escapes aliases that contain special characters', () => {
    const mod = emitTooltipComponentsModule({
      'drug-tip': { importPath: '@site/src/components/DrugTip' },
    });

    expect(mod.contents).toContain('"drug-tip": TooltipComponent_0');
  });
});
