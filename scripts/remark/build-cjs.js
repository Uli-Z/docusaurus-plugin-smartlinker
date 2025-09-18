import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '../../dist/remark');
const esm = readFileSync(join(distDir, 'index.js'), 'utf8');
const cjs = `
'use strict';
var m = {};
module.exports = m;
(() => {
  const mod = (function(){ ${esm} ; return exports || {}; })();
  Object.assign(m, mod);
})();
`;
writeFileSync(join(distDir, 'index.cjs'), cjs);
