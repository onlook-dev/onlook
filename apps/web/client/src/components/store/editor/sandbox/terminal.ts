import type { Task, Terminal, WebSocketSession } from '@codesandbox/sdk';
import { checkMessageError, checkMessageSuccess } from '@onlook/utility';
import { Terminal as XTerm } from '@xterm/xterm';
import { v4 as uuidv4 } from 'uuid';

export enum CLISessionType {
    TERMINAL = 'terminal',
    TASK = 'task',
}

export interface CLISession {
    id: string;
    name: string;
    type: CLISessionType;
    terminal: Terminal | null;
    // Task is readonly
    task: Task | null;
    xterm: XTerm;
}

export interface TaskSession extends CLISession {
    type: CLISessionType.TASK;
    task: Task;
}

export interface TerminalSession extends CLISession {
    type: CLISessionType.TERMINAL;
    terminal: Terminal;
}

export class CLISessionImpl implements CLISession {
    id: string;
    terminal: Terminal | null;
    task: Task | null;
    xterm: XTerm;

    constructor(
        public readonly name: string,
        public readonly type: CLISessionType,
        private readonly session: WebSocketSession,
        private readonly emitError: (message: string) => void,
        private readonly emitSuccess: (message: string) => void,
    ) {
        this.id = uuidv4();
        this.xterm = this.createXTerm();
        this.terminal = null;
        this.task = null;

        if (type === CLISessionType.TERMINAL) {
            this.initTerminal();
        } else if (type === CLISessionType.TASK) {
            this.initTask();
        }
    }

    async initTerminal() {
        const terminal = await this.session?.terminals.create();
        if (!terminal) {
            console.error('Failed to create terminal');
            return;
        }
        this.terminal = terminal;
        terminal.onOutput((data: string) => {
            this.xterm.write(data);
        });

        this.xterm.onData((data: string) => {
            terminal.write(data);
        });
        terminal.open();
    }

    async initTask() {
        const task = await this.createDevTaskTerminal();
        if (!task) {
            console.error('Failed to create task');
            return;
        }
        this.task = task;
        task.onOutput((data: string) => {
            this.xterm.write(data);
            if (checkMessageError(data)) {
                this.emitError(data);
            } else if (checkMessageSuccess(data)) {
                this.emitSuccess(data);
            }
        });
        task.open();
    }

    createXTerm() {
        return new XTerm({
            cursorBlink: true,
            fontSize: 12,
            fontFamily: 'monospace',
            convertEol: true,
            allowTransparency: true,
            disableStdin: false,
            allowProposedApi: true,
            macOptionIsMeta: true,
        });
    }

    async createDevTaskTerminal() {
        const task = this.session?.tasks.getTask('dev');
        if (!task) {
            console.error('No dev task found');
            return;
        }
        return task;
    }

    dispose() {
        this.xterm.dispose();
        this.terminal?.kill();
    }
}
