
import { ipcMain } from "electron";
import { writeStyle } from "./code";
import { openInVsCode } from "./code/files";
import { openTunnel } from "./tunnel";
import { MainChannels } from "/common/constants";
import { TemplateNode, WriteStyleParams } from "/common/models";

export function listenForIpcMessages(webviewPreload: string) {
    ipcMain.handle(MainChannels.WEBVIEW_PRELOAD_PATH, () => {
        return webviewPreload
    })

    ipcMain.handle(MainChannels.OPEN_CODE_BLOCK, (e: Electron.IpcMainInvokeEvent, args) => {
        const templateNode = args as TemplateNode
        openInVsCode(templateNode)
    })

    ipcMain.handle(MainChannels.WRITE_STYLE_TO_CODE, (e: Electron.IpcMainInvokeEvent, args) => {
        const writeStylePrams = args as WriteStyleParams[]
        return writeStyle(writeStylePrams)
    })

    ipcMain.handle(MainChannels.OPEN_TUNNEL, (e: Electron.IpcMainInvokeEvent, args) => {
        const port = args as number
        return openTunnel(port)
    })
}
