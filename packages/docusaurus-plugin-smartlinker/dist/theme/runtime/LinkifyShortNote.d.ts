import React from 'react';
export interface LinkifyShortNoteProps {
    tipKey?: string;
    fallback?: React.ReactNode;
    components?: Record<string, any>;
}
export default function LinkifyShortNote({ tipKey, fallback, components }: LinkifyShortNoteProps): string | number | bigint | boolean | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | import("react/jsx-runtime.js").JSX.Element | null;
//# sourceMappingURL=LinkifyShortNote.d.ts.map