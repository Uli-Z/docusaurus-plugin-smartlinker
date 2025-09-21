import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import Root from '@theme-init/Root';
import { usePluginData } from '@docusaurus/useGlobalData';
import { MDXProvider, useMDXComponents } from '@mdx-js/react';
import { IconConfigProvider, LinkifyRegistryProvider } from './context.js';
import SmartLink from './SmartLink.js';
import LinkifyShortNote from './LinkifyShortNote.js';
import { createIconResolver } from '../../options.js';
import { PLUGIN_NAME } from '../../pluginName.js';
import { generatedRegistry } from './generatedRegistry.js';
import { tooltipComponents } from './generatedTooltipComponents.js';
const pluginName = PLUGIN_NAME;
const EMPTY_OPTIONS = { icons: {}, tooltipComponents: {}, folders: [] };
function Providers({ children }) {
    const data = usePluginData(pluginName) ?? null;
    const normalizedOptions = data?.options ?? EMPTY_OPTIONS;
    const iconApi = React.useMemo(() => createIconResolver(normalizedOptions), [normalizedOptions]);
    const existingComponents = useMDXComponents();
    const mdxComponents = React.useMemo(() => ({
        ...existingComponents,
        ...tooltipComponents,
        SmartLink,
        LinkifyShortNote,
    }), [existingComponents]);
    const registryValue = React.useMemo(() => {
        const entries = data?.entries ?? [];
        const next = {};
        for (const entry of entries) {
            const generated = generatedRegistry[entry.id];
            next[entry.id] = {
                id: entry.id,
                slug: entry.slug,
                icon: entry.icon ?? generated?.icon,
                ShortNote: generated?.ShortNote,
            };
        }
        return next;
    }, [data]);
    return (_jsx(IconConfigProvider, { api: iconApi, children: _jsx(LinkifyRegistryProvider, { registry: registryValue, children: _jsx(MDXProvider, { components: mdxComponents, children: children }) }) }));
}
export default function LinkifyRoot({ children }) {
    return (_jsx(Root, { children: _jsx(Providers, { children: children }) }));
}
//# sourceMappingURL=Root.js.map