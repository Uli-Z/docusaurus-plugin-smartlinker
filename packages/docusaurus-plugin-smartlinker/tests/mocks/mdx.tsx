import React from 'react';

const MDXContext = React.createContext<Record<string, React.ComponentType<any>>>(
  {}
);

export interface MDXProviderProps {
  components?: Record<string, React.ComponentType<any>> | ((current: Record<string, React.ComponentType<any>>) => Record<string, React.ComponentType<any>>);
  children?: React.ReactNode;
}

export const MDXProvider: React.FC<MDXProviderProps> = ({ components, children }) => {
  const parent = React.useContext(MDXContext);
  const value = React.useMemo(() => {
    if (typeof components === 'function') {
      return components(parent);
    }
    return { ...parent, ...(components ?? {}) };
  }, [parent, components]);

  return <MDXContext.Provider value={value}>{children}</MDXContext.Provider>;
};

export function useMDXComponents(
  components?:
    | Record<string, React.ComponentType<any>>
    | ((current: Record<string, React.ComponentType<any>>) => Record<string, React.ComponentType<any>>)
) {
  const context = React.useContext(MDXContext);
  return React.useMemo(() => {
    if (typeof components === 'function') {
      return components(context);
    }
    return { ...context, ...(components ?? {}) };
  }, [context, components]);
}

export default { MDXProvider, useMDXComponents };
