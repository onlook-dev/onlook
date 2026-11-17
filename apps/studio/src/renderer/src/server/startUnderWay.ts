import type { ProjectCreateState, ProjectSetupSnapshot, SetupStepsView } from '@studio/events';

export type StartDriver = 'agent' | 'studio';

export interface StartFacts {
  /** The book's `pending`: a Start with no saved setup asked the agent. */
  agentAsked: boolean;
  starterSpawning: boolean;
  setup: ProjectSetupSnapshot | null;
  turn: SetupStepsView | undefined;
  /** This tab's own import, never another tab's. */
  create: ProjectCreateState | null;
}

const SETUP_IN_FLIGHT: ReadonlySet<ProjectSetupSnapshot['state']> = new Set(['preparing', 'installing', 'starting']);

/** A setup turn counts while it is live, its questions included, so the frame never offers a Start that races the agent's own run. */
export function startUnderWay(facts: StartFacts): StartDriver | null {
  if (facts.turn?.outcome === 'running' || facts.agentAsked) return 'agent';
  if (facts.starterSpawning || (facts.setup !== null && SETUP_IN_FLIGHT.has(facts.setup.state))) return 'studio';
  if (facts.create?.kind === 'installing') return 'studio';
  if (facts.create?.kind === 'starting') return facts.setup?.saved == null ? 'agent' : 'studio';
  return null;
}
