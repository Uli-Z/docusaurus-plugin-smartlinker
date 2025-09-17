import React from 'react';
import { LinkifyRegistryContext } from './context.js';

export interface LinkifyShortNoteProps {
  tipKey?: string;
  fallback?: React.ReactNode;
  components?: Record<string, any>;
}

export default function LinkifyShortNote({ tipKey, fallback = null, components }: LinkifyShortNoteProps) {
  const registry = React.useContext(LinkifyRegistryContext);
  if (!tipKey) {
    return fallback ?? null;
  }

  const entry = registry?.[tipKey];
  const Short = entry?.ShortNote;
  if (!Short) {
    return fallback ?? null;
  }

  return <Short components={components} />;
}
