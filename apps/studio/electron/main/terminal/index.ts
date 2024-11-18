import { MainChannels } from '@onlook/models/constants';
import * as pty from 'node-pty';
import os from 'os';
import { mainWindow } from '..';

class TerminalManager {
    private static instance: TerminalManager;
    private processes: Map<string, pty.IPty>;

    private constructor() {
        this.processes = new Map();
    }

    static getInstance(): TerminalManager {
        if (!TerminalManager.instance) {
            TerminalManager.instance = new TerminalManager();
        }
        return TerminalManager.instance;
    }

    createTerminal(id: string, options?: { cwd?: string }): void {
        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 24,
            cwd: options?.cwd ?? process.env.HOME,
            env: process.env,
        });

        ptyProcess.onData((data: string) => {
            mainWindow?.webContents.send(MainChannels.TERMINAL_DATA_STREAM, {
                id,
                data,
            });
        });

        this.processes.set(id, ptyProcess);
    }

    write(id: string, data: string): void {
        this.processes.get(id)?.write(data);
    }

    resize(id: string, cols: number, rows: number): void {
        this.processes.get(id)?.resize(cols, rows);
    }

    kill(id: string): void {
        const process = this.processes.get(id);
        if (process) {
            process.kill();
            this.processes.delete(id);
        }
    }

    killAll(): void {
        this.processes.forEach((process) => process.kill());
        this.processes.clear();
    }
}

export default TerminalManager.getInstance();
