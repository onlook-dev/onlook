import type { ArtifactTextEdit } from '@studio/events';
import type { ArtifactFileBundle } from './adapter.js';
import { artifactFilePathIsSafe, MAX_ARTIFACT_FILE_BYTES } from './files.js';

export function applyArtifactEdits(bundle: ArtifactFileBundle, edits: ArtifactTextEdit[]):
  { ok: true; bundle: ArtifactFileBundle } | { ok: false; reason: string } {
  if (!Array.isArray(edits) || edits.length === 0 || edits.length > 128) {
    return { ok: false, reason: 'Supply between 1 and 128 exact text edits.' };
  }
  const files = new Map(bundle.files.map((file) => [file.path, file]));
  for (const edit of edits) {
    if (!edit || typeof edit.path !== 'string' || !edit.path.startsWith('pages/') || !artifactFilePathIsSafe(edit.path) ||
        typeof edit.oldText !== 'string' || edit.oldText.length === 0 || typeof edit.newText !== 'string' ||
        Buffer.byteLength(edit.oldText) > MAX_ARTIFACT_FILE_BYTES || Buffer.byteLength(edit.newText) > MAX_ARTIFACT_FILE_BYTES) {
      return { ok: false, reason: 'Use a supported pages/ HTML, CSS or JavaScript path, nonempty oldText and text within the artifact file budget.' };
    }
    const file = files.get(edit.path);
    if (!file) return { ok: false, reason: 'The edit target does not exist. Read the artifact before retrying.' };
    let content: string;
    try {
      content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(file.bytes);
    } catch {
      return { ok: false, reason: 'The edit target is not valid UTF-8 text.' };
    }
    const start = content.indexOf(edit.oldText);
    if (start === -1 || content.indexOf(edit.oldText, start + 1) !== -1) {
      return { ok: false, reason: 'oldText must match exactly once. Read the artifact and include enough surrounding text to identify the change.' };
    }
    const bytes = Buffer.from(content.slice(0, start) + edit.newText + content.slice(start + edit.oldText.length));
    if (bytes.byteLength > MAX_ARTIFACT_FILE_BYTES) return { ok: false, reason: 'The edited file exceeds the artifact file budget.' };
    files.set(edit.path, { path: edit.path, bytes });
  }
  return { ok: true, bundle: { pages: bundle.pages, files: [...files.values()] } };
}
