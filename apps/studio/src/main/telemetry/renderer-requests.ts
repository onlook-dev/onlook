import electron from 'electron';
import { telemetryHost, telemetryRequestsAllowed } from './index.js';

export function registerTelemetryRequestGuard(target: Pick<Electron.Session, 'webRequest'> = electron.session.defaultSession): void {
  const urls = ['https://us-assets.i.posthog.com/*', 'https://eu-assets.i.posthog.com/*'];
  const host = telemetryHost();
  if (URL.canParse(host)) {
    const url = new URL(host);
    if (url.protocol === 'https:' || url.protocol === 'http:') urls.push(`${url.origin}/*`);
  }
  target.webRequest.onBeforeRequest({ urls }, (_details, callback) => {
    callback({ cancel: !telemetryRequestsAllowed() });
  });
}
