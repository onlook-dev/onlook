import { app, BaseWindow, type WebContents } from 'electron';
import { handle, on } from '../ipc/bridge.js';
import {
  APP_COMMAND_ORDER,
  APP_COMMANDS,
  IPC_EMIT,
  isHelpAction,
  isRendererEntryPoint,
  isRecord,
  IPC_INVOKE,
  IPC_SEND,
  isAppCommand,
  type AppCommand,
  type AppCommandEntry,
  type AppCommandEntryPoint,
  type AppCommandRequest,
  type HelpAction,
  type CanvasZoomCommand,
  type IpcEmitChannel,
} from '@studio/events';

import { log } from '../log/index.js';
import { capture } from '../telemetry/index.js';
import { isStudioChromeSender } from '../ipc/roles.js';
import { activeContents } from '../window/host.js';
import { isResetAvailable, resetStudio } from '../reset/index.js';
import { requestCloseActiveTab, requestSettingsView, requestTabCommand } from '../tabs/signals.js';
import { sendToRenderer } from '../tabs/broadcast.js';
import { checkForUpdatesNow, updateState } from '../updater/index.js';
import { flagOn } from '../flags/index.js';
import { openTaskManager } from '../task-manager/window.js';
import { presentation } from '@studio/i18n/update';
import { hostPlatform, isWindows } from '../env/platform.js';

const logger = log('app-commands');

/** The view a command acts on, narrowed to what it can do to one, so the dispatch runs without Electron. */
export interface CommandView {
  id: number;
  send: (channel: IpcEmitChannel, payload?: unknown) => void;
}

/** The host effects a command reaches, injected so every arm can be driven without Electron. */
export interface AppCommandDeps {
  quit: () => void;
  checkForUpdates: () => void;
  resetStudio: () => Promise<void>;
  /** Whether this build offers Reset at all (`main/reset/`). */
  isResetOffered: () => boolean;
  /** Whether the updater would take a check now; a download in flight would be restarted by one. */
  isCheckable: () => boolean;
  showAbout: () => void;
  toggleFullScreen: () => void;
  openTaskManager: () => void;
  /** Whether this launch offers the Task Manager (the `task-manager` flag). */
  isTaskManagerOffered: () => boolean;
}

function appAppCommandDeps(): AppCommandDeps {
  return {
    quit: () => app.quit(),
    checkForUpdates: () => void checkForUpdatesNow(),
    resetStudio,
    isResetOffered: isResetAvailable,
    isCheckable: () => presentation(updateState().status).menu.enabled,
    showAbout: () => app.showAboutPanel(),
    toggleFullScreen: () => {
      const window = BaseWindow.getFocusedWindow() ?? BaseWindow.getAllWindows()[0];
      window?.setFullScreen(!window.isFullScreen());
    },
    openTaskManager,
    isTaskManagerOffered: () => flagOn('task-manager'),
  };
}

/** A real view as a target: the destroyed guard is the house one, not a second spelling of it. */
export function commandView(contents: WebContents): CommandView {
  return {
    id: contents.id,
    send: (channel, payload) => sendToRenderer(contents, channel, payload as never),
  };
}

function zoom(view: CommandView, action: CanvasZoomCommand['action']): void {
  view.send(IPC_EMIT.canvasZoom, { action } satisfies CanvasZoomCommand);
}

/** Dispatched with no view too: quit, updates and reset need none, and the tab commands refuse on their own (ONL-2563). */
export const NO_VIEW: CommandView = { id: -1, send: () => undefined };

