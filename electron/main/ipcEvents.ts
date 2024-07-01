
import { ipcMain } from "electron";
import { testOpen } from "./code";
import { MainChannels } from "/common/constants";

export function listenForIpcMessages(webviewPreload: string) {
    ipcMain.handle(MainChannels.WEBVIEW_PRELOAD_PATH, () => {
        return webviewPreload
    })

    ipcMain.handle(MainChannels.OPEN_CODE_BLOCK, async (e: Electron.IpcMainInvokeEvent, args) => {
        testOpen(args)
    })
}
