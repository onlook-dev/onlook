import { handle, on } from '../ipc/bridge.js';
import { IPC_INVOKE, IPC_SEND, type ComposerDraft } from '@studio/events';
import { readComposerDraft, writeComposerDraft } from './state.js';

export function registerDraftsHandlers(): void {
  handle(IPC_INVOKE.draftState, (_project, req): ComposerDraft => readComposerDraft(req.cwd), () => ({ text: '', images: [] }));
  on(IPC_SEND.draftSave, (_project, save) => {
    writeComposerDraft(save.cwd, save.draft);
  });
}
