import type { AppResourcesSample, ProcessClass, RamBucket, ThermalState } from '@studio/events';
import { PROCESS_CLASSES, THERMAL_STATES } from '@studio/events';
import { harnessRunning } from '../agent-host/harness.js';
import { STARTER_SERVICE_PREFIX } from '../starter/runner.js';

export interface ElectronProcess {
  pid: number;
  type: string;
  serviceName?: string;
  name?: string;
  residentKb: number;
  cpuSeconds: number;
}

export interface ViewProcess {
  pid: number;
  kind: 'band' | 'tab' | 'frame';
  hostPid?: number;
}

/** `exe` is a basename, read only to label the row; no command line is read. */
export interface PsRow {
  pid: number;
  ppid: number;
  residentKb: number;
  cpuSeconds: number;
  exe: string;
}

export interface Classified {
  pid: number;
  processClass: ProcessClass;
  residentKb: number;
  cpuSeconds: number;
}

const SHELLS = new Set(['sh', 'bash', 'zsh', 'fish', 'dash', 'ksh', 'tcsh', 'csh', 'nu', 'pwsh']);

/** `[dd-][hh:]mm:ss[.cc]`, as `ps -o time=` prints it on macOS and Linux. */
export function parsePsTime(text: string): number {
  const [daysPart, clock] = text.includes('-') ? text.split('-', 2) : ['0', text];
  const parts = (clock ?? '').split(':').map(Number);
  let seconds = 0;
  for (const part of parts) seconds = seconds * 60 + (Number.isFinite(part) ? part : 0);
  return Number(daysPart) * 86_400 + seconds;
}

export function parsePs(output: string): PsRow[] {
  const rows: PsRow[] = [];
  for (const line of output.split('\n')) {
    const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.+?)\s*$/.exec(line);
    if (match === null) continue;
    const exe = match[5]!.split('/').pop() ?? '';
    rows.push({
      pid: Number(match[1]),
      ppid: Number(match[2]),
      residentKb: Number(match[3]),
      cpuSeconds: parsePsTime(match[4]!),
      exe: exe.replace(/\.exe$/, ''),
    });
  }
  return rows;
}

function isStarter(process: Pick<ElectronProcess, 'serviceName' | 'name'>): boolean {
  return [process.serviceName, process.name].some((label) => label?.startsWith(STARTER_SERVICE_PREFIX) === true);
}

export function classifyElectron(processes: readonly ElectronProcess[], views: readonly ViewProcess[]): Classified[] {
  const viewKind = new Map<number, ViewProcess['kind']>();
  for (const view of views) {
    const held = viewKind.get(view.pid);
    if (held === undefined || view.kind === 'tab') viewKind.set(view.pid, view.kind);
  }
  return processes.map((process) => {
    let processClass: ProcessClass;
    if (process.type === 'Browser') processClass = 'browser';
    else if (process.type === 'GPU') processClass = 'gpu';
    else if (process.type === 'Tab') processClass = viewKind.get(process.pid) ?? 'other';
    else if (process.type === 'Utility') processClass = isStarter(process) ? 'dev_server' : 'utility';
    else processClass = 'other';
    return { pid: process.pid, processClass, residentKb: process.residentKb, cpuSeconds: process.cpuSeconds };
  });
}

/** Every descendant of main that is not one of Electron's own processes, labelled by the nearest ancestor that says what it is. */
export function classifyDescendants(
  rows: readonly PsRow[],
  mainPid: number,
  electronPids: ReadonlySet<number>,
  starterPids: ReadonlySet<number>,
): Classified[] {
  const byPid = new Map(rows.map((row) => [row.pid, row]));
  const labelOf = (row: PsRow): ProcessClass | undefined => {
    if (starterPids.has(row.pid)) return 'dev_server';
    const harness = harnessRunning(row.exe);
    if (harness !== undefined) return harness.processClass;
    if (row.ppid === mainPid && SHELLS.has(row.exe)) return 'terminal';
    return undefined;
  };
  const classified: Classified[] = [];
  for (const row of rows) {
    if (row.pid === mainPid || electronPids.has(row.pid)) continue;
    let processClass: ProcessClass | undefined;
    let cursor: PsRow | undefined = row;
    let isDescendant = false;
    for (let depth = 0; cursor !== undefined && depth < 64; depth += 1) {
      processClass ??= labelOf(cursor);
      if (cursor.ppid === mainPid) {
        isDescendant = true;
        break;
      }
      cursor = byPid.get(cursor.ppid);
    }
    if (!isDescendant) continue;
    classified.push({ pid: row.pid, processClass: processClass ?? 'other', residentKb: row.residentKb, cpuSeconds: row.cpuSeconds });
  }
  return classified;
}

