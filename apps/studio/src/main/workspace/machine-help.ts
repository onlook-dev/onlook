import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { shell } from 'electron';
import type { MachineHelpId } from '@studio/events';
import { hostPlatform, isMac } from '../env/platform.js';

export interface MachineHelpDeps {
  platform: NodeJS.Platform;
  home: string;
  exists: (path: string) => boolean;
  /** Electron's own: the empty string is success. */
  openPath: (path: string) => Promise<string>;
  openExternal: (url: string) => Promise<void>;
}

const ACTIVITY_MONITOR = '/System/Applications/Utilities/Activity Monitor.app';
const DEVELOPER_TOOLS_HELP = 'https://developer.apple.com/download/all/';
/** The agent's own app when the person has it, its site when they do not (ONL-3111). */
const AGENT_PLACES = {
  claude: { app: 'Claude.app', site: 'https://claude.ai/new' },
  chatgpt: { app: 'ChatGPT.app', site: 'https://chatgpt.com/' },
} as const;

export function machineHelpDeps(): MachineHelpDeps {
  return {
    platform: hostPlatform(),
    home: homedir(),
    exists: existsSync,
    openPath: (path) => shell.openPath(path),
    openExternal: (url) => shell.openExternal(url),
  };
}

export async function openMachineHelp(help: MachineHelpId, deps: MachineHelpDeps): Promise<boolean> {
  if (help === 'developer-tools') {
    await deps.openExternal(DEVELOPER_TOOLS_HELP);
    return true;
  }
  if (help === 'activity-monitor') {
    if (!isMac(deps.platform)) return false;
    return await deps.openPath(ACTIVITY_MONITOR) === '';
  }
  const place = help === 'claude' ? AGENT_PLACES.claude : help === 'chatgpt' ? AGENT_PLACES.chatgpt : undefined;
  if (place === undefined) return false;
  // An app installed for this account alone lives in the home folder's own Applications.
  const apps = isMac(deps.platform) ? [join('/Applications', place.app), join(deps.home, 'Applications', place.app)] : [];
  for (const app of apps) {
    if (deps.exists(app) && await deps.openPath(app) === '') return true;
  }
  await deps.openExternal(place.site);
  return true;
}
