export interface FsIndexProviderOptions {
    roots: string[];
}
export interface TargetInfo {
    id: string;
    slug: string;
    icon?: string;
    sourcePath: string;
    terms: string[];
    folderId?: string | null;
}
export interface IndexProvider {
    getAllTargets(): TargetInfo[];
    getCurrentFilePath(file: {
        path?: string;
    }): string;
}
/**
 * Create a docusaurus-plugin-smartlinker/remark IndexProvider by scanning the file system
 * for MD/MDX files and parsing their frontmatter.
 */
export declare function createFsIndexProvider(opts: FsIndexProviderOptions): IndexProvider;
//# sourceMappingURL=fsIndexProvider.d.ts.map