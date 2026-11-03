// Runs the browser (TypeScript) and server (JavaScript) copies of normalizeTelegramHandle against one
// table of cases and fails if either disagrees with the expected value or with the other. The CRM's
// Python copy is tested with the same table in its own repo (tests/test_split_feed.py, section 9).
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await import(pathToFileURL(path.join(root, 'lib', 'telegram.js')).href);

const source = readFileSync(path.join(root, 'src', 'lib', 'telegram.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const browser = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

const CASES = {
  '@mikejones': '@mikejones',
  mikejones: '@mikejones',
  '  @MikeJones_77  ': '@MikeJones_77',
  '@@mikejones': '@mikejones',
  'https://t.me/mikejones': '@mikejones',
  't.me/mikejones?start=1': '@mikejones',
  'http://telegram.me/mike_jones/': '@mike_jones',
  'HTTPS://T.ME/MikeJones': '@MikeJones',
  '@abc': '',
  '1abcde': '',
  'mike jones': '',
  'mike@example.com': '',
  '': '',
  '@': '',
  [`a`.repeat(33)]: '',
  [`a`.repeat(32)]: '@' + 'a'.repeat(32),
  [`a`.repeat(40)]: '',
  _abcde: '',
  'bad-name': '',
  abcde: '@abcde',
  abcd: '',
};

let failed = 0;
for (const [input, want] of Object.entries(CASES)) {
  const b = browser.normalizeTelegramHandle(input);
  const s = server.normalizeTelegramHandle(input);
  const ok = b === want && s === want;
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${JSON.stringify(input.slice(0, 30))} -> ${JSON.stringify(want)}${ok ? '' : `  (browser=${JSON.stringify(b)} server=${JSON.stringify(s)})`}`);
}
for (const nonString of [null, undefined, 42, {}]) {
  const ok = browser.normalizeTelegramHandle(nonString) === server.normalizeTelegramHandle(nonString);
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} non-string ${String(nonString)} handled the same by both`);
}
console.log(`\n${Object.keys(CASES).length + 4} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
