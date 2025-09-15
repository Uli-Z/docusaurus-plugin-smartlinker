declare module '@docusaurus/useGlobalData' {
  export default function useGlobalData<T = any>(): T;
  export function usePluginData<T = any>(pluginName?: string): T;
}

declare module '@theme/SmartLink' {
  const SmartLink: React.ComponentType<any>;
  export default SmartLink;
}

declare module '@theme-original/MDXComponents' {
  const MDXComponents: Record<string, any>;
  export default MDXComponents;
}

declare module '@theme-original/Root' {
  import type { ReactNode } from 'react';
  const Root: React.ComponentType<{ children?: ReactNode }>;
  export default Root;
}

