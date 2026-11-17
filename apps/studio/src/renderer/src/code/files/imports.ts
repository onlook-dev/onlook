// Import clauses span lines but stop at quotes and semicolons (ONL-2563).
const SPECIFIER =
  /(?:^|\s)(?:import|export)[^'";]{0,400}?from\s*['"]([^'"]+)['"]|(?:^|\s)import\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;

/** What a file names as its own neighbours: relative specifiers only, bare ones are dependencies. */
export function relativeSpecifiers(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(SPECIFIER)) {
    const raw = match[1] ?? match[2] ?? match[3];
    if (raw === undefined || !raw.startsWith('.')) continue;
    found.add(raw);
  }
  return [...found];
}

/** Resolved against the importing file, so `../tokens.css` from `src/a/B.tsx` is `src/tokens.css`. */
function resolveFrom(fromPath: string, specifier: string): string {
  const parts = fromPath.split('/').slice(0, -1);
  for (const segment of specifier.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') parts.pop();
    else parts.push(segment);
  }
  return parts.join('/');
}

/** The extensions a specifier may have left off, in the order a bundler would try them. */
const TRIED = ['', '.tsx', '.ts', '.jsx', '.js', '.css', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];

export function directImports(fromPath: string, text: string, files: readonly string[]): string[] {
  return resolveImports(fromPath, relativeSpecifiers(text), files);
}

/** The same resolution from specifiers already read, which is what a file with no open tab has. */
function resolveImports(
  fromPath: string,
  specifiers: readonly string[],
  files: readonly string[],
): string[] {
  const known = new Set(files);
  const out = new Set<string>();
  for (const specifier of specifiers) {
    const base = resolveFrom(fromPath, specifier);
    for (const suffix of TRIED) {
      const candidate = `${base}${suffix}`;
      if (candidate !== fromPath && known.has(candidate)) {
        out.add(candidate);
        break;
      }
    }
  }
  return [...out];
}

export interface ImportSeed {
  path: string;
  specifiers: readonly string[];
}

export function relatedImports(seeds: readonly ImportSeed[], files: readonly string[]): string[] {
  const own = new Set(seeds.map((seed) => seed.path));
  const taken = new Set<string>();
  const out: string[] = [];
  for (const seed of seeds) {
    for (const path of resolveImports(seed.path, seed.specifiers, files)) {
      if (own.has(path) || taken.has(path)) continue;
      taken.add(path);
      out.push(path);
    }
  }
  return out;
}
