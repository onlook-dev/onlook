import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import type { CodeEol, CodeReadRequest, CodeReadResult, CodeSnapshot } from '@studio/events';
import { CODE_IMAGE_MAX_BYTES, codeImageMediaType } from '@studio/events';
import { resolveInWorktree } from './scope.js';

/** Past this the editor is not the tool: a mapped minified bundle is the shape that gets here. */
export const CODE_READ_MAX_BYTES = 2 * 1024 * 1024;

const NUL = 0x00;

/** Read from the bytes: `TextDecoder` has already taken the mark off the text by the time it is a string. */
function hasBom(bytes: Buffer): boolean {
  return bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
}

function eolOf(text: string): CodeEol {
  const firstLf = text.indexOf('\n');
  if (firstLf <= 0) return '\n';
  return text[firstLf - 1] === '\r' ? '\r\n' : '\n';
}

export function snapshotOf(bytes: Buffer, mode: number, mtimeMs: number, text: string, bom: boolean): CodeSnapshot {
  return {
    hash: createHash('sha256').update(bytes).digest('hex'),
    size: bytes.byteLength,
    mtimeMs,
    eol: eolOf(text),
    mode,
    bom,
  };
}

/** The whole call is inside one try: a throw would reject the invoke, and a refusal the panel can read is the point (ONL-2563). */
export function readCodeFile(
  worktree: string | undefined,
  request: CodeReadRequest,
): CodeReadResult {
  if (worktree === undefined) return { ok: false, code: 'no-project' };
  const scope = resolveInWorktree(worktree, request.path);
  if (!scope.ok) return scope;

  try {
    const stat = statSync(scope.path);
    // A directory is `unreadable`, not `not-found`: something is there.
    if (!stat.isFile()) return { ok: false, code: 'unreadable' };
    const mediaType = codeImageMediaType(request.path);
    const maxBytes = mediaType === null ? CODE_READ_MAX_BYTES : CODE_IMAGE_MAX_BYTES;
    if (stat.size > maxBytes) return { ok: false, code: 'too-large' };

    const bytes = readFileSync(scope.path);
    if (bytes.byteLength > maxBytes) return { ok: false, code: 'too-large' };
    if (mediaType !== null) {
      return {
        ok: true,
        path: request.path,
        text: '',
        snapshot: snapshotOf(bytes, stat.mode & 0o777, stat.mtimeMs, '', false),
        image: { dataUrl: `data:${mediaType};base64,${bytes.toString('base64')}` },
      };
    }
    if (bytes.includes(NUL)) return { ok: false, code: 'not-text' };

    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      return { ok: false, code: 'not-text' };
    }

    return {
      ok: true,
      path: request.path,
      text,
      snapshot: snapshotOf(bytes, stat.mode & 0o777, stat.mtimeMs, text, hasBom(bytes)),
    };
  } catch (error) {
    return {
      ok: false,
      code: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'not-found' : 'unreadable',
    };
  }
}
