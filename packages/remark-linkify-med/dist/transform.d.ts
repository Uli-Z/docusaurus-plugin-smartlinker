import type { Transformer } from 'unified';
export interface TargetInfo {
    id: string;
    slug: string;
    icon?: string;
    sourcePath: string;
    terms: string[];
}
export interface IndexProvider {
    getAllTargets(): TargetInfo[];
    getCurrentFilePath(file: import('vfile').VFile): string;
}
export interface RemarkSmartlinkerOptions {
    index: IndexProvider;
    componentName?: string;
    toAttr?: string;
    iconAttr?: string;
    tipKeyAttr?: string;
    matchAttr?: string;
    shortNoteComponentName?: string;
    shortNoteTipKeyAttr?: string;
    shortNotePlaceholder?: string;
}
export default function remarkSmartlinker(opts: RemarkSmartlinkerOptions): Transformer;
//# sourceMappingURL=transform.d.ts.map