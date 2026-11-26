import { useLayoutEffect, useRef } from 'react';
import type { OnlookState } from '@studio/events';
import { AccountMenu, type AccountVariant } from '../../cloud/AccountMenu.js';
import { DiscoverCard } from '../../projects/DiscoverCard.jsx';
import { RailHelp } from '../../rail/RailHelp.js';
import { t } from '@studio/i18n';
import { isTargeted, noop, type Gallery, type Story } from './Showroom.js';

interface Still {
  id: string;
  title: string;
  state: OnlookState;
  variant?: AccountVariant;
  /** The dismissible star card above the account, on the Projects placement. */
  hasCard?: boolean;
  busy?: boolean;
  error?: string;
  open?: boolean;
}

// A real raster portrait, so a still shows a photograph and never reads as the generic glyph.
const PICTURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAACPklEQVR42pXSTU/aYAAH8Ofj7LQvsduy+24zxiVmmwthmunmVHCiomxQ0JXyUguFp5Q+fVqKFPuKRVAQVlqWZZeddtttH2EkTQzx5v13+b+AR7+kxz/Q0yl64YsrnvjeFbZG9cigFr2qROzSppoLC8QGl9xmE7GzeCJ/AGb62VRcmuJVH0c8HJ/g5Bilh/VMn0tfskmtGJfJO50m98ATX1ic4jUf7/lSypeyE4l2cWmESjc841SKBpNVqBRMBprKRMFzD4U8cdfHhC8XfRl6MprIeIzFQV3oQs4osc0cXUsHmknugCVX+DhBiQnOezLnNxRfufAbmiu1h6h5xclGCTVzXC1NZ2MzDY8/gZURv/sdZVyxPJEkr6FPle606biyNUR6F6p6SWlQGBIcGZtp8eADCA+4/VueHAlwjBVXsrxG31N6Y8m5rtuXVf3irI3JJpsUM7szff55Haz2KofXkLrh4VBQbpExEi9vxe6N4HS5jlG2mnm9ftKmj+XE1kzrO2vgnc0cOmz2qlrtcXK/1u7zVq/WcWDHLHfUoi2SZiWlkbFAO5th8FbNxXT61GTKdhnZ7LnNambZ1Bi7VbBx1oaElY/rie1AD9ZD4LV0sqOQRCtHq4WaWpDVYus8r8mUKXyzqoRVODJT0Tvtrq6AYPk4T1DopIJOBXSq8BkVEhrzxaAOjK+Ref0z9ArM/6RwdgTpI7EQb2T3W0S0tbdxT/9+swzmfxJsGfR9l3Je/1l+CR6k/y4tggfpfwsL/wHSbd1Wo9hDpgAAAABJRU5ErkJggg==';

/** The Projects sidebar's own geometry, so the row reads as the footer it ships in (`projects/ProjectsSidebar.tsx`). */
const COLUMN = {
  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
  width: 300, padding: 24, gap: 24, boxSizing: 'border-box',
  background: 'var(--studio-ground)',
} as const;
const VERSION = { paddingInline: 'var(--spacing-2)', color: 'var(--color-text-disabled)', fontSize: 'var(--font-size-sm)' } as const;
/** The editor rail's foot, under Help (`rail/Rail.tsx`). */
const RAIL = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
  width: 48, paddingBlockEnd: 12, gap: 8, boxSizing: 'border-box',
  background: 'var(--color-background-surface)', borderInlineEnd: '0.5px solid var(--color-border)',
} as const;

