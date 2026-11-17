import { ARTIFACT_FIRST_PAGE_PATH, ARTIFACT_REFUSALS, isArtifactId } from '@studio/events';
import type { ArtifactToolInput, ArtifactToolReport, ArtifactToolResult } from '../agent-host/artifact-tools.js';
import type { ArtifactCreate, ArtifactFileBundle, ArtifactStore } from './adapter.js';
import type { ArtifactImportResult } from './import.js';
import { artifactPrivacyIssues } from './privacy.js';
import { validArtifactBundle } from './files.js';
import { starterPage } from './starter.js';
import { forkArtifact } from './copy.js';
import { manifestPagePath } from './manifest.js';
import { applyArtifactEdits } from './text-edits.js';
import { createKeyedQueue } from '../lib/keyed-queue.js';

const artifactWrites = createKeyedQueue<string>();

export interface ArtifactAccessDeps {
  store: ArtifactStore;
  givenIds(): Promise<readonly string[]>;
  place(input: ArtifactToolInput & { artifactId: string; title: string; pagePath: string }): Promise<unknown>;
  import(path: string): Promise<ArtifactImportResult>;
  created(id: string): void;
  projectNames?: readonly string[];
  changed(id: string): void;
  imported?(pageCount: number): void;
  edited?(pageCount: number, firstWrite: boolean): void;
  written?(id: string): void;
}

function bundleFrom(input: ArtifactToolInput): ArtifactFileBundle {
  return {
    pages: input.pages ?? [{ path: ARTIFACT_FIRST_PAGE_PATH, name: 'Home' }],
    files: input.files === undefined
      ? [{ path: ARTIFACT_FIRST_PAGE_PATH, bytes: Buffer.from(input.html ?? starterPage()) }]
      : input.files.map((file) => ({ path: file.path, bytes: Buffer.from(file.content) })),
  };
}

const refusal = (reason: string): ArtifactToolResult => ({ ok: false, reason });
const showsOnlyStarter = (bundle: ArtifactFileBundle): boolean =>
  bundle.files.length === 1 && Buffer.from(bundle.files[0]!.bytes).toString('utf8') === starterPage();
const untrusted = (body: string): string =>
  '<artifact-reference>\n' + body.replace(/<\/?artifact-reference>/gi, '')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '') + '\n</artifact-reference>';

