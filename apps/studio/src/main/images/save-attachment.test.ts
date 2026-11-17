import { beforeEach, afterEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { StudioEvent, ChatFileRef } from '@studio/events';
import { registerAttachment, readAttachment, resetImagesStore } from './store.js';
import { saveAttachment } from './save-attachment.js';
import { readComposerDraft, resetComposerDraftsCache, writeComposerDraft, draftImageIds } from '../drafts/state.js';

const previous = process.env['STUDIO_STATE_ROOT'];
let cwd: string;
let state: string;
beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'attachment-project-'));
  state = mkdtempSync(join(tmpdir(), 'attachment-state-'));
  process.env['STUDIO_STATE_ROOT'] = state;
  resetImagesStore();
  resetComposerDraftsCache();
});
afterEach(() => {
  resetImagesStore();
  resetComposerDraftsCache();
  if (previous === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = previous;
});
function event(ref: ChatFileRef): StudioEvent {
  return { type: 'message.user', text: 'Save this in the project', attachments: [ref], messageId: 'u1', turnId: 't1', sessionId: 's1', eventId: 'e1', seq: 1, ts: 1 };
}
function admit(bytes: Uint8Array, name: string): ChatFileRef {
  const result = registerAttachment(cwd, bytes, name, 'claude');
  if (!result.ok) throw new Error(result.reason);
  return result.ref;
}

describe('explicit attachment copy', () => {
  it('writes no project file on attach and saves exact PNG bytes only on the explicit tool call', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0xff]);
    const ref = admit(bytes, 'logo.png');
    expect(readdirSync(cwd)).toEqual([]);
    expect(existsSync(join(state, 'image-blobs'))).toBe(true);
    expect(saveAttachment(cwd, [event(ref)], ref.id, 'public/brand/logo.png')).toEqual({ ok: true, path: 'public/brand/logo.png' });
    expect(new Uint8Array(readFileSync(join(cwd, 'public/brand/logo.png')))).toEqual(bytes);
    expect(readAttachment(ref.id)?.bytes).toEqual(bytes);
    expect(readdirSync(join(cwd, 'public/brand'))).toEqual(['logo.png']);
  });
  it('saves SVG and PDF without re-encoding or deleting the source', () => {
    for (const [name, content] of [['logo.svg', '<svg><!-- iris-924 --></svg>'], ['brand.pdf', '%PDF-1.7\nsecret-42']] as const) {
      const bytes = new TextEncoder().encode(content);
      const ref = admit(bytes, name);
      expect(saveAttachment(cwd, [event(ref)], ref.id, name).ok).toBe(true);
      expect(new Uint8Array(readFileSync(join(cwd, name)))).toEqual(bytes);
      expect(readAttachment(ref.id)?.bytes).toEqual(bytes);
    }
  });
  it('refuses unattached/foreign ids, traversal, absolute paths, git metadata and overwrites', () => {
    const ref = admit(new TextEncoder().encode('secret'), 'brand.md');
    expect(saveAttachment(cwd, [], ref.id, 'brand.md').ok).toBe(false);
    const other = mkdtempSync(join(tmpdir(), 'attachment-other-'));
    expect(saveAttachment(other, [event(ref)], ref.id, 'brand.md').ok).toBe(false);
    for (const path of ['../escape', '/tmp/escape', 'public/../escape', '.git/config', '.GIT/config', 'public//logo', 'C:/escape', 'public\\logo']) expect(saveAttachment(cwd, [event(ref)], ref.id, path).ok).toBe(false);
    writeFileSync(join(cwd, 'brand.md'), 'keep me');
    expect(saveAttachment(cwd, [event(ref)], ref.id, 'brand.md').ok).toBe(false);
    expect(readFileSync(join(cwd, 'brand.md'), 'utf8')).toBe('keep me');
    expect(readdirSync(cwd).some((name) => name.startsWith('.onlook-asset-'))).toBe(false);
  });
  it('does not write through symlink directories or files', () => {
    const ref = admit(new TextEncoder().encode('brand'), 'brand.md');
    const outside = mkdtempSync(join(tmpdir(), 'attachment-outside-'));
    symlinkSync(outside, join(cwd, 'linked'));
    expect(saveAttachment(cwd, [event(ref)], ref.id, 'linked/brand.md').ok).toBe(false);
    symlinkSync(join(outside, 'missing.md'), join(cwd, 'target.md'));
    expect(saveAttachment(cwd, [event(ref)], ref.id, 'target.md').ok).toBe(false);
    expect(readdirSync(outside)).toEqual([]);
  });
  it('restores named file and skill draft references and roots files for collection', () => {
    const ref = admit(new TextEncoder().encode('violet-172'), 'brand.md');
    const skill = { kind: 'skill' as const, agent: 'codex' as const, name: 'brand', description: 'Use brand assets', path: '/skills/brand/SKILL.md' };
    writeComposerDraft(cwd, { text: 'apply it', images: [ref], skills: [skill] });
    resetComposerDraftsCache();
    expect(readComposerDraft(cwd)).toEqual({ text: 'apply it', images: [ref], skills: [skill] });
    expect(draftImageIds().has(ref.id)).toBe(true);
  });
});
