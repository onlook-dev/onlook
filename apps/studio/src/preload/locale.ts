import { contextBridge } from 'electron';
import { LOCALE_ARG } from '@studio/events';

export function exposeLocale(): void {
  const prefix = `${LOCALE_ARG}=`;
  const arg = process.argv.find((entry) => entry.startsWith(prefix));
  if (arg !== undefined) contextBridge.exposeInMainWorld('studioLocale', arg.slice(prefix.length));
}
