export function ipcMessageHandler(e: Electron.IpcMessageEvent) {
    console.log("🚀 ~ ipcMessageHandler ~ e.channel:", e.channel)
};