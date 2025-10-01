import remarkSmartlinkerImpl from '../../../remark-smartlinker/src/index.js';

type MaybeFunction = typeof remarkSmartlinkerImpl extends (...args: any[]) => any
  ? typeof remarkSmartlinkerImpl
  : never;

type ResolvedAttacher = MaybeFunction extends never ? typeof remarkSmartlinkerImpl : MaybeFunction;

const attacher: ResolvedAttacher = remarkSmartlinkerImpl as ResolvedAttacher;

export default attacher;

export * from '../../../remark-smartlinker/src/index.js';
