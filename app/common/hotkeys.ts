import { capitalizeFirstLetter } from './helpers';

export class Hotkeys {
    static readonly UNDO = new Hotkeys('meta+z', 'Undo');
    static readonly REDO = new Hotkeys('meta+shift+z', 'Redo');
    static readonly SELECT = new Hotkeys('v', 'Select');
    static readonly PAN = new Hotkeys('h', 'Pan');
    static readonly INTERACT = new Hotkeys('i', 'Interact');
    static readonly INSERT_DIV = new Hotkeys('r', 'Insert Div');
    static readonly INSERT_TEXT = new Hotkeys('t', 'Insert Text');

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