/** The one implementation of the application menu's commands: `main/menu/index.ts` drives its own items through this, and the rail's logo menu asks for the same members over the bridge. */
export function runAppCommand(
  command: AppCommand,
  view: CommandView,
  deps: AppCommandDeps = appAppCommandDeps(),
): void {
  switch (command) {
    case 'settings':
      requestSettingsView();
      return;
    case 'check-for-updates':
      // The application menu disables this item mid-download; a check restarted there hides the progress.
      if (deps.isCheckable()) deps.checkForUpdates();
      return;
    case 'reset-studio':
      // Re-checked here, not only where the menus are drawn: a build that never offers Reset must not run it.
      if (!deps.isResetOffered()) {
        logger.warn('reset refused: this build does not offer it');
        return;
      }
      // Caught rather than `void`-ed: an unhandled rejection takes the main process down over a dialog that failed to open.
      deps.resetStudio().catch((err: unknown) => {
        logger.error('reset could not run', { error: err });
      });
      return;
    case 'quit':
      deps.quit();
      return;
    case 'new-tab':
      requestTabCommand({ kind: 'new' }, { viewId: view.id });
      return;
    case 'close-tab':
      requestCloseActiveTab();
      return;
    case 'reopen-tab':
      requestTabCommand({ kind: 'reopen' }, { viewId: view.id });
      return;
    // The renderer's own branch is the only side that can tell text undo from canvas undo (ONL-2042).
    case 'undo':
      view.send(IPC_EMIT.editUndo);
      return;
    case 'redo':
      view.send(IPC_EMIT.editRedo);
      return;
    case 'actual-size':
      zoom(view, 'reset');
      return;
    case 'zoom-in':
      zoom(view, 'in');
      return;
    case 'zoom-out':
      zoom(view, 'out');
      return;
    case 'zoom-to-fit':
      zoom(view, 'fit');
      return;
    case 'zoom-to-selection':
      zoom(view, 'selection');
      return;
    case 'about':
      deps.showAbout();
      return;
    case 'full-screen':
      deps.toggleFullScreen();
      return;
    case 'task-manager':
      if (deps.isTaskManagerOffered()) deps.openTaskManager();
      return;
    default: {
      // The union is closed, so a command added without an arm above fails here at compile time.
      const unreached: never = command;
      logger.warn('app command reached no arm', { command: String(unreached) });
    }
  }
}

/** Reset is the one command a build can lack (`main/reset/`), and the app menu's own commands exist only where the app menu is drawn; the renderer draws what this answers. */
export function availableAppCommands(
  platform: NodeJS.Platform = hostPlatform(),
  isResetOffered: () => boolean = isResetAvailable,
  isTaskManagerOffered: () => boolean = () => flagOn('task-manager'),
): readonly AppCommand[] {
  return APP_COMMAND_ORDER.filter((command) => {
    if (command === 'reset-studio') return isResetOffered();
    if (command === 'task-manager' && !isTaskManagerOffered()) return false;
    const entry: AppCommandEntry = APP_COMMANDS[command];
    return entry.isAppMenuOnly !== true || isWindows(platform);
  });
}

export function recordAppCommand(command: AppCommand, entryPoint: AppCommandEntryPoint): void {
  capture('app_command_run', { command, entry_point: entryPoint });
}

/** A command from the chrome acts on the active tab, never the chrome that asked; a tab's command acts on itself. */
export function commandTarget(sender: WebContents, isChrome: boolean, active: () => WebContents | undefined): WebContents | undefined {
  return isChrome ? active() : sender;
}

export function registerAppCommandHandlers(): void {
  handle(IPC_INVOKE.appCommands, (): readonly AppCommand[] => availableAppCommands());
  // The target is the asking view, never the focused webContents: a focused frame is a guest, and the command belongs to the view whose menu was pressed.
  on(IPC_SEND.runAppCommand, (event, req: AppCommandRequest | undefined) => {
    if (!isRecord(req) || !isAppCommand(req.command)) {
      logger.warn('unknown app command refused');
      return;
    }
    const isChrome = isStudioChromeSender(event.sender);
    const target = commandTarget(event.sender, isChrome, activeContents);
    recordAppCommand(req.command, isRendererEntryPoint(req.entryPoint) ? req.entryPoint : isChrome ? 'app_menu' : 'logo_menu');
    runAppCommand(req.command, target ? commandView(target) : NO_VIEW);
    // The chrome keeps focus after a click in it; the user's next key belongs to the tab they were working in.
    if (isChrome) target?.focus();
  });
  on(IPC_SEND.runHelpAction, (_event, action: HelpAction | undefined) => {
    if (!isHelpAction(action)) {
      logger.warn('unknown help action refused');
      return;
    }
    const target = activeContents();
    if (target === undefined) return;
    sendToRenderer(target, IPC_EMIT.helpAction, action);
    target.focus();
  });
}
