import { execFile } from 'node:child_process';
import { totalmem } from 'node:os';
import { performance } from 'node:perf_hooks';
import electron from 'electron';
import { GONE_REASONS, type GoneReason, type ProcessClass } from '@studio/events';
import { log } from '../log/index.js';
import { isTaskManagerSender } from '../ipc/roles.js';
import { STARTER_SERVICE_PREFIX } from '../starter/runner.js';
import { tabHost } from '../tabs/host.js';
import { capture, currentTelemetryConfig, perfWindowOverride } from '../telemetry/index.js';
import {
  classifyDescendants,
  classifyElectron,
  parsePs,
  ramBucket,
  summarizeResources,
  thermalState,
  type Classified,
  type ElectronProcess,
  type PsRow,
  type ViewProcess,
} from './resources.js';
import { hostPlatform, isMac, isWindows } from '../env/platform.js';
import { recordProcessExit } from '../errors/index.js';

const WINDOW_MS = 5 * 60_000;
const FIRST_SAMPLE_MS = 60_000;
const PS_LIMIT_MS = 5_000;
const BOOT_PS_LIMIT_MS = 15_000;

const logger = log('perf');

function viewProcesses(): ViewProcess[] {
  const host = tabHost();
  const views: ViewProcess[] = [];
  for (const contents of electron.webContents.getAllWebContents()) {
    if (contents.isDestroyed() || isTaskManagerSender(contents)) continue;
    const pid = contents.getOSProcessId();
    if (contents.getType() === 'webview') {
      const hostPid = contents.hostWebContents?.getOSProcessId();
      views.push({ pid, kind: 'frame', ...(hostPid === undefined ? {} : { hostPid }) });
    } else {
      views.push({ pid, kind: host?.isBandContents(contents.id) === true ? 'band' : 'tab' });
    }
  }
  return views;
}

export function electronProcesses(): ElectronProcess[] {
  return electron.app.getAppMetrics().map((metric) => ({
    pid: metric.pid,
    type: metric.type,
    ...(metric.serviceName === undefined ? {} : { serviceName: metric.serviceName }),
    ...(metric.name === undefined ? {} : { name: metric.name }),
    residentKb: metric.memory.workingSetSize,
    cpuSeconds: metric.cpu.cumulativeCPUUsage ?? 0,
  }));
}

/** Columns only: no command line is asked for, so none can leak; Windows has no `ps` and reports Electron's processes alone. */
export function readPs(execute = execFile, platform: NodeJS.Platform = hostPlatform(), timeout = PS_LIMIT_MS): Promise<PsRow[]> {
  if (isWindows(platform)) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const child = execute('/bin/ps', ['-Ao', 'pid=,ppid=,rss=,time=,comm='], { timeout, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error !== null) reject(Object.assign(error, { stderr }));
      else resolve(parsePs(stdout).filter((row) => row.pid !== child.pid));
    });
  });
}

function displayHz(): number {
  const window = tabHost()?.window;
  const display = window === undefined ? electron.screen.getPrimaryDisplay() : electron.screen.getDisplayMatching(window.getBounds());
  return display.displayFrequency;
}

function onBattery(): boolean {
  try {
    return electron.powerMonitor.isOnBatteryPower();
  } catch {
    return false;
  }
}

function thermal(): string | undefined {
  try {
    return isMac() ? electron.powerMonitor.getCurrentThermalState() : undefined;
  } catch {
    return undefined;
  }
}

export async function readResourceProcesses(readers = { readPs, viewProcesses, electronProcesses }): Promise<{ processes: Classified[]; views: ViewProcess[]; syncMs: number }> {
  let stage = 'process-list';
  try {
    const rows = await readers.readPs();
    const began = performance.now();
    stage = 'views';
    const views = readers.viewProcesses();
    stage = 'electron-metrics';
    const metrics = readers.electronProcesses();
    stage = 'classify';
    const electronPids = new Set(metrics.map((metric) => metric.pid));
    const starterPids = new Set(
      metrics
        .filter((metric) => [metric.serviceName, metric.name].some((label) => label?.startsWith(STARTER_SERVICE_PREFIX) === true))
        .map((metric) => metric.pid),
    );
    const processes = [...classifyElectron(metrics, views), ...classifyDescendants(rows, process.pid, electronPids, starterPids)];
    return { processes, views, syncMs: performance.now() - began };
  } catch (cause) {
    throw new ResourceSampleError(stage, cause);
  }
}

let samplingStarted = false;

