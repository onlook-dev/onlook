export type TaskGroup = 'tabs' | 'frames' | 'agent' | 'dev_servers' | 'studio';

export const TASK_GROUPS: readonly TaskGroup[] = ['tabs', 'frames', 'agent', 'dev_servers', 'studio'];

export type StudioPart = 'main' | 'gpu' | 'band' | 'utility' | 'spare_tab' | 'task_manager' | 'other';

/** What a row is, in Studio's nouns; the renderer words it. `tabId` is the Tab a click brings forward. */
export type TaskSubject =
  | { kind: 'tab'; tabId: string; name: string; purpose: 'projects' | 'project' }
  | { kind: 'frames'; tabId?: string; projectName?: string; addresses: string[]; frameCount: number; artifactCount: number; frames: TaskFrame[] }
  | { kind: 'harness'; harness: 'claude' | 'codex' }
  | { kind: 'dev_server'; tabId?: string; projectName?: string; port?: number }
  | { kind: 'studio'; part: StudioPart };

/** One Frame or Artifact on a Tab's Canvas; `page` is `host:port/path`, absent for an Artifact. */
export interface TaskFrame {
  pid: number;
  isArtifact: boolean;
  page?: string;
}

export interface TaskProcess {
  pid: number;
  /** A basename or Electron's own process name; never a command line. */
  name: string;
  cpuPct: number;
  memoryKb: number;
}

export interface TaskRow {
  id: string;
  group: TaskGroup;
  subject: TaskSubject;
  cpuPct: number;
  memoryKb: number;
  processes: TaskProcess[];
}

export interface TaskTotals {
  cpuPct: number;
  memoryKb: number;
  /** Electron's own processes: main, GPU, utilities and every renderer. */
  studioKb: number;
  /** Programs Studio started or found serving a Project: agents and dev servers. */
  childKb: number;
}

export interface TaskManagerSnapshot {
  totals: TaskTotals;
  rows: TaskRow[];
  /** The first reading has no earlier one to measure CPU against. */
  isCpuPending?: true;
  /** No process list on this platform: only Electron's own processes are counted. */
  isElectronOnly?: true;
}

/** What the person did in the window, counted for the close event. */
export type TaskManagerAction = 'expand' | 'sort';

export const TASK_MANAGER_HEADER_HEIGHT = 52;

/** Electron's `trafficLightPosition` for the window, inside the header. */
export const TASK_MANAGER_TRAFFIC_LIGHTS = { x: 16, y: 20 } as const;
