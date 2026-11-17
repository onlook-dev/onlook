import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, extname, join, posix, relative, resolve, sep } from 'node:path';
import type { ArtifactCreate } from './adapter.js';
import { ARTIFACT_TEXT_EXTENSIONS, MAX_ARTIFACT_BYTES, MAX_ARTIFACT_FILES, MAX_ARTIFACT_FILE_BYTES, validArtifactBundle } from './files.js';
import { artifactPrivacyIssues } from './privacy.js';
import { boundedFont, boundedRaster } from './assets.js';
import { artifactReferences, rewriteArtifactReferences } from './references.js';

export type ArtifactImportResult = { ok: true; input: ArtifactCreate } | { ok: false; reason: string };

function containedFile(root: string, path: string): string {
  const absolute = resolve(root, path);
  if (!absolute.startsWith(root + sep)) throw new Error('outside project');
  const parts = relative(root, absolute).split(sep);
  let current = root;
  for (const part of parts) {
    current = join(current, part);
    if (lstatSync(current).isSymbolicLink()) throw new Error('linked file');
  }
  if (realpathSync(current) !== absolute || !lstatSync(current).isFile()) throw new Error('unsafe file');
  if (lstatSync(current).size > MAX_ARTIFACT_FILE_BYTES) throw new Error('too large');
  return current;
}

function decodedReference(value: string): string {
  return value.replace(/&#(?:x([\da-f]+)|(\d+));?/gi, (_match, hex: string | undefined, decimal: string | undefined) =>
    String.fromCodePoint(Number.parseInt(hex ?? decimal ?? '0', hex === undefined ? 10 : 16)))
    .replace(/&amp;/gi, '&').replace(/&colon;/gi, ':').replace(/&sol;/gi, '/');
}

export function importArtifactFromProject(cwd: string, path: string,
  reencodeImage: (bytes: Buffer) => Buffer | null): ArtifactImportResult {
  try {
    const root = realpathSync(cwd);
    const source = containedFile(root, path);
    if (extname(source).toLowerCase() !== '.html') return { ok: false, reason: 'Choose an HTML file in this project.' };
    const files: NonNullable<ArtifactCreate['bundle']>['files'] = [];
    const pages: NonNullable<ArtifactCreate['bundle']>['pages'] = [];
    const destinations = new Map<string, string>([[source, 'pages/index.html']]);
    const queue = [source];
    let total = 0;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      if (queue.length > MAX_ARTIFACT_FILES) throw new Error('too many dependencies');
      const absolute = queue[cursor];
      if (absolute === undefined) throw new Error('missing dependency');
      const destination = destinations.get(absolute);
      if (destination === undefined) throw new Error('missing destination');
      const bytes = readFileSync(absolute);
      total += bytes.length;
      if (total > MAX_ARTIFACT_BYTES) throw new Error('too many source bytes');
      const extension = extname(absolute).toLowerCase();
      if (ARTIFACT_TEXT_EXTENSIONS.has(extension)) {
        const text = bytes.toString('utf8');
        const replacements: Parameters<typeof rewriteArtifactReferences>[1] = [];
        for (const reference of artifactReferences(text, extension)) {
          const decoded = decodedReference(reference.value);
          if (decoded === '' || decoded.startsWith('#')) continue;
          const [local, fragment] = decoded.split('#');
          if (local === undefined || /^\/|[\\:?%&\u0000-\u001f]/.test(local)) throw new Error('unsafe reference');
          const resource = containedFile(root, relative(root, resolve(dirname(absolute), local)));
          const resourceExtension = extname(resource).toLowerCase();
          if (!['.css', '.js', '.png', '.jpg', '.jpeg', '.woff', '.woff2'].includes(resourceExtension)) throw new Error('unsupported dependency');
          let copiedPath = destinations.get(resource);
          if (copiedPath === undefined) {
            const image = ['.png', '.jpg', '.jpeg'].includes(resourceExtension);
            copiedPath = ARTIFACT_TEXT_EXTENSIONS.has(resourceExtension) ? `pages/resource-${destinations.size}${resourceExtension}` : `assets/resource-${destinations.size}${image ? '.png' : resourceExtension}`;
            destinations.set(resource, copiedPath);
            queue.push(resource);
          }
          replacements.push({ reference, value: posix.relative(posix.dirname(destination), copiedPath) + (fragment === undefined ? '' : `#${fragment}`) });
        }
        const rewritten = rewriteArtifactReferences(text, replacements);
        files.push({ path: destination, bytes: Buffer.from(rewritten) });
        if (extension === '.html') pages.push({ path: destination, name: basename(absolute, extension) });
      } else {
        const image = ['.png', '.jpg', '.jpeg'].includes(extension);
        if (image ? !boundedRaster(bytes) : !boundedFont(bytes)) throw new Error('unsafe asset');
        const copied = image ? reencodeImage(bytes) : bytes;
        if (copied === null || copied.length > MAX_ARTIFACT_FILE_BYTES) throw new Error('invalid image');
        files.push({ path: destination, bytes: copied });
      }
    }
    const bundle = { pages, files };
    const html = Buffer.from(files[0]?.bytes ?? []).toString('utf8');
    if (!validArtifactBundle(bundle)) return { ok: false, reason: 'The artifact exceeds its file or size budget.' };
    if (artifactPrivacyIssues(bundle, [basename(root)]).length > 0) {
      return { ok: false, reason: 'Remove private machine, project or credential details before importing.' };
    }
    return { ok: true, input: { title: basename(source, extname(source)), html, bundle } };
  } catch {
    return { ok: false, reason: 'Choose one readable HTML document with classic local scripts, styles, PNG/JPEG images and WOFF fonts inside this project. Create separate artifacts for other HTML documents. Keep each file under 5 MB and images below 8192 pixels per side and 16 million pixels. Remove remote or encoded references, modules and symlinks.' };
  }
}
