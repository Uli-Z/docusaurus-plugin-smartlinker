import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { LinkifyRegistryContext } from './context.js';
export default function LinkifyShortNote({ tipKey, fallback = null, components }) {
    const registry = React.useContext(LinkifyRegistryContext);
    if (!tipKey) {
        return fallback ?? null;
    }
    const entry = registry?.[tipKey];
    const Short = entry?.ShortNote;
    if (!Short) {
        return fallback ?? null;
    }
    return _jsx(Short, { components: components });
}
//# sourceMappingURL=LinkifyShortNote.js.map