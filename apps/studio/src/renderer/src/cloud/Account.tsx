import { useEffect, useRef, useState } from 'react';
import type { TeamCommand, TeamError, TeamResult } from '@studio/events';
import { ONLOOK_DOCS_URL } from '../rail/helpMenu.js';
import { AccountMenu, type AccountVariant } from './AccountMenu.js';
import { AccountSettingsDialog } from './AccountSettings.js';
import { TeamsDialog } from './TeamsDialog.js';
import { useOnlookState } from './store.js';
import { accountErrorText, useAccountAction } from './useAccountAction.js';
import { studio } from '../bridge.js';

const command = (next: TeamCommand): Promise<TeamResult> => studio().onlookTeamCommand(next);

export default function Account({ variant }: { variant: AccountVariant }): React.JSX.Element | null {
  const { state, sessionRevision } = useOnlookState();
  const action = useAccountAction(state, sessionRevision);
  const [settingsSession, setSettingsSession] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [teamError, setTeamError] = useState<TeamError>();
  const switching = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => { if (state?.session !== 'signed-in' || state.teamsEnabled !== true) setTeamsOpen(false); }, [state?.session, state?.teamsEnabled]);

  if (state === null) return null;
  const signedIn = state.session === 'signed-in';
  return <>
    <AccountMenu variant={variant} state={state} busy={action.busy !== null}
      {...(action.error === undefined ? {} : { error: accountErrorText(action.error) })}
      onSignIn={() => { void action.run('email'); }}
      onSignOut={() => { void action.run('sign-out'); }}
      {...(signedIn ? { onAccountSettings: () => { action.clearError(); setConfirming(false); setSettingsSession(sessionRevision); } } : {})}
      onTeams={() => { if (state.teamsEnabled === true) { setTeamError(undefined); setTeamsOpen(true); } }}
      onSwitchWorkspace={(workspaceId) => {
        if (state.teamsEnabled !== true || action.busy !== null || switching.current || state.connection !== 'connected' || state.teams?.loading === true) return;
        switching.current = true;
        void command({ type: 'switch', workspaceId }).catch((): TeamResult => ({ ok: false, error: 'failed' })).then((result) => {
          if (mounted.current && !result.ok) { setTeamError(result.error); setTeamsOpen(true); }
        }).finally(() => { switching.current = false; });
      }}
      onSettings={() => { studio().runAppCommand({ command: 'settings' }); }}
      onHelp={() => window.open(ONLOOK_DOCS_URL, '_blank', 'noopener')} />
    {signedIn ? <AccountSettingsDialog state={state} isOpen={settingsSession === sessionRevision}
      confirming={confirming} busy={action.busy} error={action.error}
      onClose={() => { setSettingsSession(null); setConfirming(false); }}
      onSignOut={() => { void action.run('sign-out'); }}
      onRequestDelete={() => { action.clearError(); setConfirming(true); }}
      onCancelDelete={() => { action.clearError(); setConfirming(false); }}
      onDelete={() => { void action.run('delete'); }} /> : null}
    {state.teamsEnabled === true && teamsOpen && signedIn && <TeamsDialog state={state} onClose={() => setTeamsOpen(false)} onCommand={command}
      {...(teamError === undefined ? {} : { initialError: teamError })} />}
  </>;
}
