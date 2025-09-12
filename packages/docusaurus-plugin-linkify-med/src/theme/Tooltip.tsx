import React from 'react';

export interface TooltipProps {
  content?: React.ReactNode;
  children: React.ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  return (
    <span className="lm-tooltip">
      {children}
      {content ? <span className="lm-tooltip__content">{content}</span> : null}
    </span>
  );
}