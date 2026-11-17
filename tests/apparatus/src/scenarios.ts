import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ProjectCreateState, ProjectSetupSnapshot } from '@studio/events';
import { readTabAgent, waitForSetup, waitForTurn, type AgentTurn } from './agent.js';
import { until } from './async.js';
import { debugState, evaluate, gateCall, gateTabId, guestTarget, readTab, waitForGate } from './cdp.js';
import { attachStudio, FIRST_RUN_ENV, freePort, HANDLE_FILE, launchStudio, machineClaudeLogin, type StudioProcess } from './launch.js';
import { importProject, waitForCanvas } from './quick-start.js';
import { moveRecordedPorts, recordedPorts } from './replay-ports.js';
import { cloneSampleProject, type SampleProject } from './sample-project.js';
import { makeFixtureSite, serveFixtureSite } from './site.js';

export interface ScenarioRun {
  /** The runner's own Claude login: a prompt the scenario did not script runs live, unless the scenario's own turn replays. */
  login?: boolean;
  /** Every turn the scenario drives runs live on the runner's login instead of replaying its recording. */
  live?: boolean;
  /** Writes each turn the scenario drives to this file; implies `live`. */
  record?: string;
}

export interface ScenarioLaunch extends ScenarioRun {
  /** Every scenario owns this whole directory: opening one deletes what an earlier open left there. */
  root: string;
  /** `true` puts a window on the screen; a coding agent's check leaves it off. */
  headed?: boolean;
  tree?: string;
  build?: boolean;
  port?: string | number;
}

export interface OpenedScenario {
  name: string;
  app: StudioProcess;
  tabId: string;
  /** The Project the scenario opened on, when it opens one. */
  workspacePath?: string;
  frameUrl?: string;
  /** A folder on disk the scenario placed for the person to import by hand. */
  sourcePath?: string;
}

interface ScenarioStep {
  app: StudioProcess;
  tabId: string;
  run: ScenarioRun;
}

interface Reached {
  workspacePath?: string;
  frameUrl?: string;
  sourcePath?: string;
}

interface Replay {
  file: string;
  /** Cuts the recording at the first row this matches, so that turn is still running when the scenario opens. */
  holdAt?: (row: Record<string, unknown>, turn: number) => boolean;
  /** Replays only without a login: with one, the prompt typed by hand runs live. */
  onlyWithoutLogin?: boolean;
  /** Rewrites the recorded rows before ports move, after any `holdAt` cut. */
  rewrite?: (rows: string[]) => string[];
}

export interface Scenario {
  ticket: string;
  what: string;
  replay?: Replay;
  env?: Record<string, string>;
  reach(step: ScenarioStep): Promise<Reached>;
}

const recording = (name: string): string => fileURLToPath(new URL(`../recordings/${name}.jsonl`, import.meta.url));

export const FIXTURE_ANCHORS: readonly string[] = [
  'Your computer has gone to sleep',
  '  .listen(0, function () {',
];
const FIXTURE_FRAME_NAME = 'Computer asleep';
export const FIRST_EDIT_HEADLINE = 'Your computer is taking a nap';
export const FIRST_EDIT_PROMPT = `Change the headline to “${FIRST_EDIT_HEADLINE}”.`;
export const FIRST_EDIT_RECORDING = recording('first-edit');
export const IMPORT_START_RECORDING = recording('import-start');
export const SETUP_REPAIR_RECORDING = recording('setup-repair');
export const BLANK_ASK = 'Build a landing page for a neighborhood bakery.';
export const BLANK_BUILD_RECORDING = recording('blank-build');
export const IMPORT_SAMPLE: SampleProject = { name: 'onlook', url: 'https://github.com/onlook-dev/onlook.git', commit: '423e2e924366419e418ee049093872d535eea41a' };

const SIGNED_IN = { STUDIO_AGENT_PROBE: 'ok', STUDIO_AGENT_VERIFY: 'ok' } as const;

const calls = (...names: string[]) => (row: Record<string, unknown>): boolean =>
  row['type'] === 'assistant' && names.some((name) => JSON.stringify(row['message'] ?? null).includes(`"name":"${name}"`));
const SERVER_STARTS = calls('mcp__studio__run_project_setup', 'mcp__studio__server_running');

