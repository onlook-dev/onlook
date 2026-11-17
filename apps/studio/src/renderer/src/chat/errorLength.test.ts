import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { brotliDecompressSync } from 'node:zlib';
import { failedTurnFacts, failureLine, NOTICE_INSET, type ChatStrings, type FailureContext } from '@studio/chat-ui';
import { PANEL_LIMITS, type HarnessId, type ProviderRetry, type TranscriptItem } from '@studio/events';
import { studioTheme } from '../theme/studio.js';
import { CHAT_FIXTURE_STRINGS } from '../dev/ChatFixture.js';
import { t } from '@studio/i18n';
import { failureStrings } from './failureStrings.js';
import { providerNotice } from './providerNotice.js';

const MAX_LINES = 3;
const REPRESENTATIVE_FILE = 'src/components/ProductDetailsCard.tsx';

const WOFF2_TAGS = 'cmap head hhea hmtx maxp name OS/2 post cvt  fpgm glyf loca prep CFF  VORG EBDT EBLC gasp hdmx kern LTSH PCLT VDMX vhea vmtx BASE GDEF GPOS GSUB EBSC JSTF MATH CBDT CBLC COLR CPAL SVG  sbix acnt avar bdat bloc bsln cvar fdsc feat fmtx fvar gvar hsty just lcar mort morx opbd prop trak Zapf Silf Glat Gloc Feat Sill'
  .match(/.{4}\s?/g)!
  .map((tag) => tag.slice(0, 4));

/** Inter's default instance is weight 400, so `hmtx` holds the supporting text's advances; GPOS kerning is left out, which only ever reads wider. */
function interAdvances(): { unitsPerEm: number; advance: (codePoint: number) => number } {
  const require = createRequire(import.meta.url);
  const css = require.resolve('@fontsource-variable/inter/index.css');
  const file = readFileSync(join(dirname(css), 'files', 'inter-latin-wght-normal.woff2'));
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  if (view.getUint32(0) !== 0x774f4632) throw new Error('not a woff2 file');
  const tableCount = view.getUint16(12);
  let at = 48;
  const base128 = (): number => {
    let value = 0;
    for (;;) {
      const byte = view.getUint8(at++);
      value = value * 128 + (byte & 0x7f);
      if ((byte & 0x80) === 0) return value;
    }
  };
  const entries: { tag: string; length: number; transformed: boolean }[] = [];
  for (let index = 0; index < tableCount; index += 1) {
    const flags = view.getUint8(at++);
    let tag = WOFF2_TAGS[flags & 0x3f] ?? '';
    if ((flags & 0x3f) === 0x3f) {
      tag = String.fromCharCode(...file.subarray(at, at + 4));
      at += 4;
    }
    const version = flags >> 6;
    const original = base128();
    const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0;
    entries.push({ tag, length: transformed ? base128() : original, transformed });
  }
  const data = brotliDecompressSync(file.subarray(at));
  const tables = new Map<string, DataView>();
  let offset = 0;
  for (const entry of entries) {
    if (!entry.transformed) tables.set(entry.tag, new DataView(data.buffer, data.byteOffset + offset, entry.length));
    offset += entry.length;
  }
  const head = tables.get('head');
  const hhea = tables.get('hhea');
  const hmtx = tables.get('hmtx');
  const cmap = tables.get('cmap');
  if (!head || !hhea || !hmtx || !cmap) throw new Error('Inter lost an untransformed head, hhea, hmtx or cmap table');
  const metrics = hhea.getUint16(34);
  let format4: DataView | undefined;
  for (let index = 0; index < cmap.getUint16(2); index += 1) {
    const record = 4 + index * 8;
    const sub = new DataView(cmap.buffer, cmap.byteOffset + cmap.getUint32(record + 4));
    if (cmap.getUint16(record) === 3 && cmap.getUint16(record + 2) === 1 && sub.getUint16(0) === 4) format4 = sub;
  }
  if (format4 === undefined) throw new Error('Inter has no Unicode BMP cmap');
  const sub = format4;
  const segments = sub.getUint16(6) / 2;
  const glyphOf = (codePoint: number): number => {
    for (let segment = 0; segment < segments; segment += 1) {
      const end = sub.getUint16(14 + segment * 2);
      if (codePoint > end) continue;
      const startAt = 16 + segments * 2 + segment * 2;
      const start = sub.getUint16(startAt);
      if (codePoint < start) return 0;
      const delta = sub.getInt16(startAt + segments * 2);
      const rangeAt = startAt + segments * 4;
      const range = sub.getUint16(rangeAt);
      if (range === 0) return (codePoint + delta) & 0xffff;
      const glyph = sub.getUint16(rangeAt + range + (codePoint - start) * 2);
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }
    return 0;
  };
  return {
    unitsPerEm: head.getUint16(18),
    advance: (codePoint) => hmtx.getUint16(Math.min(glyphOf(codePoint), metrics - 1) * 4),
  };
}

