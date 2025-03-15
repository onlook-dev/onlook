declare module 'electron-ipc-stream' {
  export default class IPCStream {
    constructor(channel: string, window?: Electron.BrowserWindow);
    write(data: any): void;
    end(): void;
    on(event: string, callback: (data: any) => void): void;
    removeListener(event: string, callback: (data: any) => void): void;
  }
}
