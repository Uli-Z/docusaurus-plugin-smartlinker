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
 * - Mobile: First tap (text or icon) shows tooltip; second tap navigates.
 * Rendering: icon AFTER text.
 */
export default function SmartLink({ to, children, tipKey, icon, match }) {
    const registry = React.useContext(LinkifyRegistryContext);
    const Entry = tipKey && registry ? registry[tipKey] : undefined;
    const Short = Entry?.ShortNote;
    const mdxComponents = useMDXComponents();
    const childText = typeof children === 'string' ? children : undefined;
    const candidateSlug = Entry?.permalink ? null : Entry?.slug ?? to;
    const candidateHref = Entry?.permalink ?? (candidateSlug || to);
    const resolvedHref = useBaseUrl(candidateHref);
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
    // Controlled open state for mobile taps
    const [open, setOpen] = React.useState(false);
    const triggerRef = React.useRef(null);
    const contentRef = React.useRef(null);
    const readyToNavigateRef = React.useRef(false);
    const handleContentNode = React.useCallback((node) => {
        contentRef.current = node;
    }, []);
    const close = React.useCallback(() => {
        readyToNavigateRef.current = false;
        setOpen(false);
    }, []);
    const hasTooltip = Boolean(Short);
    const handleAnchorClick = React.useCallback((event) => {
        if (!isHoverCapable && hasTooltip) {
            if (!readyToNavigateRef.current) {
                event.preventDefault();
                event.stopPropagation();
                readyToNavigateRef.current = true;
                setOpen(true);
                return;
            }
            readyToNavigateRef.current = false;
            setOpen(false);
        }
        close();
    }, [isHoverCapable, hasTooltip, close]);
    const noop = React.useCallback(() => { }, []);
    React.useEffect(() => {
        if (isHoverCapable || !open) {
            return;
        }
        const handlePointerDown = (event) => {
            const target = event.target;
            if (!target) {
                return;
            }
            if (triggerRef.current?.contains(target)) {
                return;
            }
            // Tooltip content is rendered in a portal; ignore taps that land inside it so links remain interactive.
            if (contentRef.current?.contains(target)) {
                return;
            }
            close();
        };
        // Bubble phase is sufficient once we know the portal content node.
        document.addEventListener('pointerdown', handlePointerDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [isHoverCapable, open, close]);
    // Tooltip content: render ShortNote if available; otherwise no tooltip
    const content = Short ? _jsx(Short, { components: mdxComponents }) : undefined;
    // Anchors share the same click handling so mobile taps open first, then navigate
    const textNode = (_jsx("a", { href: resolvedHref, className: "lm-smartlink__anchor", "data-tipkey": tipKey ?? undefined, onClick: handleAnchorClick, children: _jsx("span", { className: "lm-smartlink__text", children: children }) }));
    const baseLabel = match ?? childText;
    const iconLabel = !isHoverCapable
        ? baseLabel
            ? `Open tooltip for ${baseLabel}`
            : 'Open tooltip'
        : undefined;
    const iconNode = icon ? (_jsx("a", { href: resolvedHref, className: "lm-smartlink__iconlink", onClick: handleAnchorClick, onFocus: !isHoverCapable ? undefined : close, tabIndex: isHoverCapable ? -1 : 0, "aria-hidden": isHoverCapable ? true : undefined, "aria-label": iconLabel, children: _jsx("span", { className: "lm-smartlink__iconwrap", children: _jsx("span", { className: "lm-smartlink__icon", children: _jsx(IconResolver, { iconId: icon }) }) }) })) : null;
    // Tooltip trigger groups text + icon so they can be styled separately
    const handleTriggerBlur = React.useCallback(() => {
        if (isHoverCapable) {
            close();
        }
    }, [isHoverCapable, close]);
    const trigger = (_jsxs("span", { className: "lm-smartlink", "data-tipkey": tipKey ?? undefined, role: "group", onBlur: handleTriggerBlur, ref: triggerRef, children: [textNode, iconNode] }));
    return (_jsx(Tooltip, { content: content, open: isHoverCapable ? undefined : open, onOpenChange: isHoverCapable ? undefined : noop, delayDuration: 150, maxWidth: 360, onContentNode: handleContentNode, children: trigger }));
}
//# sourceMappingURL=SmartLink.js.map