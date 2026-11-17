import { channelNames, type BridgeOf, type EmitContract, type InvokeContract, type Misnamed, type ScopedNames, type SendContract } from './channel.js';
import { CHANNELS } from './channels.js';
import type { WindowControlsEdge } from './tabs.js';

type Channels = typeof CHANNELS;

export type IpcInvoke = InvokeContract<Channels['invoke']>;
export type IpcSend = SendContract<Channels['send']>;
export type IpcEmit = EmitContract<Channels['emit']>;

export type IpcRequest<C extends keyof IpcInvoke> = IpcInvoke[C]['request'];
export type IpcResponse<C extends keyof IpcInvoke> = IpcInvoke[C]['response'];
export type IpcSendPayload<C extends keyof IpcSend> = IpcSend[C];
export type IpcPayload<C extends keyof IpcEmit> = IpcEmit[C];

/** Channels whose handler main reaches only with the sender's Project resolved, and those handed it or `undefined`. */
export type IpcProjectInvokeChannel = ScopedNames<Channels['invoke'], 'project'>;
export type IpcProjectOrNoneInvokeChannel = ScopedNames<Channels['invoke'], 'project-or-none'>;
export type IpcProjectSendChannel = ScopedNames<Channels['send'], 'project'>;

const claimsAreRequestFields: [Misnamed<Channels['invoke']> | Misnamed<Channels['send']>] extends [never] ? true : never = true;
void claimsAreRequestFields;

export type IpcInvokeChannel = keyof IpcInvoke;
export type IpcSendChannel = keyof IpcSend;
export type IpcEmitChannel = keyof IpcEmit;

export const IPC_INVOKE = channelNames(CHANNELS.invoke);
export const IPC_SEND = channelNames(CHANNELS.send);
export const IPC_EMIT = channelNames(CHANNELS.emit);

export interface StudioBridge extends BridgeOf<Channels, 'tab'> {
  /** Which end of the window the system draws its buttons over; the tab reads it to word and key its menus for that system. */
  readonly windowControls?: WindowControlsEdge;
}

export interface StudioChromeBridge extends BridgeOf<Channels, 'chrome'> {
  readonly windowControls?: WindowControlsEdge;
}

export interface StudioTaskManagerBridge extends BridgeOf<Channels, 'taskManager'> {
  readonly windowControls: WindowControlsEdge;
}
