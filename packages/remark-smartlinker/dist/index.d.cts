import * as vfile from 'vfile';
import { Transformer } from 'unified';
import { DebugOptions } from 'docusaurus-plugin-smartlinker';

interface TargetInfo {
    id: string;
    slug: string;
    icon?: string;
    sourcePath: string;
    terms: string[];
    folderId?: string | null;
}
interface IndexProvider {
    getAllTargets(): TargetInfo[];
    getCurrentFilePath(file: vfile.VFile): string;
}
interface RemarkSmartlinkerOptions {
    index?: IndexProvider;
    componentName?: string;
    toAttr?: string;
    iconAttr?: string;
    tipKeyAttr?: string;
    matchAttr?: string;
    shortNoteComponentName?: string;
    shortNoteTipKeyAttr?: string;
    shortNotePlaceholder?: string;
    restrictToFolders?: string | string[];
    debug?: DebugOptions;
}
declare function remarkSmartlinker(opts?: RemarkSmartlinkerOptions): Transformer;

export { remarkSmartlinker as default };
