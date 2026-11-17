interface ReadyGuest {
  addEventListener(type: 'dom-ready', listener: () => void): void;
  removeEventListener(type: 'dom-ready', listener: () => void): void;
  getWebContentsId(): number;
}

export function bindGuestReady(guest: ReadyGuest, onReady: () => void): () => void {
  guest.addEventListener('dom-ready', onReady);
  let alreadyReady = false;
  try {
    guest.getWebContentsId();
    alreadyReady = true;
  } catch {
  }
  if (alreadyReady) {
    try {
      onReady();
    } catch (error) {
      guest.removeEventListener('dom-ready', onReady);
      throw error;
    }
  }
  return () => guest.removeEventListener('dom-ready', onReady);
}
