import type { WebContents } from 'electron';

export function send(contents: WebContents, channel: string, payload?: unknown): void {
  if (contents.isDestroyed()) return;
  if (payload === undefined) contents.send(channel);
  else contents.send(channel, payload);
}
