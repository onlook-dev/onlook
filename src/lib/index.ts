export function handleIpcMessage(e: Electron.IpcMessageEvent) {
    console.log("Ipc Message:", e.channel, e.args)
};

export function handleConsoleMessage(e: Electron.ConsoleMessageEvent) {
    console.log(`%c ${e.message}`, 'background: #000; color: #AAFF00');
}
