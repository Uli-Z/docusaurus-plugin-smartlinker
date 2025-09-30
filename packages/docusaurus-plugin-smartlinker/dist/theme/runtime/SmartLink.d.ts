import React from 'react';
export interface SmartLinkProps extends React.PropsWithChildren {
    to: string;
    tipKey?: string;
    icon?: string;
    match?: string;
}
/**
 * Behavior:
 * - Desktop: Hover over text shows tooltip; click on text or icon navigates.
 * - Mobile: First tap (text or icon) shows tooltip; second tap navigates.
 * Rendering: icon AFTER text.
 */
export default function SmartLink({ to, children, tipKey, icon, match }: SmartLinkProps): import("react/jsx-runtime.js").JSX.Element;
//# sourceMappingURL=SmartLink.d.ts.map