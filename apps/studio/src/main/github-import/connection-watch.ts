import type { GithubImportState } from '@studio/events';
import type { GithubIdentity } from './backend.js';

export function createGithubConnectionWatch() {
  let previous: { subject: string | undefined; state: string; account: string | undefined } | undefined;
  return (subject: string | undefined, connection: GithubImportState['connection'], identity?: GithubIdentity): boolean => {
    const accountChanged = previous !== undefined && previous.subject !== subject;
    if (connection.status === 'unavailable' && !accountChanged) return false;
    const account = identity?.status === 'connected' ? identity.account : accountChanged ? undefined : previous?.account;
    let state: string = connection.status;
    if (identity !== undefined && identity.status !== 'connected' && identity.status !== 'unavailable') state = identity.status;
    const changed = previous === undefined || accountChanged || previous.state !== state || previous.account !== account;
    previous = { subject, state, account };
    return changed && state !== 'connecting';
  };
}
