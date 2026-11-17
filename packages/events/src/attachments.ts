import { IMAGE_MAX_BYTES, sniffMediaType } from './images.js';
import type { HarnessId } from './models.js';
import type { ImageRef } from './events.js';

export interface FileRef {
  kind: 'file';
  id: string;
  name: string;
  mediaType: 'text/plain' | 'application/pdf';
  originalSize: number;
}

export interface AgentSkill {
  name: string;
  description: string;
  agent: HarnessId;
  path?: string;
}

export interface SkillAttachment extends AgentSkill { kind: 'skill'; }

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Where the composer placed a chosen skill in its prompt: the first `/name` standing as its own word (ONL-2744). */
export function skillMentionRange(text: string, name: string): { start: number; end: number } | undefined {
  const match = new RegExp(`(^|\\s)/${escapeRegExp(name)}(?=\\s|$)`).exec(text);
  if (match === null) return undefined;
  const start = match.index + (match[1]?.length ?? 0);
  return { start, end: start + name.length + 1 };
}

/** The prompt with its skill mention and one neighbouring space taken out, for a harness that names the skill on its own. */
export function withoutSkillMention(text: string, name: string): string {
  const range = skillMentionRange(text, name);
  if (range === undefined) return text;
  let { start, end } = range;
  if (/\s/.test(text.charAt(end))) end += 1;
  else if (start > 0 && /\s/.test(text.charAt(start - 1))) start -= 1;
  return text.slice(0, start) + text.slice(end);
}
export type ChatFileRef = ImageRef | FileRef;
export const ATTACHMENT_SOURCES = ['drop', 'paste', 'picker'] as const;
export type AttachmentSource = (typeof ATTACHMENT_SOURCES)[number];
export const ATTACHMENT_REJECT_REASONS = ['unsupported-format', 'too-large', 'unreadable', 'pdf-unsupported', 'text-too-large'] as const;
export type AttachmentRejectReason = (typeof ATTACHMENT_REJECT_REASONS)[number];
export interface AttachmentBytes { bytes: Uint8Array; mediaType: ImageRef['mediaType'] | FileRef['mediaType']; }
export const TEXT_ATTACHMENT_MAX_BYTES = 64 * 1024;
export const PDF_ATTACHMENT_MAX_BYTES = IMAGE_MAX_BYTES;

export function classifyAttachmentBytes(bytes: Uint8Array, agent: HarnessId):
  | { ok: true; mediaType: AttachmentBytes['mediaType'] }
  | { ok: false; reason: AttachmentRejectReason } {
  if (bytes.byteLength === 0) return { ok: false, reason: 'unreadable' };
  if (bytes.byteLength > IMAGE_MAX_BYTES) return { ok: false, reason: 'too-large' };
  const raster = sniffMediaType(bytes);
  if (raster !== null) return { ok: true, mediaType: raster };
  if (bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === '%PDF-') {
    return agent === 'claude' ? { ok: true, mediaType: 'application/pdf' } : { ok: false, reason: 'pdf-unsupported' };
  }
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return { ok: false, reason: 'unsupported-format' }; }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)) return { ok: false, reason: 'unsupported-format' };
  if (bytes.byteLength > TEXT_ATTACHMENT_MAX_BYTES) return { ok: false, reason: 'text-too-large' };
  return { ok: true, mediaType: 'text/plain' };
}

export interface RegisterAttachmentRequest {
  cwd: string;
  bytes: Uint8Array;
  name: string;
  agent: HarnessId;
  source: AttachmentSource;
  existingIds?: string[];
}
export type RegisterAttachmentResult = { ok: true; ref: ChatFileRef } | { ok: false; reason: AttachmentRejectReason };
export interface PickAttachmentsRequest { cwd: string; agent: HarnessId; title: string; buttonLabel: string; existingIds?: string[]; }
export type PickAttachmentsResult = { canceled: true } | { canceled: false; files: ChatFileRef[]; rejected: { name: string; reason: AttachmentRejectReason }[]; };
