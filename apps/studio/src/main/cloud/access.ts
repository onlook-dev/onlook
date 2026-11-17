import type { OnlookState } from '@studio/events';
import { capabilities } from './capabilities.js';
import { readIdentity } from '../identity/store.js';

let signedIn = false;

export function noteOnlookSession(session: OnlookState['session']): void {
  signedIn = session === 'signed-in';
}

export function hasOnlookSession(): boolean {
  return !capabilities().account || signedIn;
}

/** A build that signs people in has a record once they have; one that does not never writes a record to wait for, and waiting would cost it every saved window (ONL-2950). */
export function hasAccountRecord(): boolean {
  return !capabilities().account || readIdentity() !== null;
}
