import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import type { CodeWriteRequest, CodeWriteResult, CodeWriteRefusalCode } from '@studio/events';
import { codeImageMediaType } from '@studio/events';
import { writeAtomicFile } from '../fs-atomic.js';
import { snapshotOf } from './read.js';
import { resolveInWorktree } from './scope.js';

const BOM = '﻿';

interface ErrorWithCode {
  code?: string;
}

/** Each cause gets its own name, because an unnamed failure is one the designer cannot act on. */
function causeOf(error: unknown): CodeWriteRefusalCode {
  const code = (error as ErrorWithCode | null)?.code;
  if (code === 'EACCES' || code === 'EPERM' || code === 'EROFS') return 'permission';
  if (code === 'ENOSPC' || code === 'EDQUOT') return 'no-space';
  if (code === 'EISDIR') return 'unwritable';
  return 'unwritable';
}

/** The bytes a save puts on disk: the buffer's text carrying back the mark and line ending the file arrived with (ONL-2563). */
function bytesToWrite(text: string, expected: CodeWriteRequest['expected']): Buffer {
  const lines = expected.eol === '\r\n' ? text.replace(/\r?\n/g, '\r\n') : text.replace(/\r\n/g, '\n');
  return Buffer.from((expected.bom ? BOM : '') + lines, 'utf8');
}

export function writeCodeFile(worktree: string | undefined, request: CodeWriteRequest): CodeWriteResult {
  if (worktree === undefined) return { ok: false, code: 'no-project' };
  const scope = resolveInWorktree(worktree, request.path);
  // One vocabulary per channel: the scope module answers a read's union.
  if (!scope.ok) return { ok: false, code: scope.code === 'no-project' ? 'no-project' : 'out-of-scope' };
  if (codeImageMediaType(request.path) !== null) return { ok: false, code: 'unwritable' };

  try {
    let onDisk: Buffer | undefined;
    try {
      const stat = statSync(scope.path);
      if (!stat.isFile()) return { ok: false, code: 'unwritable' };
      onDisk = readFileSync(scope.path);
    } catch {
      // Gone since it was opened. A dirty tab recreates it, which is sound only
      // because containment was decided on the nearest EXISTING ancestor.
      onDisk = undefined;
    }

    // Identical bytes remain valid even when size or modification time changed (ONL-2563).
    if (onDisk !== undefined) {
      const hash = createHash('sha256').update(onDisk).digest('hex');
      if (hash !== request.expected.hash) return { ok: false, code: 'stale' };
    }

    const bytes = bytesToWrite(request.text, request.expected);
    writeAtomicFile(scope.path, bytes, { mode: request.expected.mode });

    const after = statSync(scope.path);
    return {
      ok: true,
      path: request.path,
      snapshot: snapshotOf(bytes, after.mode & 0o777, after.mtimeMs, request.text, request.expected.bom),
    };
  } catch (error) {
    return { ok: false, code: causeOf(error) };
  }
}
