import { app, BaseWindow, BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron';
import { APP_COMMANDS, IPC_EMIT, MENU_ACCELERATORS, TAB_SHORTCUTS, type AppCommand, type TabShortcut, type CanvasZoomCommand, type ReportOpen, type UpdateState } from '@studio/events';
import { requestTabCommand } from '../tabs/signals.js';
import { workspaceOf } from '../tabs/views.js';
import { commandView, NO_VIEW, recordAppCommand, runAppCommand } from '../app-commands/index.js';
import { tabCommandForInput } from '../tabs/shortcuts.js';
import { isSaveChord } from './save-chord.js';
import { isChatFocusChord } from './chat-focus-chord.js';
import { zoomActionForInput } from './zoom-chords.js';
import { HELP_ITEMS, type HelpItem } from './help.js';
import { activeContents, isAuxiliaryWindow, presentPrimaryWindow } from '../window/host.js';
import { closeTaskManager, isTaskManagerWindow } from '../task-manager/window.js';
import { flagOn } from '../flags/index.js';
// One catalog for both processes: the menu exists before the renderer mounts, and the i18n guardrail applies in main too.
import { t } from '@studio/i18n';
import { presentation } from '@studio/i18n/update';
import { isResetAvailable } from '../reset/index.js';
import { onUpdateStateChange, restartToUpdate, updateState } from '../updater/index.js';
import { log } from '../log/index.js';
import { isMac } from '../env/platform.js';
import { capabilities } from '../cloud/capabilities.js';

const logger = log('menu');

/** A menu click hands back a `BaseWindow` under the window-of-views the app actually uses, which carries no contents of its own. */
function contentsFor(window: BaseWindow | undefined): Electron.WebContents | undefined {
  return window instanceof BrowserWindow && !isAuxiliaryWindow(window) ? window.webContents : activeContents();
}

const ACTS_IN_THE_TAB = new Set<AppCommand>(['undo', 'redo', 'actual-size', 'zoom-in', 'zoom-out', 'zoom-to-fit', 'zoom-to-selection']);
const OPENS_IN_STUDIO = new Set<AppCommand>(['new-tab', 'reopen-tab', 'settings']);

/** Every hand-built item runs the one dispatch the rail's logo menu runs, so the two cannot drift (ONL-2563). */
function runFromMenu(command: AppCommand, window: BaseWindow | undefined, event: Electron.KeyboardEvent): void {
  if (isTaskManagerWindow(window)) {
    if (command === 'close-tab') closeTaskManager();
    if (command === 'close-tab' || ACTS_IN_THE_TAB.has(command)) return;
    if (OPENS_IN_STUDIO.has(command)) presentPrimaryWindow();
  }
  recordAppCommand(command, event.triggeredByAccelerator === true ? 'shortcut' : 'application_menu');
  const contents = contentsFor(window);
  runAppCommand(command, contents ? commandView(contents) : NO_VIEW);
}

// Main chords already fire these accelerators; registering them again fires twice (ONL-1989).
function commandItem(
  command: AppCommand,
  accelerator?: string,
  registerAccelerator = false,
): MenuItemConstructorOptions {
  return {
    label: t(APP_COMMANDS[command].labelKey),
    ...(accelerator === undefined ? {} : { accelerator }),
    registerAccelerator,
    click: (_item, window, event) => runFromMenu(command, window, event),
  };
}

function checkItem(state: UpdateState): MenuItemConstructorOptions {
  const { key, enabled } = presentation(state.status).menu;
  return {
    // The label follows the update state, so it is the one shared item whose words are not the descriptor's.
    label: t(key, { percent: state.percent ?? 0 }),
    enabled,
    click: (_item, window, event) => runFromMenu('check-for-updates', window, event),
  };
}

function restartItem(state: UpdateState): MenuItemConstructorOptions {
  const ready = state.status === 'downloaded';
  return {
    label:
      ready && state.version
        ? t('menu.update.restartVersion', { version: state.version })
        : t('menu.update.restart'),
    enabled: ready,
    click: () => restartToUpdate(),
  };
}

function resetItems(): MenuItemConstructorOptions[] {
  if (!isResetAvailable()) return [];
  return [
    { type: 'separator' },
    commandItem('reset-studio'),
  ];
}

// `role: 'viewMenu'` zooms the focused webContents and Chromium persists page zoom per origin, so one ⌘= left the user's frame zoomed for good (ONL-1989).
// The accelerator is display only: `installMainChords` fires the chord, `registerAccelerator: false` keeps it off the system table, and `click` is the mouse path.
// The `editMenu` role's ⌘Z fires before the renderer sees the keydown, so canvas undo never reached the registry; only the renderer can tell text undo from canvas undo (ONL-2042).

function editMenu(): MenuItemConstructorOptions {
  return {
    label: t('menu.edit'),
    submenu: [
      commandItem('undo', MENU_ACCELERATORS.undo.key),
      commandItem('redo', MENU_ACCELERATORS.redo.key),
      { type: 'separator' },
      // The roles are where macOS gets ⌘C/⌘V and the OS's localised labels; dropping them silently loses copy and paste in the composer.
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'pasteAndMatchStyle' },
      { role: 'delete' },
      { role: 'selectAll' },
      ...(isMac() ? [
        { type: 'separator' as const },
        {
          label: t('menu.edit.speech'),
          submenu: [{ role: 'startSpeaking' as const }, { role: 'stopSpeaking' as const }],
        },
      ] : []),
    ],
  };
}

