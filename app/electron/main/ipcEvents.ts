import { ipcMain } from 'electron';
import { writeStyle } from './code';
import { openInVsCode, writeCodeResults } from './code/files';
import { TunnelService } from './tunnel';
import { MainChannels } from '/common/constants';
import { CodeResult, TemplateNode, WriteStyleParams } from '/common/models';

export function listenForIpcMessages() {
    const tunnelService = new TunnelService();

    ipcMain.handle(MainChannels.OPEN_CODE_BLOCK, (e: Electron.IpcMainInvokeEvent, args) => {
        const templateNode = args as TemplateNode;
        openInVsCode(templateNode);
    });

    ipcMain.handle(MainChannels.WRITE_CODE_BLOCK, (e: Electron.IpcMainInvokeEvent, args) => {
        const codeResults = args as CodeResult[];
        return writeCodeResults(codeResults);
    });

    ipcMain.handle(MainChannels.GET_STYLE_CODE, (e: Electron.IpcMainInvokeEvent, args) => {
        const writeStylePrams = args as WriteStyleParams[];
        return writeStyle(writeStylePrams);
    });

    ipcMain.handle(MainChannels.OPEN_TUNNEL, (e: Electron.IpcMainInvokeEvent, args) => {
        const port = args as number;
        return tunnelService.open(port);
    });

    ipcMain.handle(MainChannels.CLOSE_TUNNEL, (e: Electron.IpcMainInvokeEvent) => {
        return tunnelService.close();
    });
}
