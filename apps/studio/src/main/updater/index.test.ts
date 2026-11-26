import { expect, it } from 'bun:test';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

const entrypoint = fileURLToPath(new URL('./index.ts', import.meta.url));

for (const windows of [true, false]) {
  it(`installs the Windows signature verifier before update checks on ${windows ? 'Windows' : 'other platforms'}`, async () => {
    const original = async () => 'original';
    const verifier = async () => null;
    const updater = { verifyUpdateCodeSignature: original };
    let verifierCreations = 0;
    const callbacks: unknown[] = [];
    const session = { check: async () => { callbacks.push(updater.verifyUpdateCodeSignature); } };
    const module: { exports: { initAutoUpdater?: () => void; checkForUpdatesNow?: () => Promise<void> } } = { exports: {} };
    const modules: Record<string, unknown> = {
      'node:module': {},
      'node:fs': { readFileSync: () => 'provider: generic\nurl: https://updates.example.test\n' },
      'node:path': { join: (...parts: string[]) => parts.join('/') },
      electron: { app: { isPackaged: true, getVersion: () => '1.0.0', on() {} } },
      '../ipc/bridge.js': {},
      '@studio/events': {},
      '../tabs/broadcast.js': {},
      './check.js': {},
      './session.js': { createUpdateSession: () => session },
      './proof.js': { installUpdateProof: () => undefined },
      './machine.js': { UpdateMachine: class { startPeriodicChecks() {} current() { return {}; } } },
      '../log/index.js': { log: () => ({ info() {}, warn() {} }) },
      '../cloud/capabilities.js': { capabilities: () => ({ updates: true }) },
      '../env/platform.js': { isMac: () => false, isWindows: () => windows },
      '../env/dev-switches.js': { devSwitches: {} },
      '../telemetry/index.js': {},
      './recovery.js': { createUpdateRecovery: () => ({}) },
      './signature.js': { createWindowsSignatureVerifier: () => { verifierCreations++; return verifier; } },
    };
    const built = await Bun.build({
      entrypoints: [entrypoint], target: 'node', format: 'cjs',
      plugins: [{ name: 'updater-fixture', setup(build) {
        build.onResolve({ filter: /.*/ }, (args) => {
          if (args.path === entrypoint) return;
          return args.path === 'electron-updater'
            ? { path: 'updater', namespace: 'fixture' }
            : { path: args.path, external: true };
        });
        build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const autoUpdater = globalThis.updater;', loader: 'js' }));
      } }],
    });
    expect(built.success).toBe(true);
    runInNewContext(await built.outputs[0]!.text(), {
      module, exports: module.exports, updater,
      process: { resourcesPath: '/resources' },
      require: (name: string) => {
        if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`);
        return modules[name];
      },
    });
    module.exports.initAutoUpdater!();
    await module.exports.checkForUpdatesNow!();
    expect(callbacks).toEqual([windows ? verifier : original, windows ? verifier : original]);
    expect(verifierCreations).toBe(windows ? 1 : 0);
  });
}
