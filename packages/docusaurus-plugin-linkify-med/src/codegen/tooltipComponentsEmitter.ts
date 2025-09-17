import type { TooltipComponentConfig } from '../options.js';

export interface TooltipComponentsModule {
  filename: string;
  contents: string;
}

/**
 * Emit a runtime module that statically imports user-provided React components
 * so MDX short notes can render custom tags inside tooltips.
 */
export function emitTooltipComponentsModule(
  components: Record<string, TooltipComponentConfig>
): TooltipComponentsModule {
  const entries = Object.entries(components);
  const imports: string[] = [];
  const assignments: string[] = [];

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

  const importBlock = imports.length > 0 ? `${imports.join('\n')}\n\n` : '';
  const recordsBlock = assignments.length > 0 ? `${assignments.join(',\n')}\n` : '';

  const contents = `
/* AUTO-GENERATED: tooltip component registry */
${importBlock}export const tooltipComponents = {
${recordsBlock}};
`.trimStart();

  return { filename: 'tooltipComponents.js', contents };
}
