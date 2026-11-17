import { t } from '@studio/i18n';

export interface WorkingRowState {
  phase: 'idle' | 'working' | 'done';
  frameIds: string[];
}

export type WorkingRowAction =
  | { type: 'frames'; frameIds: string[] }
  | { type: 'streaming'; isStreaming: boolean }
  /** A new chat replaces the session; the row belongs to the chat that ran it (ONL-2556). */
  | { type: 'reset' };

export const INITIAL_WORKING_ROW_STATE: WorkingRowState = { phase: 'idle', frameIds: [] };

export function workingRowReducer(state: WorkingRowState, action: WorkingRowAction): WorkingRowState {
  switch (action.type) {
    case 'reset':
      return INITIAL_WORKING_ROW_STATE;
    case 'streaming':
      if (action.isStreaming) {
        return { phase: 'working', frameIds: [] };
      }
      return state.phase === 'idle' ? state : { ...state, phase: 'done' };
    case 'frames':
      // An empty push is main clearing the canvas overlay at turn end; the row's persistence is streaming-driven.
      if (action.frameIds.length === 0) return state;
      if (state.phase === 'idle') return state;
      return { phase: state.phase, frameIds: action.frameIds };
  }
}

export interface WorkingRowCopy {
  phase: 'working' | 'done';
  text: string;
}

export interface ResolvedFrame {
  name: string;
  link: string;
}

export function workingRowCopy(
  state: WorkingRowState,
  resolveFrame: (frameId: string) => ResolvedFrame | undefined,
): WorkingRowCopy | undefined {
  if (state.phase !== 'done') return undefined;
  const frames = state.frameIds
    .map(resolveFrame)
    .filter((frame): frame is ResolvedFrame => frame !== undefined);

  if (frames.length === 0) return { phase: 'done', text: t('chat.workingRow.doneGeneric') };
  if (frames.length === 1) {
    return { phase: 'done', text: t('chat.workingRow.done', { frame: frames[0]!.link }) };
  }
  return {
    phase: 'done',
    text: t('chat.workingRow.doneMany', { frames: frames.map((frame) => frame.link).join(t('chat.workingRow.separator')) }),
  };
}
