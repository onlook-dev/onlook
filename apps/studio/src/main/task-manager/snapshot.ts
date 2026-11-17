import type { StudioPart, TaskFrame, TaskGroup, TaskManagerSnapshot, TaskProcess, TaskRow, TaskSubject } from '@studio/events';
import type { ElectronProcess, PsRow } from '../perf/resources.js';

type ViewRole = 'band' | 'tab' | 'spare' | 'task_manager' | 'frame' | 'other';

export interface ViewIdentity {
  pid: number;
  role: ViewRole;
  /** The Tab a `tab` view is, or the Tab a `frame` view sits in. */
  tabId?: string;
  isArtifact?: boolean;
  /** `host:port`, for a Frame showing an http page. */
  address?: string;
  /** `host:port/path` of that page. */
  page?: string;
}

export interface TabIdentity {
  tabId: string;
  name: string;
  purpose: 'projects' | 'project';
  workspacePath?: string;
}

/** A process known to serve a Project: a listener on one of its booked ports, or its starter. */
export interface ServerProcess {
  pid: number;
  workspacePath: string;
  port?: number;
}

export interface SnapshotInputs {
  now: number;
  mainPid: number;
  ps: readonly PsRow[];
  /** `false` where the platform has no process list; then only Electron's processes count. */
  hasProcessList: boolean;
  electron: readonly ElectronProcess[];
  views: readonly ViewIdentity[];
  tabs: readonly TabIdentity[];
  servers: readonly ServerProcess[];
}

/** The previous reading's CPU seconds per pid, and when it was taken. */
export interface CpuBaseline {
  at: number;
  cpuSeconds: ReadonlyMap<number, number>;
}

const ELECTRON_NAMES: Record<string, string> = { Browser: 'Main', GPU: 'GPU', Tab: 'Renderer', Utility: 'Utility' };

interface Placed {
  key: string;
  group: TaskGroup;
  subject: TaskSubject;
}

function studio(part: StudioPart): Placed {
  return { key: `studio:${part}`, group: 'studio', subject: { kind: 'studio', part } };
}

