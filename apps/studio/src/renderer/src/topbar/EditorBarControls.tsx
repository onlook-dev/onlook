import { useEffect, useMemo } from 'react';
import type { ChromeSlots, TabStatus } from '@studio/events';
import { pillStateOf } from '@studio/git-ui/derive';
import type { GitDropdownOption } from '@studio/git-ui';

import { canSubmitPrompt, subscribeToAgent, useAgentStore, type AgentUiState } from '../agent/store.js';
import { isRailHidden, useCanvasStore } from '../canvas/store.js';
import {
  actionFor,
  isNoPrOption,
  isReadyOption,
  pickFor,
  promptKeyFor,
  type GitClickResult,
} from '../git-status/press.js';
import { noteBrowserOpen, noteNoActionPress, queuedActionFor, takeBackFor, useGitStatusStore } from '../git-status/store.js';
import { t } from '@studio/i18n';
import { abandonProject } from '../workspace/session.js';
import { sessionCovered, useWorkspaceStore } from '../workspace/store.js';
import { folderDecision } from './folderAction.js';
import { useFillWindowBar } from './slots.js';
import { studio } from '../bridge.js';

/** Mid-turn the pen holds the press rather than folding it into the running turn, so the turn is no longer part of this question (ONL-2379). */
export function pillCanSubmit(state: Pick<AgentUiState, 'hasSession' | 'connection'>): boolean {
  return canSubmitPrompt(state);
}

/** No `done`: every end of streaming publishes it, a dead turn included, so it would report success for failed work (ONL-2455). */
export function railStatusFor(state: {
  isRightRailHidden: boolean;
  isTurnRunning: boolean;
  needsAttention: boolean;
}): TabStatus | undefined {
  if (!state.isRightRailHidden) return undefined;
  if (state.needsAttention) return 'waiting';
  return state.isTurnRunning ? 'working' : undefined;
}

export function EditorBarSlot({
  onExitToProjects, onConnectGithub,
}: {
  onExitToProjects: () => void;
  onConnectGithub: () => void;
}): React.JSX.Element | null {
  useEffect(() => subscribeToAgent(), []);

  const worktreePath = useCanvasStore((state) => state.project?.path);
  const isSwitching = useWorkspaceStore(sessionCovered);
  const canSubmit = useAgentStore(pillCanSubmit);
  const isTurnRunning = useAgentStore((state) => state.isStreaming);
  const needsAttention = useAgentStore((state) => state.needsAttention);
  const row = useGitStatusStore((state) =>
    worktreePath === undefined ? undefined : state.rows[worktreePath],
  );
  const defaults = useGitStatusStore((state) => state.defaults);
  const leftHidden = useCanvasStore((state) => isRailHidden(state, 'left'));
  const rightHidden = useCanvasStore((state) => isRailHidden(state, 'right'));
  const working = useGitStatusStore((state) =>
    worktreePath === undefined ? undefined : state.working[worktreePath],
  );
  const held = useGitStatusStore((state) =>
    worktreePath === undefined ? undefined : state.held[worktreePath],
  );
  const pen = useAgentStore((state) => state.pen);
  const failure = useGitStatusStore((state) => worktreePath === undefined ? undefined : state.failures[worktreePath]);
  const queuedAction = queuedActionFor(held, pen);

  const slots = useMemo((): ChromeSlots => {
    const next: ChromeSlots = {};
    // The only way back to projects, so not gated on a worktree; inert mid-switch.
    next.showFolder = !isSwitching;
    // Present before the worktree exists so the cluster never reflows (ONL-2312).
    const settled = worktreePath !== undefined && !isSwitching;
    const rightStatus = railStatusFor({
      isRightRailHidden: rightHidden,
      isTurnRunning: settled && isTurnRunning,
      needsAttention: settled && needsAttention,
    });
    next.rails = {
      left: leftHidden,
      right: rightHidden,
      ...(rightStatus === undefined ? {} : { rightStatus }),
    };
    next.git = {
      ...(settled && row !== undefined ? { row } : {}),
      defaults,
      isWorking: settled && working !== undefined,
      ...(settled && failure !== undefined ? { failure } : {}),
      ...(settled && working !== undefined ? { workingAction: working.action } : {}),
      canSubmit: settled && canSubmit,
      ...(settled && queuedAction !== undefined ? { queuedAction } : {}),
    };
    return next;
  }, [isSwitching, worktreePath, row, defaults, working, failure, queuedAction, canSubmit, isTurnRunning, needsAttention, leftHidden, rightHidden]);

  useFillWindowBar(slots);

  useEffect(() => {
    return studio().onChromeAction((action) => {
      if (action.slot === 'folder') {
        const decision = folderDecision(action, isSwitching);
        if (decision === 'ignore') return;
        if (decision === 'abandon-then-exit') abandonProject();
        onExitToProjects();
        return;
      }
      if (action.slot === 'rail') {
        useCanvasStore.getState().toggleRail(action.side);
        return;
      }
      if (worktreePath === undefined) return;
      const store = useGitStatusStore.getState();
      const state = pillStateOf(row, defaults, working !== undefined, working?.action);
      const base = row?.measurement.baseBranch ?? '';
      const connectViaBrowser = row?.measurement.connectViaBrowser === true;

      const dispatch = (result: GitClickResult): void => {
        if (result.kind === 'connect-github') {
          onConnectGithub();
        } else if (result.kind === 'open-browser') {
          noteBrowserOpen(worktreePath);
          window.open(result.url, '_blank', 'noopener');
        } else if (result.kind === 'send') {
          void store.click(worktreePath, result.action, t(result.key, { base }), useAgentStore.getState().pen);
        }
      };

      if (action.kind === 'action') {
        const pen = useAgentStore.getState().pen;
        const takeBack = takeBackFor(store.held[worktreePath], pen);
        if (takeBack !== undefined) {
          void store.click(worktreePath, takeBack.action, takeBack.text, pen);
          return;
        }
        if (working !== undefined || actionFor(state, canSubmit, connectViaBrowser).kind === 'none') {
          noteNoActionPress(worktreePath, working !== undefined ? 'working' : promptKeyFor(state) === undefined ? 'passive-state' : 'agent-unavailable');
          return;
        }
        dispatch(actionFor(state, canSubmit, connectViaBrowser));
        return;
      }
      const option = action.option as GitDropdownOption;
      if (isNoPrOption(option)) void store.setDefault({ noPr: option });
      else if (isReadyOption(option)) void store.setDefault({ ready: option });
      dispatch(pickFor(state, option, canSubmit));
    });
  }, [onExitToProjects, onConnectGithub, isSwitching, worktreePath, row, defaults, working, canSubmit]);

  return null;
}