class ResourceSampleError extends Error {
  constructor(readonly stage: string, cause: unknown) {
    super('resource sample failed', { cause });
  }
}

export function reportResourceSampleFailure(error: unknown): void {
  const cause = error instanceof ResourceSampleError ? error.cause : error;
  const fields = cause !== null && typeof cause === 'object' ? cause as Record<string, unknown> : {};
  logger.warn('resource sample failed', {
    stage: error instanceof ResourceSampleError ? error.stage : 'summary',
    error_class: cause instanceof Error ? cause.name : 'unknown',
    reason: cause instanceof Error ? cause.message : 'non-error rejection',
    ...(typeof fields['code'] === 'string' || typeof fields['code'] === 'number' ? { code: fields['code'] } : {}),
    ...(typeof fields['signal'] === 'string' || fields['signal'] === null ? { signal: fields['signal'] } : {}),
    ...(typeof fields['killed'] === 'boolean' ? { killed: fields['killed'] } : {}),
    ...(typeof fields['stderr'] === 'string' ? { stderr: fields['stderr'] } : {}),
  });
}

/** Telemetry on only: off, nothing is sampled. */
export function startResourceSampling(readers?: Parameters<typeof readResourceProcesses>[0]): void {
  if (samplingStarted || !currentTelemetryConfig().enabled) return;
  samplingStarted = true;
  const windowMs = perfWindowOverride() ?? WINDOW_MS;
  let cpuAtOpen = new Map<number, number>();
  let openedAt = performance.now();
  let baselineReady = false;

  const sample = async (): Promise<void> => {
    const { processes, views, syncMs } = await readResourceProcesses(readers);
    const began = performance.now();
    if (!baselineReady) {
      cpuAtOpen = new Map(processes.map((process) => [process.pid, process.cpuSeconds]));
      openedAt = began;
      baselineReady = true;
      return;
    }
    const host = tabHost();
    const summary = summarizeResources(processes, views, cpuAtOpen, {
      windowMs: began - openedAt,
      openTabs: host?.openTabCount ?? 0,
      webviews: views.filter((view) => view.kind === 'frame').length,
      uptimeMin: process.uptime() / 60,
      onBattery: onBattery(),
      thermalState: thermalState(thermal()),
      displayHz: displayHz(),
      ramBucket: ramBucket(totalmem()),
      instrumentMs: 0,
    });
    summary.instrument_ms = Math.round(syncMs + (performance.now() - began));
    capture('app_resources_sampled', summary);
    cpuAtOpen = new Map(processes.map((process) => [process.pid, process.cpuSeconds]));
    openedAt = began;
  };

  const run = (): void => {
    sample().catch(reportResourceSampleFailure);
  };

  void readResourceProcesses(readers ?? { readPs: () => readPs(execFile, hostPlatform(), BOOT_PS_LIMIT_MS), viewProcesses, electronProcesses }).then(({ processes }) => {
    cpuAtOpen = new Map(processes.map((process) => [process.pid, process.cpuSeconds]));
    openedAt = performance.now();
    baselineReady = true;
  }).catch(reportResourceSampleFailure);
  setTimeout(() => {
    run();
    setInterval(run, windowMs).unref();
  }, Math.min(FIRST_SAMPLE_MS, windowMs)).unref();
  installGoneCounting();
}

function goneReason(reason: string): GoneReason | undefined {
  return (GONE_REASONS as readonly string[]).includes(reason) ? (reason as GoneReason) : undefined;
}

function installGoneCounting(): void {
  electron.app.on('render-process-gone', (_event, contents, details) => {
    const reason = goneReason(details.reason);
    if (reason === undefined) return;
    const processClass: ProcessClass =
      contents.getType() === 'webview' ? 'frame' : tabHost()?.isBandContents(contents.id) === true ? 'band' : 'tab';
    recordProcessExit({ process_class: processClass, reason, exit_code: details.exitCode });
  });
  electron.app.on('child-process-gone', (_event, details) => {
    const reason = goneReason(details.reason);
    if (reason === undefined) return;
    const starter = details.serviceName?.startsWith(STARTER_SERVICE_PREFIX) === true;
    // Main stops the starter's process itself when a project closes.
    if (starter && reason === 'killed') return;
    const processClass: ProcessClass =
      details.type === 'GPU' ? 'gpu' : starter ? 'dev_server' : details.type === 'Utility' ? 'utility' : 'other';
    recordProcessExit({ process_class: processClass, reason, exit_code: details.exitCode });
  });
}
