import * as generated from '@generated/docusaurus-plugin-smartlinker/default/registry';
/**
 * The generated registry lives under the plugin name + plugin id.
 * The default id is exported from pluginName.ts; if you customize the id,
 * make sure to duplicate this module with the matching import path so
 * Docusaurus can statically resolve the generated data.
 */
export const GENERATED_REGISTRY_IMPORT_PATH = '@generated/docusaurus-plugin-smartlinker/default/registry';
const moduleApi = generated;
export const generatedRegistry = moduleApi.registry ?? moduleApi.default ?? {};
//# sourceMappingURL=generatedRegistry.js.map