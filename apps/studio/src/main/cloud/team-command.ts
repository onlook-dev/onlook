import { isRecord, type TeamCommand } from '@studio/events';

export function isTeamCommand(value: unknown): value is TeamCommand {
  if (!isRecord(value)) return false;
  const command = value;
  const text = (key: string, max = 256): boolean => typeof command[key] === 'string' && command[key].trim().length > 0 && command[key].length <= max;
  const role = command['role'] === 'admin' || command['role'] === 'member';
  switch (command['type']) {
    case 'refresh': return true;
    case 'leave': return text('workspaceId');
    case 'switch': return text('workspaceId');
    case 'create': return text('name', 100) && text('requestId', 100);
    case 'invite': return text('workspaceId') && text('email', 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(command['email'])) && role;
    case 'join': return text('invitationId');
    case 'revoke': return text('workspaceId') && text('invitationId');
    case 'set-role': return text('workspaceId') && text('membershipId') && role;
    case 'remove': return text('workspaceId') && text('membershipId');
    default: return false;
  }
}
