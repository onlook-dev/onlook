import type { CloudIdentity, ProviderCapabilities } from './client.js';
export { createOnlookClient } from './local-client.js';
import type { FlagResolver } from '../flags/index.js';

export const flag: FlagResolver | undefined = undefined;

export const capabilities: ProviderCapabilities = {};

export const identity: CloudIdentity = {
  enabled: () => false,
  configured: () => false,
  prepareSession: () => null,
  hasSession: () => false,
  signIn: async () => { throw new Error('not_configured'); },
  supersedeSignIn() {},
  clearSession() {},
  refreshSession: async () => {},
  dispose() {},
  signInStep: () => null,
  onSignInProgress: () => () => {},
  onSessionChanged: () => () => {},
};
