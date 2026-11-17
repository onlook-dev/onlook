/** A script's origin is judged on the mirrored current url, never the document's `homeUrl`: a local-homed frame can be on any page its app links to (ONL-1995). */

import {
  type EvaluateResult,
  type FrameCaptureResult,
  type FrameFacts,
} from '@studio/events';
import {
  captureGuest,
  captureGuestForThumbnail,
  clipGuest,
  evaluateInGuest,
  isArtifactPage,
  isWebPage,
  readGuestFrame,
  webOnlyRefusal,
  type FrameReadResult,
  type ClipGuestDeps,
  type ClipGuestResult,
  type GuestCommandDeps,
  type GuestImageResult,
  type ThumbnailGuestDeps,
} from './cdp.js';
import type { ClipTarget } from './clip.js';
import type { RevealFacts } from './capture-view.js';
import type { FrameMirrorReader } from './mirror.js';

type PageLookup = { facts: FrameFacts } | { refusal: { ok: false; reason: string } };

/** The canvas page holding the frame, passed only when it is not the page the canvas is showing — which is the page whose guests are mounted (ONL-2488). */
export interface OffPage {
  name: string;
}

// `peek`, not `read`: `read` drains console lines `list_frames` promised the agent.
function peekPage(
  mirror: FrameMirrorReader,
  docId: string,
  frameId: string,
  offPage?: OffPage,
): PageLookup {
  if (offPage !== undefined) {
    return {
      refusal: {
        ok: false,
        reason:
          `frame ${frameId} is on page "${offPage.name}", which the canvas is not showing, so its ` +
          `page is not mounted. The frame is still there: list_frames reports it, and it can be ` +
          `moved, renamed and removed by id.`,
      },
    };
  }
  const facts = mirror.peek(docId, frameId);
  if (facts === undefined) {
    return {
      refusal: {
        ok: false,
        reason: `frame ${frameId} has no live page — it may not be open yet, or may not exist`,
      },
    };
  }
  return { facts };
}

function admitScriptPage(
  mirror: FrameMirrorReader,
  docId: string,
  frameId: string,
  offPage?: OffPage,
  artifactId?: string,
): PageLookup {
  const peeked = peekPage(mirror, docId, frameId, offPage);
  if ('refusal' in peeked) return peeked;
  const { currentUrl } = peeked.facts;
  if (artifactId === undefined ? !isWebPage(currentUrl) : !isArtifactPage(currentUrl, artifactId)) {
    return { refusal: { ok: false, reason: artifactId === undefined ? webOnlyRefusal(currentUrl) : `refused: ${currentUrl} is not this Artifact's page.` } };
  }
  return peeked;
}

export interface EvaluateDeps {
  mirror: FrameMirrorReader;
  docId: string;
  frameId: string;
  script: string;
  artifactId?: string;
  offPage?: OffPage;
  run?: (deps: GuestCommandDeps, script: string) => Promise<EvaluateResult>;
}

export async function evaluateInFrame(deps: EvaluateDeps): Promise<EvaluateResult> {
  const { mirror, docId, frameId, script, offPage } = deps;
  const run = deps.run ?? evaluateInGuest;

  const admitted = admitScriptPage(mirror, docId, frameId, offPage, deps.artifactId);
  if ('refusal' in admitted) return admitted.refusal;

  return run({ frameId, webContentsId: admitted.facts.webContentsId, ...(deps.artifactId === undefined ? {} : { artifactId: deps.artifactId }) }, script);
}

export interface ReadFrameDeps {
  mirror: FrameMirrorReader;
  docId: string;
  frameId: string;
  artifactId?: string;
  offPage?: OffPage;
  run?: (deps: GuestCommandDeps) => Promise<FrameReadResult>;
}

export async function readFrame(deps: ReadFrameDeps): Promise<FrameReadResult> {
  const { mirror, docId, frameId, offPage } = deps;
  const run = deps.run ?? readGuestFrame;
  const admitted = admitScriptPage(mirror, docId, frameId, offPage, deps.artifactId);
  if ('refusal' in admitted) return admitted.refusal;
  return run({ frameId, webContentsId: admitted.facts.webContentsId, ...(deps.artifactId === undefined ? {} : { artifactId: deps.artifactId }) });
}

export interface CaptureDeps {
  mirror: FrameMirrorReader;
  docId: string;
  frameId: string;
  artifactId?: string;
  offPage?: OffPage;
  revealed?: RevealFacts;
  run?: (deps: GuestCommandDeps) => Promise<FrameCaptureResult>;
}

/** Any page a Frame shows: it is on the Canvas for the Onlook Agent to see (ONL-2658). */
export async function captureFrame(deps: CaptureDeps): Promise<FrameCaptureResult> {
  const { mirror, docId, frameId, offPage } = deps;
  const run = deps.run ?? captureGuest;

  const peeked = peekPage(mirror, docId, frameId, offPage);
  if ('refusal' in peeked) return peeked.refusal;

  return run({
    frameId,
    webContentsId: peeked.facts.webContentsId,
    ...(deps.artifactId === undefined ? {} : { artifactId: deps.artifactId }),
    ...(deps.revealed === undefined ? {} : { revealed: deps.revealed }),
  });
}

export interface ClipDeps {
  mirror: FrameMirrorReader;
  docId: string;
  frameId: string;
  targets: readonly ClipTarget[];
  artifactId?: string;
  offPage?: OffPage;
  run?: (deps: ClipGuestDeps) => Promise<ClipGuestResult>;
}

export async function clipFrame(deps: ClipDeps): Promise<ClipGuestResult> {
  const { mirror, docId, frameId, offPage, targets } = deps;
  const run = deps.run ?? clipGuest;

  const peeked = peekPage(mirror, docId, frameId, offPage);
  if ('refusal' in peeked) return { ok: false, reason: peeked.refusal.reason, retried: false };

  return run({ frameId, targets, webContentsId: peeked.facts.webContentsId, ...(deps.artifactId === undefined ? {} : { artifactId: deps.artifactId }) });
}

export interface ThumbnailFrameDeps {
  mirror: FrameMirrorReader;
  docId: string;
  frameId: string;
  deadlineMs: number;
  run?: (deps: ThumbnailGuestDeps) => Promise<GuestImageResult>;
}

/** The image never reaches the agent (ONL-2471). */
export async function captureFrameForThumbnail(
  deps: ThumbnailFrameDeps,
): Promise<GuestImageResult> {
  const { mirror, docId, frameId, deadlineMs } = deps;
  const run = deps.run ?? captureGuestForThumbnail;

  const peeked = peekPage(mirror, docId, frameId);
  if ('refusal' in peeked) return peeked.refusal;

  return run({ frameId, webContentsId: peeked.facts.webContentsId, deadlineMs });
}
