import type { OnlookClient, OnlookClientOptions } from './client.js';

export function createOnlookClient(_options?: OnlookClientOptions): OnlookClient {
  const state = { revision: 0, session: 'local', connection: 'idle', me: null, profile: null } as const;
  return {
    start() {},
    setSession() {},
    setProfile() {},
    snapshot: () => state,
    subscribe: () => () => {},
    signIn: async () => {},
    signOut: async () => {},
    deleteAccount: async () => {},
    teamCommand: async () => ({ ok: false, error: 'unavailable' }),
    close: async () => {},
  };
}
