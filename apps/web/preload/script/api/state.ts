
export function setWebviewId(webviewId: string) {
    (window as any)._onlookWebviewId = webviewId;
}

export function getWebviewId(): string {
    const webviewId = (window as any)._onlookWebviewId;
    if (!webviewId) {
        console.warn('Webview id not found');
        return '';
    }
    return webviewId;
}
