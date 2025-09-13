declare module '@docusaurus/useGlobalData' {
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

