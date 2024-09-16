import { capitalizeFirstLetter } from './helpers';

export class Hotkey {
    static readonly UNDO = new Hotkey('mod+z', 'Undo');
    static readonly REDO = new Hotkey('mod+shift+z', 'Redo');
    static readonly SELECT = new Hotkey('v', 'Select');
    static readonly ESCAPE = new Hotkey('esc', 'Escape');
    static readonly PAN = new Hotkey('h', 'Pan');
    static readonly INTERACT = new Hotkey('i', 'Interact');
    static readonly INSERT_DIV = new Hotkey('r', 'Insert Div');
    static readonly INSERT_TEXT = new Hotkey('t', 'Insert Text');
    static readonly DELETE = new Hotkey('backspace', 'Delete Div');

    // private to disallow creating other instances of this type
    private constructor(
        public readonly command: string,
        public readonly description: string,
    ) {}

    toString() {
        return this.command;
    }

    get readableCommand() {
        return this.command
            .replace('meta', '⌘')
            .split('+')
            .map((value) => capitalizeFirstLetter(value))
            .join(' ');
    }
}
