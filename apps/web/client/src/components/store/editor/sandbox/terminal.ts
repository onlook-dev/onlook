import type { Task, Terminal, WebSocketSession } from '@codesandbox/sdk';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal as XTerm } from '@xterm/xterm';
import { v4 as uuidv4 } from 'uuid';
import type { ErrorManager } from '../error';

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
    fitAddon: FitAddon;
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
    fitAddon: FitAddon;

    constructor(
        public readonly name: string,
        public readonly type: CLISessionType,
        private readonly session: WebSocketSession,
        private readonly errorManager: ErrorManager,
    ) {
        this.id = uuidv4();
        this.fitAddon = new FitAddon();
        this.xterm = this.createXTerm();
        this.xterm.loadAddon(this.fitAddon);
        this.terminal = null;
        this.task = null;

        if (type === CLISessionType.TERMINAL) {
            this.initTerminal();
        } else if (type === CLISessionType.TASK) {
            this.initTask();
        }
    }

    async initTerminal() {
        try {
            const terminal = await this.session?.terminals.create();
            if (!terminal) {
                console.error('Failed to create terminal');
                return;
            }
            this.terminal = terminal;
            terminal.onOutput((data: string) => {
                // Debug: log escape sequences to see what Claude Code is sending
                if (data.includes('\x1b[')) {
                    console.log('Terminal escape sequence:', data.replace(/\x1b/g, '\\x1b'));
                }
                this.xterm.write(data);
            });

            this.xterm.onData((data: string) => {
                terminal.write(data);
            });

            // Handle terminal resize
            this.xterm.onResize(({ cols, rows }) => {
                terminal.resize(cols, rows);
            });

            await terminal.open();

            // Set initial terminal size and environment
            if (this.xterm.cols && this.xterm.rows) {
                terminal.resize(this.xterm.cols, this.xterm.rows);
            }

            // Set TERM environment variable for better compatibility
            terminal.write('export TERM=xterm-256color\r');
        } catch (error) {
            console.error('Failed to initialize terminal:', error);
            this.terminal = null;
        }
    }

    async initTask() {
        const task = await this.createDevTaskTerminal();
        if (!task) {
            console.error('Failed to create task');
            return;
        }
        this.task = task;
        const output = await task.open();
        this.xterm.write(output);
        this.errorManager.processMessage(output);
        task.onOutput((data: string) => {
            this.xterm.write(data);
            this.errorManager.processMessage(data);
        });
    }

    createXTerm() {
        const terminal = new XTerm({
            cursorBlink: true,
            fontSize: 12,
            fontFamily: 'monospace',
            convertEol: false,
            allowTransparency: true,
            disableStdin: false,
            allowProposedApi: true,
            macOptionIsMeta: true,
            altClickMovesCursor: false,
            windowsMode: false,
            scrollback: 1000,
            screenReaderMode: false,
            fastScrollModifier: 'alt',
            fastScrollSensitivity: 5,
        });

        // Override write method to handle Claude Code's redrawing patterns
        const originalWrite = terminal.write.bind(terminal);
        terminal.write = (data: string | Uint8Array, callback?: () => void) => {
            if (typeof data === 'string') {
                // Detect Claude Code's redraw pattern: multiple line clears with cursor movement
                const lineUpPattern = /(\x1b\[2K\x1b\[1A)+\x1b\[2K\x1b\[G/;
                if (lineUpPattern.test(data)) {
                    console.log('Claude Code redraw pattern detected - handling specially');
                    // Count how many lines are being cleared
                    const matches = data.match(/\x1b\[1A/g);
                    const lineCount = matches ? matches.length : 0;
                    
                    // Clear the number of lines being redrawn plus some buffer
                    for (let i = 0; i <= lineCount + 2; i++) {
                        terminal.write('\x1b[2K\x1b[1A\x1b[2K');
                    }
                    terminal.write('\x1b[G'); // Go to beginning of line
                    
                    // Extract just the content after the clearing commands
                    const contentMatch = data.match(/\x1b\[G(.+)$/s);
                    if (contentMatch) {
                        return originalWrite(contentMatch[1], callback);
                    }
                }
            }
            return originalWrite(data, callback);
        };

        return terminal;
    }

    async createDevTaskTerminal() {
        const task = this.session?.tasks.get('dev');
        if (!task) {
            console.error('No dev task found');
            return;
        }
        return task;
    }

    dispose() {
        this.xterm.dispose();
        if (this.terminal) {
            try {
                this.terminal.kill();
            } catch (error) {
                console.warn('Failed to kill terminal during disposal:', error);
            }
        }
    }
}
