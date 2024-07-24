import { ipcMain } from 'electron';
import { TemplateNode } from '../../../common/models/element/templateNode';
import Analytics from '../analytics';
import { openInVsCode, readCodeBlock, readCodeBlocks, writeCode } from '../code/';
import { getStyleCodeDiffs } from '../code/babel';
import { TunnelService } from '../tunnel';
import { MainChannels } from '/common/constants';
import { StyleChangeParam, StyleCodeDiff } from '/common/models';

function listenForTunnelMessages() {
    const tunnelService = new TunnelService();

    ipcMain.handle(MainChannels.OPEN_TUNNEL, (e: Electron.IpcMainInvokeEvent, args) => {
        const port = args as number;
        return tunnelService.open(port);
    });

    ipcMain.handle(MainChannels.CLOSE_TUNNEL, (e: Electron.IpcMainInvokeEvent) => {
        return tunnelService.close();
    });
}

function listenForAnalyticsMessages() {
    let analytics: Analytics | null = null;

    ipcMain.on(MainChannels.ANLYTICS_PREF_SET, (e: Electron.IpcMainInvokeEvent, args) => {
        const analyticsPref = args as boolean;
        if (analyticsPref) {
            analytics = new Analytics();
            analytics.track('analytics-allowed');
        }
    });

    ipcMain.on(MainChannels.SEND_ANALYTICS, (e: Electron.IpcMainInvokeEvent, args) => {
        if (analytics) {
            const { event, data } = args as { event: string; data: object };
            analytics.track(event, data);
        }
    });
}

function listenForCodeMessages() {
    ipcMain.handle(MainChannels.VIEW_SOURCE_CODE, (e: Electron.IpcMainInvokeEvent, args) => {
        const templateNode = args as TemplateNode;
        openInVsCode(templateNode);
    });

    ipcMain.handle(MainChannels.GET_CODE_BLOCK, (e: Electron.IpcMainInvokeEvent, args) => {
        const templateNode = args as TemplateNode;
        return readCodeBlock(templateNode);
    });

    ipcMain.handle(MainChannels.GET_CODE_BLOCKS, (e: Electron.IpcMainInvokeEvent, args) => {
        const templateNodes = args as TemplateNode[];
        return readCodeBlocks(templateNodes);
    });

    ipcMain.handle(MainChannels.WRITE_CODE_BLOCKS, (e: Electron.IpcMainInvokeEvent, args) => {
        const codeResults = args as StyleCodeDiff[];
        return writeCode(codeResults);
    });

    ipcMain.handle(MainChannels.GET_STYLE_CODE_DIFFS, (e: Electron.IpcMainInvokeEvent, args) => {
        const styleParams = args as StyleChangeParam[];
        return getStyleCodeDiffs(styleParams);
    });
}

export function listenForIpcMessages() {
    listenForTunnelMessages();
    listenForAnalyticsMessages();
    listenForCodeMessages();
}
