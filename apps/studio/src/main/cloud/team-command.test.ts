import { expect, test } from 'bun:test';
import { isTeamCommand } from './team-command.js';

test('validates untrusted team commands and bounded fields', () => {
  for (const command of [null, [], {}, { type: 'unknown' }, { type: 'create', name: '', requestId: 'stable' },
    { type: 'create', name: 'x'.repeat(101), requestId: 'stable' }, { type: 'invite', email: 'no', role: 'admin' },
    { type: 'set-role', membershipId: 'member', role: 'owner' }, { type: 'switch', workspaceId: 3 }]) expect(isTeamCommand(command)).toBe(false);
  for (const command of [{ type: 'refresh' }, { type: 'leave', workspaceId: 'team' }, { type: 'switch', workspaceId: 'team' },
    { type: 'create', name: 'Design', requestId: 'stable' }, { type: 'invite', workspaceId: 'team', email: 'alex@example.com', role: 'member' },
    { type: 'join', invitationId: 'invitation' }, { type: 'revoke', workspaceId: 'team', invitationId: 'invitation' },
    { type: 'set-role', workspaceId: 'team', membershipId: 'member', role: 'admin' }, { type: 'remove', workspaceId: 'team', membershipId: 'member' }]) expect(isTeamCommand(command)).toBe(true);
});
