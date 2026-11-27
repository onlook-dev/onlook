import { localPort } from '@studio/events';

export function installFrameRequestGuard(
  session: Electron.Session,
  guestFor: (id: number) => Electron.WebContents | undefined,
  allows: (guest: Electron.WebContents, url: string) => boolean,
): void {
  session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (request, callback) => {
    if (request.resourceType !== 'mainFrame' || localPort(request.url) === null) {
      callback({});
      return;
    }
    const guest = request.webContentsId === undefined ? undefined : guestFor(request.webContentsId);
    callback({ cancel: guest === undefined || !allows(guest, request.url) });
  });
}
