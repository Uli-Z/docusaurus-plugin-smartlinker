import React from 'react';

type Props = {
  sources: { light: string; dark?: string };
} & React.ImgHTMLAttributes<HTMLImageElement>;

export default function ThemedImage({ sources, ...rest }: Props) {
  const { light, dark } = sources;
  const src = light ?? dark ?? '';
  return <img src={src} data-light={light ?? ''} data-dark={dark ?? ''} {...rest} />;
}
