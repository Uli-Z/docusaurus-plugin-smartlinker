import type { ComponentType } from 'react';
import * as generated from '@generated/docusaurus-plugin-smartlinker/default/tooltipComponents';

type TooltipComponentsModule = {
  tooltipComponents?: Record<string, ComponentType<any>>;
  default?: Record<string, ComponentType<any>>;
};

const moduleApi = generated as TooltipComponentsModule;

export const tooltipComponents: Record<string, ComponentType<any>> =
  moduleApi.tooltipComponents ?? moduleApi.default ?? {};
