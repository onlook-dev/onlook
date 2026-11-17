import { session } from 'electron';

/** The frame element asks for this partition; main sets it so no guest can decline it. */
export const FRAMES_PARTITION = 'persist:studio-frames';

/** One instance per partition string, which is what makes an identity comparison the guest's session. */
export function framesSession(): Electron.Session {
  return session.fromPartition(FRAMES_PARTITION);
}

export function installFrameSessionPolicies(target: Electron.Session): void {
  target.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  target.setPermissionCheckHandler(() => false);
  target.setDevicePermissionHandler(() => false);
  target.setDisplayMediaRequestHandler((_request, callback) => callback({}));
  target.on('will-download', (event) => event.preventDefault());
}
