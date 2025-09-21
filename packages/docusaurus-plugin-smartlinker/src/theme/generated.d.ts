declare module '@generated/docusaurus-plugin-smartlinker/default/registry' {
  import type { ComponentType } from 'react';
  export interface GeneratedRegistryEntry {
    id: string;
    slug: string;
    permalink?: string;
    icon?: string;
    ShortNote?: ComponentType<{ components?: Record<string, unknown> }>;
  }
  export const registry: Record<string, GeneratedRegistryEntry>;
  const _default: typeof registry;
  export default _default;
}

declare module '@generated/docusaurus-plugin-smartlinker/default/tooltipComponents' {
  import type { ComponentType } from 'react';
  export const tooltipComponents: Record<string, ComponentType<any>>;
  const _default: typeof tooltipComponents;
  export default _default;
}

