import { app } from 'electron';
import { DIAGNOSTICS_ARG } from '@studio/events';
import { type ProofSwitch, readProofSwitch, readSwitch } from '../env/dev-switches.js';

export interface GateFacts {
  packaged: boolean;
  /** Absent, each switch is read from the app's own environment when it is asked for. */
  env?: NodeJS.ProcessEnv;
}

/** A shipped build is always shut (ONL-2377). */
export function gatePort({ packaged, env }: GateFacts): string | undefined {
  if (packaged) return undefined;
  return readSwitch('diagnosticsPort', env) || undefined;
}

export function cloudBuildOverride({ packaged, env }: GateFacts): number | undefined {
  if (packaged) return undefined;
  const value = readSwitch('cloudTestBuild', env);
  if (value === undefined) return undefined;
  if (!/^(0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error('STUDIO_CLOUD_TEST_BUILD must be a nonnegative safe integer');
  }
  return Number(value);
}

export function cloudBuildForProof(): number | undefined {
  return cloudBuildOverride(liveFacts());
}

export type AgentStreamSwitch = { replay: string } | { record: string };

/** A shipped build neither replays nor records (ONL-2444). */
export function agentStreamSwitch({ packaged, env }: GateFacts): AgentStreamSwitch | undefined {
  if (packaged) return undefined;
  const replay = readSwitch('agentReplay', env);
  if (replay) return { replay };
  const record = readSwitch('agentRecord', env);
  return record ? { record } : undefined;
}

/** Shut when packaged, as every switch here is: this pin fakes the connected claim itself (ONL-2496). */
export function agentVerifyPin({ packaged, env }: GateFacts): string | undefined {
  if (packaged) return undefined;
  return readSwitch('agentVerify', env) || undefined;
}

/** Shut when packaged: a walk must not open Apple's installer on the machine it runs on, and watches the rest for real (ONL-3111). */
export function machineInstallRequestSkipped({ packaged, env }: GateFacts): boolean {
  return !packaged && readSwitch('machineInstallRequest', env) === 'skip';
}

export function machineInstallRequestPinned(): boolean {
  return machineInstallRequestSkipped(liveFacts());
}

/** Never-shown launches are never focused, so a walk asks for every tab to count as on screen (ONL-2960). */
export function tabsOnScreenPin(facts: GateFacts): boolean {
  return gatePort(facts) !== undefined && readSwitch('tabsOnScreen', facts.env) === '1';
}

export function tabsOnScreenPinned(): boolean {
  return tabsOnScreenPin(liveFacts());
}

export function gateArguments(facts: GateFacts): string[] {
  return gatePort(facts) === undefined ? [] : [DIAGNOSTICS_ARG];
}

function liveFacts(): GateFacts {
  return { packaged: app.isPackaged };
}

/** Readable before `ready`: `app.isPackaged` is derived from the executable path. */
export function diagnosticsPort(): string | undefined {
  return gatePort(liveFacts());
}

/** The one condition every reach surface asks — `debug:state` and the `#debug` hash. */
export function diagnosticsGateOpen(): boolean {
  return diagnosticsPort() !== undefined;
}

export function agentStream(): AgentStreamSwitch | undefined {
  return agentStreamSwitch(liveFacts());
}

export function agentVerify(): string | undefined {
  return agentVerifyPin(liveFacts());
}

export function diagnosticsArguments(): string[] {
  return gateArguments(liveFacts());
}

export type { ProofSwitch };

export function proofSwitchEnabled(name: ProofSwitch, { packaged, env }: GateFacts): boolean {
  return !packaged && readProofSwitch(name, env) === '1';
}

export function proofSwitchOn(name: ProofSwitch): boolean {
  return proofSwitchEnabled(name, liveFacts());
}
