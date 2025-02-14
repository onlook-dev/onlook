import * as pty from 'node-pty';
import os from 'os';

process.on('message', (message: any) => {
    if (!process.send) {
        return;
    }

    const { type, payload } = message;

    switch (type) {
        case 'CREATE': {
            const { id, cwd } = payload;
            const shell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/sh';
            const ptyProcess = pty.spawn(shell, [], {
                name: 'xterm-color',
                cwd,
            });

            ptyProcess.onData((data: string) => {
                process.send!({
                    type: 'DATA',
                    payload: { id, data },
                });
            });

            // Store process reference
            processes.set(id, ptyProcess);
            break;
        }
        case 'WRITE': {
            const { id, data } = payload;
            const ptyProcess = processes.get(id);
            if (ptyProcess) {
                ptyProcess.write(data);
            }
            break;
        }
        case 'RESIZE': {
            const { id, cols, rows } = payload;
            const ptyProcess = processes.get(id);
            if (ptyProcess) {
                ptyProcess.resize(cols, rows);
            }
            break;
        }
        case 'KILL': {
            const { id } = payload;
            const ptyProcess = processes.get(id);
            if (ptyProcess) {
                ptyProcess.kill();
                processes.delete(id);
            }
            break;
        }
        case 'KILL_ALL': {
            processes.forEach((process) => process.kill());
            processes.clear();
            break;
        }
    }
});

const processes = new Map<string, pty.IPty>();

// Clean up on exit
process.on('exit', () => {
    processes.forEach((process) => process.kill());
    processes.clear();
});
