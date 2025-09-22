import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import ThemedImage from '@theme/ThemedImage';
import { IconConfigContext } from './context.js';

export interface IconResolverProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'id' | 'src' | 'alt'> {
  iconId?: string | null;
  /** render after text so no need for alt; mark decorative */
  className?: string;
}

export default function IconResolver({ iconId, className, ...rest }: IconResolverProps) {
  const api = React.useContext(IconConfigContext);
  if (!iconId || !api) return null;

  const lightSrcRaw = api.resolveIconSrc(iconId, 'light');
  const darkSrcRaw = api.resolveIconSrc(iconId, 'dark');
  const primarySrc = lightSrcRaw ?? darkSrcRaw;
  if (!primarySrc) return null;

  if (primarySrc.startsWith('emoji:')) {
    const emoji = primarySrc.slice('emoji:'.length);
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

  const lightSrc = lightSrcRaw ? useBaseUrl(lightSrcRaw) : undefined;
  const darkSrc = darkSrcRaw ? useBaseUrl(darkSrcRaw) : undefined;
  const fallbackSrc = lightSrc ?? darkSrc;
  if (!fallbackSrc) return null;

  const baseClassName = ['lm-icon', className].filter(Boolean).join(' ');
  const sharedImageProps = {
    className: baseClassName,
    'aria-hidden': 'true' as const,
    ...(api.iconProps ?? {}),
    ...rest,
  };

  if (darkSrc && darkSrc !== fallbackSrc) {
    return (
      <ThemedImage
        sources={{ light: fallbackSrc, dark: darkSrc }}
        alt=""
        {...sharedImageProps}
      />
    );
  }

  return <img src={fallbackSrc} alt="" {...sharedImageProps} />;
}
