import React from 'react';
export interface IconResolverProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'id' | 'src' | 'alt'> {
    iconId?: string | null;
    /** render after text so no need for alt; mark decorative */
    className?: string;
}
export default function IconResolver({ iconId, className, ...rest }: IconResolverProps): import("react/jsx-runtime.js").JSX.Element | null;
//# sourceMappingURL=IconResolver.d.ts.map