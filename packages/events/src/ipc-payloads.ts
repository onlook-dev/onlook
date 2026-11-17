import type { PenTake } from './events.js';
import type { FrameShown } from './frame-shown.js';

/** `signed-out` when the CLI could not authenticate to check the model (ONL-2542). */
export type ModelRefusal = 'signed-out' | 'refused';

export interface AgentCommandAcceptance {
  accepted: boolean;
  /** Accepted into main's holding pen rather than handed to the agent, so no send failed (ONL-2294). */
  held?: boolean;
  /** Only a `pen.take` answers it, and only when the id it quoted still named the waiting prompt (ONL-2294). */
  taken?: PenTake;
  /** Only a refused `session.setModel` answers it (ONL-2542). */
  modelRefusal?: ModelRefusal;
}

export type CanvasZoomAction = 'in' | 'out' | 'reset' | 'fit' | 'selection';

export interface CanvasZoomCommand {
  action: CanvasZoomAction;
}

export interface AppInfo {
  version: string;
  /** `unknown` when the build had no git (ONL-1964). */
  commit: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  platform: string;
  isPackaged: boolean;
  /** `STUDIO_TIPS_EVERY_PROJECT=1`, read only by an unpackaged build: each early tip shows on every project, not just the first. */
  tipsEveryProject?: boolean;
  /** `STUDIO_TIP_MOMENT_GAP_MS`, read only by an unpackaged build (ONL-2960). */
  tipMomentGapMs?: number;
}

export interface PtyEchoRequest {
  text: string;
}

export interface PtyEchoResult {
  output: string;
  error?: string;
}

export interface ProjectSelected {
  /** A project's worktree, never the folder the user picked; agent-host refuses anything else (ONL-1829). */
  path: string;
  devUrl?: string;
}

export interface AgentSessionInfo {
  sessionId?: string;
  cwd?: string;
}

export interface AgentSnapshotRequest {
  sinceSeq?: number;
}

export interface AgentProbeRequest {
  fresh?: boolean;
}

export type FrameDestinationReadiness = 'pending' | 'ready' | 'retired';

export type EvaluateResult =
  | { ok: true; value: string }
  | { ok: true; navigatedTo: string }
  | { ok: false; reason: string };

/** Base64: a file would put a picture of the user's app on disk with no owner. */
export type FrameCaptureResult =
  | { ok: true; pngBase64: string; shown?: FrameShown }
  | { ok: false; reason: string; shown?: FrameShown };
