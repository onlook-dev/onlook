import { writeFileSync } from 'node:fs';
import type { DebugCaptureFrame } from '@studio/events';
import { chromeTarget, readJson } from './cdp.js';

export type FrameImage = Omit<DebugCaptureFrame, 'result'> &
  ({ ok: true; out: string; bytes: number } | { ok: false; reason: string });

/** `capture_frame`'s own capture, written to `out` when it succeeds: the image the agent would read (ONL-3031). */
export async function captureFrameImage(
  app: { port: string | number },
  { worktreePath, frameId, out }: { worktreePath: string; frameId: string; out: string },
): Promise<FrameImage> {
  const answer = await readJson<DebugCaptureFrame | null>(
    await chromeTarget(app.port),
    `window.studioChrome?.debugCaptureFrame ? window.studioChrome.debugCaptureFrame(${JSON.stringify({ worktreePath, frameId })}) : null`,
  );
  if (answer === null) throw new Error('The running app exposes no `debugCaptureFrame`: only a dev build launched with AGENT_CDP_PORT registers it.');
  const { result, ...facts } = answer;
  if (!result.ok) return { ...facts, ok: false, reason: result.reason };
  const png = Buffer.from(result.pngBase64, 'base64');
  writeFileSync(out, png);
  return { ...facts, ok: true, out, bytes: png.length };
}
