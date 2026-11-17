// Default import: outside Electron the package is CJS exporting a binary path, and `{ app }` fails Bun's ESM link.
import electron from 'electron';
import { stateRootOverridden } from './root.js';
import { hostPlatform, isMac } from '../env/platform.js';

let platformOverride: NodeJS.Platform | undefined;
let packagedOverride: boolean | undefined;
let sharedRootOverride: boolean | undefined;

function statePlatform(): NodeJS.Platform {
  return platformOverride ?? hostPlatform();
}

/** The one answer both halves of an account read, so a build's credentials and the identity describing them always move together (ONL-2882). The install's own anchors — the telemetry anonymous id and the merge marker — stay shared on purpose. */
export function usesDevelopmentNames(): boolean {
  return isMac(statePlatform())
    && (packagedOverride ?? electron.app?.isPackaged) === false
    // The apparatus seeds `identity.json` by name into a root it owns alone, where the installed names collide with nothing.
    && (sharedRootOverride ?? !stateRootOverridden());
}

export function setStatePlatformForTesting(platform: NodeJS.Platform | undefined): void {
  platformOverride = platform;
}

export function setStatePackagedForTesting(packaged: boolean | undefined): void {
  packagedOverride = packaged;
}

export function setStateSharedRootForTesting(shared: boolean | undefined): void {
  sharedRootOverride = shared;
}
