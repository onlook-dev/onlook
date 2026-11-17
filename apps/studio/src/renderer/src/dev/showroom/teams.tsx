import { useLayoutEffect, useRef } from 'react';
import type { OnlookState } from '@studio/events';
import { TeamsDialog } from '../../cloud/TeamsDialog.js';
import { AccountMenu } from '../../cloud/AccountMenu.js';
import { noop, type Gallery } from './Showroom.js';

const STATE: OnlookState = {
  revision: 1, session: 'signed-in', connection: 'connected', teamsEnabled: true,
  profile: { name: 'Alex Designer', email: 'designer@onlook.test', picture: null },
  me: { user: { id: 'user', subject: 'person', email: 'designer@onlook.test', createdAt: 0 }, orgId: 'team', role: 'admin' },
  teams: { activeId: 'team', loading: false, error: null,
    workspaces: [{ id: 'personal', name: 'Personal workspace', role: 'admin' }, { id: 'team', name: 'Studio design', role: 'admin' }],
    members: [{ id: 'membership', userId: 'person', role: 'admin', status: 'active' }],
    invitations: [{ id: 'invitation', email: 'teammate@onlook.test', state: 'pending', expiresAt: '2026-11-01' }],
  },
};

function Still({ kind }: { kind: string }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = root.current;
    if (kind === 'focus') node?.querySelector<HTMLInputElement>('input')?.focus();
    if (kind === 'confirmation') [...(node?.querySelectorAll('button') ?? [])].find((button) => button.textContent === 'Leave team')?.click();
    const trigger = node?.querySelector<HTMLButtonElement>('[data-testid="onlook-account-trigger"]');
    if (kind === 'menu-personal-focus') trigger?.focus();
    if (kind.startsWith('menu') && !['menu-personal-closed', 'menu-personal-hover', 'menu-personal-focus'].includes(kind)) trigger?.click();
  }, [kind]);
  const state = kind === 'empty' ? { ...STATE, teams: { ...STATE.teams!, workspaces: [], members: [], invitations: [], activeId: null } }
    : kind === 'offline' || kind === 'menu-offline' ? { ...STATE, connection: 'offline' as const }
    : kind === 'member' ? { ...STATE, me: { ...STATE.me!, role: 'member' }, teams: { ...STATE.teams!, members: STATE.teams!.members.map((member) => ({ ...member, role: 'member' })), workspaces: STATE.teams!.workspaces.map((workspace) => ({ ...workspace, role: 'member' })) } }
    : kind.startsWith('menu-personal') ? { ...STATE, teamsEnabled: false, connection: kind === 'menu-personal-offline' ? 'offline' as const : STATE.connection }
    : STATE;
  return <div ref={root} data-teams-still={kind} style={{ width: kind.startsWith('menu') ? 240 : 560 }}>
    {kind.startsWith('menu') ? <AccountMenu state={state} variant={kind.endsWith('rail') ? 'icon' : 'row'} onTeams={noop} onSwitchWorkspace={noop} onAccountSettings={noop} onSignIn={noop} onSignOut={noop} onSettings={noop} onHelp={noop} />
      : <TeamsDialog state={state} isInline onClose={noop} onCommand={async () => ({ ok: true })}
        initialTab={['members', 'member', 'error', 'confirmation'].includes(kind) ? 'members' : kind === 'join' ? 'join' : 'workspaces'}
        {...(kind === 'error' ? { initialError: 'last-admin' as const } : {})} initialBusy={kind === 'busy'} />}
  </div>;
}

export const TEAMS_GALLERY: Gallery = {
  id: 'teams', title: 'Teams', subtitle: 'Workspace selection and team management from the account menu.',
  frame: (children) => <><style>{`[data-teams-still='hover'] [data-testid='teams-close'], [data-teams-still='menu-personal-hover'] .account-trigger { background-color: var(--color-overlay-hover) !important; }`}</style>{children}</>,
  categories: ['default', 'members', 'join', 'empty', 'member', 'offline', 'busy', 'error', 'hover', 'focus', 'confirmation', 'menu-row', 'menu-rail', 'menu-offline', 'menu-personal', 'menu-personal-rail', 'menu-personal-closed', 'menu-personal-hover', 'menu-personal-focus', 'menu-personal-offline'].map((kind) => ({
    id: kind, title: kind, stories: [{ id: `teams-${kind}`, title: kind, wide: true, render: () => <Still kind={kind} /> }],
  })),
};
