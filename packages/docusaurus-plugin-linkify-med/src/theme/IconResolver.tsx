import React from 'react';

export interface IconResolverProps {
  id?: string;
}

export default function IconResolver({ id }: IconResolverProps) {
  // Placeholder only; real implementation will map IDs to assets from plugin options
  return id ? <span className="lm-icon" data-icon-id={id} aria-hidden="true">🔹</span> : null;
}