function MenuStill({ still }: { still: Still }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const variant = still.variant ?? 'row';
  useLayoutEffect(() => {
    const trigger = root.current?.querySelector<HTMLButtonElement>('[data-testid="onlook-account-trigger"], [data-testid="onlook-sign-in"]');
    if (still.id === 'focus') trigger?.focus();
    // Clicked, not forced open: only the library's own handler puts the popover in the top layer.
    if (still.open === true && isTargeted(still.id)) trigger?.click();
  }, [still.id, still.open]);
  const account = (
    <AccountMenu variant={variant} state={still.state} busy={still.busy ?? false}
      {...(still.error === undefined ? {} : { error: still.error })}
      onSignIn={noop} onSignOut={noop} onSettings={noop} onHelp={noop} />
  );
  const height = still.open === true ? 460 : 240;
  return (
    <div ref={root} data-account-still={still.id} style={{ width: 720, height, display: 'flex', alignItems: 'stretch' }}>
      {variant === 'row' ? (
        <div style={COLUMN}>
          {still.hasCard === true && <DiscoverCard onStar={noop} onDismiss={noop} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {account}
            <div style={VERSION}>{t('projects.version', { version: '43.7.7' })}</div>
          </div>
        </div>
      ) : (
        <div style={RAIL}>
          <RailHelp />
          {account}
        </div>
      )}
    </div>
  );
}

export function accountGallery(): Gallery {
  const profile = { name: 'Alex Designer', email: 'designer@example.com', picture: PICTURE };
  const connected: OnlookState = {
    revision: 1, session: 'signed-in', connection: 'connected', profile,
    me: { user: { id: 'user-example', subject: 'workos-example', email: 'designer@example.com', createdAt: 0 }, orgId: 'org_example', role: 'designer' },
  };
  const signedOut: OnlookState = { revision: 2, session: 'signed-out', connection: 'idle', me: null, profile: null };
  const connectedMe = connected.me!;
  const connectedUser = connectedMe.user!;
  const longProfile = {
    name: 'Alexandra Internationale Design-Systems Reviewer', picture: null,
    email: 'alexandra.design-systems-and-experiments@international-example.com',
  };
  const longMe = { ...connectedMe, user: { ...connectedUser, email: longProfile.email }, role: 'design-system-administrator-and-reviewer' };
  // Hyphenated, so the circle reads two initials rather than the one Astryx's whitespace split gives.
  const noNameEmail = 'updated-designer@example.com';
  const noName: OnlookState = {
    ...connected, profile: { name: null, email: noNameEmail, picture: null },
    me: { ...connectedMe, user: { ...connectedUser, email: noNameEmail } },
  };
  const stills: Still[] = [
    { id: 'connected', title: 'Star card up — the account under it', state: connected, hasCard: true },
    { id: 'card-dismissed', title: 'Star card dismissed — the account keeps its place', state: connected },
    { id: 'connecting', title: 'Reconnecting — amber dot', state: { ...connected, connection: 'connecting' }, hasCard: true },
    { id: 'offline', title: 'Can’t reach Onlook — amber dot', state: { ...connected, connection: 'offline' }, hasCard: true },
    { id: 'cold-offline', title: 'Cold offline launch — no server answer yet', state: { ...connected, connection: 'offline', me: null } },
    { id: 'signed-out', title: 'Signed out', state: signedOut, hasCard: true },
    { id: 'loading', title: 'Loading — placeholder avatar', state: { ...connected, me: null, profile: null }, hasCard: true },
    { id: 'no-picture', title: 'No picture — initials on a tinted circle', state: { ...connected, profile: { ...profile, picture: null } } },
    { id: 'no-name', title: 'No name — initials and the email from it', state: noName },
    { id: 'no-role', title: 'No role — no badge', state: { ...connected, me: { ...connectedMe, orgId: null, role: null } } },
    { id: 'long', title: 'Long name and email', state: { ...connected, profile: longProfile, me: longMe } },
    { id: 'menu-open', title: 'Menu open', state: connected, hasCard: true, open: true },
    { id: 'menu-open-offline', title: 'Menu open while offline', state: { ...connected, connection: 'offline' }, open: true },
    { id: 'menu-open-no-name', title: 'Menu open with no name — the email is the only line', state: noName, open: true },
    { id: 'menu-open-long', title: 'Menu open with long values', state: { ...connected, profile: longProfile, me: longMe }, open: true },
    { id: 'menu-open-refused', title: 'Menu open after a refused sign-out', state: connected, error: t('account.signOutFailed'), open: true },
    { id: 'busy', title: 'Sign-out pending — announced, no box in the row', state: connected, busy: true },
    { id: 'sign-in-busy', title: 'Sign-in pending', state: signedOut, busy: true },
    { id: 'sign-in-error', title: 'Sign-in refused', state: signedOut, error: t('account.signInFailed') },
    { id: 'sign-out-error', title: 'Sign-out refused — the menu carries it, the row takes no width', state: connected, error: t('account.signOutFailed') },
    { id: 'hover', title: 'Row hovered', state: connected },
    { id: 'focus', title: 'Keyboard focus', state: connected },
    { id: 'local', title: 'Local mode — nothing rendered, nothing reserved', state: { revision: 0, session: 'local', connection: 'idle', me: null, profile: null } },
    { id: 'rail-picture', title: 'Editor rail — picture, under Help', state: connected, variant: 'icon' },
    { id: 'rail-initials', title: 'Editor rail — initials', state: noName, variant: 'icon' },
    { id: 'rail-offline', title: 'Editor rail — amber dot', state: { ...connected, connection: 'offline', profile: { ...profile, picture: null } }, variant: 'icon' },
    { id: 'rail-signed-out', title: 'Editor rail — signed out', state: signedOut, variant: 'icon' },
    { id: 'rail-loading', title: 'Editor rail — placeholder avatar', state: { ...connected, me: null, profile: null }, variant: 'icon' },
    { id: 'rail-menu-open', title: 'Editor rail — menu open', state: connected, variant: 'icon', open: true },
  ];
  const byId = new Map(stills.map((still) => [still.id, still]));
  const openIds = ['menu-open', 'menu-open-offline', 'menu-open-no-name', 'menu-open-long', 'menu-open-refused', 'rail-menu-open'];
  const pick = (ids: readonly string[]): Story[] => ids.map((id) => story(byId.get(id)!));
  return {
    id: 'account', title: 'Onlook account', subtitle: 'The Projects sidebar’s footer row, and the same account as one avatar in the editor rail.',
    frame: (children) => <>
      <style>{`[data-account-still='hover'] [data-testid='onlook-account-trigger'] { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); } [data-account-still='focus'] [data-testid='onlook-account-trigger'] { outline: 2px solid var(--color-accent); outline-offset: 1px; }`}</style>
      {children}
    </>,
    categories: [
      { id: 'session', title: 'Projects sidebar — session and connectivity', stories: pick(['connected', 'card-dismissed', 'connecting', 'offline', 'cold-offline', 'signed-out', 'loading', 'local']) },
      { id: 'details', title: 'Who is signed in', stories: pick(['no-picture', 'no-name', 'no-role', 'long']) },
      { id: 'rail', title: 'Editor rail', stories: pick(['rail-picture', 'rail-initials', 'rail-offline', 'rail-signed-out', 'rail-loading']) },
      // One category per open menu: a staged popover evicts its siblings, so only a targeted one opens.
      ...openIds.map((id) => ({ id, title: byId.get(id)!.title, stories: pick([id]) })),
      { id: 'interaction', title: 'Actions', stories: pick(['busy', 'sign-in-busy', 'sign-in-error', 'sign-out-error', 'hover', 'focus']) },
    ],
  };
}

function story(still: Still): Story {
  return { id: `account-${still.id}`, title: still.title, render: () => <MenuStill still={still} /> };
}
