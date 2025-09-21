import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as RT from '@radix-ui/react-tooltip';
export default function Tooltip({ content, open, onOpenChange, children, delayDuration = 150, maxWidth = 360, }) {
    if (!content) {
        return _jsx(_Fragment, { children: children });
    }
    const isBrowser = typeof window !== 'undefined';
    return (_jsxs(_Fragment, { children: [!isBrowser && (_jsx("div", { className: "lm-tooltip-content", "data-ssr-hidden": "true", style: { display: 'none' }, children: content })), _jsx(RT.Provider, { delayDuration: delayDuration, skipDelayDuration: 0, children: _jsxs(RT.Root, { open: open, onOpenChange: onOpenChange, children: [_jsx(RT.Trigger, { asChild: true, children: children }), _jsx(RT.Portal, { children: _jsxs(RT.Content, { className: "lm-tooltip", side: "top", align: "center", sideOffset: 8, collisionPadding: 8, style: { maxWidth }, children: [_jsx("div", { className: "lm-tooltip-content", children: content }), _jsx(RT.Arrow, { className: "lm-tooltip-arrow" })] }) })] }) })] }));
}
//# sourceMappingURL=Tooltip.js.map