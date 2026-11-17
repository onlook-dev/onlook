import '../testing/dom.js';
import { afterEach, describe, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import type { OnlookState } from '@studio/events';
import { AccountMenu, type AccountVariant } from './AccountMenu.js';
import { t } from '@studio/i18n';

const PICTURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAACPklEQVR42pXSTU/aYAAH8Ofj7LQvsduy+24zxiVmmwthmunmVHCiomxQ0JXyUguFp5Q+fVqKFPuKRVAQVlqWZZeddtttH2EkTQzx5v13+b+AR7+kxz/Q0yl64YsrnvjeFbZG9cigFr2qROzSppoLC8QGl9xmE7GzeCJ/AGb62VRcmuJVH0c8HJ/g5Bilh/VMn0tfskmtGJfJO50m98ATX1ic4jUf7/lSypeyE4l2cWmESjc841SKBpNVqBRMBprKRMFzD4U8cdfHhC8XfRl6MprIeIzFQV3oQs4osc0cXUsHmknugCVX+DhBiQnOezLnNxRfufAbmiu1h6h5xclGCTVzXC1NZ2MzDY8/gZURv/sdZVyxPJEkr6FPle606biyNUR6F6p6SWlQGBIcGZtp8eADCA+4/VueHAlwjBVXsrxG31N6Y8m5rtuXVf3irI3JJpsUM7szff55Haz2KofXkLrh4VBQbpExEi9vxe6N4HS5jlG2mnm9ftKmj+XE1kzrO2vgnc0cOmz2qlrtcXK/1u7zVq/WcWDHLHfUoi2SZiWlkbFAO5th8FbNxXT61GTKdhnZ7LnNambZ1Bi7VbBx1oaElY/rie1AD9ZD4LV0sqOQRCtHq4WaWpDVYus8r8mUKXyzqoRVODJT0Tvtrq6AYPk4T1DopIJOBXSq8BkVEhrzxaAOjK+Ref0z9ArM/6RwdgTpI7EQb2T3W0S0tbdxT/9+swzmfxJsGfR9l3Je/1l+CR6k/y4tggfpfwsL/wHSbd1Wo9hDpgAAAABJRU5ErkJggg==';
const PROFILE = { name: 'Alex Designer', email: 'designer@example.com', picture: PICTURE };
const CONNECTED: OnlookState = {
  teamsEnabled: true,
  revision: 1, session: 'signed-in', connection: 'connected', profile: PROFILE,
  me: { user: { id: 'user-1', subject: 'workos-1', email: 'designer@example.com', createdAt: 0 }, orgId: 'org_verified', role: 'designer' },
};
const noop = (): void => {};
interface Extra {
  variant?: AccountVariant;
  busy?: boolean;
  error?: string;
  onSignOut?: () => void;
  onSettings?: () => void;
  onHelp?: () => void;
  onAccountSettings?: () => void;
  onTeams?: () => void;
}
const menu = (state: OnlookState, extra: Extra = {}): React.JSX.Element =>
  <AccountMenu variant="row" state={state} onSignIn={noop} onSignOut={noop} onSettings={noop} onHelp={noop} {...extra} />;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

async function mount(element: React.JSX.Element): Promise<HTMLDivElement> {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(element);
  });
  return container;
}

/** The popover focuses its first row from a frame, so a claim about focus has to let one pass. */
async function frame(): Promise<void> {
  await act(async () => { await new Promise((resolve) => { requestAnimationFrame(() => { resolve(undefined); }); }); });
}

async function open(mounted: HTMLDivElement): Promise<HTMLElement> {
  const trigger = mounted.querySelector('button')!;
  await act(async () => { trigger.focus(); trigger.click(); });
  await frame();
  return trigger;
}

afterEach(async () => {
  if (root) await act(async () => { root!.unmount(); });
  container?.remove();
  root = undefined;
  container = undefined;
});

