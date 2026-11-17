import {
  IPC_INVOKE,
  IPC_SEND,
  WINDOW_BAR_HEIGHT,
  type ChromeExtent,
  type ChromeExtentApplied,
  type ChromeSlotAction,
  type ChromeSlotsPush,
  type DuplicateProjectRequest,
  type ProjectCreateState,
  type TabAssignment,
  type TabLinkTarget,
  type TabPreview,
  type TabsState,
} from '@studio/events';
import { handle, on } from '../ipc/bridge.js';
import type { ProjectCreateRequest } from '../workspace/create-project.js';
import type { TabHost } from './host.js';

/** Every channel the band and the Tabs reach the tab host on. */
export function registerTabIpc(host: TabHost): void {
  handle(IPC_INVOKE.tabsPreview, (event, req: { tabId: string }): TabPreview =>
    event.sender.id !== host.chromeContents.id ? {} : host.previewOf(req.tabId),
  );
  handle(IPC_INVOKE.tabsTakeDraftRequest, (event) => host.takeDraftRequest(event.sender.id));
  handle(IPC_INVOKE.tabsTakeSettingsRequest, (event) => host.takeSettingsRequest(event.sender.id));
  handle(IPC_INVOKE.chromeWindowFocusState, () => ({ isFocused: host.window.isFocused() }));
  handle(IPC_INVOKE.tabsState, (): TabsState => host.state());
  handle(IPC_INVOKE.tabsCreateState, (event): ProjectCreateState | null => host.createStateFor(event.sender));
  handle(IPC_INVOKE.tabsAssignment, (event): TabAssignment | null => host.assignmentFrom(event.sender));
  handle(IPC_INVOKE.tabOnScreenState, (event) => host.onScreenFrom(event.sender));
  handle(IPC_INVOKE.revealTab, (_event, req: TabLinkTarget): boolean => host.revealWorkspace(req));
  on(IPC_SEND.tabsSelect, (_event, req: { tabId: string }) => {
    host.activate(req.tabId);
  });
  on(IPC_SEND.tabsClose, (_event, req: { tabId: string }) => {
    void host.requestClose(req.tabId);
  });
  on(IPC_SEND.tabsNew, () => {
    host.openFromActive();
  });
  on(IPC_SEND.tabsReopen, () => {
    host.reopenClosed();
  });
  on(IPC_SEND.tabsNewDraft, () => {
    host.newDraft();
  });
  on(IPC_SEND.tabsContext, (event, req: { repoIdentity?: string }) => {
    host.noteContext(event.sender.id, req.repoIdentity);
  });
  on(IPC_SEND.tabsCreateProject, (event, req: ProjectCreateRequest) => {
    host.createInTab(event.sender.id, req);
  });
  on(IPC_SEND.tabsDuplicateProject, (event, req: DuplicateProjectRequest) => {
    host.duplicateInTab(event.sender.id, req);
  });
  on(IPC_SEND.tabsCreateRetry, (event) => {
    host.retryCreate(event.sender.id);
  });
  on(IPC_SEND.tabsCreateDismiss, (event) => {
    host.dismissCreate(event.sender.id);
  });
  on(IPC_SEND.tabsReorder, (_event, req: { tabId: string; toIndex: number }) => {
    host.reorder(req.tabId, req.toIndex);
  });
  on(IPC_SEND.tabsRename, (_event, req: { tabId: string; name: string }) => {
    host.rename(req.tabId, req.name);
  });
  on(IPC_SEND.tabsReload, (_event, req: { tabId: string }) => {
    host.reload(req.tabId);
  });
  on(IPC_SEND.chromeSlots, (event, push: ChromeSlotsPush) => {
    host.handleSlots(event.sender, push);
  });
  on(IPC_SEND.chromeAction, (_event, action: ChromeSlotAction) => {
    host.handleAction(action);
  });
  handle(IPC_INVOKE.chromeExpand, (event, extent: ChromeExtent): ChromeExtentApplied => {
    // The chrome view alone: a tab asking would resize the band over itself.
    if (event.sender.id !== host.chromeContents.id) return { height: WINDOW_BAR_HEIGHT };
    return host.expand(extent);
  });
}