async function heldRecording(replay: Replay, root: string): Promise<string> {
  const out = join(root, 'replay.jsonl');
  const rows = readFileSync(replay.file, 'utf8').split('\n').filter((line) => line.trim() !== '');
  let turn = 0;
  const cut =
    replay.holdAt === undefined
      ? -1
      : rows.findIndex((line) => {
          const row = JSON.parse(line) as Record<string, unknown>;
          const held = replay.holdAt!(row, turn);
          if (row['type'] === 'result') turn += 1;
          return held;
        });
  const held = cut === -1 ? rows : rows.slice(0, cut);
  const kept = replay.rewrite === undefined ? held : replay.rewrite(held);
  const moves = new Map<number, number>();
  for (const port of recordedPorts(kept)) moves.set(port, await freePort());
  writeFileSync(out, `${moveRecordedPorts(kept, moves).join('\n')}\n`);
  return out;
}

async function agentEnv(scenario: Scenario, run: ScenarioRun, root: string): Promise<Record<string, string>> {
  const login = run.login === true || run.live === true || run.record !== undefined;
  const signIn = login ? { ...machineClaudeLogin() } : { ...SIGNED_IN };
  if (run.record !== undefined) return { ...signIn, STUDIO_AGENT_RECORD: run.record };
  const replay = scenario.replay;
  if (run.live === true || replay === undefined || (replay.onlyWithoutLogin === true && login)) return signIn;
  return { ...signIn, STUDIO_AGENT_REPLAY: await heldRecording(replay, root) };
}

/** The first turn fails with a 529 right after its first completed Edit; the rest of it answers the next prompt, so Continue picks up where it stopped (ONL-2973). */
export function failAfterFirstEdit(rows: string[]): string[] {
  const parsed = rows.map((line) => JSON.parse(line) as Record<string, unknown>);
  const edit = parsed.findIndex(calls('Edit'));
  const editId = JSON.stringify((parsed[edit]?.['message'] as { content?: { type: string; id?: string }[] } | undefined)?.content?.find((block) => block.type === 'tool_use')?.id ?? null);
  const landed = parsed.findIndex((row, index) => index > edit && row['type'] === 'user' && JSON.stringify(row['message'] ?? null).includes(`"tool_use_id":${editId}`));
  const end = parsed.findIndex((row) => row['type'] === 'result');
  const init = rows.find((_line, index) => parsed[index]?.['type'] === 'system' && parsed[index]?.['subtype'] === 'init');
  if (edit === -1 || landed === -1 || end === -1 || init === undefined) throw new Error('The recording has no completed Edit inside a turn to fail after.');
  const failed = { ...parsed[end], subtype: 'error_during_execution', is_error: true, terminal_reason: 'api_error', api_error_status: 529, result: 'API Error: 529 {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}' };
  return [...rows.slice(0, landed + 1), JSON.stringify(failed), init, ...rows.slice(landed + 1)];
}

async function skipTour(port: string, tabId: string): Promise<void> {
  const press = (): Promise<'gone' | 'no-skip' | 'pressed'> =>
    readTab(
      port,
      tabId,
      `(() => {
        const dialog = document.querySelector('[data-testid="tour-dialog"]');
        if (dialog === null) return 'gone';
        const skip = dialog.querySelector('[data-testid="tour-skip"]');
        if (skip === null) return 'no-skip';
        skip.click();
        return 'pressed';
      })()`,
    );
  const state = await until(press, (read) => read === 'gone', { what: 'the tour dialog to close', limitMs: 5_000, everyMs: 250 }).catch(press);
  if (state === 'no-skip') throw new Error('The first-run tour is open with no Skip button, so the scenario cannot reach the canvas behind it.');
  if (state === 'pressed') throw new Error('The first-run tour stayed open after Skip was pressed, so the scenario cannot reach the canvas behind it.');
}

async function editorOn(port: string, tabId: string, known: ReadonlySet<string>): Promise<string> {
  const screen = await until(
    () => gateCall(port, tabId, 'screen'),
    (read) => read.kind === 'editor' && read.workspacePath !== null && !known.has(read.workspacePath),
    { what: 'the new project to open in the editor', limitMs: 120_000, everyMs: 200 },
  );
  await waitForCanvas(port, tabId);
  await skipTour(port, tabId);
  return screen.workspacePath!;
}

async function knownProjects(port: string): Promise<Set<string>> {
  return new Set((await debugState(port)).workspaces.flatMap((workspace) => workspace.projects.map((project) => project.workspacePath)));
}

