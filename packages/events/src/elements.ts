export const EVIDENCE_OUTER_HTML_MAX = 2048;
export const EVIDENCE_TEXT_MAX = 512;
export const EVIDENCE_ID_MAX = 128;
import { CLASS_MAX, FILENAME_MAX, FRAMES_MAX, FUNCTION_MAX, MESSAGE_MAX, type ScrubbedFrame } from './scrub.js';
import type { CanvasZoomAction } from './ipc-payloads.js';

export const EVIDENCE_TAG_MAX = 64;
export const EVIDENCE_DOM_PATH_MAX = 2048;
export const EVIDENCE_PATH_DEPTH_MAX = 64;
export const EVIDENCE_CLASS_MAX = 128;
export const EVIDENCE_CLASSES_MAX = 32;
export const EVIDENCE_FRAME_URL_MAX = 2048;
export const EVIDENCE_AGGREGATE_MAX_BYTES = 20 * 1024;

export const MAX_ELEMENT_SELECTIONS = 10;

export interface ElementEvidence {
  kind: 'element';
  id: string;
  tag: string;
  /** `tag:nth-of-type` segments, `>`-joined. */
  domPath: string;
  outerHtmlSnippet: string;
  textContent: string;
  classes: string[];
  frameUrl: string;
  stale?: boolean;
}

const EVIDENCE_KEYS = [
  'kind',
  'id',
  'tag',
  'domPath',
  'outerHtmlSnippet',
  'textContent',
  'classes',
  'frameUrl',
] as const;
const EVIDENCE_KEYS_WITH_STALE = [...EVIDENCE_KEYS, 'stale'] as const;

