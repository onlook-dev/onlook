import type { WebContents } from 'electron';
import type { IpcEmitChannel, IpcPayload } from '@studio/events';
import { everyRenderer } from '../window/host.js';

export interface Sink {
  isDestroyed(): boolean;
  send(channel: string, payload?: unknown): void;
}

/** `BrowserWindow.getAllWindows()` is empty under a `BaseWindow` of views; every emit goes through this source (ONL-2226). */
let renderers: () => Sink[] = everyRenderer;

export function setRendererSource(source: () => WebContents[]): void {
  renderers = source;
}

export function broadcastAudience<R extends Pick<Sink, 'isDestroyed'>>(views: {
  chrome: R;
  tabs: readonly (R | undefined)[];
  spare: R | undefined;
}): R[] {
  return [views.chrome, ...views.tabs, views.spare].filter(
    (view): view is R => view !== undefined && !view.isDestroyed(),
  );
}

export function broadcastToRenderers<C extends IpcEmitChannel>(
  channel: C,
  payload: IpcPayload<C>,
  except?: unknown,
): void {
  for (const sink of renderers()) {
    if (sink !== except && !sink.isDestroyed()) sink.send(channel, payload);
  }
}

export function sendToRenderer<C extends IpcEmitChannel>(
  sink: Sink,
  channel: C,
  payload: IpcPayload<C>,
): void {
  if (!sink.isDestroyed()) sink.send(channel, payload);
}
