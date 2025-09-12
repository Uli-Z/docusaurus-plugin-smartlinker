declare module '@docusaurus/useGlobalData' {
  export function usePluginData<T = any>(pluginName?: string): T;
}

