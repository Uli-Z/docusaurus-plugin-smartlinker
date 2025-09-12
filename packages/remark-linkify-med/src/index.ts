import type { Transformer } from 'unified';

export default function remarkLinkifyMed(): Transformer {
  return (tree) => {
    // no-op in Milestone 0; will transform in later milestones
    return tree;
  };
}