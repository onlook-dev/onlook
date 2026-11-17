import { constants, closeSync, linkSync, lstatSync, mkdirSync, openSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { StudioEvent } from '@studio/events';
import { attachmentBelongsTo, readAttachment } from './store.js';

export function saveAttachment(cwd: string, events: readonly StudioEvent[], id: string, path: string): { ok: true; path: string } | { ok: false; reason: string } {
  if (!attachmentBelongsTo(cwd, id) || !events.some((event) => event.type === 'message.user' && event.attachments?.some((ref) => 'id' in ref && ref.id === id))) {
    return { ok: false, reason: 'Use an attachment supplied in this Project Chat.' };
  }
  const parts = path.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..' || part.toLowerCase() === '.git' || part.includes('\\') || part.includes('\0')) || /^[A-Za-z]:/.test(path)) {
    return { ok: false, reason: 'Choose a new relative file path inside this project, outside .git.' };
  }
  const source = readAttachment(id);
  if (!source) return { ok: false, reason: 'The original attachment is no longer readable.' };
  let temporary: string | undefined;
  try {
    let parent = realpathSync(cwd);
    for (const part of parts.slice(0, -1)) {
      parent = join(parent, part);
      try { mkdirSync(parent); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
      if (!lstatSync(parent).isDirectory() || lstatSync(parent).isSymbolicLink() || realpathSync(parent) !== parent) throw new Error('unsafe directory');
    }
    const destination = join(parent, parts.at(-1)!);
    const staging = join(parent, `.onlook-asset-${randomUUID()}`);
    const descriptor = openSync(staging, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o644);
    temporary = staging;
    try { writeFileSync(descriptor, source.bytes); } finally { closeSync(descriptor); }
    linkSync(staging, destination);
    return { ok: true, path };
  } catch { return { ok: false, reason: 'The destination exists, is unsafe, or cannot be written. Choose a new file path.' }; }
  finally { if (temporary !== undefined) { try { unlinkSync(temporary); } catch {} } }
}
