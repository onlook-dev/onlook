import { isRecord } from '@studio/events';
import { join } from 'node:path';
import { readStateFile, writeStateFile } from '../state/file.js';
import { stateRoot } from '../state/root.js';

/** The cap on every text an attribution link carries: the raw link, the request URL it arrives on, and the encoded query. */
export const ATTRIBUTION_LIMIT = 16_384;

const CAMPAIGN_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const URL_FIELDS = ['initial_referrer', 'landing_page'] as const;
const ATTRIBUTION_FIELDS = ['ph_id', ...CAMPAIGN_FIELDS, ...URL_FIELDS, 'initial_referring_domain'] as const;
// Each first-touch person property the link sets, and the query key it is read from; a renamed key changes the `onlook://web-link` contract the cloud sends (ONL-3080).
const PROPERTY_FIELDS: Record<string, string> = {
  ...Object.fromEntries(CAMPAIGN_FIELDS.map((field) => [`first_${field}`, field])),
  first_referrer: 'initial_referrer',
  first_landing_page: 'landing_page',
  first_referring_domain: 'initial_referring_domain',
};

export const FIRST_TOUCH_PROPERTIES: readonly string[] = Object.keys(PROPERTY_FIELDS);

function isAttributionField(key: string): boolean {
  return ATTRIBUTION_FIELDS.some((field) => field === key);
}

export interface WebAttribution {
  phId: string;
  firstTouch: Record<string, string>;
}

export interface AttributionRecord {
  attribution: WebAttribution;
  queued: boolean;
  linked: boolean;
  boundTo?: string;
  legacyWebId?: string;
}

