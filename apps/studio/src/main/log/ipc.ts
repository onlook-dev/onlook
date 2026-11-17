// A type does not bind a compromised renderer: the shape is re-checked here and
// an off-union line is dropped.

import { LOG_LEVELS, isRecord, type LogLevel, type LogProcess, type RendererLogLine } from '@studio/events';
import { writeLine } from './index.js';

/** Where the renderers' lines arrive from. */
export type RendererLogLines = (receive: (payload: RendererLogLine) => void) => void;

const PROCESSES: readonly LogProcess[] = ['tab', 'chrome', 'task-manager'];

export function receiveRendererLog(payload: RendererLogLine): void {
  if (!isRecord(payload)) return;
  const { process: proc, level, subsystem, msg, fields } = payload;
  if (!(PROCESSES as readonly unknown[]).includes(proc)) return;
  if (!(LOG_LEVELS as readonly unknown[]).includes(level)) return;
  if (typeof subsystem !== 'string' || typeof msg !== 'string') return;
  if (fields !== undefined && !isRecord(fields)) return;
  writeLine(proc as LogProcess, level as LogLevel, subsystem, msg, fields);
}

export function registerLogHandlers(lines: RendererLogLines): void {
  lines(receiveRendererLog);
}
