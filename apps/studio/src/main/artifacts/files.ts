import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { extname, join, sep } from 'node:path';
import type { ArtifactFileBundle } from './adapter.js';
import type { ArtifactManifest } from '@studio/events';

export const MAX_ARTIFACT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ARTIFACT_BYTES = 20 * 1024 * 1024;
export const MAX_ARTIFACT_FILES = 256;

export const ARTIFACT_TEXT_EXTENSIONS = new Set(['.html', '.css', '.js']);
const ARTIFACT_ASSET_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.woff', '.woff2']);

export function artifactDocumentPaths(dir: string): string[] {
  if (lstatSync(dir).isSymbolicLink()) throw new Error('unsafe root');
  const root = realpathSync(dir);
  const documents: string[] = [];
  let visited = 0;
  const walk = (relative: string): void => {
    const absolute = join(root, relative);
    if (lstatSync(absolute).isSymbolicLink() || realpathSync(absolute) !== absolute) throw new Error('unsafe directory');
    for (const entry of readdirSync(absolute, {withFileTypes: true})) {
      if (++visited > MAX_ARTIFACT_FILES * 2) throw new Error('too many entries');
      const path = `${relative}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error('unsafe file');
      if (entry.isDirectory()) {
        if (path.split('/').length > 8) throw new Error('too many directories');
        walk(path);
      } else {
        if (!entry.isFile() || !artifactFilePathIsSafe(path)) throw new Error('unsupported file');
        if (extname(path).toLowerCase() === '.html') documents.push(path);
      }
    }
  };
  walk('pages');
  return documents.sort();
}

export function artifactFilePathIsSafe(path: string): boolean {
  if (path.length > 240 || /[\\\u0000-\u001f%?#:]/.test(path)) return false;
  const parts = path.split('/');
  if (parts.length < 2 || parts.length > 8 || parts.some((part) => part === '' || part === '.' || part === '..')) return false;
  const extension = extname(path).toLowerCase();
  return (parts[0] === 'pages' && ARTIFACT_TEXT_EXTENSIONS.has(extension)) ||
    (parts[0] === 'assets' && ARTIFACT_ASSET_EXTENSIONS.has(extension));
}

export function artifactPagePathIsSafe(path: string): boolean {
  return artifactFilePathIsSafe(path) && extname(path).toLowerCase() === '.html';
}

export function validArtifactBundle(bundle: ArtifactFileBundle, allowLegacyDocuments = false): boolean {
  if (!Array.isArray(bundle.pages) || bundle.pages.length === 0 || bundle.pages.length > 64) return false;
  if (!Array.isArray(bundle.files) || bundle.files.length > MAX_ARTIFACT_FILES) return false;
  if (!allowLegacyDocuments && (bundle.pages.length !== 1 || bundle.files.filter((file) => file.path.toLowerCase().endsWith('.html')).length !== 1)) return false;
  const paths = new Set<string>();
  let total = 0;
  for (const file of bundle.files) {
    if (!artifactFilePathIsSafe(file.path) || paths.has(file.path)) return false;
    if (!(file.bytes instanceof Uint8Array) || file.bytes.byteLength > MAX_ARTIFACT_FILE_BYTES) return false;
    total += file.bytes.byteLength;
    if (total > MAX_ARTIFACT_BYTES) return false;
    paths.add(file.path);
  }
  const pages = new Set<string>();
  for (const page of bundle.pages) {
    if (!artifactPagePathIsSafe(page.path)) return false;
    if (!paths.has(page.path) || pages.has(page.path) || typeof page.name !== 'string' || page.name.trim() === '') return false;
    pages.add(page.path);
  }
  return true;
}

export function readArtifactBundle(dir: string, manifest: ArtifactManifest): ArtifactFileBundle {
  if (lstatSync(dir).isSymbolicLink()) throw new Error('unsafe root');
  const root = realpathSync(dir);
  const files: ArtifactFileBundle['files'] = [];
  let visited = 0;
  let total = 0;
  const walk = (relative: string): void => {
    const directory = join(root, relative);
    if (lstatSync(directory).isSymbolicLink() || realpathSync(directory) !== directory) throw new Error('unsafe directory');
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (++visited > MAX_ARTIFACT_FILES * 2) throw new Error('too many entries');
      const path = `${relative}/${entry.name}`;
      const absolute = join(root, path);
      if (entry.isSymbolicLink()) throw new Error('unsafe file');
      if (entry.isDirectory()) {
        if (files.length >= MAX_ARTIFACT_FILES || path.split('/').length > 8) throw new Error('too many files');
        walk(path);
      } else {
        if (!entry.isFile() || !artifactFilePathIsSafe(path)) throw new Error('unsupported file');
        const actual = realpathSync(absolute);
        if (!actual.startsWith(root + sep) || actual !== absolute) throw new Error('unsafe file');
        const size = lstatSync(actual).size;
        total += size;
        if (size > MAX_ARTIFACT_FILE_BYTES || total > MAX_ARTIFACT_BYTES) throw new Error('file too large');
        files.push({ path, bytes: readFileSync(actual) });
        if (files.length > MAX_ARTIFACT_FILES) throw new Error('too many files');
      }
    }
  };
  walk('pages');
  if (readdirSync(root).includes('assets')) walk('assets');
  const bundle = { pages: manifest.pages, files };
  if (!validArtifactBundle(bundle, true)) throw new Error('invalid bundle');
  return bundle;
}
