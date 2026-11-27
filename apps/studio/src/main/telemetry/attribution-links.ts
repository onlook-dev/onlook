import { ATTRIBUTION_LIMIT, webLinkQuery } from './attribution.js';

const OPEN_LINK_FIELDS: Record<string, { maxLength: number; validate?: (value: string) => boolean }> = {
  utm_source: { maxLength: 200 },
  utm_medium: { maxLength: 200 },
  utm_campaign: { maxLength: 200 },
  utm_content: { maxLength: 200 },
  utm_term: { maxLength: 200 },
  stage: { maxLength: 64, validate: (v) => /^[a-z0-9_]{1,64}$/.test(v) },
  link_id: { maxLength: 36, validate: (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) },
};

function printableAscii(value: string): boolean {
  return value.length > 0 && /^[\x20-\x7e]+$/.test(value);
}

export interface OpenLinkParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  stage?: string;
  link_id?: string;
}

export function openLinkParams(searchParams: URLSearchParams): OpenLinkParams | undefined {
  const result: Record<string, string> = {};
  const seen = new Set<string>();
  for (const [key] of searchParams) {
    if (seen.has(key)) return undefined;
    seen.add(key);
    const spec = OPEN_LINK_FIELDS[key];
    if (spec === undefined) return undefined;
  }
  for (const [key, spec] of Object.entries(OPEN_LINK_FIELDS)) {
    const value = searchParams.get(key);
    if (value === null || value === '') continue;
    if (value.length > spec.maxLength) return undefined;
    if (!printableAscii(value)) return undefined;
    if (spec.validate !== undefined && !spec.validate(value)) return undefined;
    result[key] = value;
  }
  return result as OpenLinkParams;
}

export type DeepLinkResult =
  | { kind: 'attribution'; params: URLSearchParams }
  | { kind: 'open'; params: OpenLinkParams };

export function parseDeepLink(raw: string): DeepLinkResult | undefined {
  if (raw.length > ATTRIBUTION_LIMIT) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'onlook:' || (url.pathname !== '' && url.pathname !== '/') || url.username || url.password || url.port || url.hash) return undefined;
    if (url.hostname === 'open') {
      const params = openLinkParams(url.searchParams);
      return params !== undefined ? { kind: 'open', params } : undefined;
    }
    if (url.hostname === 'web-link') {
      const params = webLinkQuery(url.searchParams);
      return params !== undefined ? { kind: 'attribution', params } : undefined;
    }
    return url.hostname === 'attribution' ? { kind: 'attribution', params: url.searchParams } : undefined;
  } catch {
    return undefined;
  }
}

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
  app: Pick<Electron.App, 'on' | 'isReady' | 'isPackaged' | 'setAsDefaultProtocolClient'>,
  receiveAttribution: (params: URLSearchParams) => void,
  receiveOpen: (params: OpenLinkParams, launch: 'cold' | 'warm') => void,
  argv: readonly string[] = process.argv,
): void {
  const receiveUrl = (raw: string, launch: 'cold' | 'warm'): void => {
    const result = parseDeepLink(raw);
    if (result === undefined) return;
    if (result.kind === 'attribution') receiveAttribution(result.params);
    else receiveOpen(result.params, launch);
  };
  app.on('open-url', (event, url) => {
    const result = parseDeepLink(url);
    if (result === undefined) return;
    event.preventDefault();
    if (result.kind === 'attribution') receiveAttribution(result.params);
    else receiveOpen(result.params, app.isReady() ? 'warm' : 'cold');
  });
  app.on('second-instance', (_event, args) => {
    for (const arg of args) receiveUrl(arg, 'warm');
  });
  for (const arg of argv) receiveUrl(arg, 'cold');
  if (app.isPackaged) app.setAsDefaultProtocolClient('onlook');
}
