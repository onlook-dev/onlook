import { describe, expect, it } from 'bun:test';
import { installFrameSessionPolicies } from './partition.js';

describe('frame capability security', () => {
  it('security denies frame permission requests, checks, devices, capture and downloads', () => {
    let request!: Parameters<Electron.Session['setPermissionRequestHandler']>[0];
    let check!: Parameters<Electron.Session['setPermissionCheckHandler']>[0];
    let device!: Parameters<Electron.Session['setDevicePermissionHandler']>[0];
    let capture!: Parameters<Electron.Session['setDisplayMediaRequestHandler']>[0];
    let download: ((event: { preventDefault(): void }) => void) | undefined;
    installFrameSessionPolicies({
      setPermissionRequestHandler: (handler: typeof request) => { request = handler; },
      setPermissionCheckHandler: (handler: typeof check) => { check = handler; },
      setDevicePermissionHandler: (handler: typeof device) => { device = handler; },
      setDisplayMediaRequestHandler: (handler: typeof capture) => { capture = handler; },
      on: (_event: string, handler: typeof download) => { download = handler; },
    } as unknown as Electron.Session);
    expect(request).toBeFunction();
    expect(check).toBeFunction();
    expect(device).toBeFunction();
    expect(capture).toBeFunction();
    if (!request || !check || !device || !capture) throw new Error('Frame policies were not installed');
    for (const permission of ['media', 'geolocation', 'notifications', 'clipboard-read', 'pointerLock', 'unknown'] as const) {
      let granted: boolean | undefined;
      request(null as unknown as Electron.WebContents, permission, (answer) => { granted = answer; }, {} as Electron.PermissionRequest);
      expect(granted).toBe(false);
      expect(check(null, permission as Parameters<NonNullable<typeof check>>[1], 'https://example.test', {} as Electron.PermissionCheckHandlerHandlerDetails)).toBe(false);
    }
    expect(device({} as Electron.DevicePermissionHandlerHandlerDetails)).toBe(false);
    let streams: unknown;
    capture({} as Electron.DisplayMediaRequestHandlerHandlerRequest, (answer) => { streams = answer; });
    expect(streams).toEqual({});
    let prevented = false;
    download?.({ preventDefault: () => { prevented = true; } });
    expect(prevented).toBe(true);
  });
});