async function openFixtureProject({ app, tabId }: ScenarioStep): Promise<{ workspacePath: string; frameUrl: string }> {
  const site = makeFixtureSite({ root: join(app.root, 'sites') });
  await importProject(app, tabId, site.path, 'design');
  const setup = await waitForSetup(app.port, tabId, 60_000);
  if (setup.kind !== 'ready') throw new Error(`Importing the fixture site ended ${JSON.stringify(setup)}.`);
  const workspacePath = setup.workspace.workspacePath;
  await waitForCanvas(app.port, tabId);
  const servedRoot = join(app.root, 'served');
  mkdirSync(servedRoot, { recursive: true });
  const served = await serveFixtureSite({ path: workspacePath, root: servedRoot }, { owner: app.pid });
  const added = await gateCall(app.port, tabId, 'addFrame', served.url);
  if (!added.ok) throw new Error(`addFrame refused: ${added.reason}`);
  await until(
    () => gateCall(app.port, tabId, 'screen'),
    (screen) => screen.frames.some((frame) => frame.homeUrl === served.url && frame.isArmed),
    { what: 'the fixture frame to arm', limitMs: 30_000, everyMs: 100 },
  );
  const frame = (await gateCall(app.port, tabId, 'screen')).frames.find((candidate) => candidate.homeUrl === served.url)!;
  const named = await gateCall(app.port, tabId, 'renameFrame', frame.id, FIXTURE_FRAME_NAME);
  if (!named.ok) throw new Error(`renameFrame refused: ${named.reason}`);
  await until(
    () => gateCall(app.port, tabId, 'screen'),
    (screen) => screen.frames.some((candidate) => candidate.id === frame.id && candidate.name === FIXTURE_FRAME_NAME),
    { what: `the fixture frame to be named ${JSON.stringify(FIXTURE_FRAME_NAME)}`, limitMs: 10_000, everyMs: 100 },
  );
  await skipTour(app.port, tabId);
  return { workspacePath, frameUrl: served.url };
}

/** The turn's next-task card, open with at least one task in the chat (ONL-2977). */
async function nextTasksShown({ app, tabId }: ScenarioStep): Promise<void> {
  await until(
    () =>
      readTab<{ state: string | null; tasks: number }>(
        app.port,
        tabId,
        `(() => {
          const card = document.querySelector('[data-testid="next-tasks"]');
          return { state: card?.getAttribute('data-state') ?? null, tasks: card?.querySelectorAll('[data-testid="next-task"]').length ?? 0 };
        })()`,
      ),
    (card) => card.state === 'open' && card.tasks > 0,
    { what: 'the chat to show the next-task card, open', limitMs: 10_000, everyMs: 250 },
  );
}

async function lastSeq(port: string, tabId: string): Promise<number> {
  return (await readTabAgent(port, tabId)).agent.events.at(-1)?.seq ?? 0;
}

async function prompt(port: string, tabId: string, text: string): Promise<void> {
  await readTab(port, tabId, `window.studio.agentCommand(${JSON.stringify({ type: 'prompt', text })})`);
}

/** Answers what a live turn asks as a person would on a first run: allow, and the first option of each question. */
async function answerAsked(port: string, tabId: string, after: number, answered: Set<string>): Promise<void> {
  const { agent } = await readTabAgent(port, tabId, after);
  for (const event of agent.events) {
    if (event.type !== 'permission.requested' || answered.has(event.requestId)) continue;
    answered.add(event.requestId);
    const answers = Object.fromEntries((event.questions ?? []).map((question) => [question.question, question.options[0]?.label ?? '']));
    const command = { type: 'permission.respond', requestId: event.requestId, optionId: 'allow', ...(event.questions === undefined ? {} : { answers }) };
    await readTab(port, tabId, `window.studio.agentCommand(${JSON.stringify(command)})`);
  }
}

function toolNamed(agent: Snapshot, toolCallId: string, name: string): boolean {
  return agent.events.some((event) => event.type === 'tool.start' && event.toolCallId === toolCallId && event.name === name);
}

