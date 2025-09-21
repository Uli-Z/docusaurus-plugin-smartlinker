import type { TooltipComponentConfig } from '../options.js';
export interface TooltipComponentsModule {
    filename: string;
    contents: string;
}
/**
 * Emit a runtime module that statically imports user-provided React components
 * so MDX short notes can render custom tags inside tooltips.
 */
export declare function emitTooltipComponentsModule(components: Record<string, TooltipComponentConfig>): TooltipComponentsModule;
//# sourceMappingURL=tooltipComponentsEmitter.d.ts.map