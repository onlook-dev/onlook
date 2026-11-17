import { describe, expect, it } from 'bun:test';
import { EventEmitter } from 'node:events';
import { ARTIFACT_SCHEME, type BrowserNode } from '@studio/events';
import { appGuestAllowed, protectAppContents } from './host.js';
import { appViewPreferences } from './preferences.js';
import { frameBindings } from '../frames/bindings.js';

describe('application view security', () => {
  it('security keeps app preloads sandboxed and isolated even with conflicting extra preferences', () => {
    expect(appViewPreferences('/trusted/preload.cjs', { sandbox: false, contextIsolation: false, nodeIntegration: true, webviewTag: true }))
      .toEqual({ preload: '/trusted/preload.cjs', sandbox: true, contextIsolation: true, nodeIntegration: false, webviewTag: true });
  });

  function surface(allowGuests = false) {
    const events = new EventEmitter();
    let popup: ((details: { url: string }) => { action: string }) | undefined;
    const external: string[] = [];
    const contents = Object.assign(events, {
      id: 700,
      setWindowOpenHandler: (handler: typeof popup) => { popup = handler; },
    });
    protectAppContents(contents as unknown as Electron.WebContents, { allowGuests, openExternal: (url) => { external.push(url); } });
    const blocked = (name: string, ...args: unknown[]): boolean => {
      let prevented = false;
      events.emit(name, { preventDefault: () => { prevented = true; } }, ...args);
      return prevented;
    };
    return { contents, blocked, popup: (url = 'about:blank') => popup?.({ url }), external };
  }

  it('security blocks app navigation, frame navigation, redirects and popups', () => {
    const view = surface();
    for (const event of ['will-navigate', 'will-frame-navigate', 'will-redirect']) {
      for (const url of ['https://example.test', 'file:///etc/passwd', 'data:text/html,bad', 'about:blank']) {
        expect(view.blocked(event, url)).toBe(true);
      }
    }
    expect(view.popup()).toEqual({ action: 'deny' });
  });

  it('security preserves own-view web links in the browser without allowing app popups or executable schemes', () => {
    const view = surface();
    for (const url of ['https://example.test/download', 'http://localhost:3000/']) {
      expect(view.popup(url)).toEqual({ action: 'deny' });
    }
    expect(view.external).toEqual(['https://example.test/download', 'http://localhost:3000/']);
    for (const url of ['file:///tmp/tool', 'javascript:alert(1)', 'data:text/html,bad', 'custom:run', 'not a URL']) {
      expect(view.popup(url)).toEqual({ action: 'deny' });
    }
    expect(view.external).toHaveLength(2);
  });

  it('security denies guest attachment by default, including the chrome view', () => {
    expect(surface().blocked('will-attach-webview', {}, { src: 'http://localhost:3000' })).toBe(true);
  });

  it('security admits only recognized Canvas guests on opted-in app views', () => {
    const view = surface(true);
    const valid = ['http://localhost:3000', 'https://example.test', 'about:blank', `${ARTIFACT_SCHEME}://aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa/pages/index.html`];
    for (const src of valid) {
      expect(appGuestAllowed(src)).toBe(true);
      expect(view.blocked('will-attach-webview', {}, { src })).toBe(false);
    }
    for (const src of [undefined, '', 'file:///etc/passwd', 'data:text/html,bad', 'javascript:alert(1)', `${ARTIFACT_SCHEME}://foreign/page.html`]) {
      expect(appGuestAllowed(src)).toBe(false);
      expect(view.blocked('will-attach-webview', {}, { src })).toBe(true);
    }
  });

  it('admits a native birth challenge only through its same-owner prepared context and canonical destination', () => {
    for (const url of ['https://example.test/', 'file:///private/secret']) {
      const view = surface(true);
      const owner = view.contents as unknown as Electron.WebContents;
      const node: BrowserNode = { id: 'frame', kind: 'browser', pageId: 'page', name: 'Frame', x: 0, y: 0, width: 800, height: 600, order: 0, content: { homeUrl: url } };
      try {
        const params = { src: frameBindings.issue(owner, 'doc', node, url)! };
        const preferences = {};
        expect(frameBindings.prepare(owner, preferences, params)).toBe(true);
        expect(appGuestAllowed(params.src)).toBe(false);
        expect(view.blocked('will-attach-webview', preferences, params)).toBe(url.startsWith('file:'));
        expect(view.blocked('will-attach-webview', preferences, { ...params })).toBe(true);
        expect(surface(true).blocked('will-attach-webview', preferences, params)).toBe(true);
        expect(surface().blocked('will-attach-webview', preferences, params)).toBe(true);
      } finally { frameBindings.forget(owner); }
    }
  });
});
