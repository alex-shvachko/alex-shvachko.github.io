import {readFileSync, statSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import assert from 'node:assert/strict';

const root = resolve('.');
const html = readFileSync('index.html', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'duplicate HTML IDs');
const files = new Set();
function check(ref, base = root) {
  if (/^(?:[a-z]+:|\/\/)/i.test(ref)) return;
  if (ref.startsWith('#')) { assert.ok(ids.includes(ref.slice(1)), `missing anchor ${ref}`); return; }
  const path = resolve(base, decodeURIComponent(ref.split(/[?#]/)[0]));
  assert.ok(statSync(path).isFile(), `missing asset ${ref}`);
  files.add(path);
}
for (const [, ref] of html.matchAll(/\b(?:src|href|poster|data-src|data-end-poster)="([^"]+)"/g)) check(ref);
for (const path of [...files].filter(path => path.endsWith('.css'))) {
  for (const [, ref] of readFileSync(path, 'utf8').matchAll(/url\(["']?([^"')]+)["']?\)/g)) check(ref, dirname(path));
}
const bytes = [...files].reduce((sum, path) => sum + statSync(path).size, 0);
console.log(`PASS: ${ids.length} unique IDs, navigation anchors, ${files.size} local assets (${(bytes / 1048576).toFixed(1)} MiB including lazy media)`);
