import { MENU_ACCELERATORS } from './menu-accelerators.js';
import { TAB_SHORTCUTS } from './tab-shortcuts.js';

/** The hand-built menu items only; a role enumerates nothing, so a role-composed item is here only where the logo menu re-declares it, as Quit does (ONL-2563). */
export type AppCommand =
  | 'settings'
  | 'check-for-updates'
  | 'reset-studio'
  | 'quit'
  | 'new-tab'
  | 'close-tab'
  | 'reopen-tab'
  | 'undo'
  | 'redo'
  | 'actual-size'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-to-fit'
  | 'zoom-to-selection'
  | 'about'
  | 'full-screen'
  | 'task-manager';

/** `studio` and `exit` draw at the menu's top level; the other three are its submenus. `exit` is the pair that ends the running app, drawn last under its own rule. */
export type AppCommandGroup = 'studio' | 'file' | 'edit' | 'view' | 'exit';

/** A key in the renderer's catalog, hand-written because this package cannot import it; `renderer/src/rail/logoMenuItems.test.ts` holds the two together (ONL-2563). */
export type AppCommandLabelKey =
  | 'settings.nav'
  | 'menu.update.check'
  | 'menu.resetStudio'
  | 'menu.quit'
  | 'menu.file.newTab'
  | 'menu.file.closeTab'
  | 'menu.file.reopenClosedTab'
  | 'menu.edit.undo'
  | 'menu.edit.redo'
  | 'menu.view.actualSize'
  | 'menu.view.zoomIn'
  | 'menu.view.zoomOut'
  | 'menu.view.zoomToFit'
  | 'menu.view.zoomToSelection'
  | 'menu.about'
  | 'menu.view.fullScreen'
  | 'menu.taskManager';

/** The app menu's own words where the logo menu's differ: the zoom labels there carry their chord for an OS menu that cannot draw a bare Shift one. */
export type AppMenuLabelKey = 'menu.exit' | 'menu.app.zoomToFit' | 'menu.app.zoomToSelection';

/** How a command reads in the app menu Windows draws behind the band's chevron, in place of the OS menu. */
export interface AppMenuWording {
  /** In `Kbd` notation. */
  readonly keys?: string;
  readonly labelKey?: AppMenuLabelKey;
}

export interface AppCommandEntry {
  readonly labelKey: AppCommandLabelKey;
  readonly group: AppCommandGroup;
  /** The accelerator drawn beside the item, in `Kbd` notation. Only for a command whose key the OS menu also shows; the submenu items leave theirs to the application menu. */
  readonly keys?: string;
  readonly appMenu: AppMenuWording;
  /** Drawn in the app menu only; the logo menu mirrors the macOS application menu, which offers these through roles. */
  readonly isAppMenuOnly?: true;
}

const tabKeys = (kind: 'new' | 'reopen'): string => TAB_SHORTCUTS.find((shortcut) => shortcut.command.kind === kind)!.keys;

const ACCELERATOR_KEY: Record<string, string> = { cmdorctrl: 'mod', shift: 'shift', alt: 'alt', ctrl: 'ctrl' };

/** An Electron accelerator in `Kbd` notation, so the app menu draws the chord `MENU_ACCELERATORS` already owns. */
export function kbdOf(accelerator: string): string {
  return accelerator
    .split('+')
    .map((part) => ACCELERATOR_KEY[part.toLowerCase()] ?? part.toLowerCase())
    .join('+');
}

