import remarkSmartlinkerImpl, * as src from '../../../remark-smartlinker/src/index.js';

type MaybeFunction = typeof remarkSmartlinkerImpl extends (...args: any[]) => any
  ? typeof remarkSmartlinkerImpl
  : never;

type ResolvedAttacher = MaybeFunction extends never ? typeof remarkSmartlinkerImpl : MaybeFunction;

const attacher: ResolvedAttacher = (
  (src as { default?: unknown }).default ??
  (src as { remarkSmartlinker?: unknown }).remarkSmartlinker ??
  remarkSmartlinkerImpl
) as ResolvedAttacher;

export default attacher;

export * from '../../../remark-smartlinker/src/index.js';
