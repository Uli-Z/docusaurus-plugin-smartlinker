import React from 'react';

export type ShortNoteComponent = React.ComponentType<{ components?: Record<string, any> }>;

export interface RegistryEntry {
  id: string;
  slug: string;
  docId?: string;
  permalink?: string | null;
  icon?: string;
  ShortNote?: ShortNoteComponent;
}

export interface LinkifyRegistry {
  [id: string]: RegistryEntry;
}

export const LinkifyRegistryContext = React.createContext<LinkifyRegistry | null>(null);

export interface IconResolverAPI {
  resolveIconSrc: (id: string, mode: 'light' | 'dark') => string | null;
  iconProps?: Record<string, any>;
}

export const IconConfigContext = React.createContext<IconResolverAPI | null>(null);

/** Lightweight helpers for tests/host */
export const LinkifyRegistryProvider: React.FC<React.PropsWithChildren<{ registry: LinkifyRegistry }>> = ({ registry, children }) => {
  return <LinkifyRegistryContext.Provider value={registry}>{children}</LinkifyRegistryContext.Provider>;
};

export const IconConfigProvider: React.FC<React.PropsWithChildren<{ api: IconResolverAPI }>> = ({ api, children }) => {
  return <IconConfigContext.Provider value={api}>{children}</IconConfigContext.Provider>;
};

