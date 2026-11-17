import { describe, expect, it } from 'bun:test';
import { calmOutsidePages, isOutsidePage, REDUCED_MOTION_CSS, type CalmedGuest } from './motion.js';

function fakeGuest(url: string) {
  const inserted: string[] = [];
  let ready: () => void = () => {};
  const guest: CalmedGuest = {
    isDestroyed: () => false,
    getURL: () => url,
    insertCSS: async (css) => { inserted.push(css); return String(inserted.length); },
    on: (_event, listener) => { ready = listener; },
  };
  return { guest, inserted, load: (next: string) => { url = next; ready(); } };
}

describe('which pages are calmed', () => {
  it.each(['http://localhost:3000/', 'http://127.0.0.1:5173/', 'http://0.0.0.0:8080/', 'http://myapp.local/', 'http://app.localhost/', 'http://192.168.1.20:3000/', 'http://10.0.0.4/', 'http://172.20.0.2/'])(
    'leaves the person’s own app at %s alone',
    (url) => expect(isOutsidePage(url)).toBe(false),
  );

  it.each(['https://example.com/explore', 'http://172.32.0.1/'])('calms %s', (url) => expect(isOutsidePage(url)).toBe(true));

  it('leaves pages that are not on the web alone', () => {
    expect(isOutsidePage('about:blank')).toBe(false);
    expect(isOutsidePage('not a url')).toBe(false);
  });
});

describe('the reduced-motion stylesheet', () => {
  it('goes into each new outside document, and never into the person’s own app', () => {
    const frame = fakeGuest('https://example.com/');
    calmOutsidePages(frame.guest);
    frame.load('https://example.com/');
    frame.load('https://example.com/next');
    frame.load('http://localhost:3000/');
    expect(frame.inserted).toEqual([REDUCED_MOTION_CSS, REDUCED_MOTION_CSS]);
  });
});