export function ramBucket(totalBytes: number): RamBucket {
  const gb = totalBytes / 1024 ** 3;
  if (gb <= 8.5) return 'lte_8';
  if (gb <= 16.5) return 'lte_16';
  if (gb <= 32.5) return 'lte_32';
  if (gb <= 64.5) return 'lte_64';
  return 'gt_64';
}

export function thermalState(value: string | undefined): ThermalState {
  return (THERMAL_STATES as readonly (string | undefined)[]).includes(value) ? (value as ThermalState) : 'unknown';
}

export interface SampleContext {
  windowMs: number;
  openTabs: number;
  webviews: number;
  uptimeMin: number;
  onBattery: boolean;
  thermalState: ThermalState;
  displayHz: number;
  ramBucket: RamBucket;
  instrumentMs: number;
}

/** `previousCpu` holds each pid's cumulative CPU seconds at the window's start; a pid absent from it was born inside the window. */
export function summarizeResources(
  processes: readonly Classified[],
  views: readonly ViewProcess[],
  previousCpu: ReadonlyMap<number, number>,
  context: SampleContext,
): AppResourcesSample {
  const seconds = Math.max(1, context.windowMs / 1000);
  const cpuPct = (process: Classified): number =>
    (Math.max(0, process.cpuSeconds - (previousCpu.get(process.pid) ?? 0)) / seconds) * 100;
  const mb = (kb: number): number => Math.round(kb / 1024);
  const perClass = {} as Record<`${ProcessClass}_${'count' | 'mb' | 'cpu_pct'}`, number>;
  for (const processClass of PROCESS_CLASSES) {
    const members = processes.filter((process) => process.processClass === processClass);
    perClass[`${processClass}_count`] = members.length;
    perClass[`${processClass}_mb`] = mb(members.reduce((total, process) => total + process.residentKb, 0));
    perClass[`${processClass}_cpu_pct`] = Math.round(members.reduce((total, process) => total + cpuPct(process), 0));
  }
  const residentByPid = new Map(processes.map((process) => [process.pid, process.residentKb]));
  const tabKb = views
    .filter((view) => view.kind === 'tab')
    .map((tab) => {
      const framePids = new Set(views.filter((view) => view.kind === 'frame' && view.hostPid === tab.pid && view.pid !== tab.pid).map((view) => view.pid));
      return [tab.pid, ...framePids].reduce((total, pid) => total + (residentByPid.get(pid) ?? 0), 0);
    })
    .sort((a, b) => a - b);
  const median = tabKb.length === 0 ? 0 : tabKb[Math.floor((tabKb.length - 1) / 2)]!;
  return {
    ...perClass,
    memory_measure: 'resident',
    total_mb: mb(processes.reduce((total, process) => total + process.residentKb, 0)),
    total_cpu_pct: Math.round(processes.reduce((total, process) => total + cpuPct(process), 0)),
    tab_mb_max: mb(tabKb.at(-1) ?? 0),
    tab_mb_median: mb(median),
    open_tabs: context.openTabs,
    webviews: context.webviews,
    uptime_min: Math.round(context.uptimeMin),
    on_battery: context.onBattery,
    thermal_state: context.thermalState,
    display_hz: Math.round(context.displayHz),
    ram_gb_bucket: context.ramBucket,
    window_ms: Math.round(context.windowMs),
    instrument_ms: Math.round(context.instrumentMs),
  };
}
