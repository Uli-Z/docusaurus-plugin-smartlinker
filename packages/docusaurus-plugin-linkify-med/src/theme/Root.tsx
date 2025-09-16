import React from 'react';
import Root from '@theme-init/Root';
import useGlobalData from '@docusaurus/useGlobalData';
import { IconConfigProvider, LinkifyRegistryProvider } from './context';
import { createIconResolver, type NormalizedOptions } from '../options';
import { registry } from '@generated/docusaurus-plugin-linkify-med/default/registry';
import './styles.css';

type GlobalData = { options: NormalizedOptions };

function Providers({ children }: { children: React.ReactNode }) {
  const global = useGlobalData() as any;
  const data = global['docusaurus-plugin-linkify-med']?.default as GlobalData | undefined;
  const opts = data?.options ?? ({ icons: {} } as NormalizedOptions);
  const iconApi = React.useMemo(() => createIconResolver(opts), [opts]);

  return (
    <IconConfigProvider api={iconApi}>
      <LinkifyRegistryProvider registry={registry}>{children}</LinkifyRegistryProvider>
    </IconConfigProvider>
  );
}

export default function LinkifyRoot({ children }: { children: React.ReactNode }) {
  return (
    <Root>
      <Providers>{children}</Providers>
    </Root>
  );
}

