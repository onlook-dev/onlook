import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';

class MockNotification extends EventEmitter {
  static instances: MockNotification[] = [];
  readonly options: Record<string, unknown>;
  constructor(options: Record<string, unknown> = {}) {
    super();
    this.options = options;
    MockNotification.instances.push(this);
  }
  show(): void {}
  close(): void { this.emit('close'); }
}

// One registration (preload.ts) serves every suite, so the surface is the union of every `electron`
// member any module names at import time; a missing one fails in whichever suite loads it first.
export function mockMainProcessElectron(): Record<string, unknown> {
  const electron: Record<string, unknown> = {
    // `electron-mock.test.ts` asserts this sentinel by identity, so a foreign stub cannot pass.
    __studioSharedElectronMock: true,
    app: { getPath: (): string => join(tmpdir(), 'studio-unit-userdata') },
    BrowserWindow: { getAllWindows: (): unknown[] => [] },
    BaseWindow: { getAllWindows: (): unknown[] => [], getFocusedWindow: (): unknown => null },
    WebContentsView: class {
      constructor() {
        throw new Error('tests must not construct a real view — use a structural TabHost seam');
      }
    },
    screen: {
      getAllDisplays: (): never => {
        throw new Error('tests must not query real displays — inject display bounds');
      },
      getPrimaryDisplay: (): never => {
        throw new Error('tests must not query the real primary display — inject display bounds');
      },
      getDisplayMatching: (): never => {
        throw new Error('tests must not query real matching displays — inject display bounds');
      },
    },
    ipcMain: { handle: (): undefined => undefined, on: (): undefined => undefined },
    clipboard: { readText: (): never => { throw new Error('tests must not read the real clipboard'); } },
    Notification: MockNotification,
    webContents: { fromId: (): undefined => undefined, getAllWebContents: (): unknown[] => [] },
    // One object per partition, which is the contract an identity comparison against a
    // guest's session rests on (ONL-2568).
    session: (() => {
      const byPartition = new Map<string, unknown>();
      const make = (partition: string): unknown => ({
        partition,
        protocol: { handle: (): undefined => undefined },
        webRequest: { onBeforeRequest: (): undefined => undefined },
        setPermissionRequestHandler: (): undefined => undefined,
        setPermissionCheckHandler: (): undefined => undefined,
      });
      return {
        fromPartition: (partition: string): unknown => {
          if (!byPartition.has(partition)) byPartition.set(partition, make(partition));
          return byPartition.get(partition);
        },
        get defaultSession(): unknown {
          return make('');
        },
      };
    })(),
    utilityProcess: {
      fork: (): never => {
        throw new Error('tests must not fork a real utility process — inject fork through StarterRunnerDeps');
      },
    },
    dialog: {
      showOpenDialog: (): never => {
        throw new Error('tests must not open a real file picker');
      },
      showMessageBox: (): never => {
        throw new Error('tests must not stand a real modal — inject the confirm through the suite seam (RemoveFlowDeps)');
      },
    },
    shell: {
      openExternal: (): void => {
        throw new Error('tests must not reach the real browser — inject it through the suite seam (SignInDeps)');
      },
    },
    safeStorage: {
      isEncryptionAvailable: (): boolean => {
        throw new Error('tests must not reach the real Keychain — inject it through setSafeStorageForTesting');
      },
    },
  };
  // Modules under test mix default and named imports of electron.
  return { default: electron, ...electron };
}
