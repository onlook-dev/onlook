import { localeArguments } from '../locale/arguments.js';

export function appViewPreferences(preload: string, extra: Electron.WebPreferences = {}): Electron.WebPreferences {
  const additionalArguments = [...(extra.additionalArguments ?? []), ...localeArguments()];
  return {
    ...extra,
    ...(additionalArguments.length > 0 ? { additionalArguments } : {}),
    preload,
    sandbox: true,
    contextIsolation: true,
    nodeIntegration: false,
  };
}
