export const FRAME_CONSOLE_CAPACITY = 200;

export const FRAME_CONSOLE_LINE_MAX_CHARS = 2_000;

export const FRAME_FACTS_PUSH_MS = 250;

export type FrameHealth = 'loading' | 'live' | 'unreachable';

export interface FrameConsoleLine {
  level: 'log' | 'warning' | 'error';
  text: string;
}

export function truncateConsoleLine(line: FrameConsoleLine): FrameConsoleLine {
  if (line.text.length <= FRAME_CONSOLE_LINE_MAX_CHARS) return line;
  return { ...line, text: `${line.text.slice(0, FRAME_CONSOLE_LINE_MAX_CHARS)}…` };
}

/** Momentary facts; the canvas document does not carry these (ONL-1995). */
export interface FrameFacts {
  id: string;
  /** Where the guest is now, not the document's `homeUrl`. */
  currentUrl: string;
  health: FrameHealth;
  title: string;
  /** Reused after a remount: a stale id addresses another page without failing. */
  webContentsId?: number;
  /** A navigation in flight. This and `loadFailed` reach main up to `FRAME_FACTS_PUSH_MS` after the screen shows them. */
  targetUrl?: string;
  loadFailed?: true;
}

export interface FrameFactsPush {
  docId: string;
  frames: FrameFacts[];
  console?: { id: string; lines: FrameConsoleLine[] }[];
}

export interface MirroredFrame extends FrameFacts {
  /** Drained by each read. */
  console: FrameConsoleLine[];
  errorCount: number;
}