export function createArtifactAccess(deps: ArtifactAccessDeps): ArtifactToolReport {
  const made = new Set<string>();
  const madeEmpty = new Set<string>();
  const register = (id: string): void => {
    made.add(id);
    deps.created(id);
    deps.changed(id);
  };
  const create = async (input: ArtifactCreate): Promise<ArtifactToolResult> => {
    const bundle = input.bundle ?? bundleFrom(input);
    if (!validArtifactBundle(bundle)) return refusal('Use supported relative pages, scripts, styles, images and fonts within the artifact size budget.');
    if (artifactPrivacyIssues(bundle, deps.projectNames).length > 0) return refusal('Remove private machine URLs, paths and credential-shaped text before saving.');
    const created = await deps.store.create({ ...input, bundle });
    if ('code' in created) return refusal(created.reason);
    register(created.id);
    return { ok: true, value: created };
  };
  const isStillEmpty = async (id: string): Promise<boolean> => {
    const bundle = await deps.store.readFiles(id);
    return !('code' in bundle) && showsOnlyStarter(bundle);
  };
  const report: ArtifactToolReport = async (verb, input) => {
    if (verb === 'create') {
      const created = await create({ title: input.title, html: input.html ?? starterPage(), bundle: bundleFrom(input) });
      if (created.ok && input.html === undefined && input.files === undefined) madeEmpty.add((created.value as { id: string }).id);
      return created;
    }
    if (verb === 'import') {
      const imported = await deps.import(input.path ?? '');
      if (!imported.ok) return imported;
      const created = await create({ ...imported.input, title: imported.input.title?.toLowerCase() === 'index' ? undefined : imported.input.title });
      if (created.ok) deps.imported?.(imported.input.bundle?.pages.length ?? 1);
      return created;
    }
    const id = input.artifactId;
    if (!isArtifactId(id)) return refusal('Use an artifact id from this canvas, an attachment, or one this session created.');
    if (!made.has(id) && !(await deps.givenIds()).includes(id)) {
      return refusal('Ask the designer to place or attach this artifact first. Knowing its id does not grant access.');
    }
    const read = await deps.store.read(id);
    if (read.outcome !== 'resolved') return refusal('That artifact is missing. Ask the designer to choose an existing one.');
    if (verb === 'fork') {
      // A fork that kept its source's title read as the source on the canvas and in the panel (ONL-2593).
      const title = typeof input.title === 'string' ? input.title.trim() : '';
      if (title === '' || title === read.manifest.title.trim()) return refusal('Give the copy its own title, different from the original, naming what makes it different.');
      const forked = await forkArtifact(deps.store, id, title, deps.projectNames);
      if ('code' in forked) return refusal(forked.reason);
      register(forked.id);
      return {ok: true, value: forked};
    }
    if (verb === 'read') {
      const bundle = await deps.store.readFiles(id);
      if ('code' in bundle) return refusal(bundle.reason);
      return { ok: true, value: { artifactId: id, title: read.manifest.title, readOnly: read.readOnly, pages: bundle.pages,
        assets: bundle.files.filter((file) => file.path.startsWith('assets/')).map((file) => ({ path: file.path, byteLength: file.bytes.byteLength })),
        files: bundle.files.filter((file) => file.path.startsWith('pages/')).map((file) => ({ path: file.path, content: untrusted(Buffer.from(file.bytes).toString('utf8')) })) } };
    }
    if (verb === 'place') {
      const pagePath = manifestPagePath(read.manifest, input.pagePath);
      if (pagePath === undefined) return refusal('Choose a page listed by read_artifact.');
      if (input.quote !== undefined && !(madeEmpty.has(id) && (await isStillEmpty(id)))) {
        return refusal('A quote goes only on an artifact you created in this session without content and have not written yet. Place this one without a quote.');
      }
      const placed = await deps.place({ ...input, artifactId: id, title: read.manifest.title, pagePath });
      const outcome = placed as { ok?: boolean; reason?: string };
      return outcome.ok === false ? refusal(outcome.reason ?? 'The canvas is no longer available.') : { ok: true, value: placed };
    }
    if (read.readOnly) return refusal(ARTIFACT_REFUSALS[read.manifest.pages.length > 1 || (read.blockedDocuments ?? 0) > 0 ? 'multipleDocuments' : 'newerBuild']);
    const previous = await deps.store.readFiles(id);
    if ('code' in previous) return refusal(previous.reason);
    if (input.edits !== undefined && (input.html !== undefined || input.files !== undefined || input.pages !== undefined)) {
      return refusal('Use edits alone for targeted changes, or html/files/pages for complete replacements.');
    }
    const replacements = new Map(previous.files.map((file) => [file.path, file]));
    if (input.edits !== undefined) {
      const edited = applyArtifactEdits(previous, input.edits);
      if (!edited.ok) return refusal(edited.reason);
      for (const file of edited.bundle.files) replacements.set(file.path, file);
    } else if (input.files !== undefined) {
      for (const file of input.files) replacements.set(file.path, { path: file.path, bytes: Buffer.from(file.content) });
    } else {
      const firstPage = previous.pages[0]?.path ?? ARTIFACT_FIRST_PAGE_PATH;
      replacements.set(firstPage, { path: firstPage, bytes: Buffer.from(input.html ?? starterPage()) });
    }
    const bundle = { pages: input.pages ?? previous.pages, files: [...replacements.values()] };
    if (!validArtifactBundle(bundle) || artifactPrivacyIssues(bundle, deps.projectNames).length > 0) return refusal('Use a safe complete local file bundle without private machine or credential details.');
    const firstWrite = madeEmpty.has(id) && showsOnlyStarter(previous);
    const written = await deps.store.writeFiles(id, bundle, read.manifest.updatedAt);
    if ('code' in written) return refusal(written.reason);
    deps.changed(id);
    deps.written?.(id);
    deps.edited?.(bundle.pages.length, firstWrite);
    const updated = await deps.store.read(id);
    if (updated.outcome !== 'resolved') return refusal('The artifact was removed after this edit. Ask the designer to choose an existing one.');
    return { ok: true, value: { artifactId: id, title: updated.manifest.title, pages: updated.manifest.pages, updatedAt: updated.manifest.updatedAt, readOnly: updated.readOnly, updated: true } };
  };
  return (verb, input) => verb === 'set' && isArtifactId(input.artifactId)
    ? artifactWrites.run(input.artifactId, () => report(verb, input))
    : report(verb, input);
}
