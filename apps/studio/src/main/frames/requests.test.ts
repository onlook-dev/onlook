import { expect, it } from 'bun:test';
import { installFrameRequestGuard } from './requests.js';

it('blocks main-frame requests for sibling ports even when no navigation event fires', () => {
  let beforeRequest: Parameters<Electron.WebRequest['onBeforeRequest']>[0];
  const guest = { id: 7 } as Electron.WebContents;
  const denied: string[] = [];
  const session = { webRequest: { onBeforeRequest: (_filter: unknown, listener: typeof beforeRequest) => { beforeRequest = listener; } } } as unknown as Electron.Session;
  installFrameRequestGuard(session, id => id === guest.id ? guest : undefined, (_guest, url) => {
    denied.push(url);
    return new URL(url).port !== '4700';
  });
  const request = (url: string, resourceType: string, webContentsId = guest.id) => {
    let result: Electron.CallbackResponse | undefined;
    beforeRequest!({ url, resourceType, webContentsId } as Electron.OnBeforeRequestListenerDetails, response => { result = response; });
    return result;
  };
  expect(request('http://localhost:4700/menu', 'mainFrame')).toEqual({ cancel: true });
  expect(request('http://localhost:4701/menu', 'mainFrame')).toEqual({ cancel: false });
  expect(request('http://localhost:4701/menu', 'mainFrame', 99)).toEqual({ cancel: true });
  for (const resource of ['subFrame', 'script', 'xhr', 'image']) {
    expect(request('http://localhost:4700/resource', resource)).toEqual({});
  }
  expect(request('https://example.com/', 'mainFrame')).toEqual({});
  expect(denied).toEqual(['http://localhost:4700/menu', 'http://localhost:4701/menu']);
});
