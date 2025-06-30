import { capitalizeFirstLetter } from '@onlook/utility';

export class Hotkey {
    // Modes
    static readonly SELECT = new Hotkey('v', 'Select');
    static readonly ESCAPE = new Hotkey('esc', 'Escape');
    static readonly PAN = new Hotkey('h', 'Pan');
    static readonly PREVIEW = new Hotkey('p', 'Preview');
    static readonly INSERT_DIV = new Hotkey('r', 'Insert Div');
    static readonly RELOAD_APP = new Hotkey('mod+r', 'Reload App');

    // Zoom
    static readonly ZOOM_FIT = new Hotkey('mod+0', 'Zoom Fit');
    static readonly ZOOM_IN = new Hotkey('mod+equal', 'Zoom In');
    static readonly ZOOM_OUT = new Hotkey('mod+minus', 'Zoom Out');

    // Actions
    static readonly UNDO = new Hotkey('mod+z', 'Undo');
    static readonly REDO = new Hotkey('mod+shift+z', 'Redo');
    static readonly GROUP = new Hotkey('mod+g', 'Group');
    static readonly UNGROUP = new Hotkey('mod+shift+g', 'Ungroup');
    static readonly OPEN_DEV_TOOL = new Hotkey('mod+shift+i', 'Open Devtool');
    static readonly ADD_AI_CHAT = new Hotkey('mod+shift+l', 'Add to AI chat');
    static readonly NEW_AI_CHAT = new Hotkey('mod+l', 'New AI Chat');
    static readonly CHAT_MODE_TOGGLE = new Hotkey('mod+period', 'Open Chat Mode Menu');
    static readonly MOVE_LAYER_UP = new Hotkey('shift+arrowup', 'Move Layer Up');
    static readonly MOVE_LAYER_DOWN = new Hotkey('shift+arrowdown', 'Move Layer Down');
    static readonly SHOW_HOTKEYS = new Hotkey('mod+k', 'Show Shortcuts');

    // Text
    static readonly INSERT_TEXT = new Hotkey('t', 'Insert Text');
    static readonly ENTER = new Hotkey('enter', 'Edit Text');

    // Copy
    static readonly COPY = new Hotkey('mod+c', 'Copy');
    static readonly PASTE = new Hotkey('mod+v', 'Paste');
    static readonly CUT = new Hotkey('mod+x', 'Cut');
    static readonly DUPLICATE = new Hotkey('mod+d', 'Duplicate');

    // Delete
    static readonly BACKSPACE = new Hotkey('backspace', 'Delete');
    static readonly DELETE = new Hotkey('delete', 'Delete');

    // private to disallow creating other instances of this type
    private constructor(
        public readonly command: string,
        public readonly description: string,
    ) { }

    toString() {
        return this.command;
    }

    get readableCommand() {
        const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        return this.command
            .replace('mod', isMac ? '⌘' : 'Ctrl')
            .split('+')
            .map((value) => {
                if (value === 'shift') {
                    return '⇧';
                }
                if (value === 'alt') {
                    return isMac ? '⌥' : 'Alt';
                }
                if (value === 'ctrl') {
                    return isMac ? '⌃' : 'Ctrl';
                }
                if (value === 'equal') {
                    return '=';
                }
                if (value === 'minus') {
                    return '-';
                }
                if (value === 'plus') {
                    return '+';
                }
                if (value === 'period') {
                    return '.';
                }
                return capitalizeFirstLetter(value);
            })
            .join(' ');
    }
}