async function promptAndWait({ app, tabId }: ScenarioStep, text: string): Promise<AgentTurn> {
  const after = await lastSeq(app.port, tabId);
  await prompt(app.port, tabId, text);
  const answered = new Set<string>();
  const turn = waitForTurn(app.port, tabId, { after, limitMs: 900_000 });
  let done = false;
  void turn.finally(() => { done = true; }).catch(() => undefined);
  while (!done) {
    await answerAsked(app.port, tabId, after, answered).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return turn;
}

type Snapshot = Awaited<ReturnType<typeof readTabAgent>>['agent'];
const underWay = (agent: Snapshot): boolean => agent.events.some((event) => event.type === 'tool.start' || event.type === 'text.start');

/** Resolves once the turn this prompt opened is running and `reached` holds, answering what it asks on the way. */
async function promptAndWatch({ app, tabId }: ScenarioStep, text: string, reached: (agent: Snapshot) => boolean = underWay): Promise<void> {
  const after = await lastSeq(app.port, tabId);
  await prompt(app.port, tabId, text);
  const answered = new Set<string>();
  await until(
    async () => {
      await answerAsked(app.port, tabId, after, answered);
      return (await readTabAgent(app.port, tabId, after)).agent;
    },
    (agent) => agent.isStreaming && reached(agent),
    { what: 'the turn to reach the held point', limitMs: 180_000, everyMs: 250 },
  );
}

async function createBlank({ app, tabId }: ScenarioStep): Promise<string> {
  await until(() => gateCall(app.port, tabId, 'screen'), (screen) => screen.kind === 'projects', { what: 'the projects screen', limitMs: 15_000 });
  const known = await knownProjects(app.port);
  const started = await gateCall(app.port, tabId, 'createBlank');
  if (!started.ok) throw new Error(`createBlank refused: ${started.reason}`);
  return editorOn(app.port, tabId, known);
}

function setupState(port: string, tabId: string): Promise<ProjectCreateState | null> {
  return readTab<ProjectCreateState | null>(port, tabId, 'window.studio.tabCreateState()');
}

async function importForSetup(step: ScenarioStep): Promise<string> {
  const { app, tabId } = step;
  const site = makeFixtureSite({ root: join(app.root, 'sites') });
  const known = await knownProjects(app.port);
  await importProject(app, tabId, site.path, 'experiment');
  return editorOn(app.port, tabId, known);
}

async function reachImportStarting(step: ScenarioStep): Promise<Reached> {
  const workspacePath = await importForSetup(step);
  const { app, tabId, run } = step;
  if (run.record !== undefined) {
    const setup = await waitForSetup(app.port, tabId);
    if (setup.kind !== 'live') throw new Error(`The recorded setup ended ${JSON.stringify(setup)}, not live.`);
    return { workspacePath };
  }
  await until(
    async () => ({ setup: await setupState(app.port, tabId), agent: (await readTabAgent(app.port, tabId)).agent }),
    ({ setup, agent }) => setup?.kind === 'starting' && agent.isStreaming && agent.events.some((event) => event.type === 'tool.start'),
    { what: 'setup to reach starting with the start turn under way', limitMs: 180_000, everyMs: 250 },
  );
  return { workspacePath };
}

export const SCENARIOS: Readonly<Record<string, Scenario>> = {
  'project-open': {
    ticket: 'ONL-2959',
    what: 'the fixture site on the canvas with one frame, before any agent turn',
    replay: { file: FIRST_EDIT_RECORDING, onlyWithoutLogin: true },
    reach: openFixtureProject,
  },
  'first-edit-landed': {
    ticket: 'ONL-2959',
    what: 'the fixture site just after the first agent edit changed its headline',
    replay: { file: FIRST_EDIT_RECORDING },
    async reach(step) {
      const reached = await openFixtureProject(step);
      await promptAndWait(step, FIRST_EDIT_PROMPT);
      let reloaded = false;
      const headline = (): Promise<string | null> =>
        guestTarget(step.app.port, reached.frameUrl)
          .then(async (guest) => {
            const text = await evaluate<string | null>(guest, `document.querySelector('#title')?.textContent ?? null`);
            if (text !== null && text !== FIRST_EDIT_HEADLINE && !reloaded) {
              reloaded = true;
              await evaluate(guest, '(location.reload(), true)');
            }
            return text;
          })
          .catch(() => null);
      await until(headline, (text) => text === FIRST_EDIT_HEADLINE, {
        what: `the frame to show the edited headline ${JSON.stringify(FIRST_EDIT_HEADLINE)}`,
        limitMs: 20_000,
        everyMs: 250,
      });
      await nextTasksShown(step);
      return reached;
    },
  },
  'first-edit-stopped': {
    ticket: 'ONL-2973',
    what: 'the first agent edit landed, then Claude overloaded (529) before the turn finished; the next prompt replays the rest of the turn',
    replay: { file: FIRST_EDIT_RECORDING, rewrite: failAfterFirstEdit },
    async reach(step) {
      const reached = await openFixtureProject(step);
      await promptAndWait(step, FIRST_EDIT_PROMPT);
      return reached;
    },
  },
  'first-edit-working': {
    ticket: 'ONL-2973',
    what: 'the first agent edit still running, with its frame marked as worked on',
    replay: { file: FIRST_EDIT_RECORDING, holdAt: calls('mcp__studio__evaluate_in_frame') },
    async reach(step) {
      const reached = await openFixtureProject(step);
      await promptAndWatch(step, FIRST_EDIT_PROMPT, (agent) => agent.events.some((event) => event.type === 'tool.end' && event.status === 'completed' && toolNamed(agent, event.toolCallId, 'Edit')));
      return reached;
    },
  },
  'first-run': {
    ticket: 'ONL-2960',
    what: 'a fresh install on its first screen',
    env: { ...FIRST_RUN_ENV },
    reach: async () => ({}),
  },
  'import-first-run': {
    ticket: 'ONL-2901',
    what: `a fresh install on its first screen, with ${IMPORT_SAMPLE.name} cloned on disk at a pinned commit for the folder pick`,
    env: { ...FIRST_RUN_ENV },
    reach: async (step) => ({ sourcePath: await cloneSampleProject(IMPORT_SAMPLE, join(step.app.root, 'projects', IMPORT_SAMPLE.name)) }),
  },
  'blank-fresh': {
    ticket: 'ONL-2960',
    what: 'a new blank project on its empty canvas, through the New Draft row',
    reach: async (step) => ({ workspacePath: await createBlank(step) }),
  },
  'blank-building': {
    ticket: 'ONL-2960',
    what: `a new blank project while the agent builds its first ask (“${BLANK_ASK}”)`,
    replay: { file: BLANK_BUILD_RECORDING, holdAt: calls('mcp__studio__capture_frame') },
    async reach(step) {
      const workspacePath = await createBlank(step);
      if (step.run.record !== undefined) await promptAndWait(step, BLANK_ASK);
      else await promptAndWatch(step, BLANK_ASK, (agent) => agent.events.some((event) => event.type === 'tool.end' && event.status === 'completed' && toolNamed(agent, event.toolCallId, 'Write')));
      return { workspacePath };
    },
  },
  'import-starting': {
    ticket: 'ONL-2961',
    what: 'an imported repo whose setup is starting its server, the start turn under way',
    replay: { file: IMPORT_START_RECORDING, holdAt: SERVER_STARTS },
    reach: reachImportStarting,
  },
  'import-queued': {
    ticket: 'ONL-2961',
    what: 'import-starting, with a first change typed while the server is still starting, joined to the setup turn and acknowledged',
    replay: { file: IMPORT_START_RECORDING, holdAt: SERVER_STARTS, onlyWithoutLogin: true },
    async reach(step) {
      const reached = await reachImportStarting({ ...step, run: { ...step.run, record: undefined } });
      const after = await lastSeq(step.app.port, step.tabId);
      await prompt(step.app.port, step.tabId, FIRST_EDIT_PROMPT);
      const joined = await until(
        () => readTabAgent(step.app.port, step.tabId, after),
        ({ agent }) => agent.events.some((event) => event.type === 'message.user'),
        { what: 'the typed change to join the setup turn', limitMs: 15_000, everyMs: 250 },
      );
      const typed = joined.agent.events.find((event) => event.type === 'message.user');
      if (typed === undefined || joined.agent.events.some((event) => event.type === 'turn.started')) throw new Error('The typed change opened a turn of its own instead of joining setup.');
      if (step.run.login !== true && step.run.live !== true) return reached;
      const answered = new Set<string>();
      await until(
        async () => {
          await answerAsked(step.app.port, step.tabId, after, answered).catch(() => undefined);
          return readTabAgent(step.app.port, step.tabId, typed.seq);
        },
        ({ agent }) => agent.events.some((event) => event.type === 'text.start' && event.parentToolUseId === undefined),
        { what: 'the agent to acknowledge the typed change', limitMs: 180_000, everyMs: 500 },
      );
      return reached;
    },
  },
  'import-failed': {
    ticket: 'ONL-2961',
    what: 'an imported repo whose server start failed, through the setup machine\'s own forced failure',
    env: { STUDIO_SETUP_FAIL_AT: 'starting' },
    async reach(step) {
      const workspacePath = await importForSetup(step);
      const setup = await waitForSetup(step.app.port, step.tabId);
      if (setup.kind !== 'failed') throw new Error(`Setup ended ${JSON.stringify(setup)}, not failed.`);
      return { workspacePath };
    },
  },
  'setup-repair': {
    ticket: 'ONL-2961',
    what: 'an imported repo whose saved setup failed to install, the setup turn over, so the agent can be asked for help',
    replay: { file: SETUP_REPAIR_RECORDING },
    async reach(step) {
      const { app, tabId } = step;
      const workspacePath = await importForSetup(step);
      const setup = await waitForSetup(app.port, tabId);
      if (setup.kind !== 'failed') throw new Error(`Setup ended ${JSON.stringify(setup)}, not failed.`);
      const snapshot = await readTab<ProjectSetupSnapshot>(app.port, tabId, 'window.studio.projectSetupRead()');
      if (snapshot.failure?.stage !== 'install' || snapshot.failure.revision !== snapshot.saved?.revision) {
        throw new Error(`The saved setup did not fail at install: ${JSON.stringify({ state: snapshot.state, stage: snapshot.failure?.stage ?? null })}.`);
      }
      await until(() => readTabAgent(app.port, tabId), ({ agent }) => !agent.isStreaming, { what: 'the setup turn to end', limitMs: 30_000, everyMs: 250 });
      return { workspacePath };
    },
  },
};

export function defaultScenarioRoot(): string {
  return process.env['STUDIO_SCENARIO_ROOT'] || join(homedir(), '.cache', 'onlook-studio-scenarios');
}

const SCENARIO_MARK = 'scenario.json';

export function markScenarioRoot(root: string, name: string): void {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, SCENARIO_MARK), `${JSON.stringify({ name })}\n`);
}

