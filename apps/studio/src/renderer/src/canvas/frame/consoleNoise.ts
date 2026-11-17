/** Electron's own startup complaints are logged against the guest and counted as the page's errors (ONL-2297). */
export function isElectronsOwnNoise(sourceId: string): boolean {
  return sourceId.startsWith('node:electron/') || sourceId.startsWith('electron/js2c/');
}
