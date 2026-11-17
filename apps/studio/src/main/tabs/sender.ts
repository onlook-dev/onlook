interface Sender {
  id: number;
  mainFrame: unknown;
  isDestroyed(): boolean;
}

export function requireStudioTabSender(
  event: { sender: Sender; senderFrame: unknown },
  renderers: readonly Sender[],
): void {
  if (event.sender.isDestroyed() || event.senderFrame !== event.sender.mainFrame || !renderers.some((renderer) => renderer === event.sender)) {
    throw new Error('Onlook requires a Studio Tab');
  }
}
