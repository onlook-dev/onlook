export function normalizeDevUrl(input: string): string | null {
  const raw = input.trim();
  if (raw === '') return null;

  if (/^\d{1,5}$/.test(raw)) {
    const port = Number(raw);
    if (port < 1 || port > 65535) return null;
    return new URL(`http://localhost:${String(port)}`).toString();
  }

  // Any scheme, not just http(s): `ftp://x` must reach the protocol guard below (ONL-1883).
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Display form, scheme stripped; not a navigable URL. */
export function displayUrl(input: string): string {
  try {
    const url = new URL(input);
    const path = url.pathname === '/' ? '' : url.pathname;
    return `${url.host}${path}${url.search}`;
  } catch {
    return input;
  }
}

// `0.0.0.0` stays: dev servers print it and designers paste it.
export const LOCAL_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);

export function localPort(url: string): number | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  // Without the scheme check, `file://localhost/etc/passwd` reads as local.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (!LOCAL_HOSTS.has(parsed.hostname)) return null;
  // An empty `port` is the scheme default, not "no port".
  return parsed.port === '' ? (parsed.protocol === 'https:' ? 443 : 80) : Number(parsed.port);
}

/** Viewport size, chrome excluded (ONL-1862). */
export const DEFAULT_FRAME_SIZE = { width: 1512, height: 982 } as const;