export const APP_COMMANDS = {
  settings: { labelKey: 'settings.nav', group: 'studio', keys: 'mod+,', appMenu: { keys: 'mod+,' } },
  'check-for-updates': { labelKey: 'menu.update.check', group: 'studio', appMenu: {} },
  'reset-studio': { labelKey: 'menu.resetStudio', group: 'exit', appMenu: {} },
  quit: { labelKey: 'menu.quit', group: 'exit', keys: 'mod+q', appMenu: { labelKey: 'menu.exit' } },
  'new-tab': { labelKey: 'menu.file.newTab', group: 'file', appMenu: { keys: tabKeys('new') } },
  'close-tab': { labelKey: 'menu.file.closeTab', group: 'file', appMenu: { keys: kbdOf(MENU_ACCELERATORS.closeTab.key) } },
  'reopen-tab': { labelKey: 'menu.file.reopenClosedTab', group: 'file', appMenu: { keys: tabKeys('reopen') } },
  undo: { labelKey: 'menu.edit.undo', group: 'edit', appMenu: { keys: kbdOf(MENU_ACCELERATORS.undo.key) } },
  redo: { labelKey: 'menu.edit.redo', group: 'edit', appMenu: { keys: kbdOf(MENU_ACCELERATORS.redo.key) } },
  'actual-size': { labelKey: 'menu.view.actualSize', group: 'view', appMenu: { keys: kbdOf(MENU_ACCELERATORS.actualSize.key) } },
  'zoom-in': { labelKey: 'menu.view.zoomIn', group: 'view', appMenu: { keys: kbdOf(MENU_ACCELERATORS.zoomIn.key) } },
  'zoom-out': { labelKey: 'menu.view.zoomOut', group: 'view', appMenu: { keys: kbdOf(MENU_ACCELERATORS.zoomOut.key) } },
  'zoom-to-fit': { labelKey: 'menu.view.zoomToFit', group: 'view', appMenu: { keys: 'shift+1', labelKey: 'menu.app.zoomToFit' } },
  'zoom-to-selection': { labelKey: 'menu.view.zoomToSelection', group: 'view', appMenu: { keys: 'shift+2', labelKey: 'menu.app.zoomToSelection' } },
  about: { labelKey: 'menu.about', group: 'studio', appMenu: {}, isAppMenuOnly: true },
  'full-screen': { labelKey: 'menu.view.fullScreen', group: 'view', appMenu: { keys: 'f11' }, isAppMenuOnly: true },
  'task-manager': { labelKey: 'menu.taskManager', group: 'studio', appMenu: {}, isAppMenuOnly: true },
} as const satisfies Record<AppCommand, AppCommandEntry>;

/** The one runtime enumeration of the union, in the order the logo menu draws. */
export const APP_COMMAND_ORDER = Object.keys(APP_COMMANDS) as readonly AppCommand[];

export function isAppCommand(value: unknown): value is AppCommand {
  return typeof value === 'string' && Object.hasOwn(APP_COMMANDS, value);
}

export interface AppCommandGroupDescriptor {
  readonly id: AppCommandGroup;
  /** Absent on the group drawn at the menu's top level rather than as a submenu. */
  readonly labelKey?: 'menu.file' | 'menu.edit' | 'menu.view';
  /** A rule is drawn above it, unless nothing was drawn before it. The three submenus are one cluster and carry no rules between them. */
  readonly hasRuleAbove?: true;
}

export const APP_COMMAND_GROUPS: readonly AppCommandGroupDescriptor[] = [
  { id: 'studio' },
  { id: 'file', labelKey: 'menu.file', hasRuleAbove: true },
  { id: 'edit', labelKey: 'menu.edit' },
  { id: 'view', labelKey: 'menu.view' },
  { id: 'exit', hasRuleAbove: true },
];

/** A row of the app menu: a command, or one of its two submenus. View holds the `view` group's commands; Help holds the rail's Help rows. */
export type AppMenuRow = AppCommand | { readonly submenu: 'view' | 'help' };

/** The app menu's sections, in order, a rule between two that both drew. A command main does not offer is left out. */
export const APP_MENU: readonly (readonly AppMenuRow[])[] = [
  ['new-tab', 'close-tab', 'reopen-tab'],
  ['undo', 'redo'],
  [{ submenu: 'view' }, { submenu: 'help' }],
  ['settings', 'task-manager', 'check-for-updates', 'about'],
  ['reset-studio', 'quit'],
];

/** Where a command was asked for. The renderer may name only the first three; main names the last two itself. */
export type AppCommandEntryPoint = 'app_menu' | 'logo_menu' | 'account_menu' | 'application_menu' | 'shortcut';

export const RENDERER_ENTRY_POINTS: readonly AppCommandEntryPoint[] = ['app_menu', 'logo_menu', 'account_menu'];

export function isRendererEntryPoint(value: unknown): value is AppCommandEntryPoint {
  return typeof value === 'string' && (RENDERER_ENTRY_POINTS as readonly string[]).includes(value);
}

export interface AppCommandRequest {
  command: AppCommand;
  entryPoint?: AppCommandEntryPoint;
}

/** The Help menu's own rows: the rail's Help menu, run by the active tab, which hosts what each opens. */
export type HelpAction = 'docs' | 'reportIssue' | 'requestFeature' | 'shortcuts' | 'tour';

const HELP_ACTIONS: readonly HelpAction[] = ['docs', 'reportIssue', 'requestFeature', 'shortcuts', 'tour'];

export function isHelpAction(value: unknown): value is HelpAction {
  return typeof value === 'string' && (HELP_ACTIONS as readonly string[]).includes(value);
}
