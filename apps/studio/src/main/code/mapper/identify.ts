import type {
  CodeComponentMapResult,
  CodeIdentifyDecline,
  CodeIdentifyRequest,
  CodeIdentifyResult,
} from '@studio/events';
import { evaluateInGuest, type GuestSource } from '../../canvas/cdp.js';
import { forgetFrameReadings, onFrameLane } from './lane.js';
import { boundariesOf, componentMapSource } from './component-map.js';
import { readerSource, readingOf } from './reader.js';

export interface IdentifyDeps {
  frameId: string;
  /** The guest's web-contents id: the lane's key and the evaluation's target. */
  webContentsId: number | undefined;
  guests?: GuestSource;
}


/** An already-attached debugger is the ordinary case, not a fault: DevTools or an agent turn holds it. */
function declineFor(reason: string): CodeIdentifyDecline {
  if (reason.includes('already being debugged')) return 'attachment-unavailable';
  // The gate's own refusals — no live page, or an address that is not local.
  if (reason.includes('no live page') || reason.includes('not a local address') || reason.includes('went away')) {
    return 'unaddressable';
  }
  return 'failed';
}

export async function identifyComponent(
  deps: IdentifyDeps,
  request: CodeIdentifyRequest,
): Promise<CodeIdentifyResult> {
  if (deps.webContentsId === undefined) return { ok: false, decline: 'unaddressable' };

  return onFrameLane(deps.webContentsId, `${String(deps.webContentsId)}:${request.evidenceId}`, async () => {
    const answer = await evaluateInGuest(
      {
        frameId: deps.frameId,
        webContentsId: deps.webContentsId,
        localOnly: true,
        ...(deps.guests === undefined ? {} : { guests: deps.guests }),
      },
      readerSource(request.domPath),
    );
    if (!answer.ok) return { ok: false as const, decline: declineFor(answer.reason) };
    if ('navigatedTo' in answer) return { ok: false as const, decline: 'failed' as const };
    try {
      return { ok: true as const, reading: readingOf(JSON.parse(answer.value) as unknown) };
    } catch {
      return { ok: false as const, decline: 'failed' as const };
    }
  });
}

/** Which page load each Frame's readings were taken against, so a navigation can drop them. */
const loadSeen = new Map<number, string>();

/** `3:7` is read 7 of load 3; the LOAD is what makes a reading from the old DOM wrong. */
function loadOf(token: string): string {
  return token.split(':')[0] ?? token;
}

export async function readComponentMap(
  deps: IdentifyDeps,
  loadToken: string,
): Promise<CodeComponentMapResult> {
  if (deps.webContentsId === undefined) return { ok: false, decline: 'unaddressable' };

  const load = loadOf(loadToken);
  if (loadSeen.get(deps.webContentsId) !== load) {
    forgetFrameReadings(deps.webContentsId);
    loadSeen.set(deps.webContentsId, load);
  }

  // Never remembered: the token is fresh per read, so a cached answer could never be asked for again.
  return onFrameLane(deps.webContentsId, `map:${String(deps.webContentsId)}:${loadToken}`, async () => {
    const answer = await evaluateInGuest(
      {
        frameId: deps.frameId,
        webContentsId: deps.webContentsId,
        localOnly: true,
        ...(deps.guests === undefined ? {} : { guests: deps.guests }),
      },
      componentMapSource(),
    );
    if (!answer.ok) return { ok: false as const, decline: declineFor(answer.reason) };
    if ('navigatedTo' in answer) return { ok: false as const, decline: 'failed' as const };
    try {
      return { ok: true as const, boundaries: boundariesOf(JSON.parse(answer.value) as unknown) };
    } catch {
      return { ok: false as const, decline: 'failed' as const };
    }
  }, { remember: false });
}
