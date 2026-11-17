import {
  isRecord,
  isReportLane,
  REPORT_ENTRY_POINTS,
  REPORT_MESSAGE_MAX,
  verifiedSubject,
  type ReportEntryPoint,
  type ReportRefusalReason,
  type StudioIdentity,
} from '@studio/events';
import type { TelemetryProperties } from '../telemetry/events.js';

export type ReportProperties = TelemetryProperties<'report_submitted'>;

export type ReportComposition =
  | { ok: true; properties: ReportProperties }
  | { ok: false; reason: Extract<ReportRefusalReason, 'empty' | 'too-long' | 'malformed'> };

function isEntryPoint(value: unknown): value is ReportEntryPoint {
  return (REPORT_ENTRY_POINTS as readonly unknown[]).includes(value);
}

// Trimmed and bounded, never inspected: the body is the user's own words, sent because they asked (ONL-2350).
// Field by field, no spread: a spread lets a smuggled property cross the `telemetry/events.ts` guardrail.
export function composeReport(
  request: unknown,
  installId: string,
  identity: StudioIdentity | null = null,
): ReportComposition {
  if (!isRecord(request)) return { ok: false, reason: 'malformed' };
  const { lane, entryPoint, message } = request;
  if (!isReportLane(lane) || !isEntryPoint(entryPoint) || typeof message !== 'string') {
    return { ok: false, reason: 'malformed' };
  }
  const trimmed = message.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'empty' };
  if (trimmed.length > REPORT_MESSAGE_MAX) return { ok: false, reason: 'too-long' };
  const accountId = verifiedSubject(identity);
  return {
    ok: true,
    properties: {
      lane,
      entry_point: entryPoint,
      install_id: installId,
      message: trimmed,
      ...(identity === null ? {} : { email: identity.email }),
      ...(accountId === undefined ? {} : { account_id: accountId }),
      $geoip_disable: true,
      $ip: null,
    },
  };
}
