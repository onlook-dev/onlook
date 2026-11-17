import type { StudioEvent, ToolCallView, TranscriptItem } from './events.js';
import { isRecord } from './guards.js';
import { isSetupRepairAsk, repairAskFailure, type ProjectSetupFailure, type ProjectSetupResult, type ProjectSetupSnapshot } from './project-setup.js';
import { PROJECT_SETUP_TOOL_NAMES, SERVER_RUNNING_TOOL_NAME, STUDIO_TOOL_SERVER } from './studio-tools.js';

export const SETUP_STEP_IDS = ['find', 'install', 'start', 'canvas'] as const;
export type SetupStepId = (typeof SETUP_STEP_IDS)[number];
export type SetupStepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface SetupStep {
  id: SetupStepId;
  status: SetupStepStatus;
  /** The failure's own last line, shown verbatim under a failed step. */
  detail?: string;
}

export type SetupStepsOutcome = 'running' | 'done' | 'failed' | 'incomplete';

export interface SetupStepsView {
  steps: SetupStep[];
  outcome: SetupStepsOutcome;
  failedStep?: 1 | 2 | 3 | 4;
}

/** What the live turn may read beyond its own tool results: the setup machine and the server book as they stand. */
export interface SetupStepsLive {
  snapshot: ProjectSetupSnapshot | null;
  livePorts: readonly number[];
}

/** Absent, the last step follows the setup run alone. */
export interface SetupCanvas {
  liveFramePorts: readonly number[];
  /** The import still waits on its Frame, so the latest setup card waits with it after its turn ends. */
  latestWaits?: boolean;
}

/** A card reads the canvas while its turn runs, or as the latest while the import waits; any other follows its own run. */
export function setupCardCanvas(canvas: SetupCanvas | undefined, isLive: boolean, isLatest: boolean): SetupCanvas | undefined {
  return isLive || (isLatest && canvas?.latestWaits === true) ? canvas : undefined;
}

export function appShowsOnCanvas(ports: readonly number[], canvas: SetupCanvas | undefined): boolean {
  if (canvas === undefined) return true;
  if (ports.length === 0) return canvas.liveFramePorts.length > 0;
  return ports.some((port) => canvas.liveFramePorts.includes(port));
}

function reportedPort(call: ToolCallView): number[] {
  const port = isRecord(call.input) ? call.input['port'] : undefined;
  return typeof port === 'number' ? [port] : [];
}

/** `server_running`'s own words for a Frame on the canvas; the tool writes them, the checklist reads them. */
export const SERVER_RUNNING_PLACED = 'Onlook put the app on the canvas';
/** What builds before ONL-3169 wrote, still in transcripts on disk. */
export const LEGACY_SERVER_RUNNING_PLACED = 'Studio put the app on the canvas';
export const SERVER_RUNNING_ALREADY_SHOWN = 'The app is already on the canvas';

const PREFIX = `mcp__${STUDIO_TOOL_SERVER}__`;

/** Claude and codex both present Studio's tools under the MCP prefix (`appserver/presentation.ts`). */
export function studioToolName(call: ToolCallView): string {
  return call.name.startsWith(PREFIX) ? call.name.slice(PREFIX.length) : call.name;
}

const SETUP_MACHINE_TOOLS = new Set<string>([
  PROJECT_SETUP_TOOL_NAMES.read,
  PROJECT_SETUP_TOOL_NAMES.save,
  PROJECT_SETUP_TOOL_NAMES.run,
]);

export function isSetupMachineCall(call: ToolCallView): boolean {
  return SETUP_MACHINE_TOOLS.has(studioToolName(call));
}

