declare module '@docusaurus/useGlobalData' {
  export default function useGlobalData<T = any>(): T;
  export function usePluginData<T = any>(pluginName: string): T;
}

declare module '@mdx-js/react' {
  import type { ReactNode, ComponentType } from 'react';
  export interface MDXProviderProps {
    components?: Record<string, ComponentType<any>>;
    children?: ReactNode;
  }
  export const MDXProvider: ComponentType<MDXProviderProps>;
}

declare module '@theme/SmartLink' {
  const SmartLink: React.ComponentType<any>;
  export default SmartLink;
}

declare module '@theme-init/Root' {
  import type { ReactNode } from 'react';
  const Root: React.ComponentType<{ children?: ReactNode }>;
  export default Root;
}

