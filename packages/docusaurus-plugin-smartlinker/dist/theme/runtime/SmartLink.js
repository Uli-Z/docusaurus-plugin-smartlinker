import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useMDXComponents } from '@mdx-js/react';
import Tooltip from './Tooltip.js';
import IconResolver from './IconResolver.js';
import { LinkifyRegistryContext } from './context.js';
import useBaseUrl from '@docusaurus/useBaseUrl';
/**
 * Behavior:
 * - Desktop: Hover over text shows tooltip; click on text or icon navigates.
 * - Mobile: Tap on icon toggles tooltip; tap on text navigates.
 * Rendering: icon AFTER text.
 */
export default function SmartLink({ to, children, tipKey, icon, match }) {
    const registry = React.useContext(LinkifyRegistryContext);
    const Entry = tipKey && registry ? registry[tipKey] : undefined;
    const Short = Entry?.ShortNote;
    const mdxComponents = useMDXComponents();
    const childText = typeof children === 'string' ? children : undefined;
    const candidateSlug = Entry?.permalink ? null : Entry?.slug ?? to;
    const isCandidateExternal = !!candidateSlug && (/^[a-z]+:/i.test(candidateSlug) || candidateSlug.startsWith('#'));
    const baseHref = useBaseUrl(!Entry?.permalink && candidateSlug && !isCandidateExternal ? candidateSlug : '/');
    const resolvedHref = Entry?.permalink
        ?? (candidateSlug
            ? (isCandidateExternal ? candidateSlug : baseHref)
            : to);
    // Mobile detection (rough): browsers that don't support hover
    const [isHoverCapable, setIsHoverCapable] = React.useState(true);
    React.useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const mq = window.matchMedia?.('(hover: hover)');
        setIsHoverCapable(!!mq?.matches);
        const onChange = () => setIsHoverCapable(!!mq?.matches);
        mq?.addEventListener?.('change', onChange);
        return () => mq?.removeEventListener?.('change', onChange);
    }, []);
    // Controlled open state for mobile (icon tap)
    const [open, setOpen] = React.useState(false);
    const toggleOpen = React.useCallback(() => setOpen(v => !v), []);
    const close = React.useCallback(() => setOpen(false), []);
    // Tooltip content: render ShortNote if available; otherwise no tooltip
    const content = Short ? _jsx(Short, { components: mdxComponents }) : undefined;
    // Anchor onClick should close tooltip on navigation
    const onAnchorClick = () => {
        // allow navigation; just close
        setOpen(false);
    };
    // Icon button for mobile toggle (but clickable to navigate as well on desktop)
    const textNode = (_jsx("a", { href: resolvedHref, className: "lm-smartlink__anchor", "data-tipkey": tipKey ?? undefined, onClick: onAnchorClick, children: _jsx("span", { className: "lm-smartlink__text", children: children }) }));
    const baseLabel = match ?? childText;
    const iconLabel = !isHoverCapable
        ? baseLabel
            ? `Open tooltip for ${baseLabel}`
            : 'Open tooltip'
        : undefined;
    const iconNode = icon ? (_jsx("a", { href: resolvedHref, className: "lm-smartlink__iconlink", onClick: (e) => {
            if (!isHoverCapable && content) {
                e.preventDefault();
                e.stopPropagation();
                toggleOpen();
                return;
            }
            onAnchorClick(e);
        }, onFocus: !isHoverCapable ? undefined : close, tabIndex: isHoverCapable ? -1 : 0, "aria-hidden": isHoverCapable ? true : undefined, "aria-label": iconLabel, children: _jsx("span", { className: "lm-smartlink__iconwrap", children: _jsx("span", { className: "lm-smartlink__icon", children: _jsx(IconResolver, { iconId: icon }) }) }) })) : null;
    // Tooltip trigger groups text + icon so they can be styled separately
    const trigger = (_jsxs("span", { className: "lm-smartlink", "data-tipkey": tipKey ?? undefined, role: "group", onBlur: close, children: [textNode, iconNode] }));
    return (_jsx(Tooltip, { content: content, open: isHoverCapable ? undefined : open, onOpenChange: isHoverCapable ? undefined : setOpen, delayDuration: 150, maxWidth: 360, children: trigger }));
}
//# sourceMappingURL=SmartLink.js.map