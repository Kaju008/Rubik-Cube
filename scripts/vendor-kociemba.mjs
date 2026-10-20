// Wraps cubejs (MIT) into a single ES module so the solver ships inside the app bundle.
import { readFileSync, writeFileSync } from 'node:fs';
const lic = readFileSync('node_modules/cubejs/LICENSE', 'utf8');
const cube = readFileSync('node_modules/cubejs/lib/cube.js', 'utf8');
const solve = readFileSync('node_modules/cubejs/lib/solve.js', 'utf8');
const out = `/* eslint-disable */
// @ts-nocheck
/*! cubejs 1.3.2 — Kociemba two-phase solver.
${lic.trim().split('\n').map(l => ' * ' + l).join('\n')}
 */
const module = undefined; const require = undefined;
const __scope = {};
(function () {
${cube}
}).call(__scope);
(function () {
${solve}
}).call(__scope);
export default __scope.Cube;
`;
writeFileSync('src/vendor/kociemba.js', out);
console.log('ok', out.length);
