import { localPort } from '@studio/events';

export const REDUCED_MOTION_CSS =
  '*, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; ' +
  'transition-duration: 0.01ms !important; scroll-behavior: auto !important; }';

const PRIVATE_IPV4 = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

/** The person's own app may run on localhost, a `.local` name or a LAN address; only a page elsewhere is calmed. */
export function isOutsidePage(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  if (localPort(url) !== null) return false;
  const host = parsed.hostname;
  return !(host.endsWith('.local') || host.endsWith('.localhost') || PRIVATE_IPV4.test(host));
}

export interface CalmedGuest {
  isDestroyed(): boolean;
  getURL(): string;
  insertCSS(css: string, options: { cssOrigin: 'user' }): Promise<string>;
  on(event: 'dom-ready', listener: () => void): unknown;
}

/** Inserted CSS lives with one document, so each new document gets it again; JS-driven motion and `matchMedia` are out of its reach. */
export function calmOutsidePages(guest: CalmedGuest): void {
  guest.on('dom-ready', () => {
    if (guest.isDestroyed() || !isOutsidePage(guest.getURL())) return;
    void guest.insertCSS(REDUCED_MOTION_CSS, { cssOrigin: 'user' }).catch(() => {});
  });
}
