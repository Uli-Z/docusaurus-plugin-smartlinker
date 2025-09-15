import React from 'react';
import { IconConfigContext } from './context';

export interface IconResolverProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'id' | 'src' | 'alt'> {
  iconId?: string | null;
  /** render after text so no need for alt; mark decorative */
  className?: string;
}

export default function IconResolver({ iconId, className, ...rest }: IconResolverProps) {
  const api = React.useContext(IconConfigContext);
  if (!iconId || !api) return null;

  // naive prefers-light; could read prefers-color-scheme if needed
  const mode: 'light' | 'dark' =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  const src = api.resolveIconSrc(iconId, mode);
  if (!src) return null;

  if (src.startsWith('emoji:')) {
    const emoji = src.slice('emoji:'.length);
    return (
      <span
        className={['lm-icon', 'lm-icon-emoji', className].filter(Boolean).join(' ')}
        aria-hidden="true"
        {...rest}
      >
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={src}
      className={['lm-icon', className].filter(Boolean).join(' ')}
      aria-hidden="true"
      {...(api.iconProps ?? {})}
      {...rest}
    />
  );
}