function text(value: string | null, limit: number): string | undefined {
  if (value === null) return undefined;
  if (value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function page(value: string | null): string | undefined {
  const clean = text(value, 2048);
  if (clean === undefined || clean === '$direct') return clean;
  try {
    const url = new URL(clean);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}

export function parseAttribution(params: URLSearchParams): WebAttribution | undefined {
  if (params.toString().length > ATTRIBUTION_LIMIT) return undefined;
  const seen = new Set<string>();
  for (const [key] of params) {
    if (!isAttributionField(key) || seen.has(key)) return undefined;
    seen.add(key);
  }
  const phId = text(params.get('ph_id'), 200);
  if (phId === undefined || /\s/.test(params.get('ph_id') ?? '')) return undefined;
  const firstTouch: Record<string, string> = {};
  for (const field of CAMPAIGN_FIELDS) {
    const value = text(params.get(field), 512);
    if (params.get(field) && value === undefined) return undefined;
    if (value !== undefined) firstTouch[`first_${field}`] = value;
  }
  for (const field of URL_FIELDS) {
    const value = page(params.get(field));
    if (params.get(field) && value === undefined) return undefined;
    if (value !== undefined) firstTouch[field === 'initial_referrer' ? 'first_referrer' : 'first_landing_page'] = value;
  }
  const domain = text(params.get('initial_referring_domain'), 253);
  if (params.get('initial_referring_domain') && domain === undefined) return undefined;
  if (domain !== undefined) {
    if (domain !== '$direct' && !domain.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) return undefined;
    firstTouch['first_referring_domain'] = domain.toLowerCase();
  }
  return { phId, firstTouch };
}

/** `onlook://web-link` names its values after the person properties they set; this reads them into the one query shape `parseAttribution` validates (ONL-3080). */
export function webLinkQuery(params: URLSearchParams): URLSearchParams | undefined {
  const query = new URLSearchParams();
  for (const [key, value] of params) {
    const field = key === 'ph_id' ? 'ph_id' : Object.hasOwn(PROPERTY_FIELDS, key) ? PROPERTY_FIELDS[key] : undefined;
    if (field === undefined || query.has(field)) return undefined;
    query.append(field, value);
  }
  return query;
}

/** Projects the documented keys out of a sign-in callback, which also carries `code` and `state`; a sender speaking `onlook://web-link`'s spelling is refused outright, since retaining its `ph_id` alone would block the real first touch for good (ONL-3080). */
export function attributionQuery(params: URLSearchParams): URLSearchParams {
  const attribution = new URLSearchParams();
  for (const [key, value] of params) {
    if (Object.hasOwn(PROPERTY_FIELDS, key)) return new URLSearchParams();
    if (isAttributionField(key)) attribution.append(key, value);
  }
  return attribution;
}

function attributionPath(): string {
  return join(stateRoot(), 'telemetry', 'web-attribution.json');
}

export function readWebAttribution(): AttributionRecord | undefined {
  try {
    const file = readStateFile(attributionPath(), 2);
    if (file.kind !== 'data' || (file.version !== 1 && file.version !== 2)) return undefined;
    const record = file.data as AttributionRecord & { useWebId?: boolean };
    if (record?.attribution === undefined || record.attribution === null || typeof record.queued !== 'boolean' || typeof record.linked !== 'boolean') return undefined;
    if (file.version === 1 && typeof record.useWebId !== 'boolean') return undefined;
    if (record.boundTo !== undefined && (typeof record.boundTo !== 'string' || text(record.boundTo, 200) !== record.boundTo)) return undefined;
    const { phId, firstTouch } = record.attribution;
    if (typeof phId !== 'string') return undefined;
    const validFirstTouch = isRecord(firstTouch) && !Array.isArray(firstTouch);
    if (!validFirstTouch && file.version === 2) return undefined;
    const params = new URLSearchParams({ ph_id: phId });
    if (parseAttribution(params) === undefined) return undefined;
    for (const [key, value] of validFirstTouch ? Object.entries(firstTouch) : []) {
      const field = Object.hasOwn(PROPERTY_FIELDS, key) ? PROPERTY_FIELDS[key] : undefined;
      if (field === undefined || typeof value !== 'string') {
        if (file.version === 1) continue;
        return undefined;
      }
      params.set(field, value);
      if (file.version === 1 && parseAttribution(params) === undefined) params.delete(field);
    }
    const attribution = parseAttribution(params);
    if (attribution === undefined) return undefined;
    const legacyWebId = file.version === 1 ? attribution.phId : record.legacyWebId;
    if (legacyWebId !== undefined && legacyWebId !== attribution.phId) return undefined;
    return {
      attribution,
      queued: file.version === 2 && record.queued,
      linked: file.version === 2 && record.linked,
      ...(record.boundTo === undefined ? {} : { boundTo: record.boundTo }),
      ...(legacyWebId === undefined ? {} : { legacyWebId }),
    };
  } catch {
    return undefined;
  }
}

export function retainAttribution(params: URLSearchParams): boolean {
  if (readWebAttribution() !== undefined) return false;
  const attribution = parseAttribution(params);
  if (attribution === undefined) return false;
  try {
    return writeStateFile(attributionPath(), 2, { attribution, queued: false, linked: false });
  } catch {
    return false;
  }
}

export function pendingAttribution(): WebAttribution | undefined {
  const record = readWebAttribution();
  return record?.queued === false && !record.linked ? record.attribution : undefined;
}

export function bindWebAttribution(workosId: string): boolean {
  if (text(workosId, 200) !== workosId) return false;
  const record = readWebAttribution();
  if (record === undefined) return false;
  if (record.boundTo !== undefined) return record.boundTo === workosId;
  try {
    return writeStateFile(attributionPath(), 2, { ...record, boundTo: workosId });
  } catch {
    return false;
  }
}

export function markAttributionQueued(linked = false): boolean {
  const record = readWebAttribution();
  if (record === undefined) return false;
  try {
    return writeStateFile(attributionPath(), 2, { ...record, queued: linked ? record.queued : true, linked: record.linked || linked });
  } catch {
    return false;
  }
}

/** The web ID a pre-link build may have merged on, read straight off a v1 file: the outbox scrub has to arm even when the receipts beside it no longer validate (ONL-3080). */
export function legacyWebIdOnDisk(): string | undefined {
  try {
    const file = readStateFile(attributionPath(), 2);
    if (file.kind !== 'data' || file.version !== 1) return undefined;
    const phId = (file.data as { attribution?: { phId?: unknown } } | null)?.attribution?.phId;
    return typeof phId === 'string' && text(phId, 200) === phId ? phId : undefined;
  } catch {
    return undefined;
  }
}
