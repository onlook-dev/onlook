import {
  ARTIFACT_FIRST_PAGE_PATH,
  ARTIFACT_MANIFEST_VERSION,
  ARTIFACT_MIN_READER_VERSION,
  ARTIFACT_PAGES_DIR,
  artifactDimensions,
  type ArtifactId,
  type ArtifactManifest,
  type ArtifactPage,
} from '@studio/events';
import { t } from '@studio/i18n';
import { artifactPagePathIsSafe } from './files.js';
import { decodeStateFile } from '../state/file.js';

const KNOWN_KEYS = new Set([
  'schemaVersion',
  'minReaderVersion',
  'id',
  'title',
  'createdAt',
  'updatedAt',
  'pages',
  'provenance',
  'dimensions',
]);

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isoOr = (value: unknown, fallback: string): string => (nonEmptyString(value) ? value : fallback);

/** A page path stays relative and under `pages/`: anything else cannot be served or exported. */
function readPages(value: unknown): ArtifactPage[] {
  const rows = Array.isArray(value) ? value : [];
  const pages: ArtifactPage[] = [];
  for (const row of rows) {
    const page = row as Partial<ArtifactPage> | null;
    if (typeof page !== 'object' || page === null) continue;
    const path = page.path;
    if (!nonEmptyString(path)) continue;
    if (!path.startsWith(`${ARTIFACT_PAGES_DIR}/`) || !artifactPagePathIsSafe(path)) continue;
    pages.push({ path, name: nonEmptyString(page.name) ? page.name : path });
  }
  return pages;
}

export interface DecodedManifest {
  manifest: ArtifactManifest;
  /** The manifest on disk did not already name the directory, so a read rewrites it. */
  repaired: boolean;
  /** It named a different id. A rebuild refuses such a directory; a read still repairs it. */
  idConflict: boolean;
  /** Written by a newer build: listed and readable, refused for writing (ONL-2568). */
  readOnly: boolean;
}

/** Salvages rather than rejects: throwing here would cost a user their only copy (ONL-2568). */
export function decodeManifest(parsed: unknown, dirName: ArtifactId): DecodedManifest {
  const raw = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<string, unknown>;

  const extras: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!KNOWN_KEYS.has(key)) extras[key] = value;
  }

  const minReaderVersion =
    typeof raw['minReaderVersion'] === 'number' && Number.isFinite(raw['minReaderVersion'])
      ? raw['minReaderVersion']
      : ARTIFACT_MIN_READER_VERSION;

  const pages = readPages(raw['pages']);
  const provenance = raw['provenance'];
  const madeIn =
    typeof provenance === 'object' && provenance !== null
      ? (provenance as { copiedFrom?: unknown }).copiedFrom
      : undefined;

  const now = new Date().toISOString();
  const createdAt = isoOr(raw['createdAt'], now);

  return {
    repaired: raw['id'] !== dirName,
    idConflict: nonEmptyString(raw['id']) && raw['id'] !== dirName,
    readOnly: minReaderVersion > ARTIFACT_MANIFEST_VERSION || decodeStateFile(raw, ARTIFACT_MANIFEST_VERSION, { inline: true, versionKey: 'schemaVersion' }).kind === 'future',
    manifest: {
      ...extras,
      ...(artifactDimensions(raw['dimensions']) === undefined ? {} : { dimensions: artifactDimensions(raw['dimensions']) }),
      schemaVersion:
        typeof raw['schemaVersion'] === 'number' && Number.isFinite(raw['schemaVersion'])
          ? raw['schemaVersion']
          : ARTIFACT_MANIFEST_VERSION,
      minReaderVersion,
      id: dirName,
      title: nonEmptyString(raw['title']) ? raw['title'] : t('canvas.artifact.untitled'),
      createdAt,
      updatedAt: isoOr(raw['updatedAt'], createdAt),
      pages: pages.length > 0 ? pages : [{ path: ARTIFACT_FIRST_PAGE_PATH, name: 'index.html' }],
      provenance: {
        madeIn: 'onlook',
        ...(nonEmptyString(madeIn) ? { copiedFrom: madeIn } : {}),
      },
    },
  };
}

const ABSOLUTE_PATH = /^(?:\/|[A-Za-z]:[\\/]|\\\\)/;
const FILE_URL = /^file:\/\//i;

/** Enforced where the bytes are written, not at export (ONL-2568). The title is exempt: it is text the user typed. */
export function machineLocalFieldIn(manifest: ArtifactManifest): string | undefined {
  const walk = (value: unknown, path: string): string | undefined => {
    if (typeof value === 'string') {
      if (ABSOLUTE_PATH.test(value) || FILE_URL.test(value)) return path;
      return undefined;
    }
    if (Array.isArray(value)) {
      for (const [index, item] of value.entries()) {
        const found = walk(item, `${path}[${String(index)}]`);
        if (found !== undefined) return found;
      }
      return undefined;
    }
    if (typeof value === 'object' && value !== null) {
      for (const [key, item] of Object.entries(value)) {
        const found = walk(item, path === '' ? key : `${path}.${key}`);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };
  const { title: _title, ...rest } = manifest;
  return walk(rest, '');
}

/** The asked page, or the first one, and only when the manifest names it. */
export function manifestPagePath(manifest: ArtifactManifest, pagePath?: string): string | undefined {
  const path = pagePath ?? manifest.pages[0]?.path;
  return path !== undefined && manifest.pages.some((page) => page.path === path) ? path : undefined;
}
