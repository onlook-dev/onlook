import electron from 'electron';
import {
  CHANNELS,
  TAB,
  type InvokeRow,
  type IpcInvokeChannel,
  type IpcProjectInvokeChannel,
  type IpcProjectOrNoneInvokeChannel,
  type IpcProjectSendChannel,
  type IpcRequest,
  type IpcResponse,
  type IpcSendChannel,
  type IpcSendPayload,
  type SendRow,
  type ViewRole,
} from '@studio/events';
import { everyRenderer } from '../window/host.js';
import { requireStudioTabSender } from '../tabs/sender.js';
import { isStudioChromeSender, isTaskManagerSender } from './roles.js';
import { claimsOwnProject, senderProject, type SenderProject } from './project-scope.js';

const invokes: Record<string, InvokeRow> = CHANNELS.invoke;
const sends: Record<string, SendRow> = CHANNELS.send;
const rows = new Map<string, InvokeRow | SendRow>(
  [...Object.values(invokes), ...Object.values(sends)].map((row) => [row.name, row]),
);

function senderRole(event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent): ViewRole {
  if (!isTaskManagerSender(event.sender)) {
    requireStudioTabSender(event, everyRenderer());
    return isStudioChromeSender(event.sender) ? 'chrome' : 'tab';
  }
  if (event.sender.isDestroyed() || event.senderFrame !== event.sender.mainFrame) throw new Error('Onlook IPC is not available to this view');
  return 'taskManager';
}

function requireRole(role: ViewRole, channel: string): void {
  // A name the table does not hold is a Tab's alone.
  if (!(rows.get(channel)?.from ?? TAB).includes(role)) {
    throw new Error('Onlook IPC is not available to this view');
  }
}

function requireSender(event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent, channel: string): void {
  requireRole(senderRole(event), channel);
}

/** The sending view's Project, or `undefined` when it shows none or the request names another's. */
function projectOf(channel: string, sender: Electron.WebContents, request: unknown): SenderProject | undefined {
  const project = senderProject(sender.id);
  const claim = rows.get(channel)?.names;
  return project !== undefined && (claim === undefined || claimsOwnProject(project, claim, request)) ? project : undefined;
}

function requireProject(channel: string, sender: Electron.WebContents, request: unknown): void {
  if (rows.get(channel)?.scope === 'project' && projectOf(channel, sender, request) === undefined) {
    throw new Error('Onlook IPC needs the Project this view is showing');
  }
}

type InvokeListener = Parameters<Electron.IpcMain['handle']>[1];
type SendListener = Parameters<Electron.IpcMain['on']>[1];
const sendListeners = new WeakMap<SendListener, Map<string, SendListener>>();

function answer(channel: string, listener: InvokeListener): void {
  electron.ipcMain.handle(channel, async (event, ...args) => {
    requireSender(event, channel);
    return listener(event, ...args);
  });
}

function hear(channel: string, listener: SendListener, heard: SendListener): void {
  const guarded: SendListener = (event, ...args) => {
    try { requireSender(event, channel); } catch { return; }
    heard(event, ...args);
  };
  const channels = sendListeners.get(listener) ?? new Map<string, SendListener>();
  channels.set(channel, guarded);
  sendListeners.set(listener, channels);
  electron.ipcMain.on(channel, guarded);
}

function guardedOn(channel: string, listener: SendListener): void {
  hear(channel, listener, (event, ...args) => {
    try { requireProject(channel, event.sender, args[0]); } catch { return; }
    listener(event, ...args);
  });
}

function guardedOff(channel: string, listener: SendListener): void {
  const channels = sendListeners.get(listener);
  const guarded = channels?.get(channel);
  if (guarded === undefined) return;
  electron.ipcMain.off(channel, guarded);
  channels?.delete(channel);
}

type Answer<C extends IpcInvokeChannel> = IpcResponse<C> | Promise<IpcResponse<C>>;

/** A `scope: 'project'` handler takes the sender's Project and names the decline; `project-or-none` takes it or `undefined`; any other takes the event. */
type InvokeHandler<C extends IpcInvokeChannel> = C extends IpcProjectInvokeChannel
  ? [handler: (project: SenderProject, request: IpcRequest<C>, event: Electron.IpcMainInvokeEvent) => Answer<C>, declined: () => Answer<C>]
  : C extends IpcProjectOrNoneInvokeChannel
    ? [handler: (project: SenderProject | undefined, request: IpcRequest<C>, event: Electron.IpcMainInvokeEvent) => Answer<C>]
    : [handler: (event: Electron.IpcMainInvokeEvent, request: IpcRequest<C>) => Answer<C>];