function parsed(call: ToolCallView): unknown {
  const text = call.result ?? call.errorMessage;
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function isSnapshot(value: unknown): value is ProjectSetupSnapshot {
  return isRecord(value) && typeof value['state'] === 'string' && 'saved' in value;
}

function runResultOf(call: ToolCallView): ProjectSetupResult | undefined {
  const value = parsed(call);
  return isRecord(value) && typeof value['ok'] === 'boolean' && isSnapshot(value['snapshot']) ? (value as unknown as ProjectSetupResult) : undefined;
}

function placedFrame(call: ToolCallView): boolean {
  const text = call.result ?? '';
  return call.status === 'completed' && [SERVER_RUNNING_PLACED, LEGACY_SERVER_RUNNING_PLACED, SERVER_RUNNING_ALREADY_SHOWN].some((words) => text.includes(words));
}

export function setupFailureDetail(failure: ProjectSetupFailure): string {
  if (failure.stage === 'ready') return failure.reason;
  const lines = failure.outputTail.split('\n').map((line) => line.trim()).filter((line) => line !== '');
  return lines.at(-1) ?? failure.reason;
}

function failureStep(failure: ProjectSetupFailure): number {
  return failure.stage === 'prepare' || failure.stage === 'install' ? 1 : 2;
}

/**
 * The checklist for one setup turn, from its own top-level tool calls. Only a live turn reads `live`, and only
 * once its own `run_project_setup` has started, so a state left by an earlier run ticks nothing (ONL-2913).
 */
export function deriveSetupSteps(calls: readonly ToolCallView[], isLive: boolean, live?: SetupStepsLive, canvas?: SetupCanvas): SetupStepsView {
  let found = false;
  let runStarted = false;
  let lastRun: ProjectSetupResult | undefined;
  let placedPorts: number[] | undefined;
  for (const call of calls) {
    switch (studioToolName(call)) {
      case PROJECT_SETUP_TOOL_NAMES.read: {
        const value = parsed(call);
        if (isSnapshot(value) && value.saved !== null) found = true;
        break;
      }
      case PROJECT_SETUP_TOOL_NAMES.save: {
        const value = parsed(call);
        if (isRecord(value) && value['ok'] === true) found = true;
        break;
      }
      case PROJECT_SETUP_TOOL_NAMES.run:
        runStarted = true;
        lastRun = runResultOf(call) ?? lastRun;
        break;
      case SERVER_RUNNING_TOOL_NAME:
        if (placedFrame(call)) placedPorts = reportedPort(call);
        break;
    }
  }

  const source = isLive && runStarted && live?.snapshot ? live.snapshot : lastRun?.snapshot;
  let done = found ? 1 : 0;
  let failure: ProjectSetupFailure | undefined;
  switch (source?.state) {
    case 'preparing':
    case 'installing':
      done = Math.max(done, 1);
      break;
    case 'starting': {
      done = Math.max(done, 2);
      const ports = source.saved?.definition.servers.map((server) => server.port) ?? [];
      if (live !== undefined && ports.some((port) => live.livePorts.includes(port))) done = Math.max(done, 3);
      break;
    }
    case 'running':
      done = appShowsOnCanvas(source.saved?.definition.servers.map((server) => server.port) ?? [], canvas) ? 4 : Math.max(done, 3);
      break;
    case 'failed':
      if (source.failure !== null) {
        failure = source.failure;
        done = Math.max(done, failureStep(source.failure));
      }
      break;
    default:
      break;
  }
  if (placedPorts !== undefined) done = appShowsOnCanvas(placedPorts, canvas) ? 4 : Math.max(done, 3);
  if (done === 4) failure = undefined;

  const steps = SETUP_STEP_IDS.map((id, index): SetupStep => {
    if (index < done) return { id, status: 'done' };
    if (index === done && isLive) return { id, status: 'running' };
    if (index === done && failure !== undefined) return { id, status: 'failed', detail: setupFailureDetail(failure) };
    return { id, status: isLive ? 'pending' : 'skipped' };
  });
  if (done === 4) return { steps, outcome: 'done' };
  if (isLive) return { steps, outcome: 'running' };
  if (failure !== undefined) return { steps, outcome: 'failed', failedStep: (done + 1) as 1 | 2 | 3 | 4 };
  return { steps, outcome: 'incomplete' };
}

export interface SetupTurnCard {
  /** The Studio prompt that opened the turn: the card renders under its line. */
  promptId: string;
  /** Every top-level tool call in the turn, in order. */
  calls: ToolCallView[];
  /** The turn's `tools` items, whose setup-machine rows the card stands in for. */
  toolItemIds: string[];
  /** The turn is the transcript's last; a reader adds the session's streaming flag. */
  isLast: boolean;
}

/** A Studio prompt the chat shows, other than the resume nudge: the setup ask, the Start press, a repair. Each draws Studio's own line (ONL-2913); a hidden one, such as an inspiration Frame's opening, is no setup. */
export function isStudioSetupPrompt(item: TranscriptItem): item is Extract<TranscriptItem, { kind: 'user' }> {
  // The resume prompt is matched by its exact English text, so it never goes through the catalog or a translation (ONL-2665).
  return item.kind === 'user' && item.origin === 'studio' && item.hidden !== true && item.text !== 'continue';
}

export function opensTurn(item: TranscriptItem): boolean {
  return item.kind === 'user' && item.joinsTurn !== true;
}

/** The repair ask carries no checklist: it fixes a setup the person already watched fail. Nor does a prompt Studio sent hidden. */
export function opensSetupSteps(row: { text: string; context?: string; hidden?: true }): boolean {
  // The resume prompt is matched by its exact English text, so it never goes through the catalog or a translation (ONL-2665).
  return row.hidden !== true && row.text !== 'continue' && !isSetupRepairAsk(row);
}

/** A steer joins its turn under the same id, so the turn's first user row is the one that opened it (ONL-2961). */
export function latestTurnOpensSetupSteps(events: readonly StudioEvent[]): boolean {
  const said = events.filter((event) => event.type === 'message.user');
  const last = said.at(-1);
  if (last === undefined) return false;
  const opener = said.find((event) => event.turnId === last.turnId);
  return opener?.origin === 'studio' && opensSetupSteps(opener);
}

/** One per turn opened by a Studio setup prompt, from the prompt itself on, before the agent has called anything. A message that joined the running turn stays inside it (ONL-2961). */
export function setupTurnCards(items: readonly TranscriptItem[]): SetupTurnCard[] {
  const opens = opensTurn;
  const cards: SetupTurnCard[] = [];
  let start = items.findIndex(opens);
  while (start !== -1 && start < items.length) {
    let end = start + 1;
    while (end < items.length && !opens(items[end]!)) end++;
    const prompt = items[start]!;
    if (isStudioSetupPrompt(prompt) && opensSetupSteps(prompt)) {
      const calls: ToolCallView[] = [];
      const toolItemIds: string[] = [];
      for (let i = start + 1; i < end; i++) {
        const item = items[i]!;
        if (item.kind !== 'tools') continue;
        toolItemIds.push(item.id);
        for (const call of item.calls) if (call.parentToolUseId === undefined) calls.push(call);
      }
      cards.push({ promptId: prompt.id, calls, toolItemIds, isLast: end === items.length });
    }
    start = end;
  }
  return cards;
}

/** The checklist of the transcript's latest setup turn, as the chat would draw it, for a surface outside the chat (ONL-2961). */
export function latestSetupTurnSteps(items: readonly TranscriptItem[], isStreaming: boolean, live?: SetupStepsLive, canvas?: SetupCanvas): SetupStepsView | undefined {
  const card = setupTurnCards(items).at(-1);
  if (card === undefined) return undefined;
  const isLive = card.isLast && isStreaming;
  return deriveSetupSteps(card.calls, isLive, isLive ? live : undefined, setupCardCanvas(canvas, isLive, true));
}

/** The failure the person last asked the agent about, from the transcript, so it outlives the tab (ONL-2961). */
export function askedSetupFailure(items: readonly TranscriptItem[]): ProjectSetupFailure | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]!;
    if (item.kind !== 'user' || item.origin !== 'studio') continue;
    const failure = repairAskFailure(item);
    if (failure !== null) return failure;
  }
  return null;
}
