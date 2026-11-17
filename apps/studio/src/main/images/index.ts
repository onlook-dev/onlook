import { basename } from 'node:path';
import { readFileSync, statSync } from 'node:fs';
import { dialog } from 'electron';
import { handle } from '../ipc/bridge.js';
import {
  IPC_INVOKE,
  type ImageBytes,
  type ImageRejection,
  type PickedImage,
  type PickImagesResult,
  type RegisterCanvasImageResult,
} from '@studio/events';
import { MAX_BYTES, attachmentBelongsTo, readImage, registerImage, workspaceImagesGeneration } from './store.js';
import { ownerOf } from '../window/host.js';
import { workspaceOf } from '../tabs/views.js';
import { registerAttachmentHandlers } from './attachments.js';

export function registerImageHandlers(): void {
  registerAttachmentHandlers();
  handle(
    IPC_INVOKE.pickImages,
    async (project, req, event): Promise<PickImagesResult> => {
      // Stricter than the door: the path as the view registered it, not another spelling of it.
      if (project.root !== req.cwd) return { canceled: true };
      const generation = workspaceImagesGeneration(req.cwd);
      const window = ownerOf(event.sender);
      const options: Electron.OpenDialogOptions = {
        title: req.title,
        buttonLabel: req.buttonLabel,
        // No defaultPath: one derived from the project invites browsing into Studio's worktrees.
        filters: [{ name: req.filterLabel, extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', ...(req.target === 'canvas' ? ['svg'] : [])] }],
        properties: ['openFile', 'multiSelections'],
      };

      const result = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options);
      if (result.canceled || result.filePaths.length === 0 || event.sender.isDestroyed() || workspaceOf(event.sender.id) !== req.cwd || generation !== workspaceImagesGeneration(req.cwd)) return { canceled: true };

      const images: PickedImage[] = [];
      const rejected: ImageRejection[] = [];
      for (const path of result.filePaths) {
        // The try spans registerImage: a throw outside it rejects the whole invoke and leaks every earlier hold.
        try {
          if (statSync(path).size > MAX_BYTES) {
            rejected.push({ name: basename(path), reason: 'too-large' });
            continue;
          }
          const bytes = readFileSync(path);
          const registered = req.target === 'canvas' ? registerImage(req.cwd, bytes, { allowSvg: true }) : registerImage(req.cwd, bytes);
          if (registered.ok) {
            images.push({ image: registered.image, name: basename(path) });
          } else {
            rejected.push({ name: basename(path), reason: registered.reason });
          }
        } catch {
          rejected.push({ name: basename(path), reason: 'unreadable' });
        }
      }
      return { canceled: false, images, rejected };
    },
    () => ({ canceled: true }),
  );

  handle(
    IPC_INVOKE.registerImage,
    (project, req): RegisterCanvasImageResult => {
      if (project.root !== req.cwd || !(req.bytes instanceof Uint8Array)) return { ok: false, reason: 'unreadable' };
      return req.target === 'canvas' ? registerImage(req.cwd, req.bytes, { allowSvg: true }) : registerImage(req.cwd, req.bytes);
    },
    () => ({ ok: false, reason: 'unreadable' }),
  );

  handle(
    IPC_INVOKE.imageBytes,
    (project, req): ImageBytes | null => typeof req?.id === 'string' && attachmentBelongsTo(project.root, req.id) ? readImage(req.id) : null,
    () => null,
  );
}
