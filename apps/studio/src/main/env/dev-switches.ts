import { readEnvSwitch, STATE_ROOT_SWITCH } from './switch.js';

/** Every developer, test and release switch main reads from the environment, by the name the harnesses set. */
export const SWITCH_NAMES = {
  agentHeadless: 'AGENT_HEADLESS',
  diagnosticsPort: 'AGENT_CDP_PORT',
  agentProbe: 'STUDIO_AGENT_PROBE',
  agentRecord: 'STUDIO_AGENT_RECORD',
  agentReplay: 'STUDIO_AGENT_REPLAY',
  agentVerify: 'STUDIO_AGENT_VERIFY',
  autoUpdate: 'STUDIO_AUTO_UPDATE',
  chatFixture: 'STUDIO_CHAT_FIXTURE',
  claudeBin: 'STUDIO_CLAUDE_BIN',
  claudeOpen: 'STUDIO_CLAUDE_OPEN',
  cloudTestBuild: 'STUDIO_CLOUD_TEST_BUILD',
  codexCacheRoot: 'STUDIO_CODEX_CACHE_ROOT',
  codexRoot: 'STUDIO_CODEX_ROOT',
  codexSetup: 'STUDIO_CODEX_SETUP',
  diagnostics: 'STUDIO_DIAGNOSTICS',
  dropEventSeq: 'STUDIO_DROP_EVENT_SEQ',
  errorHook: 'STUDIO_ERROR_HOOK',
  firstRun: 'STUDIO_FIRST_RUN',
  flags: 'STUDIO_FLAGS',
  ghBin: 'STUDIO_GH_BIN',
  harness: 'STUDIO_HARNESS',
  launchSessionProofOutcome: 'STUDIO_LAUNCH_SESSION_PROOF_OUTCOME',
  launchSessionProofReady: 'STUDIO_LAUNCH_SESSION_PROOF_READY',
  locale: 'STUDIO_LOCALE',
  machineInstallRequest: 'STUDIO_MACHINE_INSTALL_REQUEST',
  noPty: 'STUDIO_NO_PTY',
  onboarding: 'STUDIO_ONBOARDING',
  perfWindowMs: 'STUDIO_PERF_WINDOW_MS',
  posthogHost: 'STUDIO_POSTHOG_HOST',
  posthogKey: 'STUDIO_POSTHOG_KEY',
  projects: 'STUDIO_PROJECTS',
  setupFailAt: 'STUDIO_SETUP_FAIL_AT',
  showroom: 'STUDIO_SHOWROOM',
  starterAdapter: 'STUDIO_STARTER_ADAPTER',
  stateRoot: STATE_ROOT_SWITCH,
  tabsOnScreen: 'STUDIO_TABS_ON_SCREEN',
  targetDir: 'STUDIO_TARGET_DIR',
  telemetry: 'STUDIO_TELEMETRY',
  telemetryHeadless: 'STUDIO_TELEMETRY_HEADLESS',
  testOfficialBuild: 'STUDIO_TEST_OFFICIAL_BUILD',
  tipsEveryProject: 'STUDIO_TIPS_EVERY_PROJECT',
  tipMomentGapMs: 'STUDIO_TIP_MOMENT_GAP_MS',
  workspaceRoot: 'STUDIO_WORKSPACE_ROOT',
} as const;

export type DevSwitch = keyof typeof SWITCH_NAMES;

/** Named by variable, the way the recording tooling sets them. */
export const PROOF_SWITCHES = [
  'STUDIO_GITHUB_PROOF',
  'STUDIO_LANDING_PROOF',
  'STUDIO_SETUP_PROOF',
  'STUDIO_COOLING_PROOF',
  'STUDIO_FRAME_HEALTH_PROOF',
  'STUDIO_NOTIFICATION_PROOF',
  'STUDIO_UPDATE_PROOF',
  'STUDIO_CLAUDE_PROOF',
  'STUDIO_REPORT_PROOF',
  'STUDIO_LAUNCH_SESSION_PROOF',
] as const;

export type ProofSwitch = (typeof PROOF_SWITCHES)[number];

export function readSwitch(name: DevSwitch, env: NodeJS.ProcessEnv = process.env): string | undefined {
  return readEnvSwitch(SWITCH_NAMES[name], env);
}

export function readProofSwitch(name: ProofSwitch, env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env[name];
}

/** electron-vite's dev server. Its own launcher sets it, not a harness, so it is not in the table. */
export function rendererDevServerUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return readEnvSwitch('ELECTRON_RENDERER_URL', env);
}

function liveSwitches(): { readonly [Name in DevSwitch]: string | undefined } {
  const switches = {} as { [Name in DevSwitch]: string | undefined };
  for (const name of Object.keys(SWITCH_NAMES) as DevSwitch[]) {
    Object.defineProperty(switches, name, { enumerable: true, get: () => readSwitch(name) });
  }
  return switches;
}

/** Each property reads the app's environment when it is asked for and holds nothing, so a read happens where the code puts it. */
export const devSwitches = liveSwitches();
