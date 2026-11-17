import { useEffect, useState } from 'react';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Text } from '@astryxdesign/core/Text';
import type { OnlookState } from '@studio/events';
import { MENU_ITEM_STYLE, MenuRow } from '../menu/composerMenuRow.js';
import { MENU_DIVIDER } from '../menu/surface.js';
import { useRailMenu } from '../rail/useRailMenu.js';
import { HelpIcon, ProjectsIcon, SettingsIcon, SignOutIcon } from '../icons/glyphs.js';
import { t } from '@studio/i18n';


/** `row` is the Projects sidebar's footer, under the star card; `icon` is the editor rail's foot, under Help (ONL-2701). */
export type AccountVariant = 'row' | 'icon';

export interface AccountMenuProps {
  variant: AccountVariant;
  state: OnlookState;
  onSignIn: () => void;
  onSignOut: () => void;
  /** The app's own Settings surface, not the account's: both rows exist and open different things (ONL-2780). */
  onSettings: () => void;
  onHelp: () => void;
  onAccountSettings?: () => void;
  onTeams?: () => void;
  onSwitchWorkspace?: (workspaceId: string) => void;
  busy?: boolean;
  error?: string;
}

const AVATAR = 24;
const ICON_BOX = 28;
// The icon's mark fills its box: no hover wash rings it.
const MARK_SIZE = { row: AVATAR, icon: ICON_BOX } as const;
const ROW_HEIGHT = 32;

/** One box per variant in every state the account draws, so no state of it resizes the sidebar footer or the rail's foot (ONL-2701). */
const SLOT = {
  row: { position: 'relative', width: '100%', minWidth: 0, height: ROW_HEIGHT },
  icon: { position: 'relative', flex: '0 0 auto', width: ICON_BOX, height: ICON_BOX },
} as const;

const BARE = {
  appearance: 'none', border: 'none', margin: 0, font: 'inherit', cursor: 'pointer',
  display: 'flex', alignItems: 'center', background: 'transparent',
} as const;

const TRIGGER = {
  row: {
    ...BARE, width: '100%', height: '100%', minWidth: 0, textAlign: 'left',
    gap: 'var(--spacing-2)', paddingInline: 'var(--spacing-2)', borderRadius: 'var(--radius-element)',
  },
  icon: {
    ...BARE, justifyContent: 'center', padding: 0,
    width: ICON_BOX, height: ICON_BOX, borderRadius: 'var(--radius-full)',
  },
} as const;

/** Anchor positioning leaves no gap, so each placement spends its own margin on the layer (ONL-2701). */
const ANCHOR = {
  row: { placement: 'above', alignment: 'start', clearance: { blockEnd: 'var(--spacing-2)' } },
  icon: { placement: 'end', alignment: 'end', clearance: { inlineStart: 'var(--spacing-2)' } },
} as const;

