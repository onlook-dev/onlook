
import { ipcMain } from "electron";
import { openInVsCode } from "./code/files";
import { MainChannels } from "/common/constants";

export function listenForIpcMessages(webviewPreload: string) {
    ipcMain.handle(MainChannels.WEBVIEW_PRELOAD_PATH, () => {
        return webviewPreload
    })

    ipcMain.handle(MainChannels.OPEN_CODE_BLOCK, (e: Electron.IpcMainInvokeEvent, args) => {
        openInVsCode(args)
    })
}
