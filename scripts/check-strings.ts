import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { placeholderMismatch } from '../packages/i18n/src/placeholders.js';

const root = join(import.meta.dirname, '..');
const i18nDir = join(root, 'packages/i18n/src');
const englishDir = join(i18nDir, 'locales/en');

const problems: string[] = [];
const stale: string[] = [];
const keys: string[] = [];
for (const file of readdirSync(englishDir).filter((name) => name.endsWith('.json'))) {
  const area = file.slice(0, -'.json'.length);
  const table: unknown = JSON.parse(readFileSync(join(englishDir, file), 'utf8'));
  if (typeof table !== 'object' || table === null || Array.isArray(table)) {
    problems.push(`${file} is not a flat object of strings`);
    continue;
  }
  for (const [key, value] of Object.entries(table)) {
    if (typeof value !== 'string') problems.push(`${key} in ${file} is not a string`);
    if (key.split('.')[0] !== area) problems.push(`${key} belongs in ${key.split('.')[0]}.json, not ${file}`);
    keys.push(key);
  }
}
if (keys.length === 0) throw new Error(`no keys parsed from ${englishDir}`);

const localesDir = join(i18nDir, 'locales');
for (const locale of readdirSync(localesDir).filter((name) => name !== 'en' && statSync(join(localesDir, name)).isDirectory())) {
  for (const file of readdirSync(join(localesDir, locale)).filter((name) => name.endsWith('.json'))) {
    const where = `${locale}/${file}`;
    if (!existsSync(join(englishDir, file))) {
      problems.push(`${where} has no English area file`);
      continue;
    }
    const english: Record<string, unknown> = JSON.parse(readFileSync(join(englishDir, file), 'utf8'));
    const table: unknown = JSON.parse(readFileSync(join(localesDir, locale, file), 'utf8'));
    if (typeof table !== 'object' || table === null || Array.isArray(table)) {
      problems.push(`${where} is not a flat object of strings`);
      continue;
    }
    for (const [key, value] of Object.entries(table)) {
      const source = english[key];
      if (typeof value !== 'string') problems.push(`${key} in ${where} is not a string`);
      else if (typeof source === 'string') {
        const mismatch = placeholderMismatch(source, value);
        if (mismatch !== null) stale.push(`${key} in ${where} ${mismatch}`);
      }
    }
  }
}

// A missing scan root fails the lint rather than scanning less (ONL-1870).
const SCAN_ROOTS = ['apps', 'packages', 'scripts', 'tests'];
const SKIP_DIRS = new Set(['node_modules', 'out', 'dist', 'release', 'test-results']);
const EXTENSIONS = /\.(ts|tsx|mts|mjs)$/;

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      // Dot-directories are untracked build and tool state; a key matched there is not a reference.
      if (!SKIP_DIRS.has(entry) && !entry.startsWith('.')) yield* sourceFiles(path);
    } else if (EXTENSIONS.test(entry)) {
      yield path;
    }
  }
}

const unused = new Set(keys);
outer: for (const scanRoot of SCAN_ROOTS) {
  for (const file of sourceFiles(join(root, scanRoot))) {
    const content = readFileSync(file, 'utf8');
    for (const key of unused) {
      // Bare key: keys appear single-quoted, double-quoted and in template literals; a quoted match deleted live keys (ONL-1851).
      if (content.includes(key)) unused.delete(key);
    }
    if (unused.size === 0) break outer;
  }
}

const where = relative(root, englishDir);
for (const problem of problems) console.log(`check-strings: ${problem}`);
if (stale.length > 0) {
  console.log(`check-strings: ${stale.length} translated values show English until \`bun run translate\`, since their placeholders differ from English:`);
  for (const value of stale) console.log(`  ${value}`);
}
if (unused.size > 0) {
  console.log(`check-strings: ${unused.size} of ${keys.length} keys in ${where} have no reference in ${SCAN_ROOTS.join('/, ')}/:`);
  for (const key of unused) console.log(`  ${key}`);
}
if (problems.length === 0 && unused.size === 0) {
  console.log(`check-strings: all ${keys.length} catalog keys are referenced and filed by area.`);
} else {
  process.exitCode = 1;
}