type SendHandler<C extends IpcSendChannel> = C extends IpcProjectSendChannel
  ? (project: SenderProject, payload: IpcSendPayload<C>, event: Electron.IpcMainEvent) => void
  : (event: Electron.IpcMainEvent, payload: IpcSendPayload<C>) => void;

type InProject = (project: SenderProject | undefined, request: unknown, event: Electron.IpcMainInvokeEvent) => unknown;

/**
 * Answers an invoke channel; a sender whose role the row does not admit is rejected before the handler runs.
 * On a `scope: 'project'` row, a view showing no Project or a request naming another's is answered `declined()`.
 */
export function handle<C extends IpcInvokeChannel>(channel: C, ...[handler, declined]: InvokeHandler<C>): void {
  const scope = rows.get(channel)?.scope;
  if (scope === undefined) {
    answer(channel, handler as InvokeListener);
    return;
  }
  const inProject = handler as InProject;
  answer(channel, (event, request: unknown) => {
    const project = projectOf(channel, event.sender, request);
    if (project === undefined && scope === 'project') return (declined as () => unknown)();
    return inProject(project, request, event);
  });
}

/** Hears a send channel, behind the same sender check; a refused send is dropped, and so is one a `scope: 'project'` row's view has no Project for. */
export function on<C extends IpcSendChannel>(channel: C, listener: SendHandler<C>): void {
  if (rows.get(channel)?.scope === undefined) {
    guardedOn(channel, listener as SendListener);
    return;
  }
  const inProject = listener as (project: SenderProject, payload: unknown, event: Electron.IpcMainEvent) => void;
  hear(channel, listener as SendListener, (event, payload: unknown) => {
    const project = projectOf(channel, event.sender, payload);
    if (project !== undefined) inProject(project, payload, event);
  });
}

export function off<C extends IpcSendChannel>(channel: C, listener: SendHandler<C>): void {
  guardedOff(channel, listener as SendListener);
}

/** A frame that can still be resolved and sits under another one. A frame that is gone, or a top-level one, is not. */
function isSubframe(frame: Electron.WebFrameMain | null | undefined): boolean {
  if (frame === null || frame === undefined) return false;
  try {
    return !frame.isDestroyed() && frame.parent !== null;
  } catch {
    return false;
  }
}

/**
 * A view's own listener is reached by that view alone, so the only sender left to refuse is one of its
 * subframes; the row's role is checked as everywhere else. A send whose frame can no longer be resolved,
 * as after a reload, is heard: the listener heard it before this guard, and which view sent it is not in doubt.
 */
function requireViewSender(event: Electron.IpcMainEvent, channel: string): void {
  if (event.senderFrame !== event.sender.mainFrame && isSubframe(event.senderFrame)) throw new Error('Onlook requires a Studio Tab');
  requireRole(isTaskManagerSender(event.sender) ? 'taskManager' : isStudioChromeSender(event.sender) ? 'chrome' : 'tab', channel);
}

type ViewSendChannel = Exclude<IpcSendChannel, IpcProjectSendChannel>;
type ViewSendListener<C extends ViewSendChannel> = (event: Electron.IpcMainEvent, payload: IpcSendPayload<C>) => void;

/** Hears a send channel on one view's own `ipc`, which no other view reaches; a refused send is dropped. Returns the call that stops hearing. */
export function onView<C extends ViewSendChannel>(contents: Electron.WebContents, channel: C, listener: ViewSendListener<C>): () => void {
  const ipc = contents.ipc;
  const guarded: SendListener = (event, ...args) => {
    try { requireViewSender(event, channel); } catch { return; }
    (listener as SendListener)(event, ...args);
  };
  ipc.on(channel, guarded);
  return () => { ipc.removeListener(channel, guarded); };
}

/** `onView` for the first send the view's own main frame makes; a refused send does not use it up. */
export function onceView<C extends ViewSendChannel>(contents: Electron.WebContents, channel: C, listener: ViewSendListener<C>): () => void {
  const unhear = onView(contents, channel, ((event: Electron.IpcMainEvent, ...args: unknown[]) => {
    unhear();
    (listener as SendListener)(event, ...args);
  }) as ViewSendListener<C>);
  return unhear;
}