const INTER = interAdvances();
const tokens = studioTheme.tokens as Record<string, string>;
const remPx = (value: string | undefined): number => parseFloat(value ?? 'NaN') * 16;
const SUPPORTING_PX = remPx(tokens['--font-size-sm']);
const HAIRLINE = parseFloat(tokens['--border-width'] ?? 'NaN');
/** Astryx's `--spacing-N` is 4 px a step. */
const step = (n: number): number => n * 4;
const tooltipBox = parseFloat(/\.astryx-tooltip \{[^}]*?max-width: ([\d.]+)px/.exec(readFileSync(new URL('../theme/studio.css', import.meta.url), 'utf8'))?.[1] ?? 'NaN');

/** `ChatMessageList`'s compact inline padding, and the tooltip's inner padding as the theme re-points it. */
const LIST_INSET_STEPS = 3;
const TOOLTIP_INSET_STEPS = 1.5;

const WIDTH = {
  notice: PANEL_LIMITS.end.min - HAIRLINE - 2 * step(NOTICE_INSET.frame) - 2 * step(NOTICE_INSET.card),
  line: PANEL_LIMITS.end.min - HAIRLINE - 2 * step(LIST_INSET_STEPS),
  hover: tooltipBox - 2 * HAIRLINE - 2 * step(TOOLTIP_INSET_STEPS),
};

function textWidth(text: string): number {
  let units = 0;
  for (const char of text) units += INTER.advance(char.codePointAt(0) ?? 0);
  return (units * SUPPORTING_PX) / INTER.unitsPerEm;
}

/** Greedy, as Chrome wraps: at spaces, and after a hyphen or a dash. */
function lineCount(text: string, width: number): number {
  const pieces = text.match(/[^\s\-—]+[-—]?|[-—]|\s+/g) ?? [];
  let lines = 1;
  let current = '';
  for (const piece of pieces) {
    const next = current + piece;
    if (current.trim() !== '' && piece.trim() !== '' && textWidth(next.trimEnd()) > width) {
      lines += 1;
      current = piece;
    } else {
      current = next;
    }
  }
  return lines;
}

type Surface = 'notice' | 'line' | 'hover';
interface Reading { surface: Surface; what: string; text: string }

const NOW = new Date(2026, 10, 4, 23, 0).getTime();
const HOUR = 3600;
type ErrorItem = Extract<TranscriptItem, { kind: 'error' }>;
const failed = (over: Partial<ErrorItem>): ErrorItem => ({ kind: 'error', id: 'e', message: '', code: 'unknown', retry: { text: 'Make it warmer.' }, ...over });
const ERRORS: Record<string, ErrorItem> = {
  billing: failed({ code: 'billing_error' }),
  'session limit': failed({ code: 'rate_limited', limit: { window: 'session', resetsAt: NOW / 1000 + 2 * HOUR } }),
  'weekly limit': failed({ code: 'rate_limited', limit: { window: 'weekly', resetsAt: NOW / 1000 + 72 * HOUR } }),
  'credits limit': failed({ code: 'rate_limited', limit: { window: 'credits', resetsAt: NOW / 1000 + 2 * HOUR } }),
  'unknown limit': failed({ code: 'usage_limit_exceeded' }),
  'too many': failed({ code: 'rate_limited' }),
  'too many 429': failed({ code: 'api_error', apiErrorStatus: 429 }),
  credential: failed({ code: 'credential_rejected' }),
  'service 529': failed({ code: 'api_error', apiErrorStatus: 529 }),
  'service 500': failed({ code: 'api_error', apiErrorStatus: 500 }),
  service: failed({ code: 'api_error' }),
  'api 400': failed({ code: 'api_error', apiErrorStatus: 400 }),
  crash: failed({ code: 'spawn_failed' }),
  silent: failed({ code: 'unknown' }),
  ...Object.fromEntries((['prompt_too_long', 'image_error', 'model_error', 'hook_stopped', 'tool_use_failed', 'turn_setup_failed', 'max_turns', 'max_budget'] as const).map((code) => [code, failed({ code })])),
};

const ask: TranscriptItem = { kind: 'user', id: 'u', text: 'Make it warmer.' };
const later: TranscriptItem = { ...ask, id: 'u2' };
const edited = (target: string): TranscriptItem => ({ kind: 'tools', id: 't', calls: [{ id: 'c', kind: 'edit', name: 'Edit', target, status: 'completed' }] as never });

function stringsFor(harness: HarnessId): ChatStrings {
  const [agent, other] = harness === 'claude' ? [t('agent.name.claude'), t('agent.name.codex')] : [t('agent.name.codex'), t('agent.name.claude')];
  return { ...CHAT_FIXTURE_STRINGS, errorRetryAction: t('chat.error.retry'), failure: failureStrings(agent, other) };
}

