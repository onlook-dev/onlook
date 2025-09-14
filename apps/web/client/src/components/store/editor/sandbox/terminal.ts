'use client';

import type { Provider, ProviderTask, ProviderTerminal } from '@onlook/code-provider';
import type { FitAddon } from '@xterm/addon-fit';
import type { Terminal } from '@xterm/xterm';
import { v4 as uuidv4 } from 'uuid';
import type { ErrorManager } from '../error';
// Dynamic imports to avoid SSR issues
let FitAddonClass: typeof FitAddon | null = null;
let TerminalClass: typeof Terminal | null = null;

export enum CLISessionType {
    TERMINAL = 'terminal',
    TASK = 'task',
}

export interface CLISession {
    id: string;
    name: string;
    type: CLISessionType;
    terminal: ProviderTerminal | null;
    // Task is readonly
    task: ProviderTask | null;
    xterm: Terminal | null;
    fitAddon: FitAddon | null;
}

export interface TaskSession extends CLISession {
    type: CLISessionType.TASK;
    task: ProviderTask;
}

export interface TerminalSession extends CLISession {
    type: CLISessionType.TERMINAL;
    terminal: ProviderTerminal;
}

export class CLISessionImpl implements CLISession {
    id: string;
    terminal: ProviderTerminal | null;
    task: ProviderTask | null;
    xterm: Terminal | null;
    fitAddon: FitAddon | null;

    constructor(
        public readonly name: string,
        public readonly type: CLISessionType,
        private readonly provider: Provider,
        private readonly errorManager: ErrorManager,
    ) {
        this.id = uuidv4();
        this.terminal = null;
        this.task = null;
        // Initialize xterm and fitAddon lazily
        this.xterm = null;
        this.fitAddon = null;
    }

    private async ensureXTermLibraries() {
        if (!FitAddonClass || !TerminalClass) {
            try {
                const [fitAddonModule, xtermModule] = await Promise.all([
                    import('@xterm/addon-fit'),
                    import('@xterm/xterm')
                ]);
                FitAddonClass = fitAddonModule.FitAddon;
                TerminalClass = xtermModule.Terminal;
            } catch (error) {
                console.error('Failed to load xterm libraries:', error);
                throw new Error('Failed to load terminal libraries');
            }
        }
    }

    async initTerminal() {
        try {
            await this.ensureXTermLibraries();

            // Initialize xterm and fitAddon
            this.fitAddon = new FitAddonClass!();
            this.xterm = this.createXTerm();
            this.xterm.loadAddon(this.fitAddon);

            const { terminal } = await this.provider.createTerminal({});
            if (!terminal) {
                console.error('Failed to create terminal');
                return;
            }
            this.terminal = terminal;
            terminal.onOutput((data: string) => {
                this.xterm?.write(data);
            });

            this.xterm.onData((data: string) => {
                terminal.write(data);
            });

            // Handle terminal resize
            this.xterm.onResize(({ cols, rows }: { cols: number; rows: number }) => {
                // Check if terminal has resize method
                if ('resize' in terminal && typeof terminal.resize === 'function') {
                    terminal.resize(cols, rows);
                }
            });

            await terminal.open();

            // Set initial terminal size and environment
            if (this.xterm.cols && this.xterm.rows && 'resize' in terminal && typeof terminal.resize === 'function') {
                terminal.resize(this.xterm.cols, this.xterm.rows);
            }

        } catch (error) {
            console.error('Failed to initialize terminal:', error);
            this.terminal = null;
        }
    }

    async initTask() {
        try {
            await this.ensureXTermLibraries();

            // Initialize xterm and fitAddon
            this.fitAddon = new FitAddonClass!();
            this.xterm = this.createXTerm();
            this.xterm.loadAddon(this.fitAddon);

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
                this.xterm?.write(data);
                this.errorManager.processMessage(data);
            });
        } catch (error) {
            console.error('Failed to initialize task:', error);
        }
    }

    createXTerm(): Terminal {
        const terminal = new TerminalClass!({
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
                    // Count how many lines are being cleared
                    const matches = data.match(/\x1b\[1A/g);
                    const lineCount = matches ? matches.length : 0;

                    // Clear the number of lines being redrawn plus some buffer
                    for (let i = 0; i <= lineCount + 2; i++) {
                        terminal.write('\x1b[2K\x1b[1A\x1b[2K');
                    }
                    terminal.write('\x1b[G'); // Go to beginning of line

                    // Extract just the content after the clearing commands
                    const contentMatch = /\x1b\[G(.+)$/s.exec(data);
                    if (contentMatch?.[1]) {
                        return originalWrite(contentMatch[1], callback);
                    }
                }
            }
            return originalWrite(data, callback);
        };

        return terminal;
    }

    async createDevTaskTerminal() {
        const { task } = await this.provider.getTask({
            args: {
                id: 'dev',
            },
        });
        if (!task) {
            console.error('No dev task found');
            return;
        }
        return task;
    }

    dispose() {
        if (this.xterm) {
            this.xterm.dispose();
        }
        if (this.terminal) {
            try {
                this.terminal.kill();
            } catch (error) {
                console.warn('Failed to kill terminal during disposal:', error);
            }
        }
    }
}
