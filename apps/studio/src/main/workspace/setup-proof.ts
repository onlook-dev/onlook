import { proofSwitchOn } from '../diagnostics/gate.js';
import { serverHost, type ServerHost } from '../server/index.js';
import { isCreationRunningFor } from './creation-probe.js';
import { noteSetupReport } from './setup-signals.js';
import { knownProject } from './store.js';
import { resolveWorkspaceTelemetryProperties } from '../telemetry/index.js';

export interface SetupProofHook {
  intents(): readonly CapturedIntent[];
  creating(workspacePath: string): boolean;
  /** `background` reports without opening the project, which would make it active (ONL-2280). */
  report(input: SetupProofReport): Promise<void>;
}

export interface SetupProofReport {
  workspacePath: string;
  port: number;
  background?: boolean;
}

interface CapturedIntent {
  cwd: string;
  context?: string;
}

export interface SetupProofReportDeps {
  host: Pick<ServerHost, 'openProject' | 'report'> | undefined;
  isRegistered(workspacePath: string): boolean;
  noteSetupReport(cwd: string, port: number): void;
}

type ProofGlobal = typeof globalThis & { __studioSetupProof?: SetupProofHook };

const captured: CapturedIntent[] = [];

export async function reportForProof(
  { workspacePath, port, background = false }: SetupProofReport,
  deps: SetupProofReportDeps,
): Promise<void> {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('setup proof supplied an invalid port');
  // The proof enters through the same report seam as the agent and gets the same registry check.
  if (!deps.isRegistered(workspacePath)) throw new Error('setup proof reported a folder that is not a registered workspace');
  const host = deps.host;
  if (host === undefined) throw new Error('setup proof reported before the server book existed');
  if (!background) await host.openProject(workspacePath);
  await host.report(workspacePath, workspacePath, port, resolveWorkspaceTelemetryProperties(workspacePath));
  if (!background) deps.noteSetupReport(workspacePath, port);
}

export function installSetupProofHook(): void {
  if (!proofSwitchOn('STUDIO_SETUP_PROOF')) return;
  (globalThis as ProofGlobal).__studioSetupProof = {
    intents: () => [...captured],
    creating: (workspacePath) => isCreationRunningFor(workspacePath),
    report: (input) =>
      reportForProof(input, {
        host: serverHost(),
        isRegistered: (workspacePath) => knownProject(workspacePath) !== undefined,
        noteSetupReport,
      }),
  };
}

export function takeStartIntentForProof(cwd: string, context: string | undefined): boolean {
  if ((globalThis as ProofGlobal).__studioSetupProof === undefined) return false;
  captured.push({ cwd, ...(context === undefined ? {} : { context }) });
  return true;
}