export function buildSnapshot(inputs: SnapshotInputs, baseline: CpuBaseline | undefined): { snapshot: TaskManagerSnapshot; baseline: CpuBaseline } {
  const elapsedSeconds = baseline === undefined ? 0 : Math.max(0.001, (inputs.now - baseline.at) / 1000);
  const cpuPct = (pid: number, cpuSeconds: number): number => {
    if (baseline === undefined) return 0;
    return (Math.max(0, cpuSeconds - (baseline.cpuSeconds.get(pid) ?? 0)) / elapsedSeconds) * 100;
  };

  const tabs = new Map(inputs.tabs.map((tab) => [tab.tabId, tab]));
  const tabByWorkspace = new Map<string, TabIdentity>();
  for (const tab of inputs.tabs) if (tab.workspacePath !== undefined && !tabByWorkspace.has(tab.workspacePath)) tabByWorkspace.set(tab.workspacePath, tab);
  const projectOf = (workspacePath: string | undefined): { tabId?: string; projectName?: string } => {
    const tab = workspacePath === undefined ? undefined : tabByWorkspace.get(workspacePath);
    return tab === undefined ? {} : { tabId: tab.tabId, projectName: tab.name };
  };

  const viewsByPid = new Map<number, ViewIdentity[]>();
  for (const view of inputs.views) viewsByPid.set(view.pid, [...(viewsByPid.get(view.pid) ?? []), view]);
  const serverByPid = new Map(inputs.servers.map((server) => [server.pid, server]));

  const rows = new Map<string, TaskRow>();
  const frameFacts = new Map<string, { addresses: Set<string>; frames: number; artifacts: number; list: TaskFrame[] }>();
  const add = (placed: Placed, process: TaskProcess): void => {
    const row = rows.get(placed.key) ?? { id: placed.key, group: placed.group, subject: placed.subject, cpuPct: 0, memoryKb: 0, processes: [] };
    row.cpuPct += process.cpuPct;
    row.memoryKb += process.memoryKb;
    row.processes.push(process);
    rows.set(placed.key, row);
  };

  const serverPlace = (server: ServerProcess): Placed => {
    const project = projectOf(server.workspacePath);
    return {
      key: `dev:${server.workspacePath}:${server.port ?? ''}`,
      group: 'dev_servers',
      subject: { kind: 'dev_server', ...project, ...(server.port === undefined ? {} : { port: server.port }) },
    };
  };

  const viewPlace = (pid: number): Placed => {
    const views = viewsByPid.get(pid) ?? [];
    const tabView = views.find((view) => view.role === 'tab' && view.tabId !== undefined && tabs.has(view.tabId));
    if (tabView !== undefined) {
      const tab = tabs.get(tabView.tabId!)!;
      return { key: `tab:${tab.tabId}`, group: 'tabs', subject: { kind: 'tab', tabId: tab.tabId, name: tab.name, purpose: tab.purpose } };
    }
    const frames = views.filter((view) => view.role === 'frame');
    if (frames.length > 0) {
      const tabIds = new Set(frames.map((view) => view.tabId).filter((id): id is string => id !== undefined && tabs.has(id)));
      const tabId = tabIds.size === 1 ? [...tabIds][0] : undefined;
      const key = `frames:${tabId ?? ''}`;
      const facts = frameFacts.get(key) ?? { addresses: new Set<string>(), frames: 0, artifacts: 0, list: [] };
      for (const frame of frames) {
        if (frame.isArtifact === true) facts.artifacts += 1;
        else facts.frames += 1;
        if (frame.address !== undefined) facts.addresses.add(frame.address);
        facts.list.push({ pid: frame.pid, isArtifact: frame.isArtifact === true, ...(frame.page === undefined ? {} : { page: frame.page }) });
      }
      frameFacts.set(key, facts);
      const tab = tabId === undefined ? undefined : tabs.get(tabId);
      return {
        key,
        group: 'frames',
        subject: { kind: 'frames', ...(tab === undefined ? {} : { tabId: tab.tabId, projectName: tab.name }), addresses: [], frameCount: 0, artifactCount: 0, frames: [] },
      };
    }
    const role = views[0]?.role;
    if (role === 'band') return studio('band');
    if (role === 'spare') return studio('spare_tab');
    if (role === 'task_manager') return studio('task_manager');
    return studio('other');
  };

  const electronPids = new Set<number>();
  for (const metric of inputs.electron) {
    electronPids.add(metric.pid);
    const server = serverByPid.get(metric.pid);
    const placed = metric.type === 'Browser' ? studio('main')
      : metric.type === 'GPU' ? studio('gpu')
      : metric.type === 'Tab' ? viewPlace(metric.pid)
      : server !== undefined ? serverPlace(server)
      : metric.type === 'Utility' ? studio('utility')
      : studio('other');
    add(placed, {
      pid: metric.pid,
      name: metric.name ?? ELECTRON_NAMES[metric.type] ?? metric.type,
      cpuPct: cpuPct(metric.pid, metric.cpuSeconds),
      memoryKb: metric.residentKb,
    });
  }

  const byPid = new Map(inputs.ps.map((row) => [row.pid, row]));
  const knownProcess = (row: PsRow): Placed | undefined => {
    const server = serverByPid.get(row.pid);
    return server === undefined ? undefined : serverPlace(server);
  };
  const harness = (row: PsRow): Placed | undefined => {
    if (row.exe === 'claude') return { key: 'harness:claude', group: 'agent', subject: { kind: 'harness', harness: 'claude' } };
    if (row.exe === 'codex') return { key: 'harness:codex', group: 'agent', subject: { kind: 'harness', harness: 'codex' } };
    return undefined;
  };

  for (const row of inputs.hasProcessList ? inputs.ps : []) {
    if (row.pid === inputs.mainPid || electronPids.has(row.pid)) continue;
    let placed: Placed | undefined;
    let ranUnder: Placed | undefined;
    let isOurs = false;
    let cursor: PsRow | undefined = row;
    for (let depth = 0; cursor !== undefined && depth < 64; depth += 1) {
      const known = knownProcess(cursor);
      if (known !== undefined) {
        placed = known;
        isOurs = true;
        break;
      }
      ranUnder ??= harness(cursor);
      if (cursor.ppid === inputs.mainPid) {
        isOurs = true;
        break;
      }
      cursor = byPid.get(cursor.ppid);
    }
    if (!isOurs) continue;
    add(placed ?? ranUnder ?? studio('other'), { pid: row.pid, name: row.exe, cpuPct: cpuPct(row.pid, row.cpuSeconds), memoryKb: row.residentKb });
  }

  for (const [key, facts] of frameFacts) {
    const row = rows.get(key);
    if (row?.subject.kind !== 'frames') continue;
    const frames = [...facts.list].sort((a, b) => Number(a.isArtifact) - Number(b.isArtifact) || (a.page ?? '').localeCompare(b.page ?? ''));
    row.subject = { ...row.subject, addresses: [...facts.addresses].sort(), frameCount: facts.frames, artifactCount: facts.artifacts, frames };
  }

  const ordered = [...rows.values()];
  for (const row of ordered) row.processes.sort((a, b) => b.cpuPct - a.cpuPct || b.memoryKb - a.memoryKb);
  const sum = (pick: (row: TaskRow) => number, filter: (row: TaskRow) => boolean = () => true): number =>
    ordered.filter(filter).reduce((total, row) => total + pick(row), 0);
  const studioKb = ordered.reduce((total, row) => total + row.processes.filter((process) => electronPids.has(process.pid)).reduce((kb, process) => kb + process.memoryKb, 0), 0);
  const memoryKb = sum((row) => row.memoryKb);

  return {
    snapshot: {
      totals: {
        cpuPct: sum((row) => row.cpuPct),
        memoryKb,
        studioKb,
        childKb: memoryKb - studioKb,
      },
      rows: ordered,
      ...(baseline === undefined ? { isCpuPending: true as const } : {}),
      ...(inputs.hasProcessList ? {} : { isElectronOnly: true as const }),
    },
    baseline: {
      at: inputs.now,
      cpuSeconds: new Map([
        ...inputs.electron.map((metric): [number, number] => [metric.pid, metric.cpuSeconds]),
        ...inputs.ps.filter((row) => !electronPids.has(row.pid)).map((row): [number, number] => [row.pid, row.cpuSeconds]),
      ]),
    },
  };
}