export function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function boundedString(value: unknown, maxBytes: number, allowEmpty = true): value is string {
  return (
    typeof value === 'string' &&
    (allowEmpty || value.length > 0) &&
    utf8Bytes(value) <= maxBytes
  );
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function isSecretMinimized(frameUrl: string, outerHtmlSnippet: string): boolean {
  try {
    const url = new URL(frameUrl);
    if (url.username || url.password || url.search || url.hash) return false;
  } catch {
    return false;
  }
  // Each quote closes only itself: `value="don't"` is one value, not `don` (ONL-2335).
  const values = /\svalue\s*=\s*(?:"([^"]*)"|'([^']*)')/giu;
  for (const match of outerHtmlSnippet.matchAll(values)) {
    if ((match[1] ?? match[2]) !== '[redacted]') return false;
  }
  const sensitive = /\s(?:[^\s=>]*(?:passw(?:or)?d|token|secret|auth|api[-_]?key|access[-_]?key)[^\s=>]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/giu;
  for (const match of outerHtmlSnippet.matchAll(sensitive)) {
    if ((match[1] ?? match[2]) !== '[redacted]') return false;
  }
  const urlAttributes = /\s(?:href|src|srcset|action|formaction|poster|cite|data|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)')/giu;
  for (const match of outerHtmlSnippet.matchAll(urlAttributes)) {
    const value = match[1] ?? match[2] ?? '';
    const candidates = match[0].trimStart().toLowerCase().startsWith('srcset')
      ? value.split(',').map((candidate) => candidate.trim().split(/\s/u, 1)[0] ?? '')
      : [value];
    for (const candidate of candidates) {
      if (/^(?:data|blob|javascript):/iu.test(candidate)) return false;
      if (/^(?:[a-z][a-z0-9+.-]*:\/\/|\/\/)[^/@\s]+@/iu.test(candidate)) return false;
      if (/[?#]/u.test(candidate)) return false;
    }
  }
  return true;
}

const TAG_SHAPE = /^[a-z][a-z0-9-]*$/u;

export function parseElementEvidence(value: unknown): ElementEvidence | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    (!hasExactKeys(record, EVIDENCE_KEYS) && !hasExactKeys(record, EVIDENCE_KEYS_WITH_STALE)) ||
    record.kind !== 'element'
  ) {
    return null;
  }
  if ('stale' in record && typeof record.stale !== 'boolean') return null;
  if (!boundedString(record.id, EVIDENCE_ID_MAX, false)) return null;
  if (!boundedString(record.tag, EVIDENCE_TAG_MAX, false) || !TAG_SHAPE.test(record.tag)) {
    return null;
  }
  if (!boundedString(record.domPath, EVIDENCE_DOM_PATH_MAX, false)) return null;
  if (record.domPath.split('>').length > EVIDENCE_PATH_DEPTH_MAX) return null;
  if (!boundedString(record.outerHtmlSnippet, EVIDENCE_OUTER_HTML_MAX)) return null;
  if (!boundedString(record.textContent, EVIDENCE_TEXT_MAX)) return null;
  if (!Array.isArray(record.classes) || record.classes.length > EVIDENCE_CLASSES_MAX) return null;
  if (
    !record.classes.every(
      (className) => boundedString(className, EVIDENCE_CLASS_MAX, false),
    )
  ) {
    return null;
  }
  if (!boundedString(record.frameUrl, EVIDENCE_FRAME_URL_MAX, false)) return null;
  if (!isSecretMinimized(record.frameUrl, record.outerHtmlSnippet)) return null;
  return record as unknown as ElementEvidence;
}

/** This door's own measure, exported so the renderer can refuse exactly what the door would discard (ONL-2455). */
export function withinAggregateBytes(evidence: readonly ElementEvidence[]): boolean {
  return utf8Bytes(JSON.stringify(evidence)) <= EVIDENCE_AGGREGATE_MAX_BYTES;
}

export function parseElementEvidenceBatch(value: unknown): ElementEvidence[] | null {
  if (!Array.isArray(value) || value.length > MAX_ELEMENT_SELECTIONS) return null;
  const admitted = value.map(parseElementEvidence);
  const counts = new Map<string, number>();
  for (const evidence of admitted) {
    if (evidence) counts.set(evidence.id, (counts.get(evidence.id) ?? 0) + 1);
  }
  const unique = admitted.filter(
    (evidence): evidence is ElementEvidence => evidence !== null && counts.get(evidence.id) === 1,
  );
  if (!withinAggregateBytes(unique)) return null;
  return unique;
}

export function isElementEvidence(value: unknown): value is ElementEvidence {
  return parseElementEvidence(value) !== null;
}

// Guest channel: webview <-> renderer only, so not an `ipc.ts` entry.

export const GUEST_CHANNEL_TO_GUEST = 'studio:picker';
export const GUEST_CHANNEL_TO_HOST = 'studio:picker';

export interface ElementSelectionSeed {
  id: string;
  domPath: string;
  tag: string;
  classes: string[];
  textContent: string;
}

/** Not a theme token: the guest cannot read the studio's CSS vars. */
export const PICKER_INK = 'color(display-p3 0.98 0 0.229)';
/** The component boundary's own ink, for the same reason. Purple, under the hover and selection boxes (ONL-2563). */
export const COMPONENT_INK = 'color(display-p3 0.62 0.36 0.98)';

export type PickerToGuest =
  | { type: 'arm'; generation: number }
  /** Sent whether armed or not: selected outlines outlive disarming. */
  | { type: 'zoom'; zoom: number; generation: number }
  | { type: 'hoverAt'; point: { x: number; y: number } | null; generation: number }
  /** ⌥ held: the guest draws the distances from the selection to the hovered element. */
  | { type: 'measure'; active: boolean; generation: number }
  | { type: 'pickAt'; point: { x: number; y: number }; shiftHeld: boolean; generation: number }
  /** Sent only from the diagnostics gate (ONL-2372). */
  | { type: 'pickPath'; selector: string; shiftHeld: boolean; generation: number }
  | { type: 'disarm'; generation: number }
  /** Interact hides the outlines and keeps the selection (ONL-2455) — never `clearSelections`, which takes the `held` bookkeeping with it. */
  | { type: 'outlineVisibility'; visible: boolean; generation: number }
  /** Sent only while the diagnostics gate is open (ONL-2455): a shipped build never sends it, so the guest reports no hover. */
  | { type: 'hoverReports'; enabled: boolean; generation: number }
  /** The page's component boundaries, read once per load in main's world and cached here (ONL-2563). */
  | { type: 'componentMap'; paths: string[]; generation: number }
  | { type: 'devThrow'; generation: number }
  | { type: 'clearSelections'; generation: number }
  | { type: 'removeSelection'; id: string; generation: number }
  | {
      type: 'seedSelections';
      selections: ElementSelectionSeed[];
      /** The host's open surface, so a re-seed restores which box reports its geometry (ONL-2455). */
      anchorId: string | null;
      generation: number;
    };

/** A seeded anchor is honoured only for an id the seed itself carries (ONL-2455). */
export function seededAnchorId(
  anchorId: string | null,
  selections: readonly ElementSelectionSeed[],
): string | null {
  if (anchorId === null) return null;
  return selections.some((selection) => selection.id === anchorId) ? anchorId : null;
}

/**
 * Suppression writes `visibility` alone (ONL-2455): `display` is the
 * placement's, so a hidden outline keeps its box and the restore needs no
 * re-seed. Here rather than in the guest, which has no test apparatus.
 */
export function setOutlineVisibility(style: { visibility: string }, visible: boolean): void {
  style.visibility = visible ? 'visible' : 'hidden';
}

export function seedOf(evidence: ElementEvidence): ElementSelectionSeed {
  return {
    id: evidence.id,
    domPath: evidence.domPath,
    tag: evidence.tag,
    classes: evidence.classes,
    textContent: evidence.textContent,
  };
}

/**
 * The guest's hover emit gate (ONL-2455): nothing leaves unless the host enabled
 * reports, and an identity this module's own parser would refuse reports as a
 * miss so the count keeps running.
 */
export function hoverReportFor(
  reportsEnabled: boolean,
  found: { tag: string; domPath: string } | null,
  hitTests: number,
): { type: 'hovered'; tag: string | null; domPath: string | null; hitTests: number } | null {
  if (!reportsEnabled) return null;
  if (!Number.isSafeInteger(hitTests) || hitTests < 0) return null;
  const miss = { type: 'hovered' as const, tag: null, domPath: null, hitTests };
  if (found === null) return miss;
  if (!boundedString(found.tag, EVIDENCE_TAG_MAX, false) || !TAG_SHAPE.test(found.tag)) return miss;
  if (!boundedString(found.domPath, EVIDENCE_DOM_PATH_MAX, false)) return miss;
  return { type: 'hovered', tag: found.tag, domPath: found.domPath, hitTests };
}

/** Guest client px, so a host placement past this is a clipped or off-screen bubble (ONL-2455). */
export const ANCHOR_RECT_MAX_PX = 100_000;

export interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function withinAnchorBound(value: unknown): boolean {
  return (
    typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= ANCHOR_RECT_MAX_PX
  );
}

function isAnchorRect(value: unknown): value is AnchorRect {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const rect = value as Record<string, unknown>;
  if (!hasExactKeys(rect, ['x', 'y', 'width', 'height'])) return false;
  if (!withinAnchorBound(rect.x) || !withinAnchorBound(rect.y)) return false;
  if (!withinAnchorBound(rect.width) || !withinAnchorBound(rect.height)) return false;
  return (rect.width as number) >= 0 && (rect.height as number) >= 0;
}

/** The guest's emit gate: one anchor reports, and never a rect this module's own parser would refuse (ONL-2455). */
export function anchorGeometryFor(
  anchorId: string | null,
  id: string,
  rect: AnchorRect,
): { type: 'anchorGeometry'; id: string; rect: AnchorRect } | null {
  if (anchorId === null || anchorId !== id || !isAnchorRect(rect)) return null;
  return { type: 'anchorGeometry', id, rect };
}

export type PickerToHost =
  | { type: 'picked'; evidence: ElementEvidence; shiftHeld: boolean; generation: number }
  | { type: 'refreshed'; evidence: ElementEvidence; generation: number }
  /** The anchor element's box in guest client px, never a field on `ElementEvidence`: the agent must not see it (ONL-2455). */
  | { type: 'anchorGeometry'; id: string; rect: AnchorRect; generation: number }
  | { type: 'deselected'; id: string; generation: number }
  | { type: 'staleness'; id: string; stale: boolean; generation: number }
  | { type: 'escape'; generation: number }
  /** The answer to a `hoverReports` enable (ONL-2455): what the hit-test found, and how many the guest has performed. */
  | {
      type: 'hovered';
      tag: string | null;
      domPath: string | null;
      hitTests: number;
      generation: number;
    }
  | {
      type: 'wheel';
      deltaY: number;
      clientX: number;
      clientY: number;
      isPinch: boolean;
      generation: number;
    }
  /** The page added or removed nodes and then went quiet. Carries nothing about them: it exists so the component map can be re-read after a late render (ONL-2563). */
  | { type: 'dom-settled'; generation: number }
  /** A right-click on an element, in guest client px. Carries no evidence: the pick it rides on sent that (ONL-2563). */
  | { type: 'context-menu'; clientX: number; clientY: number; generation: number }
  /** Relayed from the guest, not read in main: ⇧ chords produce text, and only the guest knows whether a field is focused (ONL-1979). */
  | { type: 'zoom-chord'; action: CanvasZoomAction; generation: number }
  /** A Space hold that began with focus inside the guest, where the host's key listeners cannot hear it. */
  | { type: 'space-pan'; held: boolean; generation: number }
  | { type: 'error'; report: GuestErrorReport; generation: number };

export interface GuestErrorReport {
  type: string;
  value: string;
  frames: ScrubbedFrame[];
}

function scrubbedString(value: unknown, max: number, allowEmpty = true): value is string {
  return typeof value === 'string' && (allowEmpty || value.length > 0) && value.length <= max;
}

function parseGuestErrorReport(value: unknown): GuestErrorReport | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!hasExactKeys(record, ['type', 'value', 'frames'])) return null;
  if (!scrubbedString(record.type, CLASS_MAX, false) || !scrubbedString(record.value, MESSAGE_MAX)) return null;
  if (!Array.isArray(record.frames) || record.frames.length > FRAMES_MAX) return null;
  const frames: ScrubbedFrame[] = [];
  for (const frame of record.frames) {
    if (typeof frame !== 'object' || frame === null) return null;
    const f = frame as Record<string, unknown>;
    if (!scrubbedString(f.filename, FILENAME_MAX) || !scrubbedString(f.function, FUNCTION_MAX)) return null;
    if (typeof f.in_app !== 'boolean') return null;
    if (f.platform !== 'web:javascript') return null;
    if (f.lineno !== undefined && !Number.isSafeInteger(f.lineno)) return null;
    if (f.colno !== undefined && !Number.isSafeInteger(f.colno)) return null;
    frames.push({
      platform: f.platform,
      filename: f.filename,
      function: f.function,
      ...(f.lineno === undefined ? {} : { lineno: f.lineno as number }),
      ...(f.colno === undefined ? {} : { colno: f.colno as number }),
      in_app: f.in_app,
    });
  }
  return { type: record.type, value: record.value, frames };
}