function errorReadings(): Reading[] {
  const readings: Reading[] = [];
  for (const harness of ['claude', 'codex'] as const) {
    const strings = stringsFor(harness);
    const copy = strings.failure;
    for (const [name, item] of Object.entries(ERRORS)) {
      for (const other of [undefined, { ready: true }, { ready: false }]) {
        for (const landed of [undefined, edited(REPRESENTATIVE_FILE), edited('')]) {
          for (const isFollowed of [false, true]) {
            const items = [ask, ...(landed ? [landed] : []), item, ...(isFollowed ? [later] : [])];
            const ctx: FailureContext = { harness, ...(other ? { other } : {}), hasBillingLink: true, now: NOW };
            const reading = failureLine(item, ctx, failedTurnFacts(items, items.indexOf(item)), strings);
            if (reading.kind === 'none') continue;
            const what = `${harness} ${name}${other ? (other.ready ? ', other ready' : ', other to set up') : ''}${landed ? ', an edit landed' : ''}${isFollowed ? ', a later turn' : ''}`;
            if (reading.kind === 'notice' && reading.body !== undefined) readings.push({ surface: 'notice', what, text: reading.body });
            const labels = reading.line.actions.map((action) =>
              action.kind === 'retry' ? strings.errorRetryAction
              : action.kind === 'continue' ? copy.line.continue
              : action.kind === 'open-billing' ? copy.billingOpen
              : copy.useOther);
            readings.push({ surface: 'line', what, text: [reading.line.lead, ...labels].join(' ') });
            if (reading.line.detail !== undefined) readings.push({ surface: 'hover', what, text: reading.line.detail });
          }
        }
      }
    }
  }
  return readings;
}

function signInAndRetryReadings(): Reading[] {
  const agent = t('agent.name.claude');
  const copy = stringsFor('claude').failure.line;
  const retries: ProviderRetry[] = [{ status: 529, attempt: 12 }, { status: 529 }, { status: 500, attempt: 12 }, { status: null }, { status: 401, kind: 'cloud_credential_error', attempt: 12 }];
  return [
    { surface: 'notice', what: 'signed out', text: t('onboarding.chat.notice.signedOutBody') },
    { surface: 'hover', what: 'signing in', text: t('onboarding.setup.claude.signingIn.body') },
    { surface: 'hover', what: 'checking the sign-in', text: t('onboarding.setup.claude.checking.body') },
    { surface: 'line', what: 'signed out', text: `${fillAgent(copy.signedOut, agent)} ${copy.signIn}` },
    { surface: 'line', what: 'sign-in refused', text: `${fillAgent(copy.signInRejected, agent)} ${copy.signIn}` },
    { surface: 'line', what: 'signing in', text: t('onboarding.setup.claude.signingIn.title') },
    { surface: 'hover', what: 'signed out', text: copy.signedOutDetail },
    ...retries.flatMap((retrying): Reading[] => {
      const line = providerNotice({ isStreaming: true, retrying }, NOW, agent)?.line;
      return line === undefined ? [] : [{ surface: 'hover', what: `retrying ${retrying.status ?? 'no status'}`, text: line.detail }];
    }),
  ];
}

const fillAgent = (text: string, agent: string): string => text.replaceAll('{agent}', agent);

describe('chat error text fits three lines at the narrowest chat panel', () => {
  test('the widths resolve from the panel limits, the notice inset and the theme', () => {
    expect(Object.values(WIDTH).every((width) => Number.isFinite(width) && width > 100)).toBe(true);
  });

  test('the measure counts a four-line text as four lines', () => {
    const word = 'Nothing ';
    let text = '';
    while (textWidth(text.trimEnd()) <= 3 * WIDTH.notice) text += word;
    expect(lineCount(text.trimEnd(), WIDTH.notice)).toBe(4);
    expect(lineCount('Nothing was lost.', WIDTH.notice)).toBe(1);
  });

  test(`every notice body, error line and hover, with ${REPRESENTATIVE_FILE} as the edited file`, () => {
    const readings = [...errorReadings(), ...signInAndRetryReadings()];
    expect(readings.filter((reading) => reading.surface === 'notice').length).toBeGreaterThan(0);
    const over = readings
      .map((reading) => ({ ...reading, lines: lineCount(reading.text, WIDTH[reading.surface]) }))
      .filter((reading) => reading.lines > MAX_LINES)
      .map((reading) => `${reading.surface} (${reading.what}): ${reading.lines} lines: ${reading.text}`);
    expect([...new Set(over)]).toEqual([]);
  });

  test("a provider's own words in a limit stay out of the guard: the notice drops them", () => {
    const strings = stringsFor('claude');
    const item = failed({ code: 'usage_limit_exceeded', message: 'A very long sentence from the provider about its own plan rules. '.repeat(4) });
    const reading = failureLine(item, { harness: 'claude', other: { ready: true }, hasBillingLink: true, now: NOW }, failedTurnFacts([ask, item], 1), strings);
    expect(reading.kind === 'notice' ? lineCount(reading.body ?? '', WIDTH.notice) : 'not a notice').toBeLessThanOrEqual(MAX_LINES);
  });
});
