import * as vfile from 'vfile';
import { VFile } from 'vfile';
import * as unist from 'unist';
import { D as DebugOptions } from '../options-DZxWH42N.cjs';
import 'zod';

/**
 * Callback passed to transforms.
 *
 * If the signature of a `transformer` accepts a third argument, the
 * transformer may perform asynchronous operations, and must call it.
 */
type TransformCallback<Output extends unist.Node = unist.Node> = (error?: Error | undefined, tree?: Output | undefined, file?: VFile | undefined) => undefined;
/**
 * Transformers handle syntax trees and files.
 *
 * They are functions that are called each time a syntax tree and file are
 * passed through the run phase.
 * When an error occurs in them (either because it’s thrown, returned,
 * rejected, or passed to `next`), the process stops.
 *
 * The run phase is handled by [`trough`][trough], see its documentation for
 * the exact semantics of these functions.
 *
 * > **Note**: you should likely ignore `next`: don’t accept it.
 * > it supports callback-style async work.
 * > But promises are likely easier to reason about.
 *
 * [trough]: https://github.com/wooorm/trough#function-fninput-next
 */
type Transformer<Input extends unist.Node = unist.Node, Output extends unist.Node = Input> = (tree: Input, file: VFile, next: TransformCallback<Output>) => (Promise<Output | undefined | void> | Promise<never> | // For some reason this is needed separately.
Output | Error | undefined | void);

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

interface AutoLinkEntry {
    /** Original casing as authored in config/frontmatter */
    literal: string;
    /** Canonical grouping key (e.g., target id) */
    key: string;
}
interface Match {
    start: number;
    end: number;
    text: string;
    key: string;
    term: string;
}
interface Matcher {
    findAll(text: string): Match[];
}
declare function buildMatcher(entries: AutoLinkEntry[]): Matcher;

type MaybeFunction = typeof remarkSmartlinker extends (...args: any[]) => any ? typeof remarkSmartlinker : never;
type ResolvedAttacher = MaybeFunction extends never ? typeof remarkSmartlinker : MaybeFunction;
declare const attacher: ResolvedAttacher;

export { type AutoLinkEntry, type Match, type Matcher, buildMatcher, attacher as default };
