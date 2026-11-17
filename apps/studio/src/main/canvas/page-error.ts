/** A frame's health comes from load events, and a dev server's error screen is a successful load: what the page is SHOWING is a separate reading (ONL-2297). */

import { localPort, type MirroredFrame } from '@studio/events';

/** `tsconfig.node.json` carries no DOM lib on purpose, and `readGuestPage` is shipped into the guest rather than run here: it names the shapes it touches. */
interface PageNodeLike {
  textContent: string | null;
}

interface PageQueryLike {
  querySelector(selectors: string): PageElementLike | null;
  querySelectorAll(selectors: string): ArrayLike<PageElementLike>;
}

export interface PageElementLike extends PageNodeLike, PageQueryLike {
  shadowRoot: (PageNodeLike & PageQueryLike) | null;
}

export interface PageRootLike extends PageQueryLike {
  body: { innerText: string } | null;
}

type PageErrorSource = 'vite' | 'next' | 'blank' | 'unreadable';

export interface FramePageError {
  source: PageErrorSource;
  message: string;
  /** Only an overlay that names one. */
  file?: string;
  /** The offending lines the overlay prints, newlines kept. */
  codeFrame?: string;
  stack?: string;
}

export interface GuestPageReading {
  overlay?: { source: 'vite' | 'next'; message: string; file?: string; codeFrame?: string; stack?: string };
  blank?: boolean;
}

/** `unaddressable` is the only silent one: a page we reached but could not read is a finding, not a clean bill (ONL-2297). */
export type GuestReadOutcome =
  | { read: true; reading: GuestPageReading }
  | { read: false; why: 'unaddressable' | 'failed' | 'timeout' };

export const PAGE_READ_DEADLINE_MS = 1_000;

/** `live` is the load event, which lands before a client-rendered app paints: a page is only blank if it is still blank on a second look (ONL-2297). */
const BLANK_CONFIRM_MS = 250;

const MESSAGE_MAX_CHARS = 600;
const CODE_FRAME_MAX_CHARS = 1_200;
/** A compile error's stack is the dev server's own plugin frames; it is carried short because the code frame above it is the part that locates the break. */
const STACK_MAX_CHARS = 400;

/** ⚠️ Serialized into the guest by `toString()`: it closes over nothing, so every helper stays inside it. */
export function readGuestPage(doc: PageRootLike): GuestPageReading {
  const collapse = (value: string | null | undefined): string =>
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  const textOf = (node: PageNodeLike | null): string => (node === null ? '' : collapse(node.textContent));
  // The code frame's whole value is its layout, so this one keeps the line breaks `collapse` removes.
  const linesOf = (node: PageNodeLike | null): string => {
    if (node === null) return '';
    const raw = typeof node.textContent === 'string' ? node.textContent : '';
    const lines = raw.split('\n').map((line) => line.replace(/\s+$/, ''));
    while (lines.length > 0 && lines[0] === '') lines.shift();
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    return lines.join('\n');
  };

  // An overlay that is up but says nothing still means the page is broken; an empty message would be discarded downstream.
  const spokenOr = (text: string): string => (text === '' ? 'the dev server is showing an error screen' : text);

  const vite = doc.querySelector('vite-error-overlay');
  if (vite !== null) {
    const within = vite.shadowRoot ?? vite;
    const spoken = collapse(
      `${textOf(within.querySelector('.plugin'))} ${textOf(within.querySelector('.message-body'))}`,
    );
    const file = textOf(within.querySelector('.file'));
    const codeFrame = linesOf(within.querySelector('.frame'));
    const stack = linesOf(within.querySelector('.stack'));
    return {
      overlay: {
        source: 'vite',
        message: spokenOr(spoken === '' ? textOf(vite) : spoken),
        ...(file === '' ? {} : { file }),
        ...(codeFrame === '' ? {} : { codeFrame }),
        ...(stack === '' ? {} : { stack }),
      },
    };
  }

  // Every portal, not the first: Next renders its dev indicator as a sibling portal.
  const portals = doc.querySelectorAll('nextjs-portal');
  for (let index = 0; index < portals.length; index += 1) {
    const portal = portals[index];
    if (portal === undefined) continue;
    const dialog = (portal.shadowRoot ?? portal).querySelector('[data-nextjs-dialog]');
    if (dialog === null) continue;
    return { overlay: { source: 'next', message: spokenOr(textOf(dialog)) } };
  }

  const body = doc.body;
  if (body !== null && collapse(body.innerText) !== '') return {};
  if (doc.querySelector('img, svg, canvas, video, picture, object, embed, iframe') !== null) return {};
  // Only once the cheap reads say nothing: `innerText` stops at a shadow boundary, so a Lit/Stencil app would read blank.
  const all = doc.querySelectorAll('*');
  for (let index = 0; index < all.length; index += 1) {
    const root = all[index]?.shadowRoot;
    if (root != null && collapse(root.textContent) !== '') return {};
  }
  return { blank: true };
}

