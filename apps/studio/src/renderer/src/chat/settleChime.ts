import type { AgentCommandAcceptance, PenView } from '@studio/events';
import { suppressesChime } from './penRow.js';

export interface ChimeWatch {
  wasStreaming: boolean;
  isStopRequested: boolean;
}

export function watchFrom(isStreaming: boolean): ChimeWatch {
  return { wasStreaming: isStreaming, isStopRequested: false };
}

export function requestStop(watch: ChimeWatch): ChimeWatch {
  return { ...watch, isStopRequested: true };
}

export function requestSteer(watch: ChimeWatch): ChimeWatch {
  return watch.wasStreaming ? requestStop(watch) : watch;
}

export async function sendWithChime(
  watch: { current: ChimeWatch },
  send: () => Promise<AgentCommandAcceptance>,
  answersQuestion: boolean,
): Promise<AgentCommandAcceptance> {
  const before = watch.current;
  const result = await send();
  if (result.accepted && !answersQuestion && watch.current === before) {
    watch.current = requestSteer(before);
  }
  return result;
}

export function settleStreaming(
  watch: ChimeWatch,
  isStreaming: boolean,
  pen: PenView | undefined,
): { watch: ChimeWatch; chimes: boolean } {
  if (isStreaming === watch.wasStreaming) return { watch, chimes: false };
  return {
    watch: { wasStreaming: isStreaming, isStopRequested: false },
    chimes: !isStreaming && !watch.isStopRequested && !suppressesChime(pen),
  };
}
