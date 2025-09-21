import React from 'react';
export type ShortNoteComponent = React.ComponentType<{
    components?: Record<string, any>;
}>;
export interface RegistryEntry {
    id: string;
    slug: string;
    icon?: string;
    ShortNote?: ShortNoteComponent;
}
export interface LinkifyRegistry {
    [id: string]: RegistryEntry;
}
export declare const LinkifyRegistryContext: React.Context<LinkifyRegistry | null>;
export interface IconResolverAPI {
    resolveIconSrc: (id: string, mode: 'light' | 'dark') => string | null;
    iconProps?: Record<string, any>;
}
export declare const IconConfigContext: React.Context<IconResolverAPI | null>;
/** Lightweight helpers for tests/host */
export declare const LinkifyRegistryProvider: React.FC<React.PropsWithChildren<{
    registry: LinkifyRegistry;
}>>;
export declare const IconConfigProvider: React.FC<React.PropsWithChildren<{
    api: IconResolverAPI;
}>>;
//# sourceMappingURL=context.d.ts.map