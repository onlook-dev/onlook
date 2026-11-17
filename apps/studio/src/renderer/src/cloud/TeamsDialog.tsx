import { useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Dialog } from '../overlay/Dialog.js';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import type { OnlookState, TeamCommand, TeamError, TeamResult } from '@studio/events';
import { t } from '@studio/i18n';

const ERROR_KEYS = {
  'last-admin': 'teams.error.last-admin', busy: 'teams.error.busy', reconciliation: 'teams.error.reconciliation',
  'sign-in-required': 'teams.error.sign-in-required', 'switch-required': 'teams.error.switch-required',
  'invalid-request': 'teams.error.invalid-request', offline: 'teams.error.offline', unavailable: 'teams.error.unavailable', failed: 'teams.error.failed',
} as const;

export interface TeamsDialogProps {
  state: OnlookState;
  onClose(): void;
  onCommand(command: TeamCommand): Promise<TeamResult>;
  isInline?: boolean;
  initialError?: TeamError;
  initialBusy?: boolean;
  initialTab?: 'workspaces' | 'members' | 'join';
}

const SECTION = { width: '100%', minWidth: 0 } as const;
const ROW = { width: '100%', justifyContent: 'space-between', minWidth: 0, flexWrap: 'wrap' } as const;
const WRAP = { minWidth: 0, overflowWrap: 'anywhere' } as const;

