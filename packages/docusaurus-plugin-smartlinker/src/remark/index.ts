import type { Transformer } from 'unified';
import type { VFile } from 'vfile';
import type { DebugOptions } from '../options.js';
import remarkSmartlinkerImpl from '../../../remark-smartlinker/src/transform.js';
import { buildMatcher as buildMatcherImpl } from '../../../remark-smartlinker/src/matcher.js';

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
  getCurrentFilePath(file: VFile): string;
}

export interface RemarkSmartlinkerOptions {
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

export function buildMatcher(entries: AutoLinkEntry[]): Matcher {
  return buildMatcherImpl(entries) as Matcher;
}

export default function remarkSmartlinker(opts?: RemarkSmartlinkerOptions): Transformer {
  return (remarkSmartlinkerImpl as (options?: RemarkSmartlinkerOptions) => Transformer)(opts);
}
