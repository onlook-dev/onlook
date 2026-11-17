import { basename } from 'node:path';
import { readFileSync, statSync } from 'node:fs';
import { dialog } from 'electron';
import { handle } from '../ipc/bridge.js';
import { ATTACHMENT_SOURCES, HARNESS_IDS, IPC_INVOKE, IMAGE_MAX_BYTES, TEXT_ATTACHMENT_MAX_BYTES, classifyAttachmentBytes, type PickAttachmentsResult, type RegisterAttachmentRequest, type RegisterAttachmentResult } from '@studio/events';
import { ownerOf } from '../window/host.js';
import { workspaceOf } from '../tabs/views.js';
import { capture } from '../telemetry/index.js';
import { attachmentBelongsTo, readAttachment, registerAttachment, workspaceImagesGeneration } from './store.js';

function admit(req: RegisterAttachmentRequest): RegisterAttachmentResult {
  if (!HARNESS_IDS.includes(req.agent) || !ATTACHMENT_SOURCES.includes(req.source) || typeof req.name !== 'string' || !(req.bytes instanceof Uint8Array) || (req.existingIds !== undefined && (!Array.isArray(req.existingIds) || !req.existingIds.every((id) => typeof id === 'string')))) return { ok: false, reason: 'unreadable' };
  const classification = classifyAttachmentBytes(req.bytes, req.agent);
  const textSize = [...new Set(req.existingIds ?? [])].reduce((sum, id) => {
    if (!attachmentBelongsTo(req.cwd, id)) return sum;
    const stored = readAttachment(id);
    return sum + (stored?.mediaType === 'text/plain' ? stored.bytes.byteLength : 0);
  }, 0);
  const result = !classification.ok ? classification : classification.mediaType === 'text/plain' && textSize + req.bytes.byteLength > TEXT_ATTACHMENT_MAX_BYTES
    ? { ok: false as const, reason: 'text-too-large' as const }
    : registerAttachment(req.cwd, req.bytes, basename(req.name).slice(0, 255), req.agent);
  const type = result.ok ? result.ref.mediaType === 'text/plain' ? 'text' : result.ref.mediaType === 'application/pdf' ? 'pdf' : 'image' : 'unknown';
  const size = req.bytes.byteLength <= 64 * 1024 ? 'small' : req.bytes.byteLength <= 1024 * 1024 ? 'medium' : 'large';
  const properties = { kind: type, coarse_type: type, size_bucket: size, source: req.source, agent: req.agent } as const;
  if (result.ok) capture('attachment_added', properties);
  else capture('attachment_rejected', { ...properties, reason: result.reason });
  return result;
}

export function registerAttachmentHandlers(): void {
  // Stricter than the door, here and in the pick: the path as the view registered it, not another spelling of it.
  handle(IPC_INVOKE.registerAttachment, (project, req): RegisterAttachmentResult => {
    if (project.root !== req.cwd) return { ok: false, reason: 'unreadable' };
    return admit(req);
  }, () => ({ ok: false, reason: 'unreadable' }));
  handle(IPC_INVOKE.attachmentBytes, (project, req) => attachmentBelongsTo(project.root, req.id) ? readAttachment(req.id) : null, () => null);
  handle(IPC_INVOKE.pickAttachments, async (project, req, event): Promise<PickAttachmentsResult> => {
    if (project.root !== req.cwd || !HARNESS_IDS.includes(req.agent)) return { canceled: true };
    const generation = workspaceImagesGeneration(req.cwd);
    const owner = ownerOf(event.sender);
    const options: Electron.OpenDialogOptions = { title: req.title, buttonLabel: req.buttonLabel, properties: ['openFile', 'multiSelections'] };
    const picked = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options);
    if (picked.canceled || event.sender.isDestroyed() || workspaceOf(event.sender.id) !== req.cwd || generation !== workspaceImagesGeneration(req.cwd)) return { canceled: true };
    const files: Extract<PickAttachmentsResult, { canceled: false }>['files'] = [];
    const rejected: Extract<PickAttachmentsResult, { canceled: false }>['rejected'] = [];
    for (const path of picked.filePaths) {
      const name = basename(path);
      try {
        if (statSync(path).size > IMAGE_MAX_BYTES) {
          rejected.push({ name, reason: 'too-large' });
          capture('attachment_rejected', { kind: 'unknown', coarse_type: 'unknown', size_bucket: 'large', source: 'picker', agent: req.agent, reason: 'too-large' });
          continue;
        }
        const result = admit({ cwd: req.cwd, agent: req.agent, bytes: readFileSync(path), name, source: 'picker', existingIds: [...(req.existingIds ?? []), ...files.filter((file) => file.mediaType === 'text/plain').map((file) => file.id)] });
        if (result.ok) files.push(result.ref);
        else rejected.push({ name, reason: result.reason });
      } catch {
        rejected.push({ name, reason: 'unreadable' });
        capture('attachment_rejected', { kind: 'unknown', coarse_type: 'unknown', size_bucket: 'small', source: 'picker', agent: req.agent, reason: 'unreadable' });
      }
    }
    return { canceled: false, files, rejected };
  }, () => ({ canceled: true }));
}
