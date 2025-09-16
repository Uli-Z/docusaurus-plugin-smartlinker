import React from 'react';

export interface MDXProviderProps {
  components?: Record<string, React.ComponentType<any>>;
  children?: React.ReactNode;
}

export const MDXProvider: React.FC<MDXProviderProps> = ({ children }) => <>{children}</>;

export default { MDXProvider };
