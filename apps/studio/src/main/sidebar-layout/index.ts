import { handle } from '../ipc/bridge.js';
import { IPC_INVOKE, type SidebarLayout } from '@studio/events';
import { readSidebarLayout, writeSidebarLayout } from './state.js';

export function registerSidebarLayoutHandlers(): void {
  // The project comes from the asking view, never from the renderer: a renderer never names a path.
  handle(IPC_INVOKE.sidebarLayoutState, (project): SidebarLayout => readSidebarLayout(project.root), () => ({}));
  handle(IPC_INVOKE.sidebarLayoutSave, (project, req) => writeSidebarLayout(project.root, req), () => undefined);
}