/** Ends whatever an earlier open left on `root`; refuses a directory no scenario made. */
export async function closeScenario(root: string): Promise<void> {
  if (!existsSync(root)) return;
  const marked = existsSync(join(root, SCENARIO_MARK));
  if (!marked && !existsSync(join(root, HANDLE_FILE)) && readdirSync(root).length > 0) {
    throw new Error(`${root} holds files but no ${SCENARIO_MARK}; it is not a scenario's root, so it is left alone.`);
  }
  if (existsSync(join(root, HANDLE_FILE))) {
    try {
      await attachStudio(root).kill();
    } catch (error) {
      if (!/is gone/.test(String(error))) throw error;
    }
  }
  rmSync(root, { recursive: true, force: true });
}

export async function openScenario(name: string, launch: ScenarioLaunch): Promise<OpenedScenario> {
  const scenario = SCENARIOS[name];
  if (scenario === undefined) throw new Error(`No scenario is named ${name}. The scenarios are: ${Object.keys(SCENARIOS).join(', ')}.`);
  const run: ScenarioRun = {
    ...(launch.login === undefined ? {} : { login: launch.login }),
    ...(launch.live === undefined ? {} : { live: launch.live }),
    ...(launch.record === undefined ? {} : { record: launch.record }),
  };
  await closeScenario(launch.root);
  markScenarioRoot(launch.root, name);
  const agent = await agentEnv(scenario, run, launch.root);
  const app = await launchStudio({
    root: launch.root,
    ...(launch.headed === undefined ? {} : { headed: launch.headed }),
    ...(launch.tree === undefined ? {} : { tree: launch.tree }),
    ...(launch.build === undefined ? {} : { build: launch.build }),
    ...(launch.port === undefined ? {} : { port: launch.port }),
    env: { ...agent, ...scenario.env },
  });
  try {
    const tabId = gateTabId(await waitForGate(app.port));
    if (tabId === null) throw new Error('The app has no tab to open the scenario in.');
    const reached = await scenario.reach({ app, tabId, run });
    return { name, app, tabId, ...reached };
  } catch (error) {
    await app.kill();
    throw error;
  }
}
