import { join } from 'node:path';
import { BrowserWindow, type BaseWindow, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import { is } from '@electron-toolkit/utils';
import { IPC_EMIT, IPC_INVOKE, IPC_SEND, TASK_GROUPS, TASK_MANAGER_HEADER_HEIGHT, TASK_MANAGER_TRAFFIC_LIGHTS, type TaskGroup, type TaskManagerSnapshot } from '@studio/events';
import { handle, on } from '../ipc/bridge.js';
import { registerTaskManagerSender } from '../ipc/roles.js';
import { devSwitches, rendererDevServerUrl } from '../env/dev-switches.js';
import { isMac } from '../env/platform.js';
import { log } from '../log/index.js';
import { captionButtonsOverGround, DRAWS_CAPTION_BUTTONS } from '../tabs/caption-buttons.js';
import { tabHost } from '../tabs/host.js';
import { capture } from '../telemetry/index.js';
import { appViewPreferences } from '../window/preferences.js';
import { markAuxiliaryWindow, presentPrimaryWindow, protectAppContents } from '../window/host.js';
import { t } from '@studio/i18n';
import { createInputReader } from './read.js';
import { buildSnapshot, type CpuBaseline } from './snapshot.js';

const REFRESH_MS = 5_000;

const TITLE_BAR: Partial<Electron.BrowserWindowConstructorOptions> = isMac()
  ? { titleBarStyle: 'hiddenInset', trafficLightPosition: TASK_MANAGER_TRAFFIC_LIGHTS }
  : DRAWS_CAPTION_BUTTONS ? { titleBarStyle: 'hidden', titleBarOverlay: captionButtonsOverGround(TASK_MANAGER_HEADER_HEIGHT) } : {};

const logger = log('task-manager');

interface Session {
  window: BrowserWindow;
  openedAt: number;
  timer?: ReturnType<typeof setInterval>;
  reading?: Promise<TaskManagerSnapshot | undefined>;
  baseline?: CpuBaseline;
  last?: TaskManagerSnapshot;
  refreshes: number;
  tabShows: number;
  expanded: boolean;
  sorted: boolean;
}

let session: Session | undefined;
const readInputs = createInputReader();

export function isTaskManagerWindow(window: BaseWindow | undefined): boolean {
  return window !== undefined && session?.window === window;
}

function isHeadless(): boolean {
  return devSwitches.agentHeadless !== undefined;
}

/** Hidden or minimised, nobody can see a reading, so none is taken; a never-shown agent drive still reads. */
function isWatched(window: BrowserWindow): boolean {
  return !window.isDestroyed() && !window.isMinimized() && (window.isVisible() || isHeadless());
}

function read(current: Session): Promise<TaskManagerSnapshot | undefined> {
  current.reading ??= readInputs()
    .then((inputs) => {
      const { snapshot, baseline } = buildSnapshot(inputs, current.baseline);
      current.baseline = baseline;
      current.last = snapshot;
      if (!current.window.isDestroyed()) current.window.webContents.send(IPC_EMIT.taskManagerSnapshot, snapshot);
      return snapshot;
    })
    .catch((error: unknown) => {
      logger.warn('task manager reading failed', { error });
      return undefined;
    })
    .finally(() => {
      current.reading = undefined;
    });
  return current.reading;
}

function topGroup(snapshot: TaskManagerSnapshot | undefined, measure: 'cpuPct' | 'memoryKb'): TaskGroup | 'none' {
  if (snapshot === undefined) return 'none';
  const totals = new Map<TaskGroup, number>();
  for (const row of snapshot.rows) totals.set(row.group, (totals.get(row.group) ?? 0) + row[measure]);
  let top: TaskGroup | 'none' = 'none';
  let most = 0;
  for (const group of TASK_GROUPS) {
    const value = totals.get(group) ?? 0;
    if (value > most) {
      top = group;
      most = value;
    }
  }
  return top;
}

function loadPage(window: BrowserWindow): void {
  const devServerUrl = rendererDevServerUrl();
  const loading = is.dev && devServerUrl
    ? window.loadURL(`${devServerUrl}/task-manager.html`)
    : window.loadFile(join(import.meta.dirname, '../renderer/task-manager.html'));
  loading.catch((error: unknown) => logger.warn('task manager page failed to load', { error }));
}

export function openTaskManager(): void {
  const host = tabHost();
  if (session !== undefined && !session.window.isDestroyed()) {
    capture('task_manager_opened', { open_tabs: host?.openTabCount ?? 0, was_open: true });
    if (session.window.isMinimized()) session.window.restore();
    if (!isHeadless()) session.window.show();
    session.window.focus();
    return;
  }

  const window = new BrowserWindow({
    width: 720,
    height: 620,
    minWidth: 480,
    minHeight: 360,
    show: false,
    title: t('taskManager.title'),
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    ...TITLE_BAR,
    webPreferences: appViewPreferences(join(import.meta.dirname, '../preload/task-manager.cjs')),
  });
  markAuxiliaryWindow(window);
  registerTaskManagerSender(window.webContents);
  protectAppContents(window.webContents);
  window.on('page-title-updated', (event) => event.preventDefault());

  const current: Session = { window, openedAt: Date.now(), refreshes: 0, tabShows: 0, expanded: false, sorted: false };
  session = current;
  capture('task_manager_opened', { open_tabs: host?.openTabCount ?? 0, was_open: false });

  const tick = (): void => {
    if (isWatched(window)) void read(current);
  };
  current.timer = setInterval(tick, REFRESH_MS);
  window.on('show', tick);
  window.on('restore', tick);

  const closeWithStudio = (): void => {
    if (!window.isDestroyed()) window.close();
  };
  host?.window.once('closed', closeWithStudio);

  window.once('closed', () => {
    clearInterval(current.timer);
    if (host !== undefined && !host.window.isDestroyed()) host.window.removeListener('closed', closeWithStudio);
    if (session === current) session = undefined;
    capture('task_manager_closed', {
      open_ms: Date.now() - current.openedAt,
      refreshes: current.refreshes,
      tab_shows: current.tabShows,
      expanded: current.expanded,
      sorted: current.sorted,
      top_cpu_group: topGroup(current.last, 'cpuPct'),
      top_memory_group: topGroup(current.last, 'memoryKb'),
    });
  });

  window.once('ready-to-show', () => {
    if (!isHeadless()) window.show();
  });
  loadPage(window);
  void read(current);
}

function fromTaskManager(event: IpcMainEvent | IpcMainInvokeEvent): Session | undefined {
  return session !== undefined && !session.window.isDestroyed() && session.window.webContents === event.sender ? session : undefined;
}

export function registerTaskManagerHandlers(): void {
  handle(IPC_INVOKE.taskManagerSnapshot, async (event) => {
    const current = fromTaskManager(event);
    if (current === undefined) throw new Error('Onlook requires the Task Manager');
    return current.last ?? await read(current) ?? null;
  });
  on(IPC_SEND.taskManagerRefresh, (event) => {
    const current = fromTaskManager(event);
    if (current === undefined) return;
    current.refreshes += 1;
    void read(current);
  });
  on(IPC_SEND.taskManagerShowTab, (event, req: { tabId?: unknown } | undefined) => {
    const current = fromTaskManager(event);
    const host = tabHost();
    if (current === undefined || host === undefined || typeof req?.tabId !== 'string') return;
    if (!host.state().tabs.some((tab) => tab.id === req.tabId)) return;
    current.tabShows += 1;
    host.activate(req.tabId, 'task_manager');
    presentPrimaryWindow();
  });
  on(IPC_SEND.taskManagerNoted, (event, action: unknown) => {
    const current = fromTaskManager(event);
    if (current === undefined) return;
    if (action === 'expand') current.expanded = true;
    if (action === 'sort') current.sorted = true;
  });
}

export function closeTaskManager(): void {
  if (session !== undefined && !session.window.isDestroyed()) session.window.close();
}