const MARK = { position: 'relative', flex: '0 0 auto', width: AVATAR, height: AVATAR } as const;
const INITIALS = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '100%', height: '100%', borderRadius: 'var(--radius-full)', overflow: 'hidden',
  background: 'rgba(255, 255, 255, 0.12)', color: 'var(--color-text-primary)',
  fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1,
} as const;
/** Over the initials, which stay underneath: a picture that fails to decode falls back to them, never to a glyph (ONL-2701). */
const PICTURE = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-full)' } as const;
const DOT = {
  display: 'block', position: 'absolute', insetInlineEnd: '14.645%', insetBlockEnd: '14.645%', transform: 'translate(50%, 50%)', pointerEvents: 'none',
  width: 6, height: 6, borderRadius: '50%',
  background: 'var(--color-icon-orange)', boxShadow: '0 0 0 1.5px var(--color-background-teal)',
} as const;
const LABEL = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;
/** The composer's row metrics are tuned to a picker over a control; these are a destination menu's (ONL-2701). */
const ROW = { ...MENU_ITEM_STYLE, minWidth: 196, paddingBlock: 'var(--spacing-2)' } as const;
const SECONDARY = { color: 'var(--color-text-secondary)', overflowWrap: 'anywhere' } as const;
const REFUSED = { color: 'var(--color-text-orange)', overflowWrap: 'anywhere' } as const;
/** Capped, so a long name or email wraps instead of stretching the menu past the sidebar. */
const HEADER = { minWidth: 0, maxWidth: 232, paddingInline: 'var(--spacing-2)', paddingBlock: 'var(--spacing-2)' } as const;
/** An over-long role ends in an ellipsis rather than a hard cut mid-word. */
const BADGE = { display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;
/** Announced without taking a box: a message beside the avatar would widen the row it must not move. */
const OFFSCREEN = {
  position: 'absolute', width: 1, height: 1, overflow: 'hidden',
  clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', whiteSpace: 'nowrap',
} as const;

const LETTER = /[\p{L}\p{N}]/u;

// Code points, not units: a name opening on an astral character would otherwise initial to half a surrogate pair.
function initial(word: string): string {
  const first = [...word].find((char) => LETTER.test(char)) ?? '';
  return [...first.toUpperCase()][0] ?? '';
}

/** `updated-designer@onlook.test` → `UD`: Astryx splits on whitespace alone, which leaves an email one faint letter (ONL-2701). */
function initialsOf(name: string, email: string | undefined): string {
  // Only the email loses its domain; an `@` inside a chosen name is part of it.
  const source = name === '' ? (email ?? '').split('@')[0] : name;
  const words = source.split(/[\s._-]+/).filter((word) => LETTER.test(word));
  if (words.length === 0) return '';
  return words.length === 1 ? initial(words[0]) : `${initial(words[0])}${initial(words[1])}`;
}

function AccountMark({ initials, picture, isOffline, onPictureRefused, size = AVATAR }: {
  size?: number;
  initials: string;
  picture: string | null;
  isOffline: boolean;
  onPictureRefused?: () => void;
}): React.JSX.Element {
  return (
    <span style={{ ...MARK, width: size, height: size }}>
      {initials === '' && picture === null
        // Neither a name nor an email to initial, so the glyph is the only honest mark left.
        ? <Avatar size={AVATAR} tooltip={false} />
        : (
          <span style={INITIALS} data-testid="onlook-account-initials" aria-hidden>
            {initials}
            {picture !== null && (
              <img src={picture} alt="" style={PICTURE} onError={onPictureRefused} />
            )}
          </span>
        )}
      {isOffline && <span style={DOT} aria-hidden data-testid="onlook-account-connection-dot" />}
    </span>
  );
}

export function AccountMenu({
  variant, state, onSignIn, onSignOut, onSettings, onHelp, onAccountSettings, onTeams, onSwitchWorkspace, busy = false, error,
}: AccountMenuProps): React.JSX.Element | null {
  const offline = state.session === 'signed-in' && state.connection !== 'connected';
  const statusText = offline ? t('account.offline') : undefined;
  const profile = state.profile;
  const email = state.me?.user?.email ?? profile?.email ?? undefined;
  const teamsEnabled = state.teamsEnabled === true;
  const role = teamsEnabled ? state.me?.role ?? undefined : undefined;
  const announcement = error ?? (busy ? t(state.session === 'signed-in' ? 'account.signingOut' : 'account.signingIn') : undefined);
  // Blank, not just absent: a stored name of spaces would otherwise be the row's label.
  const given = (profile?.name ?? '').trim();
  const name = given || email || '';
  const initials = initialsOf(given, email);
  // Without a name the email is already the first line; a second identical one reads twice (ONL-2701).
  const secondary = email === name ? undefined : email;
  const facts = [name, secondary, role, statusText].filter(
    (fact): fact is string => typeof fact === 'string' && fact.length > 0,
  );
  const hasMenu = state.session === 'signed-in' && profile !== null;

  // Inside `role="menu"` only menuitems are announced, so the panel's own name carries who is signed in.
  const menu = useRailMenu({
    label: facts.length === 0 ? t('account.menu') : `${t('account.menu')} — ${facts.join(', ')}`,
    testId: 'onlook-account-menu', ...ANCHOR[variant],
  });
  const [isHovered, setIsHovered] = useState(false);
  // The URL, not a flag: the next person's picture gets its own attempt (ONL-2701).
  const [refusedPicture, setRefusedPicture] = useState<string | undefined>(undefined);
  // React dropping the open layer fires no `toggle`, so a state that leaves this branch would strand `isOpen` true (ONL-2206, ONL-2701).
  useEffect(() => { if (!hasMenu) menu.hide(); }, [hasMenu, menu.hide]);

  if (state.session === 'local') return null;

  const slot = (children: React.ReactNode): React.JSX.Element => (
    <div data-testid="onlook-account" data-session={state.session} data-connection={state.connection}
      data-variant={variant} aria-busy={busy} style={SLOT[variant]}>
      {children}
      {announcement !== undefined && (
        <span role={error === undefined ? 'status' : 'alert'} style={OFFSCREEN}>{announcement}</span>
      )}
    </div>
  );

  const fill = variant === 'row' && (isHovered || menu.isOpen) ? 'var(--color-overlay-hover)' : 'transparent';

  if (state.session === 'signed-out') {
    return slot(
      <button type="button" className="account-trigger" style={{ ...TRIGGER[variant], background: fill }} disabled={busy}
        aria-label={t('account.signIn')} data-testid="onlook-sign-in" onClick={onSignIn}
        onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <AccountMark initials="" picture={null} isOffline={false} size={MARK_SIZE[variant]} />
        {variant === 'row' && <Text size="base" color="secondary" style={LABEL}>{t('account.signIn')}</Text>}
      </button>,
    );
  }

  if (profile === null) {
    return slot(
      <div style={{ ...TRIGGER[variant], cursor: 'default' }} data-testid="onlook-account-loading">
        <Skeleton width={AVATAR} height={AVATAR} radius="rounded" />
        {variant === 'row' && <Skeleton width={120} height={10} radius="rounded" />}
      </div>,
    );
  }

  const picture = profile.picture === refusedPicture ? null : profile.picture;

  return slot(
    <>
      <button type="button" className="account-trigger" style={{ ...TRIGGER[variant], background: fill }}
        ref={menu.triggerRef} aria-haspopup="menu" aria-expanded={menu.isOpen}
        aria-label={[t('account.menu'), name, statusText].filter((part) => part !== undefined && part !== '').join(' — ')}
        data-testid="onlook-account-trigger"
        onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
        onClick={menu.toggle} onKeyDown={menu.onTriggerKeyDown}>
        <AccountMark initials={initials} picture={picture} isOffline={offline} size={MARK_SIZE[variant]}
          {...(picture === null ? {} : { onPictureRefused: () => setRefusedPicture(picture) })} />
        {variant === 'row' && <Text size="base" data-testid="onlook-account-name" style={LABEL}>{name}</Text>}
      </button>
      {menu.render(
        <>
          <VStack gap={0.5} aria-hidden className="menu-selectable" style={HEADER}>
            <Text size="sm" weight="medium" style={{ overflowWrap: 'anywhere' }}>{name}</Text>
            {secondary !== undefined && <Text size="sm" style={SECONDARY}>{secondary}</Text>}
            {role !== undefined && <HStack gap={1} paddingBlock={1} style={{ minWidth: 0 }}><Badge label={role} variant="neutral" style={BADGE} /></HStack>}
            {statusText !== undefined && <Text size="sm" style={SECONDARY}>{statusText}</Text>}
            {announcement !== undefined && (
              <Text size="sm" data-testid="onlook-account-announcement" style={error === undefined ? SECONDARY : REFUSED}>{announcement}</Text>
            )}
          </VStack>
          <Divider isFullBleed style={MENU_DIVIDER} />
          {onAccountSettings !== undefined && <MenuRow icon={SettingsIcon} label={t('account.settingsTitle')} isSelected={false}
            testId="onlook-account-settings" hasPopout style={ROW} onClick={() => { menu.hide(); onAccountSettings(); }} />}
          {teamsEnabled && state.teams?.workspaces.map((workspace) => <MenuRow key={workspace.id} icon={ProjectsIcon} label={workspace.name}
            isSelected={workspace.id === state.teams?.activeId} style={ROW}
            isDisabled={busy || state.connection !== 'connected' || state.teams?.loading === true}
            onClick={() => { if (!busy && state.connection === 'connected' && state.teams?.loading !== true && workspace.id !== state.teams?.activeId) { menu.hide(); onSwitchWorkspace?.(workspace.id); } }} />)}
          {teamsEnabled && onTeams !== undefined && <MenuRow icon={ProjectsIcon} label={t('teams.title')} isSelected={false} testId="onlook-account-teams"
            hasPopout style={ROW} onClick={() => { menu.hide(); onTeams(); }} />}
          {((teamsEnabled && onTeams !== undefined) || onAccountSettings !== undefined) && <Divider isFullBleed style={MENU_DIVIDER} />}
          <MenuRow icon={SettingsIcon} label={t('settings.nav')} isSelected={false} testId="onlook-app-settings"
            style={ROW} onClick={() => { menu.hide(); onSettings(); }} />
          <MenuRow icon={HelpIcon} label={t('account.docs')} isSelected={false} testId="onlook-account-docs"
            style={ROW} onClick={() => { menu.hide(); onHelp(); }} />
          <Divider isFullBleed style={MENU_DIVIDER} />
          {/* The menu stays open: a refusal lands as a line in this header, where a closed menu could not show it (ONL-2701). */}
          <MenuRow icon={SignOutIcon} label={t('account.signOut')} isSelected={false} testId="onlook-sign-out"
            style={ROW} onClick={() => { if (!busy) onSignOut(); }} />
        </>,
      )}
    </>,
  );
}
