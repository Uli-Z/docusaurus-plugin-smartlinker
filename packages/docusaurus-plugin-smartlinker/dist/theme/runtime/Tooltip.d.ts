import * as React from 'react';
/**
 * Tooltip wrapper:
 * - Desktop: show on hover/focus (default Radix behavior)
 * - Mobile: we toggle via explicit state (SmartLink controls it on icon tap)
 *
 * We expose `open`/`onOpenChange` to allow SmartLink to control for mobile.
 */
export interface TooltipProps {
    content?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (v: boolean) => void;
    children: React.ReactNode;
    /** optional delay in ms (desktop hover) */
    delayDuration?: number;
    /** max width style */
    maxWidth?: number;
    /** expose the tooltip content node to callers (e.g. SmartLink outside-click checks) */
    onContentNode?: (node: HTMLElement | null) => void;
}
export default function Tooltip({ content, open, onOpenChange, children, delayDuration, maxWidth, onContentNode, }: TooltipProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=Tooltip.d.ts.map