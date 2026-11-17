/** Minted by Studio, never derived from a path or a name, and independent of project and machine. */
export type ArtifactId = string;

export function artifactTag(artifactId: string): string {
  return artifactTagSource(artifactId).slice(0, 4);
}

function artifactTagSource(artifactId: string): string {
  const letters = artifactId.replace(/[^0-9a-z]/gi, '').toLowerCase();
  return letters === '' ? artifactId : letters;
}

export function artifactTags(artifactIds: Iterable<string>): Map<string, string> {
  const ids = [...new Set(artifactIds)];
  const sources = new Map(ids.map((id) => [id, artifactTagSource(id)]));
  const longest = Math.max(4, ...ids.map((id) => (sources.get(id) ?? '').length));
  for (let length = 4; length <= longest; length += 1) {
    const tags = ids.map((id) => (sources.get(id) ?? '').slice(0, length));
    if (new Set(tags).size === ids.length) {
      return new Map(ids.map((id, index) => [id, tags[index] ?? id]));
    }
  }
  return new Map(ids.map((id) => [id, id]));
}

export function artifactTitleLabels(artifacts: readonly { id: string; title: string }[]): Map<string, string> {
  const holders = new Map<string, Set<string>>();
  for (const artifact of artifacts) {
    const ids = holders.get(artifact.title) ?? new Set<string>();
    ids.add(artifact.id);
    holders.set(artifact.title, ids);
  }
  const tags = new Map([...holders].map(([title, ids]) => [title, ids.size > 1 ? artifactTags(ids) : new Map<string, string>()]));
  return new Map(artifacts.map(({ id, title }) => {
    const tag = tags.get(title)?.get(id);
    return [id, tag === undefined ? title : `${title} · ${tag}`];
  }));
}

/**
 * Lowercase only: Chromium lowercases a URL host, so a mixed-case id would not round-trip
 * through `studio-artifact://` and two distinct-looking ids could collide (ONL-2568).
 */
export const ARTIFACT_ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const isArtifactId = (value: unknown): value is ArtifactId =>
  typeof value === 'string' && ARTIFACT_ID_SHAPE.test(value);

export const ARTIFACT_SCHEME = 'studio-artifact';

/** `persist:studio-frames` deliberately has no artifact handler (ONL-2471). */
export const ARTIFACTS_PARTITION = 'persist:studio-artifacts';

export const ARTIFACT_PAGES_DIR = 'pages';

export const ARTIFACT_ASSETS_DIR = 'assets';

/** The one page every v1 artifact has; `pages` is a list so a second one needs no migration. */
export const ARTIFACT_FIRST_PAGE_PATH = `${ARTIFACT_PAGES_DIR}/index.html`;

/** The id sits in the host position, so each artifact is its own (scheme, host, port) authority. */
export function artifactPageUrl(id: ArtifactId, pagePath: string): string {
  return `${ARTIFACT_SCHEME}://${id}/${pagePath}`;
}

export const ARTIFACT_MANIFEST_VERSION = 1;

/**
 * The oldest build that may still write this record. A manifest naming a higher one is
 * listed and readable but refused for writing, never quarantined (ONL-2568).
 */
export const ARTIFACT_MIN_READER_VERSION = 1;

export interface ArtifactPage {
  /** Relative to the artifact's own directory, always under `pages/`. */
  path: string;
  name: string;
}

export interface ArtifactProvenance {
  madeIn: 'onlook';
  /** An artifact id, never a location: nothing stored here can be reversed into a path (ONL-2568). */
  copiedFrom?: ArtifactId;
}

export interface ArtifactDimensions {
  width: number;
  height: number;
}

export function artifactDimensions(value: unknown): ArtifactDimensions | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { width, height } = value as Partial<ArtifactDimensions>;
  if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0 || typeof height !== 'number' || !Number.isFinite(height) || height <= 0) return undefined;
  return { width, height };
}

export interface ArtifactManifest {
  schemaVersion: number;
  minReaderVersion: number;
  id: ArtifactId;
  title: string;
  /** ISO 8601. */
  createdAt: string;
  updatedAt: string;
  pages: ArtifactPage[];
  files?: string[];
  dimensions?: ArtifactDimensions;
  provenance: ArtifactProvenance;
  /** A key a newer build wrote survives a read and the write after it (ONL-2568). */
  [unknownField: string]: unknown;
}

/** What crosses to the renderer: never the page's bytes. */
export interface ArtifactSummary {
  id: ArtifactId;
  title: string;
  pagePath: string;
  pages?: ArtifactPage[];
  dimensions?: ArtifactDimensions;
  updatedAt: string;
  /** A record this build may list and render but not write. */
  readOnly: boolean;
  blockedDocuments?: number;
}

/** A summary without `pages` is a one-page record named by its title. */
export const artifactSummaryPages = (artifact: ArtifactSummary): ArtifactPage[] =>
  artifact.pages ?? [{ path: artifact.pagePath, name: artifact.title }];

/**
 * A node carries an id, so resolution is a read that has not landed on first paint. Three
 * states, not two, or every project open flashes what looks like data loss (ONL-2486).
 */
