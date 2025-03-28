import { WebviewChannels } from '@onlook/models/constants';
import type { TOnlookWindow } from './api';

export function setWebviewId(webviewId: string) {
    (window as any)._onlookWebviewId = webviewId;
}

export function getWebviewId(): string {
    const webviewId = (window as TOnlookWindow)._onlookWebviewId;
    if (!webviewId) {
        console.error('Webview id not found');
        (window as TOnlookWindow).onlook.bridge.send(WebviewChannels.GET_WEBVIEW_ID);
        return '';
    }
    return webviewId;
}
