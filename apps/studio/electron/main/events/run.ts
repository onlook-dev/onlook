import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import { runBunCommand } from '../bun';
import run from '../run';
import terminal from '../run/terminal';

export async function listenForRunMessages() {
    ipcMain.handle(MainChannels.RUN_START, (e: Electron.IpcMainInvokeEvent, args) => {
        const { id, folderPath, command } = args as {
            id: string;
            folderPath: string;
            command: string;
        };
        return run.start(id, folderPath, command);
    });

    ipcMain.handle(MainChannels.RUN_STOP, (e: Electron.IpcMainInvokeEvent, args) => {
        const { id, folderPath } = args as { id: string; folderPath: string };
        return run.stop(id, folderPath);
    });

    ipcMain.handle(MainChannels.RUN_RESTART, (e: Electron.IpcMainInvokeEvent, args) => {
        const { id, folderPath, command } = args as {
            id: string;
            folderPath: string;
            command: string;
        };
        return run.restart(id, folderPath, command);
    });

    ipcMain.handle(MainChannels.GET_TEMPLATE_NODE, (e: Electron.IpcMainInvokeEvent, args) => {
        const { id } = args as { id: string };
        return run.getTemplateNode(id);
    });

    ipcMain.handle(MainChannels.GET_RUN_STATE, (_, args) => {
        return run.state;
    });

    ipcMain.handle(MainChannels.TERMINAL_INPUT, (_, args) => {
        const { id, data } = args as { id: string; data: string };
        return terminal.write(id, data);
    });

    ipcMain.handle(MainChannels.TERMINAL_EXECUTE_COMMAND, (_, args) => {
        const { id, command } = args as { id: string; command: string };
        return terminal.executeCommand(id, command);
    });

    ipcMain.handle(MainChannels.TERMINAL_RESIZE, (_, args) => {
        const { id, cols, rows } = args as { id: string; cols: number; rows: number };
        return terminal.resize(id, cols, rows);
    });

    ipcMain.handle(MainChannels.TERMINAL_GET_HISTORY, (_, args) => {
        const { id } = args as { id: string };
        return terminal.getHistory(id);
    });

    ipcMain.handle(MainChannels.RUN_COMMAND, async (_, args) => {
        const { cwd, command } = args as { cwd: string; command: string };
        return await runBunCommand(command, [], { cwd });
    });
}
