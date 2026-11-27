import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface Instrument {
  readonly env: string;
  readonly value: '1' | 'scenario' | 'gallery';
  readonly what: string;
}

export const INSTRUMENTS: Readonly<Record<string, Instrument>> = {
  refusals: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'folder and import refusal reasons alongside the project-creation failure' },
  machine: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'Onboarding machine checks (`machine:passed`, `machine:developer-tools-missing`)' },
  'github-import': { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'GitHub connection, repository picker and clone states' },
  'app-run': { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'delayed and failed app controls in Project Chat' },
  'account-access': { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'getting-started browser sign-in and account settings, with pending, error and deletion states' },
  'cloud-update': { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'update-required screen: default, hover, focus and narrow layouts' },
  teams: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'cloud Teams dialog and account-menu workspaces' },
  'project-setup': { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'Setup script commands, verification, failures and repair states' },
  'blank-create': { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'the Blank Draft failure card, with and without a quoted error (`blank-create:failed`)' },
  account: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'cloud-build account in the Projects sidebar footer and the editor rail: connectivity, identity, menu and action states (`account:session`, `account:details`, `account:rail`, `account:menu-open`, `account:interaction`)' },
  topbar: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'onboarding window bar, the GitHub button on every connection state, and restored Projects controls (`topbar:github-connection`, `topbar:idle`, `topbar:downloaded`, `topbar:editor`)' },
  'chat-controls': { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'resume, question answers, Claude billing and background notification states' },
  connectors: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'connector inventory, design tools notice and permission rows' },
  notifications: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'notification sound picker and chat bell states' },
  artifacts: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'artifact read states, shared-prefix chips and confirmation (`artifacts:chips`)' },
  projects: { env: 'STUDIO_PROJECTS', value: 'scenario', what: 'the projects-view showroom (`projects:recovery`, `projects:collapsed`, `projects:pending`, `projects:empty`, `projects:imported`, `projects:menu`, `projects:refused`, `projects:refused-copy`, `projects:start-fresh`)' },
  discover: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'the Projects discover card at rest, hovered, focused, hidden, and above a long workspace list' },
  git: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'the git-status pill and card, with every No Access line open (`git:card`, `git:no-access`)' },
  chat: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'packages/chat-ui, exhaustive (`chat:tool-rows`, `chat:approval`, …)' },
  'onboarding-ui': { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'the Better Onboarding components: tiles, setup dialogs, the sign-in card (`onboarding-ui:dialogs`)' },
  tabs: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'the window tab strip (`tabs:states`, `tabs:band`, `tabs:parked`)' },
  rail: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'the canvas icon rail at each active item, and the empty code view (`rail:views`)' },
  code: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'the left panel’s code view: its tab row, breadcrumb and refusal (`code:shell`)' },
  sidebar: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'the left panel’s two sections and the agent status at its foot (`sidebar:pages`, `sidebar:designs`, `sidebar:status`)' },
  tips: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'the canvas guide: its prompts and its hotkeys (`tips:guide`)' },
  canvas: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'the editor frame at every rail configuration, the frame’s loading label, and the text node’s states (`canvas:rails`, `canvas:frame`, `canvas:text`)' },
  theme: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'the theme still life — Skeleton on every shared ground (`theme:skeleton`)' },
  color: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'every custom property the running app resolves to a colour, with its fallback' },
  usage: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'the composer’s usage ring at every reading' },
  limits: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'billing and plan-limit cards from typed events' },
  settings: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'the settings pane and the Default AI row at every readiness (`settings:agent`, `settings:pane`)' },
  telemetry: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'the source-build analytics question and Settings consent states' },
  report: { env: 'STUDIO_SHOWROOM', value: 'gallery', what: 'the report form at every state (`report:composing`, `report:held`, `report:settled`, `report:keyless`)' },
  'chat-fixture': { env: 'STUDIO_CHAT_FIXTURE', value: 'scenario', what: 'the chat panel from a captured conversation (`chat-fixture:multi`)' },
  onboarding: { env: 'STUDIO_ONBOARDING', value: 'scenario', what: 'the onboarding screens as a still life (`onboarding:agents`, `onboarding:import`)' },
  diagnostics: { env: 'STUDIO_DIAGNOSTICS', value: '1', what: 'the pty check; the one instrument a packaged build also has' },
};

export function resolveInstrument(arg: string): { env: string; value: string } | undefined {
  const sep = arg.indexOf(':');
  const name = sep === -1 ? arg : arg.slice(0, sep);
  const scenario = sep === -1 ? undefined : arg.slice(sep + 1);
  const instrument = INSTRUMENTS[name];
  if (instrument === undefined) return undefined;
  if (instrument.value === '1') return { env: instrument.env, value: '1' };
  if (instrument.value === 'gallery') return { env: instrument.env, value: scenario ? `${name}/${scenario}` : name };
  return { env: instrument.env, value: scenario ?? '1' };
}

// Every gate cleared first: main's hash chain ranks the other instruments above the showroom, so an inherited gate would win.
export function childEnv(base: NodeJS.ProcessEnv, chosen: { env: string; value: string }, stateRoot: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base };
  for (const instrument of Object.values(INSTRUMENTS)) delete env[instrument.env];
  env[chosen.env] = chosen.value;
  env['STUDIO_STATE_ROOT'] = stateRoot;
  return env;
}

if (import.meta.main) {
  const [arg] = process.argv.slice(2);
  if (arg === undefined || arg === '--list' || arg === '-l') {
    console.log('bun run showroom <name>\n');
    for (const [name, i] of Object.entries(INSTRUMENTS)) console.log(`  ${name.padEnd(14)} ${i.what}`);
    process.exit(arg === undefined ? 1 : 0);
  }
  const chosen = resolveInstrument(arg);
  if (chosen === undefined) {
    console.error(`showroom: unknown instrument '${arg}'. Run with --list.`);
    process.exit(1);
  }
  const stateRoot = process.env['STUDIO_STATE_ROOT'] ?? mkdtempSync(join(tmpdir(), 'studio-showroom-'));
  // Main pins the real userData whenever --user-data-dir is absent (ONL-1926).
  const result = spawnSync('bunx', ['electron-vite', 'dev', '--', `--user-data-dir=${join(stateRoot, 'user-data')}`], {
    cwd: join(import.meta.dirname, '../apps/studio'),
    stdio: 'inherit',
    env: childEnv(process.env, chosen, stateRoot),
  });
  if (result.error) console.error(`showroom: could not start electron-vite — ${result.error.message}`);
  process.exit(result.status ?? 1);
}
