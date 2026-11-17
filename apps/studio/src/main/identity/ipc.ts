import { app } from 'electron';
import { handle } from '../ipc/bridge.js';
import {
  IPC_EMIT,
  IPC_INVOKE,
  type AuthState,
  type StudioIdentity,
} from '@studio/events';
import { identifyPerson, resetTelemetryIdentity } from '../telemetry/index.js';
import { broadcastToRenderers } from '../tabs/broadcast.js';
import { everyRenderer } from '../window/host.js';
import { requireStudioTabSender } from '../tabs/sender.js';
import { restoreAllMinimized } from '../window/host.js';
import { clearIdentity, neutralIdentity, readIdentity, writeIdentity } from './store.js';
import type { ProviderIdentity } from './provider-shape.js';

type IdentityListener = (identity: StudioIdentity) => void;

const listeners: IdentityListener[] = [];

export function onIdentity(listener: IdentityListener): void {
  listeners.push(listener);
}

export function clearAccountIdentity(): void {
  resetTelemetryIdentity();
  clearIdentity();
}

function announceIdentity(identity: StudioIdentity): StudioIdentity {
  broadcastToRenderers(IPC_EMIT.authChanged, identity);
  for (const listener of listeners) listener(identity);
  return identity;
}

export function completeBrowserSignIn(identity: ProviderIdentity): StudioIdentity {
  const persisted = writeIdentity(neutralIdentity(identity));
  announceIdentity(persisted);
  restoreAllMinimized();
  app.focus({ steal: true });
  return persisted;
}

export function authState(): AuthState {
  return { identity: readIdentity() };
}

export function registerIdentityHandlers(): void {
  onIdentity(identifyPerson);

  handle(IPC_INVOKE.authState, (event): AuthState => {
    requireStudioTabSender(event, everyRenderer());
    return authState();
  });
}