export function TeamsDialog({ state, onClose, onCommand, isInline, initialError, initialBusy = false, initialTab = 'workspaces' }: TeamsDialogProps): React.JSX.Element | null {
  const [tab, setTab] = useState(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [invitationId, setInvitationId] = useState('');
  const [busy, setBusy] = useState(initialBusy);
  const [error, setError] = useState<TeamError | undefined>(initialError);
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<TeamCommand>();
  const request = useRef<{ name: string; id: string } | undefined>(undefined);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const teams = state.teams;
  const active = teams?.workspaces.find((workspace) => workspace.id === teams.activeId);
  const admin = active?.role === 'admin';
  const disabled = busy || state.connection !== 'connected' || teams?.loading === true;
  const displayedError = error ?? teams?.error ?? (state.connection === 'connected' ? undefined : 'offline');

  async function run(command: TeamCommand): Promise<void> {
    if (state.teamsEnabled !== true || pending.current || disabled) return;
    pending.current = true;
    setBusy(true); setError(undefined); setNotice(''); setConfirmation(undefined);
    try {
      const result = await onCommand(command);
      if (!mounted.current) return;
      if (!result.ok) { setError(result.error); return; }
      if (command.type === 'create') { setName(''); request.current = undefined; setNotice(t('teams.created')); }
      else if (command.type === 'invite') { setEmail(''); setNotice(t('teams.sent')); }
      else { if (command.type === 'join') setInvitationId(''); setNotice(t('teams.updated')); }
    } catch {
      if (mounted.current) setError('failed');
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  if (state.teamsEnabled !== true) return null;

  return <Dialog isOpen isInline={isInline ?? false} onOpenChange={(open) => { if (!open && !busy) onClose(); }}
    width="min(560px, 92vw)" maxHeight="86vh" padding={6} aria-label={t('teams.title')} data-testid="teams-dialog">
    <VStack gap={5} style={SECTION} aria-busy={busy}>
      <HStack gap={3} style={ROW}>
        <Text size="lg" weight="medium">{t('teams.title')}</Text>
        <Button label={t('teams.close')} variant="ghost" isDisabled={busy} onClick={onClose} data-testid="teams-close" />
      </HStack>
      <HStack gap={1} role="tablist" aria-label={t('teams.title')} onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const tabs = ['workspaces', 'members', 'join'] as const;
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
        setTab(tabs[index]!); setConfirmation(undefined);
        event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index]?.focus();
      }}>
        {(['workspaces', 'members', 'join'] as const).map((item) => <Button key={item} role="tab" aria-selected={tab === item}
          tabIndex={tab === item ? 0 : -1}
          label={t(item === 'workspaces' ? 'teams.workspaces' : item === 'members' ? 'teams.members' : 'teams.join')}
          variant={tab === item ? 'secondary' : 'ghost'} onClick={() => { setTab(item); setConfirmation(undefined); }} />)}
      </HStack>
      {displayedError !== undefined && <Text role="alert" size="sm" style={{ ...WRAP, color: 'var(--color-text-orange)' }} data-testid="teams-error">{t(ERROR_KEYS[displayedError])}</Text>}
      {notice !== '' && <Text role="status" size="sm" data-testid="teams-notice">{notice}</Text>}
      {(teams?.loading === true || busy) && <Text role="status" size="sm">{t('teams.loading')}</Text>}
      {tab === 'workspaces' && <><VStack gap={2} style={SECTION}>
        <HStack gap={2} style={ROW}><Text size="sm" weight="medium">{t('teams.workspaces')}</Text>
          <Button label={t('teams.refresh')} variant="ghost" isDisabled={disabled} onClick={() => { void run({ type: 'refresh' }); }} /></HStack>
        {teams?.workspaces.map((workspace) => <HStack key={workspace.id} gap={3} style={ROW}>
          <VStack gap={0} style={{ ...WRAP, flex: 1 }}><Text size="sm">{workspace.name}</Text><Text size="sm" color="secondary">{workspace.role === 'admin' ? t('teams.admin') : t('teams.member')}</Text></VStack>
          <Button label={workspace.id === teams.activeId ? t('teams.current') : t('teams.switch')} aria-label={workspace.id === teams.activeId ? `${workspace.name} — ${t('teams.current')}` : t('teams.switchTo', { name: workspace.name })}
            variant={workspace.id === teams.activeId ? 'secondary' : 'ghost'} isDisabled={disabled || workspace.id === teams.activeId}
            onClick={() => { void run({ type: 'switch', workspaceId: workspace.id }); }} />
        </HStack>)}
        {(teams?.workspaces.length ?? 0) === 0 && <Text size="sm" color="secondary">{t('teams.empty')}</Text>}
      </VStack>
      <Divider />
      <form style={SECTION} onSubmit={(event) => { event.preventDefault(); if (request.current?.name !== name.trim()) request.current = { name: name.trim(), id: crypto.randomUUID() }; void run({ type: 'create', name, requestId: request.current.id }); }}>
        <VStack gap={2} style={SECTION}><TextInput label={t('teams.name')} value={name} onChange={(value) => setName(value.slice(0, 100))} isDisabled={disabled} />
          <Button type="submit" label={t('teams.create')} variant="secondary" isDisabled={disabled || name.trim() === ''} /></VStack>
      </form>
      </>}
      {tab === 'members' && active === undefined && <Text size="sm" color="secondary">{t('teams.empty')}</Text>}
      {tab === 'members' && active !== undefined && <>
        <VStack gap={3} style={SECTION}>
          <Text size="sm" weight="medium">{active.name} · {t('teams.members')}</Text>
          {teams?.members.map((member) => {
            const self = member.userId === state.me?.user?.subject;
            return <HStack key={member.id} gap={2} style={ROW}>
              <VStack gap={0} style={{ ...WRAP, flex: 1 }}><Text size="sm">{self ? state.profile?.email ?? t('teams.you') : member.userId}</Text>
                <Text size="sm" color="secondary">{member.role === 'admin' ? t('teams.admin') : t('teams.member')}{self ? ` · ${t('teams.you')}` : ''}</Text></VStack>
              {admin && member.status === 'active' && <HStack gap={1}>
                <Button label={member.role === 'admin' ? t('teams.makeMember') : t('teams.makeAdmin')} variant="ghost" isDisabled={disabled}
                  onClick={() => { const command: TeamCommand = { type: 'set-role', workspaceId: active.id, membershipId: member.id, role: member.role === 'admin' ? 'member' : 'admin' }; if (self) setConfirmation(command); else void run(command); }} />
                {!self && <Button label={t('teams.remove')} variant="ghost" isDisabled={disabled} onClick={() => setConfirmation({ type: 'remove', workspaceId: active.id, membershipId: member.id })} />}
              </HStack>}
            </HStack>;
          })}
          {teams?.members.length === 0 && <Text size="sm" color="secondary">{t('teams.noMembers')}</Text>}
          {admin && <>
            <form style={SECTION} onSubmit={(event) => { event.preventDefault(); void run({ type: 'invite', workspaceId: active.id, email, role: 'member' }); }}>
              <VStack gap={2} style={SECTION}><TextInput label={t('teams.email')} type="email" value={email} onChange={(value) => setEmail(value.slice(0, 254))} isDisabled={disabled} />
                <Button type="submit" label={t('teams.invite')} variant="secondary" isDisabled={disabled || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())} /></VStack>
            </form>
            <Text size="sm" weight="medium">{t('teams.invitations')}</Text>
            {teams?.invitations.filter((invitation) => invitation.state === 'pending').map((invitation) => <HStack key={invitation.id} gap={2} style={ROW}>
              <VStack gap={0} style={{ ...WRAP, flex: 1 }}><Text size="sm">{invitation.email}</Text>
                <Text size="sm" color="secondary" style={{ userSelect: 'text', cursor: 'text', overflowWrap: 'anywhere' }}>{t('teams.invitationId')}: {invitation.id}</Text></VStack>
              <Button label={t('teams.revoke')} variant="ghost" isDisabled={disabled} onClick={() => { void run({ type: 'revoke', workspaceId: active.id, invitationId: invitation.id }); }} />
            </HStack>)}
            {!teams?.invitations.some((invitation) => invitation.state === 'pending') && <Text size="sm" color="secondary">{t('teams.noInvitations')}</Text>}
          </>}
          <Button label={t('teams.leave')} variant="ghost" isDisabled={disabled} onClick={() => setConfirmation({ type: 'leave', workspaceId: active.id })} />
        </VStack>
      </>}
      {confirmation !== undefined && 'workspaceId' in confirmation && confirmation.workspaceId === teams?.activeId && <VStack gap={2} style={SECTION} data-testid="teams-confirmation">
        <Text size="sm">{t(confirmation.type === 'leave' ? 'teams.confirmLeave' : confirmation.type === 'remove' ? 'teams.confirmRemove' : 'teams.confirmDemote')}</Text>
        <HStack gap={2}><Button label={t('teams.cancel')} variant="ghost" onClick={() => setConfirmation(undefined)} />
          <Button label={t('teams.confirm')} variant="secondary" isDisabled={disabled} onClick={() => { void run(confirmation); }} /></HStack>
      </VStack>}
      {tab === 'join' && <form style={SECTION} onSubmit={(event) => { event.preventDefault(); void run({ type: 'join', invitationId }); }}>
        <VStack gap={2} style={SECTION}><TextInput label={t('teams.invitationId')} value={invitationId} onChange={(value) => setInvitationId(value.slice(0, 256))} isDisabled={disabled} />
          <Text size="sm" color="secondary">{t('teams.joinHelp')}</Text>
          <Button type="submit" label={t('teams.join')} variant="secondary" isDisabled={disabled || invitationId.trim() === ''} /></VStack>
      </form>}
    </VStack>
  </Dialog>;
}
