import { useMemo } from 'react';
import type { SetupHarnessId } from '@studio/events';
import { HARNESSES } from '@studio/onboarding-ui';
import { isConnected } from '../agents/mapping.js';
import { useAgentSetupStore } from '../agent-setup/store.js';

/** The agents this machine can actually open, in the order the agents screen offers them (ONL-3111). */
export function useConnectedAgents(): SetupHarnessId[] {
  const claude = useAgentSetupStore((store) => isConnected(store, 'claude'));
  const codex = useAgentSetupStore((store) => isConnected(store, 'codex'));
  return useMemo(() => HARNESSES.filter((harness) => (harness === 'claude' ? claude : codex)), [claude, codex]);
}