// The `fileMenu` role's `close` closes the window, which holds N tabs; this item closes the forward tab (ONL-2251).
function fileMenu(): MenuItemConstructorOptions {
  return {
    role: 'fileMenu',
    submenu: [
      ...TAB_SHORTCUTS.filter((shortcut) => shortcut.command.kind === 'new').map(tabItem),
      commandItem('close-tab', MENU_ACCELERATORS.closeTab.key, true),
      ...TAB_SHORTCUTS.filter((shortcut) => shortcut.command.kind === 'reopen').map(tabItem),
    ],
  };
}

function viewMenu(): MenuItemConstructorOptions {
  return {
    role: 'viewMenu',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      commandItem('actual-size', MENU_ACCELERATORS.actualSize.key),
      commandItem('zoom-in', MENU_ACCELERATORS.zoomIn.key),
      commandItem('zoom-out', MENU_ACCELERATORS.zoomOut.key),
      // The ⇧1/⇧2 forms are the renderer's; a menu accelerator cannot be a bare ⇧ combo (ONL-1979), and ⌘1/⌘2 now belong to tabs (ONL-2211).
      commandItem('zoom-to-fit'),
      commandItem('zoom-to-selection'),
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  };
}

// Installed on every guest too: a focused guest delivers no key events to the host document, and `before-input-event` is the one seat that hears it.
function installMainChords(): void {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('before-input-event', (event, input) => {
      if (input.isAutoRepeat && tabCommandForInput({ ...input, isAutoRepeat: false })) {
        event.preventDefault();
        return;
      }
      const command = tabCommandForInput(input);
      const sender = contents.getType() === 'webview' ? contents.hostWebContents : contents;
      if (!sender) return;
      if (isChatFocusChord(input)) {
        const target = activeContents();
        if (target === undefined || workspaceOf(target.id) === undefined) return;
        event.preventDefault();
        target.focus();
        target.send(IPC_EMIT.chatFocus);
        return;
      }
      if (command && requestTabCommand(command, { viewId: sender.id })) {
        event.preventDefault();
        return;
      }
      if (contents.getType() !== 'window' && contents.getType() !== 'webview') return;
      if (isSaveChord(input)) {
        event.preventDefault();
        sender.send(IPC_EMIT.codeSave);
        return;
      }
      const action = zoomActionForInput(input);
      if (!action) return;
      event.preventDefault();
      sender.send(IPC_EMIT.canvasZoom, { action } satisfies CanvasZoomCommand);
    });
  });
}

