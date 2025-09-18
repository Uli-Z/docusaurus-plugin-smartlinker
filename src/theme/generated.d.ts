declare module '@generated/docusaurus-plugin-smartlinker/default/registry' {
  import type { ComponentType } from 'react';
  export interface GeneratedRegistryEntry {
    id: string;
    slug: string;
    icon?: string;
    ShortNote?: ComponentType<{ components?: Record<string, unknown> }>;
  }
  export const registry: Record<string, GeneratedRegistryEntry>;
}

declare module '@generated/docusaurus-plugin-smartlinker/default/tooltipComponents' {
  import type { ComponentType } from 'react';
  export const tooltipComponents: Record<string, ComponentType<any>>;
}

