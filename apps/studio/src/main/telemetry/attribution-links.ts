import { ATTRIBUTION_LIMIT, webLinkQuery } from './attribution.js';

export function attributionParams(raw: string): URLSearchParams | undefined {
  if (raw.length > ATTRIBUTION_LIMIT) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'onlook:' || (url.pathname !== '' && url.pathname !== '/') || url.username || url.password || url.port || url.hash) return undefined;
    if (url.hostname === 'web-link') return webLinkQuery(url.searchParams);
    return url.hostname === 'attribution' ? url.searchParams : undefined;
  } catch {
    return undefined;
  }
}

export function registerAttributionLinks(
  app: Pick<Electron.App, 'on' | 'isPackaged' | 'setAsDefaultProtocolClient'>,
  receive: (params: URLSearchParams) => void,
  argv: readonly string[] = process.argv,
): void {
  const receiveUrl = (raw: string): void => {
    const params = attributionParams(raw);
    if (params !== undefined) receive(params);
  };
  app.on('open-url', (event, url) => {
    const params = attributionParams(url);
    if (params === undefined) return;
    event.preventDefault();
    receive(params);
  });
  app.on('second-instance', (_event, args) => {
    for (const arg of args) receiveUrl(arg);
  });
  for (const arg of argv) receiveUrl(arg);
  if (app.isPackaged) app.setAsDefaultProtocolClient('onlook');
}