export type ArtifactReadState = 'reading' | 'resolved' | 'missing';

export interface ArtifactPreviewRequest {
  artifactId: ArtifactId;
  pagePath: string;
  updatedAt: string;
}

export interface ArtifactRenameRequest { artifactId: ArtifactId; title: string; updatedAt: string }
export type ArtifactRenameResult = { outcome: 'saved'; artifact: ArtifactSummary } | { outcome: 'stale' | 'unavailable' | 'readOnly' | 'invalid' };
export interface ArtifactSearchRequest { query: string }
export type ArtifactSearchResult = { outcome: 'ready'; matches: { artifactId: ArtifactId; rank: number }[]; partial: boolean } | { outcome: 'stale' | 'unavailable' };

export type ArtifactPreviewResult =
  | { outcome: 'ready'; image: string }
  | { outcome: 'missing' | 'stale' | 'unavailable' };

export const ARTIFACT_REFUSALS = {
  badId: 'that is not an artifact id',
  unknown: 'no artifact by that id',
  newerBuild: 'this artifact was written by a newer version of Onlook',
  declined: 'the delete was not confirmed',
  invalidFiles: 'the artifact contains unsupported or unsafe files',
  unavailable: 'the artifact could not be saved',
  stale: 'the artifact changed before it could be saved',
  multipleDocuments: 'this legacy artifact contains several HTML documents and is read-only; its documents and references have been preserved',
} as const;

export type ArtifactRefusalCode = keyof typeof ARTIFACT_REFUSALS;

export interface ArtifactRefusal {
  code: ArtifactRefusalCode;
  reason: string;
}

export const artifactRefusal = (code: ArtifactRefusalCode): ArtifactRefusal => ({
  code,
  reason: ARTIFACT_REFUSALS[code],
});

export type ArtifactDeleteResult = { ok: true } | ArtifactRefusal;

export type ArtifactCreated = { ok: true; artifact: ArtifactSummary } | ArtifactRefusal;

export type ImageExportFormat = 'png' | 'png-2x' | 'jpeg';
export type ArtifactExportFormat = 'html' | 'pdf' | ImageExportFormat;
export interface CanvasImageExportRequest { nodeId: string; format: Exclude<ImageExportFormat, 'png-2x'> }
export interface ArtifactPickRequest { nodeId: string; guestId: number; updatedAt: string; point: { x: number; y: number } }
export const ARTIFACT_TEXT_MAX_LENGTH = 8192;
export type ArtifactTextPrepareRequest = ArtifactPickRequest;
export interface ArtifactTextTarget {
  token: string;
  text: string;
  rect: import('./elements.js').AnchorRect;
  style: { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string; letterSpacing: string; textAlign: string; color: string; backgroundColor: string };
}
export type ArtifactTextPrepareResult = { outcome: 'editable'; target: ArtifactTextTarget } | { outcome: 'unsupported' | 'stale' | 'unavailable' | 'readOnly' };
export interface ArtifactTextSaveRequest { token: string; newText: string }
export type ArtifactTextSaveResult = { outcome: 'saved' | 'stale' | 'unavailable' | 'unsupported' | 'readOnly' };
export type ArtifactPageState = { outcome: 'ready'; url: string } | { outcome: 'missing' | 'stale' | 'unavailable' };
export type ArtifactPickResult = { outcome: 'selected'; evidence: import('./elements.js').ElementEvidence; rect: import('./elements.js').AnchorRect } | { outcome: 'none' | 'unavailable' };
export interface ArtifactExportRequest { artifactId: ArtifactId; format?: ArtifactExportFormat }
export type ArtifactExportResult = { outcome: 'saved'; name: string; location?: string } | { outcome: 'cancelled' } | { outcome: 'refused'; reason: string };

export type ArtifactToolVerb = 'create' | 'read' | 'set' | 'import' | 'place' | 'fork';
export interface ArtifactTextFile { path: string; content: string }
export interface ArtifactTextEdit { path: string; oldText: string; newText: string }
export interface ArtifactToolInput {
  artifactId?: string;
  title?: string;
  html?: string;
  pages?: ArtifactPage[];
  files?: ArtifactTextFile[];
  edits?: ArtifactTextEdit[];
  path?: string;
  pagePath?: string;
  pageId?: string;
  beside?: string;
  x?: number;
  y?: number;
  quote?: string;
}
export type ArtifactToolResult = { ok: true; value: unknown } | { ok: false; reason: string };

/** The renderer's own gestures; `agent` is main's stamp. */
export const RENDERER_ARTIFACT_CREATE_METHODS = ['click', 'paste'] as const;

export type ArtifactCreateMethod = (typeof RENDERER_ARTIFACT_CREATE_METHODS)[number] | 'agent';

export const ARTIFACT_INTEGRITY_OUTCOMES = [
  'quarantined',
  'newer_build_refused',
  'index_rebuilt',
] as const;

export type ArtifactIntegrityOutcome = (typeof ARTIFACT_INTEGRITY_OUTCOMES)[number];