export function parsePickerToHost(value: unknown): PickerToHost | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!Number.isSafeInteger(record.generation) || (record.generation as number) < 0) return null;
  switch (record.type) {
    case 'picked': {
      if (!hasExactKeys(record, ['type', 'evidence', 'shiftHeld', 'generation'])) return null;
      const evidence = parseElementEvidence(record.evidence);
      if (!evidence || typeof record.shiftHeld !== 'boolean') return null;
      return {
        type: 'picked',
        evidence,
        shiftHeld: record.shiftHeld,
        generation: record.generation as number,
      };
    }
    case 'refreshed': {
      if (!hasExactKeys(record, ['type', 'evidence', 'generation'])) return null;
      const evidence = parseElementEvidence(record.evidence);
      return evidence
        ? { type: 'refreshed', evidence, generation: record.generation as number }
        : null;
    }
    case 'anchorGeometry': {
      if (!hasExactKeys(record, ['type', 'id', 'rect', 'generation'])) return null;
      if (!boundedString(record.id, EVIDENCE_ID_MAX, false)) return null;
      if (!isAnchorRect(record.rect)) return null;
      return {
        type: 'anchorGeometry',
        id: record.id,
        rect: record.rect,
        generation: record.generation as number,
      };
    }
    case 'deselected':
      return hasExactKeys(record, ['type', 'id', 'generation']) && boundedString(record.id, EVIDENCE_ID_MAX, false)
        ? { type: 'deselected', id: record.id, generation: record.generation as number }
        : null;
    case 'staleness':
      return hasExactKeys(record, ['type', 'id', 'stale', 'generation']) &&
        boundedString(record.id, EVIDENCE_ID_MAX, false) &&
        typeof record.stale === 'boolean'
        ? {
            type: 'staleness',
            id: record.id,
            stale: record.stale,
            generation: record.generation as number,
          }
        : null;
    case 'escape':
      return hasExactKeys(record, ['type', 'generation'])
        ? { type: 'escape', generation: record.generation as number }
        : null;
    case 'dom-settled':
      return hasExactKeys(record, ['type', 'generation'])
        ? { type: 'dom-settled', generation: record.generation as number }
        : null;
    case 'space-pan':
      return hasExactKeys(record, ['type', 'held', 'generation']) && typeof record.held === 'boolean'
        ? { type: 'space-pan', held: record.held, generation: record.generation as number }
        : null;
    case 'hovered': {
      if (!hasExactKeys(record, ['type', 'tag', 'domPath', 'hitTests', 'generation'])) return null;
      if (!Number.isSafeInteger(record.hitTests) || (record.hitTests as number) < 0) return null;
      const isMiss = record.tag === null && record.domPath === null;
      if (!isMiss) {
        if (!boundedString(record.tag, EVIDENCE_TAG_MAX, false)) return null;
        if (!TAG_SHAPE.test(record.tag)) return null;
        if (!boundedString(record.domPath, EVIDENCE_DOM_PATH_MAX, false)) return null;
      }
      return {
        type: 'hovered',
        tag: isMiss ? null : (record.tag as string),
        domPath: isMiss ? null : (record.domPath as string),
        hitTests: record.hitTests as number,
        generation: record.generation as number,
      };
    }
    case 'error': {
      if (!hasExactKeys(record, ['type', 'report', 'generation'])) return null;
      const report = parseGuestErrorReport(record.report);
      return report ? { type: 'error', report, generation: record.generation as number } : null;
    }
    case 'wheel': {
      if (!hasExactKeys(record, ['type', 'deltaY', 'clientX', 'clientY', 'isPinch', 'generation'])) {
        return null;
      }
      if (typeof record.isPinch !== 'boolean') return null;
      // Finite: a forged NaN leaves the canvas unrenderable.
      const numbers = [record.deltaY, record.clientX, record.clientY];
      if (!numbers.every((value) => typeof value === 'number' && Number.isFinite(value))) {
        return null;
      }
      return {
        type: 'wheel',
        deltaY: record.deltaY as number,
        clientX: record.clientX as number,
        clientY: record.clientY as number,
        isPinch: record.isPinch,
        generation: record.generation as number,
      };
    }
    case 'context-menu': {
      if (!hasExactKeys(record, ['type', 'clientX', 'clientY', 'generation'])) return null;
      // Finite, as the wheel arm's are: a forged NaN places the menu nowhere.
      const point = [record.clientX, record.clientY];
      if (!point.every((value) => typeof value === 'number' && Number.isFinite(value))) return null;
      return {
        type: 'context-menu',
        clientX: record.clientX as number,
        clientY: record.clientY as number,
        generation: record.generation as number,
      };
    }
    case 'zoom-chord': {
      if (!hasExactKeys(record, ['type', 'action', 'generation'])) return null;
      // Spelled out, not cast: an unknown action would reach a switch that does nothing.
      if (
        record.action !== 'in' &&
        record.action !== 'out' &&
        record.action !== 'reset' &&
        record.action !== 'fit' &&
        record.action !== 'selection'
      ) {
        return null;
      }
      return {
        type: 'zoom-chord',
        action: record.action,
        generation: record.generation as number,
      };
    }
    default:
      return null;
  }
}