describe('Onlook account in the Projects sidebar and the editor rail', () => {
  it('renders nothing for a local session, even with cached account details', () => {
    expect(renderToStaticMarkup(menu({ ...CONNECTED, session: 'local' }))).toBe('');
  });

  it('shows the profile picture when there is one', () => {
    expect(renderToStaticMarkup(menu(CONNECTED))).toContain(PICTURE);
  });

  it('derives initials from the name, and from the email when there is no name', () => {
    const noPicture = { ...CONNECTED, profile: { ...PROFILE, picture: null } };
    expect(renderToStaticMarkup(menu(noPicture))).toContain('>AD<');
    expect(renderToStaticMarkup(menu({ ...noPicture, profile: { ...PROFILE, name: null, picture: null } }))).toContain('>D<');
  });

  it('splits an email local part the way a name splits, and keeps the domain out of it', () => {
    const state = (email: string | null, name: string | null = null): OnlookState => ({
      ...CONNECTED, profile: { name, email, picture: null },
      me: email === null ? null : { ...CONNECTED.me!, user: { ...CONNECTED.me!.user!, email } },
    });
    const initials = (html: string): string | undefined =>
      /data-testid="onlook-account-initials"[^>]*>([^<]*)</.exec(html)?.[1];
    const shown = (next: OnlookState): string | undefined => initials(renderToStaticMarkup(menu(next)));
    expect(shown(state('updated-designer@onlook.test'))).toBe('UD');
    expect(shown(state('ada.lovelace@onlook.test'))).toBe('AL');
    expect(shown(state('ada@onlook.test'))).toBe('A');
    // An `@` inside a chosen name is part of it, so only the email loses a domain.
    expect(shown(state('ada@onlook.test', 'Ada @ Onlook'))).toBe('AO');
    // Nothing to initial leaves the glyph, never an empty tinted circle.
    expect(shown(state(null))).toBeUndefined();
    expect(shown(state('@onlook.test'))).toBeUndefined();
  });

  it('shows a placeholder, and no waiting text, only while the profile is missing', () => {
    const html = renderToStaticMarkup(menu({ ...CONNECTED, me: null, profile: null }));
    expect(html).toContain('onlook-account-loading');
    expect(html).not.toContain(t('account.offline'));
  });

  it('keeps the avatar and its trigger on a cold offline launch that has no server answer', () => {
    const html = renderToStaticMarkup(menu({ ...CONNECTED, connection: 'offline', me: null }));
    expect(html).not.toContain('onlook-account-loading');
    expect(html).toContain('onlook-account-trigger');
    expect(html).toContain(t('account.offline'));
  });

  it('carries the connection in the trigger name and shows a dot only when not connected', () => {
    const connected = renderToStaticMarkup(menu(CONNECTED));
    expect(connected).toContain(`aria-label="${t('account.menu')} — Alex Designer"`);
    expect(connected).not.toContain('--color-icon-orange');
    for (const connection of ['connecting', 'offline'] as const) {
      const html = renderToStaticMarkup(menu({ ...CONNECTED, connection }));
      expect(html).toContain(t('account.offline'));
      expect(html).toContain('--color-icon-orange');
      expect(html).toContain('onlook-account-connection-dot');
      expect(html).toContain('inset-inline-end:14.645%');
      expect(html).toContain('inset-block-end:14.645%');
      expect(html).toContain('transform:translate(50%, 50%)');
    }
  });

  it('holds one box per placement in every state it draws, so nothing beside it moves', async () => {
    const states = [
      CONNECTED,
      { ...CONNECTED, connection: 'offline' as const },
      { ...CONNECTED, me: null, profile: null },
      { ...CONNECTED, session: 'signed-out' as const, me: null, profile: null },
    ];
    for (const [variant, box] of [['row', ['100%', '32px']], ['icon', ['28px', '28px']]] as const) {
      for (const state of states) {
        const mounted = await mount(menu(state, { variant }));
        const slot = mounted.querySelector<HTMLElement>('[data-testid="onlook-account"]')!;
        expect([slot.style.width, slot.style.height]).toEqual([...box]);
        await act(async () => { root!.unmount(); });
        container!.remove();
        root = undefined;
        container = undefined;
      }
    }
  });

  it('names the person in the row, and leaves the rail trigger to the avatar alone', async () => {
    for (const [variant, label] of [['row', 'Alex Designer'], ['icon', null]] as const) {
      const mounted = await mount(menu(CONNECTED, { variant }));
      const trigger = mounted.querySelector<HTMLElement>('[data-testid="onlook-account-trigger"]')!;
      expect(trigger.querySelector('[data-testid="onlook-account-name"]')?.textContent ?? null).toBe(label);
      // The avatar is the whole of the rail's trigger, so its name has to come from the label.
      expect(trigger.getAttribute('aria-label')).toBe(`${t('account.menu')} — Alex Designer`);
      await act(async () => { root!.unmount(); });
      container!.remove();
      root = undefined;
      container = undefined;
    }
  });

  it('falls back to the email in the row when there is no name', async () => {
    const mounted = await mount(menu({ ...CONNECTED, profile: { ...PROFILE, name: null } }));
    expect(mounted.querySelector('[data-testid="onlook-account-name"]')?.textContent).toBe('designer@example.com');
  });

  it('never names an organization, and drops the role badge when the server reports none', async () => {
    const mounted = await mount(menu(CONNECTED));
    await open(mounted);
    expect(mounted.textContent).toContain('designer');
    expect(mounted.innerHTML).not.toContain('org_verified');
    // Inside `role="menu"` only menuitems are announced, so the panel's own name has to carry who is signed in.
    expect(mounted.querySelector('[role="menu"]')?.getAttribute('aria-label'))
      .toBe(`${t('account.menu')} — Alex Designer, designer@example.com, designer`);
  });

  it('shows the email once, and announces it once, when the person has no name', async () => {
    const mounted = await mount(menu({ ...CONNECTED, profile: { ...PROFILE, name: null } }));
    await open(mounted);
    const panel = mounted.querySelector('[role="menu"]')!;
    expect(panel.getAttribute('aria-label')).toBe(`${t('account.menu')} — designer@example.com, designer`);
    expect(panel.textContent?.split('designer@example.com')).toHaveLength(2);
  });

  it('falls back to the email when the stored name is blank, so the avatar never shows a glyph', () => {
    const blank = { ...CONNECTED, profile: { ...PROFILE, name: '  ', picture: null } };
    expect(renderToStaticMarkup(menu(blank))).toContain('>D<');
  });

  it('prefers the server email over the stored one, so a server change still shows', async () => {
    const changed = { ...CONNECTED, me: { ...CONNECTED.me!, user: { ...CONNECTED.me!.user!, email: 'updated@example.com' } } };
    const mounted = await mount(menu(changed));
    await open(mounted);
    expect(mounted.textContent).toContain('updated@example.com');
    expect(mounted.textContent).not.toContain('designer@example.com');
  });

  it('shows the status line in the menu only while not connected', async () => {
    const mounted = await mount(menu(CONNECTED));
    await open(mounted);
    expect(mounted.textContent).not.toContain(t('account.offline'));
    await act(async () => { root!.render(menu({ ...CONNECTED, connection: 'offline' })); });
    expect(mounted.textContent).toContain(t('account.offline'));
  });

  it('carries only rows that exist today, with Sign out last', async () => {
    const mounted = await mount(menu(CONNECTED));
    await open(mounted);
    const rows = [...mounted.querySelectorAll('[role="menuitem"]')].map((row) => row.getAttribute('data-testid'));
    expect(rows).toEqual(['onlook-app-settings', 'onlook-account-docs', 'onlook-sign-out']);
  });

  /** Both cards reach this menu, and each destination keeps its own row. */
  it('offers account settings, teams and the app settings as three separate destinations', async () => {
    const calls: string[] = [];
    const mounted = await mount(menu(CONNECTED, {
      onAccountSettings: () => calls.push('account'),
      onTeams: () => calls.push('teams'),
      onSettings: () => calls.push('app'),
    }));
    await open(mounted);
    const rows = [...mounted.querySelectorAll('[role="menuitem"]')].map((row) => row.getAttribute('data-testid'));
    expect(rows).toEqual(['onlook-account-settings', 'onlook-account-teams', 'onlook-app-settings', 'onlook-account-docs', 'onlook-sign-out']);
    for (const testId of ['onlook-account-settings', 'onlook-account-teams', 'onlook-app-settings']) {
      await open(mounted);
      await act(async () => { mounted.querySelector<HTMLElement>(`[data-testid="${testId}"]`)!.click(); });
      await frame();
    }
    expect(calls).toEqual(['account', 'teams', 'app']);
  });

  for (const variant of ['row', 'icon'] as const) {
    for (const enabled of [false, true, undefined]) {
      it(`${variant} account menu ${enabled === true ? 'shows' : 'hides'} every team surface with teamsEnabled=${enabled}`, async () => {
        const state: OnlookState = { ...CONNECTED, me: { ...CONNECTED.me!, role: 'admin' },
          teams: { activeId: 'personal', workspaces: [{ id: 'personal', name: 'My personal team', role: 'admin' },
            { id: 'design', name: 'Design team', role: 'member' }], members: [], invitations: [], loading: false, error: null } };
        if (enabled === undefined) delete state.teamsEnabled;
        else state.teamsEnabled = enabled;
        const mounted = await mount(menu(state, { variant, onTeams: noop, onAccountSettings: noop }));
        await open(mounted);
        expect(mounted.querySelector('[data-testid="onlook-account-teams"]') !== null).toBe(enabled === true);
        expect(mounted.textContent?.includes('My personal team')).toBe(enabled === true);
        expect(mounted.textContent?.includes('Design team')).toBe(enabled === true);
        expect(mounted.querySelector('[role="menu"]')?.getAttribute('aria-label')?.includes('admin')).toBe(enabled === true);
        expect(mounted.querySelector('[data-testid="onlook-account-settings"]')).not.toBeNull();
        expect(mounted.querySelector('[data-testid="onlook-app-settings"]')).not.toBeNull();
        expect(mounted.querySelector('[data-testid="onlook-sign-out"]')).not.toBeNull();
      });
    }
  }

  it('rules the header off and Sign out off, and leaves the rows between them in one group', async () => {
    const mounted = await mount(menu(CONNECTED));
    await open(mounted);
    const panel = mounted.querySelector<HTMLElement>('[role="menu"]')!;
    expect(panel.querySelectorAll('[role="separator"]')).toHaveLength(2);
    const marks = [...panel.children].map((child) =>
      child.getAttribute('role') === 'separator' ? '—' : child.getAttribute('data-testid') ?? 'header');
    expect(marks).toEqual(['header', '—', 'onlook-app-settings', 'onlook-account-docs', '—', 'onlook-sign-out']);
  });

  it('runs the rows that leave for another surface and closes the menu behind them', async () => {
    const calls: string[] = [];
    const mounted = await mount(menu(CONNECTED, {
      onSettings: () => calls.push('settings'),
      onHelp: () => calls.push('help'),
    }));
    for (const [testId, name] of [['onlook-app-settings', 'settings'], ['onlook-account-docs', 'help']] as const) {
      const trigger = await open(mounted);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      const row = mounted.querySelector<HTMLElement>(`[data-testid="${testId}"]`)!;
      await act(async () => { row.click(); });
      await frame();
      expect(calls).toContain(name);
      // A closed popover stays in the DOM as `display:none`, so the trigger's own state is the signal.
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    }
  });

  it('keeps the menu open across a sign-out, so its refusal has somewhere to land', async () => {
    const calls: string[] = [];
    const mounted = await mount(menu(CONNECTED, { onSignOut: () => calls.push('sign-out') }));
    const trigger = await open(mounted);
    await act(async () => { mounted.querySelector<HTMLElement>('[data-testid="onlook-sign-out"]')!.click(); });
    await frame();
    expect(calls).toEqual(['sign-out']);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await act(async () => { root!.render(menu(CONNECTED, { error: t('account.signOutFailed'), onSignOut: () => calls.push('sign-out') })); });
    expect(mounted.querySelector('[data-testid="onlook-account-announcement"]')?.textContent).toBe(t('account.signOutFailed'));
  });

  it('refuses a second sign-out while the first is still in flight', async () => {
    const calls: string[] = [];
    const mounted = await mount(menu(CONNECTED, { busy: true, onSignOut: () => calls.push('sign-out') }));
    await open(mounted);
    await act(async () => { mounted.querySelector<HTMLElement>('[data-testid="onlook-sign-out"]')!.click(); });
    expect(calls).toEqual([]);
    expect(mounted.querySelector('[data-testid="onlook-account-announcement"]')?.textContent).toBe(t('account.signingOut'));
  });

  it('offers sign-in while signed out, and keeps no stale identity', () => {
    const html = renderToStaticMarkup(menu({ ...CONNECTED, session: 'signed-out', profile: null, me: null }));
    expect(html).toContain('onlook-sign-in');
    expect(html).toContain(t('account.signIn'));
    expect(html).not.toContain('designer@example.com');
  });

  it('announces a refused sign-in, whose trigger has no menu to carry it, without giving it a box in the row', () => {
    const html = renderToStaticMarkup(menu({ ...CONNECTED, session: 'signed-out', profile: null, me: null }, { error: t('account.signInFailed') }));
    expect(html).toContain('role="alert"');
    expect(html).toContain(t('account.signInFailed'));
    // Clipped out of flow: a message that took width would push the controls beside it.
    expect(html).toContain('clip-path:inset(50%)');
  });

  it('drops the open menu when a pushed state takes the trigger away, and reopens on one press', async () => {
    // Main pushes these while the menu is open — a sign-in from a Tab, a token clear, a profile refresh.
    // React removing the open layer fires no `toggle`, so a claim keyed on the popover's own state would hold for good (ONL-2206).
    for (const next of [
      { ...CONNECTED, session: 'signed-out' as const, profile: null, me: null },
      { ...CONNECTED, profile: null },
      { ...CONNECTED, session: 'local' as const, profile: null, me: null },
    ]) {
      const mounted = await mount(menu(CONNECTED));
      const trigger = await open(mounted);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      await act(async () => { root!.render(menu(next)); });
      await frame();
      expect(mounted.querySelector('[data-testid="onlook-sign-out"]')).toBeNull();
      await act(async () => { root!.render(menu(CONNECTED)); });
      await frame();
      const back = mounted.querySelector<HTMLElement>('[data-testid="onlook-account-trigger"]')!;
      expect(back.getAttribute('aria-expanded')).toBe('false');
      await act(async () => { back.click(); });
      await frame();
      expect(back.getAttribute('aria-expanded')).toBe('true');
      await act(async () => { root!.unmount(); });
      container!.remove();
      root = undefined;
      container = undefined;
    }
  });

  it('exposes one tab stop and opens its menu from the keyboard', async () => {
    const mounted = await mount(menu(CONNECTED));
    const buttons = mounted.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    const trigger = buttons[0]!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await act(async () => {
      trigger.focus();
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    await frame();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(mounted.querySelector('[data-testid="onlook-sign-out"]')).not.toBeNull();
  });

  it('moves focus into the open menu and hands it back to the trigger on Escape', async () => {
    const mounted = await mount(menu(CONNECTED));
    const trigger = await open(mounted);
    expect(document.activeElement).not.toBe(trigger);
    await act(async () => {
      (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await frame();
    expect(document.activeElement).toBe(trigger);
  });
});
