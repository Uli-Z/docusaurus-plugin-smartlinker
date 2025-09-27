import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
export const LinkifyRegistryContext = React.createContext(null);
export const IconConfigContext = React.createContext(null);
/** Lightweight helpers for tests/host */
export const LinkifyRegistryProvider = ({ registry, children }) => {
    return _jsx(LinkifyRegistryContext.Provider, { value: registry, children: children });
};
export const IconConfigProvider = ({ api, children }) => {
    return _jsx(IconConfigContext.Provider, { value: api, children: children });
};
//# sourceMappingURL=context.js.map