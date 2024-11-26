import { WebviewChannels } from '@onlook/models/constants';
import { ipcRenderer } from 'electron';

export function setWebviewId(webviewId: string) {
    (window as any)._onlookWebviewId = webviewId;
}

export function getWebviewId(): string {
    const webviewId = (window as any)._onlookWebviewId;
    if (!webviewId) {
        console.error('Webview id not found');
        ipcRenderer.sendToHost(WebviewChannels.GET_WEBVIEW_ID);
        return '';
    }
    return webviewId;
}
