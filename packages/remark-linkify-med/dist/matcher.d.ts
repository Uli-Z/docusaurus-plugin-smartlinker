export interface AutoLinkEntry {
    /** Original casing as authored in config/frontmatter */
    literal: string;
    /** Canonical grouping key (e.g., target id) */
    key: string;
}
export interface Match {
    start: number;
    end: number;
    text: string;
    key: string;
    term: string;
}
export interface Matcher {
    findAll(text: string): Match[];
}
export declare function buildMatcher(entries: AutoLinkEntry[]): Matcher;
//# sourceMappingURL=matcher.d.ts.map