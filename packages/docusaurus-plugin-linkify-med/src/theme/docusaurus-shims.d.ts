declare module '@docusaurus/useGlobalData' {
  export default function useGlobalData<T = any>(): T;
  export function usePluginData<T = any>(pluginName: string): T;
}

declare module '@docusaurus/useBaseUrl' {
  export default function useBaseUrl(path?: string | null): string;
}

declare module '@mdx-js/react' {
  import type { ReactNode, ComponentType } from 'react';
  export interface MDXProviderProps {
    components?: Record<string, ComponentType<any>>;
    children?: ReactNode;
  }
  export const MDXProvider: ComponentType<MDXProviderProps>;
  export function useMDXComponents(
    components?:
      | Record<string, ComponentType<any>>
      | ((current: Record<string, ComponentType<any>>) => Record<string, ComponentType<any>>)
  ): Record<string, ComponentType<any>>;
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

declare module '@theme/ThemedImage' {
  import type { ComponentType, ImgHTMLAttributes } from 'react';
  export interface ThemedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    sources: { light: string; dark?: string };
  }
  const ThemedImage: ComponentType<ThemedImageProps>;
  export default ThemedImage;
}

