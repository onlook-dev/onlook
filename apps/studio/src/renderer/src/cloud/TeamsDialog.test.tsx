import '../testing/dom.js';
import { afterEach, expect, test } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { OnlookState, TeamCommand, TeamResult } from '@studio/events';
import { takeComplaints } from '../testing/dom.js';
import { TeamsDialog } from './TeamsDialog.js';
import { t } from '@studio/i18n';

const STATE: OnlookState = {
  teamsEnabled: true,
  revision: 1, session: 'signed-in', connection: 'connected', profile: { name: 'Designer', email: 'designer@test.com', picture: null },
  me: { user: { id: 'user', subject: 'person', email: 'designer@test.com', createdAt: 0 }, orgId: 'personal', role: 'admin' },
  teams: { activeId: 'personal', workspaces: [{ id: 'personal', name: 'Personal', role: 'admin' }, { id: 'team', name: 'Design team', role: 'member' }],
    members: [{ id: 'membership', userId: 'person', role: 'admin', status: 'active' }], invitations: [], loading: false, error: null },
};
let root: Root | undefined;
let container: HTMLDivElement | undefined;

async function mount(onCommand: (command: TeamCommand) => Promise<TeamResult>, state = STATE) {
  takeComplaints();
  container = document.createElement('div'); document.body.appendChild(container);
  await act(async () => { root = createRoot(container!); root.render(<TeamsDialog state={state} onClose={() => {}} onCommand={onCommand} isInline />); });
  return container;
}

afterEach(async () => {
  await act(async () => { root?.unmount(); }); root = undefined;
  container?.remove(); container = undefined;
  expect(takeComplaints()).toEqual([]);
});

function button(node: HTMLElement, label: string): HTMLButtonElement {
  return [...node.querySelectorAll('button')].find((candidate) => candidate.textContent === label)!;
}

for (const tab of ['workspaces', 'members', 'join'] as const) {
  test(`teams flag hides the ${tab} section even with populated provider state`, async () => {
    const node = await mount(async () => { throw new Error('Hidden team UI issued a command'); });
    for (const enabled of [false, true, undefined]) {
      const state = { ...STATE };
      if (enabled === undefined) delete state.teamsEnabled;
      else state.teamsEnabled = enabled;
      await act(async () => { root!.render(<TeamsDialog key={`${tab}-${enabled}`} state={state} onClose={() => {}} onCommand={async () => ({ ok: true })} isInline initialTab={tab} />); });
      expect(node.querySelector('[data-testid="teams-dialog"]') !== null).toBe(enabled === true);
      if (enabled !== true) expect(node.textContent).toBe('');
      else expect(node.textContent).toContain(t(tab === 'members' ? 'teams.noInvitations' : tab === 'join' ? 'teams.joinHelp' : 'teams.workspaces'));
    }
  });
}

test('selects a listed workspace through the provider, never a local id change', async () => {
  const commands: TeamCommand[] = [];
  const node = await mount(async (command) => { commands.push(command); return { ok: true }; });
  await act(async () => { button(node, t('teams.switch')).click(); });
  expect(commands).toEqual([{ type: 'switch', workspaceId: 'team' }]);
  expect(button(node, t('teams.current')).disabled).toBe(true);
});

test('confirms leave and explains a last-admin refusal without losing the team', async () => {
  const node = await mount(async () => ({ ok: false, error: 'last-admin' }));
  await act(async () => { button(node, t('teams.members')).click(); });
  await act(async () => { button(node, t('teams.leave')).click(); });
  expect(node.querySelector('[data-testid="teams-confirmation"]')).not.toBeNull();
  await act(async () => { button(node, t('teams.confirm')).click(); });
  expect(node.querySelector('[role="alert"]')?.textContent).toBe(t('teams.error.last-admin'));
  expect(node.textContent).toContain('Personal');
});

test('prevents repeated submission while pending and disables writes offline', async () => {
  let resolve!: (result: TeamResult) => void;
  let calls = 0;
  const node = await mount(() => { calls += 1; return new Promise((done) => { resolve = done; }); });
  await act(async () => { button(node, t('teams.switch')).click(); button(node, t('teams.switch')).click(); });
  expect(calls).toBe(1);
  expect(node.querySelector('[aria-busy="true"]')).not.toBeNull();
  await act(async () => { resolve({ ok: true }); });
  await act(async () => { root?.render(<TeamsDialog state={{ ...STATE, connection: 'offline' }} onClose={() => {}} onCommand={async () => ({ ok: true })} isInline />); });
  expect(button(node, t('teams.switch')).disabled).toBe(true);
  expect(node.textContent).toContain(t('teams.error.offline'));
});

test('member view has no admin controls and updates lists from shared snapshots', async () => {
  const memberState = { ...STATE, teams: { ...STATE.teams!, workspaces: [{ id: 'personal', name: 'Personal', role: 'member' }] } };
  const node = await mount(async () => ({ ok: true }), memberState);
  await act(async () => { button(node, t('teams.members')).click(); });
  expect(node.textContent).not.toContain(t('teams.invite'));
  expect(node.textContent).not.toContain(t('teams.makeAdmin'));
  await act(async () => { root?.render(<TeamsDialog state={{ ...memberState, teams: { ...memberState.teams, members: [] } }} onClose={() => {}} onCommand={async () => ({ ok: true })} isInline />); });
  expect(node.textContent).toContain(t('teams.noMembers'));
});

test('a confirmation from another workspace is not actionable after a Tab switches', async () => {
  const calls: TeamCommand[] = [];
  const onCommand = async (command: TeamCommand): Promise<TeamResult> => { calls.push(command); return { ok: true }; };
  const node = await mount(onCommand);
  await act(async () => { button(node, t('teams.members')).click(); });
  await act(async () => { button(node, t('teams.leave')).click(); });
  expect(node.querySelector('[data-testid="teams-confirmation"]')).not.toBeNull();
  await act(async () => { root?.render(<TeamsDialog state={{ ...STATE, teams: { ...STATE.teams!, activeId: 'team' } }} onClose={() => {}} onCommand={onCommand} isInline />); });
  expect(node.querySelector('[data-testid="teams-confirmation"]')).toBeNull();
  expect(calls).toEqual([]);
});
