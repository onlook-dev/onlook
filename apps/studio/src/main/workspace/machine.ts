import { dialog } from 'electron';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { IPC_INVOKE, type MachineHelpId, type MachineInstallResult, type MachineSnapshot } from '@studio/events';
import { handle } from '../ipc/bridge.js';
import { installDeveloperTools, installToolsDeps } from './machine-install.js';
import { machineHelpDeps, openMachineHelp } from './machine-help.js';
import { machineInstallRequestPinned } from '../diagnostics/gate.js';
import { flagOn } from '../flags/index.js';
import { checkHelperProcess } from '../starter/probe.js';
import { capture } from '../telemetry/index.js';
import { readOnboardingState } from '../onboarding/state.js';
import { t } from '@studio/i18n';
import { machineFailureText } from '@studio/i18n/machine';
import { checkProjectsFolder, machineCheckDeps, runMachineChecks } from './machine-checks.js';
import { workspaceRoot, projectsFolderMayChange, resetWorkspaceCache } from './store.js';
import { chooseProjectsFolder } from './root.js';
import { isMac, isWindows } from '../env/platform.js';
import { devSwitches } from '../env/dev-switches.js';

let checking: Promise<MachineSnapshot> | undefined;
let installing: Promise<MachineInstallResult> | undefined;

function canChooseFolder(): boolean {
  return !devSwitches.workspaceRoot && !readOnboardingState().hasOnboarded && projectsFolderMayChange();
}

function checkMachine(): Promise<MachineSnapshot> {
  checking ??= (async () => ({
    checks: await runMachineChecks(machineCheckDeps(workspaceRoot(), () => checkHelperProcess(), (check_id) => capture('machine_check_failed', { check_id }))),
    platform: isMac() ? 'mac' as const : isWindows() ? 'windows' as const : 'linux' as const,
    canChooseFolder: canChooseFolder(),
  }))().finally(() => { checking = undefined; });
  return checking;
}

/** What a failed create may ask the machine, absent with `machine-check` off: off, the failure takes main's path with no diagnosis in it (ONL-3111). */
export function creationDiagnosis(): { diagnoseFailure?: () => Promise<string | undefined> } {
  return flagOn('machine-check') ? { diagnoseFailure: () => creationMachineDetail() } : {};
}

// A failure the person is already waiting on: a check that hangs holds the report back, so the diagnosis has its own bound (ONL-3111).
const CREATION_DIAGNOSIS_MS = 10_000;

export async function creationMachineDetail(check: () => Promise<MachineSnapshot> = checkMachine): Promise<string | undefined> {
  if (!flagOn('machine-check')) return undefined;
  let timer: NodeJS.Timeout | undefined;
  try {
    const snapshot = await Promise.race([
      check(),
      new Promise<undefined>((resolve) => { timer = setTimeout(() => { resolve(undefined); }, CREATION_DIAGNOSIS_MS); }),
    ]);
    if (snapshot === undefined) return undefined;
    const failures = snapshot.checks.flatMap((check) => check.status === 'failed' ? [machineFailureText(check.cause, snapshot.platform)] : []);
    return failures.length === 0 ? undefined : failures.join('\n\n');
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function emptyFolder(folder: string): Promise<boolean> {
  try { return (await readdir(folder)).length === 0; }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'ENOENT'; }
}

function installTools(): Promise<MachineInstallResult> {
  if (!isMac()) return Promise.resolve('unsupported');
  const deps = installToolsDeps();
  // A walk must not open Apple's installer on the machine it films on; the watching below it stays real.
  const watched = machineInstallRequestPinned() ? { ...deps, request: async () => true } : deps;
  const started = Date.now();
  installing ??= installDeveloperTools(watched)
    .then((outcome) => {
      capture('machine_install_tools', { outcome, elapsed_ms: Date.now() - started });
      return outcome;
    })
    .finally(() => { installing = undefined; });
  return installing;
}

export function registerMachineHandlers(): void {
  handle(IPC_INVOKE.machineCheck, () => checkMachine());
  // One watcher: a second press would ask macOS again and leave two half-hour polls behind it.
  handle(IPC_INVOKE.machineInstallTools, () => installTools());
  handle(IPC_INVOKE.machineOpenHelp, async (_event, help: MachineHelpId) => {
    const opened = await openMachineHelp(help, machineHelpDeps());
    capture('machine_help_opened', { help, opened });
    return opened;
  });
  handle(IPC_INVOKE.machineChooseFolder, async () => {
    if (!canChooseFolder()) return 'unavailable';
    const picked = await dialog.showOpenDialog({ title: t('machine.choose.title'), properties: ['openDirectory', 'createDirectory'] });
    if (picked.canceled || !picked.filePaths[0]) return 'canceled';
    const folder = join(picked.filePaths[0], 'Onlook Projects');
    if (!canChooseFolder() || !await emptyFolder(folder)) return 'unavailable';
    try {
      await checkProjectsFolder(folder);
      if (checking !== undefined) await checking;
      if (!canChooseFolder()) return 'unavailable';
      chooseProjectsFolder(folder);
      resetWorkspaceCache();
      return 'chosen';
    } catch {
      return 'unavailable';
    }
  });
}