export const GUEST_PAGE_READ_SCRIPT = `(${readGuestPage.toString()})(document)`;

/** A page that crossed from the guest: shape-checked, never trusted. */
export function readingOf(value: unknown): GuestPageReading | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { overlay, blank } = value as { overlay?: unknown; blank?: unknown };
  const reading: GuestPageReading = {};
  if (blank === true) reading.blank = true;
  if (typeof overlay === 'object' && overlay !== null) {
    const { source, message, file, codeFrame, stack } = overlay as {
      source?: unknown;
      message?: unknown;
      file?: unknown;
      codeFrame?: unknown;
      stack?: unknown;
    };
    const capped = (value: unknown, max: number): string | undefined =>
      typeof value === 'string' && value !== '' ? value.slice(0, max) : undefined;
    if ((source === 'vite' || source === 'next') && typeof message === 'string' && message !== '') {
      const shownFile = capped(file, MESSAGE_MAX_CHARS);
      const shownFrame = capped(codeFrame, CODE_FRAME_MAX_CHARS);
      const shownStack = capped(stack, STACK_MAX_CHARS);
      reading.overlay = {
        source,
        message: message.slice(0, MESSAGE_MAX_CHARS),
        ...(shownFile === undefined ? {} : { file: shownFile }),
        ...(shownFrame === undefined ? {} : { codeFrame: shownFrame }),
        ...(shownStack === undefined ? {} : { stack: shownStack }),
      };
    }
  }
  return reading;
}

export function derivePageError(outcome: GuestReadOutcome): FramePageError | undefined {
  if (!outcome.read) {
    // A frame with no page to address is already `loading` or `unreachable`; being unable to read a page we reached is not.
    if (outcome.why === 'unaddressable') return undefined;
    return {
      source: 'unreadable',
      message:
        outcome.why === 'timeout'
          ? `the page did not answer a read within ${PAGE_READ_DEADLINE_MS}ms — it may be stuck or blocked`
          : 'the page could not be read — it may be reloading',
    };
  }
  const { overlay, blank } = outcome.reading;
  if (overlay !== undefined) {
    return {
      source: overlay.source,
      message: overlay.message,
      ...(overlay.file === undefined ? {} : { file: overlay.file }),
      ...(overlay.codeFrame === undefined ? {} : { codeFrame: overlay.codeFrame }),
      ...(overlay.stack === undefined ? {} : { stack: overlay.stack }),
    };
  }
  if (blank === true) {
    return { source: 'blank', message: 'the page rendered no text and no images' };
  }
  return undefined;
}

export interface PageErrorsOptions {
  settle?: (ms: number) => Promise<void>;
  /**
   * Frames a previous call already confirmed blank. The page is still read every
   * call; only the confirm wait is skipped, since a page blank across two calls
   * has long since lost the mount race that wait guards (ONL-2297).
   */
  confirmedBlank?: Set<string>;
}

const settleByTimer = (ms: number): Promise<void> =>
  new Promise((done) => {
    setTimeout(done, ms);
  });

const confirmedBlankFrames = new Set<string>();

/** Recomputed from the live page on every read, so it never drains and it clears itself once the page is fixed (ONL-2297). */
export async function readPageErrors(
  frames: readonly MirroredFrame[],
  read: (frame: MirroredFrame) => Promise<GuestReadOutcome>,
  options: PageErrorsOptions = {},
): Promise<Map<string, FramePageError>> {
  const settle = options.settle ?? settleByTimer;
  const confirmedBlank = options.confirmedBlank ?? confirmedBlankFrames;
  const found = new Map<string, FramePageError>();
  const readable = new Set<string>();
  await Promise.all(
    frames.map(async (frame) => {
      if (frame.health !== 'live' || frame.webContentsId === undefined) return;
      // The same origin judgement the agent's other page reads take (`gate.ts`): a wandered-off page is not ours to describe.
      if (localPort(frame.currentUrl) === null) return;
      readable.add(frame.id);
      let outcome = await read(frame);
      if (outcome.read && outcome.reading.blank === true && !confirmedBlank.has(frame.id)) {
        await settle(BLANK_CONFIRM_MS);
        const confirming = await read(frame);
        // A confirming read that never answered leaves the blank verdict standing rather than downgrading it.
        if (confirming.read) outcome = confirming;
      }
      if (outcome.read) {
        if (outcome.reading.blank === true) confirmedBlank.add(frame.id);
        else confirmedBlank.delete(frame.id);
      }
      const error = derivePageError(outcome);
      if (error !== undefined) found.set(frame.id, error);
    }),
  );
  // A frame that left the canvas, went unreachable or wandered off keeps no verdict to skip a later confirm on.
  for (const id of [...confirmedBlank]) {
    if (!readable.has(id)) confirmedBlank.delete(id);
  }
  return found;
}
