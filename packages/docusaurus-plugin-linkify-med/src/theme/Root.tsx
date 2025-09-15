import React from 'react';
import { usePluginData } from '@docusaurus/useGlobalData';
import { IconConfigProvider, LinkifyRegistryProvider } from './context';
import { createIconResolver, type NormalizedOptions } from '../options';
// Import the generated registry (emitted during build)
import { registry } from '@generated/docusaurus-plugin-linkify-med/registry';
import './styles.css';

type GlobalData = { options: NormalizedOptions };

export default function Root({ children }: { children: React.ReactNode }) {
  const data = usePluginData('docusaurus-plugin-linkify-med') as GlobalData | undefined;
  const opts = data?.options ?? { icons: {} } as NormalizedOptions;

  const iconApi = React.useMemo(() => createIconResolver(opts), [opts]);

  return (
    <IconConfigProvider api={iconApi}>
      <LinkifyRegistryProvider registry={registry}>
        {children}
      </LinkifyRegistryProvider>
    </IconConfigProvider>
  );
}

