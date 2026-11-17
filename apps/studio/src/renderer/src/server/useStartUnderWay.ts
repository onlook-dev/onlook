import { useSetupTurnStore } from '../create/setupProgress.js';
import { ownCreateState, useProjectCreateStore } from '../create/projectCreate.js';
import { selectProjectSetupSnapshot, useProjectSetupStore } from '../project-setup/store.js';
import { useWorkspaceStore } from '../workspace/store.js';
import { useServerStore } from './store.js';
import { startUnderWay, type StartDriver } from './startUnderWay.js';

export function useStartUnderWay(): StartDriver | null {
  const agentAsked = useServerStore((state) => state.pending);
  const starterSpawning = useServerStore((state) => state.starterSpawning);
  const setup = useProjectSetupStore(selectProjectSetupSnapshot);
  const turn = useSetupTurnStore((state) => state.turn);
  const open = useWorkspaceStore((state) => state.workspace);
  const create = ownCreateState(useProjectCreateStore((state) => state.state), open);
  return startUnderWay({ agentAsked, starterSpawning, setup, turn, create });
}
