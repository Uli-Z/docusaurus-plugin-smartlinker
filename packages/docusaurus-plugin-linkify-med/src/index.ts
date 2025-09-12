import type { Plugin } from '@docusaurus/types';

export default function linkifyMedPlugin(): Plugin<void> {
  return {
    name: 'docusaurus-plugin-linkify-med',
    // We will wire real lifecycles later (loadContent, contentLoaded, getThemePath, etc.)
    getThemePath() {
      return './src/theme';
    },
  };
}

export function getClientModules(): string[] {
  // none yet; reserved for later
  return [];
}