function tabItem(shortcut: TabShortcut): MenuItemConstructorOptions {
  const { command } = shortcut;
  return {
    label: command.kind === 'new' ? t('menu.file.newTab')
      : command.kind === 'reopen' ? t('menu.file.reopenClosedTab')
      : command.kind === 'cycle' ? t('menu.tabs.next')
        : t('menu.tabs.number', { number: command.number }),
    accelerator: shortcut.accelerator,
    registerAccelerator: false,
    click: (_item, window) => {
      if (window && !isAuxiliaryWindow(window)) requestTabCommand(command, { windowId: window.id });
      else {
        if (window) presentPrimaryWindow();
        const contents = activeContents();
        if (contents) requestTabCommand(command, { viewId: contents.id });
      }
    },
  };
}

// Registered, with no `registerAccelerator: false`: the click resolves its own target, so nothing in the renderer needs the keydown first.
// No `enabled` tracking views — `signature()` hashes the update items alone, and a Help label that moved with state would never redraw (ONL-2350).
function helpItem(item: HelpItem): MenuItemConstructorOptions {
  return {
    label: t(item.labelKey),
    ...(item.accelerator === undefined ? {} : { accelerator: item.accelerator }),
    click: (_item, window) => {
      presentPrimaryWindow();
      const contents = contentsFor(window);
      if (!contents) {
        logger.warn('report menu item reached no view', { lane: item.lane });
        return;
      }
      contents.send(IPC_EMIT.reportOpen, { lane: item.lane } satisfies ReportOpen);
    },
  };
}

// An explicit label, not `role: 'help'`: macOS injects its own search field into a submenu it recognises as Help (ONL-2350).
function helpMenu(): MenuItemConstructorOptions {
  return {
    label: t('menu.help'),
    submenu: HELP_ITEMS.map(helpItem),
  };
}

function windowMenu(): MenuItemConstructorOptions {
  if (!flagOn('task-manager')) return { role: 'windowMenu' };
  return {
    role: 'windowMenu',
    submenu: [
      { role: 'minimize' },
      ...(isMac() ? [{ role: 'zoom' as const }, { type: 'separator' as const }, { role: 'front' as const }] : [{ role: 'close' as const }]),
      { type: 'separator' },
      commandItem('task-manager'),
    ],
  };
}

function template(state: UpdateState): MenuItemConstructorOptions[] {
  const updateItems: MenuItemConstructorOptions[] = [checkItem(state), restartItem(state)];

  const menus: MenuItemConstructorOptions[] = [];

  menus.push({
    label: t('app.name'),
    submenu: [
      { role: 'about', label: t('menu.about') },
      { type: 'separator' },
      ...updateItems,
      ...resetItems(),
      ...(isMac() ? [
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const, label: t('menu.hide') },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
      ] : []),
      { type: 'separator' },
      { role: 'quit', label: t('menu.quit') },
    ],
  });

  menus.push(fileMenu(), editMenu(), viewMenu(), {
    label: t('menu.tabs'),
    submenu: TAB_SHORTCUTS.filter((shortcut) => shortcut.command.kind === 'jump' || shortcut.command.kind === 'cycle').map(tabItem),
  }, windowMenu());
  // Both Help items file a report, which only a provider that takes reports can receive.
  if (capabilities().report) menus.push(helpMenu());

  return menus;
}

// Rebuilt only when the text changes: `download-progress` fires many times a second, and rebuilding an open macOS menu is visible.
function signature(state: UpdateState): string {
  const check = checkItem(state);
  const restart = restartItem(state);
  return `${check.label}|${check.enabled}|${restart.label}|${restart.enabled}`;
}

let installed: string | undefined;

export function installApplicationMenu(): void {
  installMainChords();
  const rebuild = (state: UpdateState): void => {
    const next = signature(state);
    if (next === installed) return;
    installed = next;
    Menu.setApplicationMenu(Menu.buildFromTemplate(template(state)));
  };

  rebuild(updateState());
  onUpdateStateChange(rebuild);
}
