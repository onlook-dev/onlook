import { isLimitShaped, type RateLimitWindow, type StudioEvent, type TranscriptItem, type HarnessId, type RendererTelemetryEventMap } from '@studio/events';
import { intlLocale, t, type StringKey } from '@studio/i18n';

export function formatReset(resetsAt: number, now: number, locale: string | undefined = intlLocale(), weekday = false): string {
  const reset = new Date(resetsAt);
  const sameDay = reset.toDateString() === new Date(now).toDateString();
  return new Intl.DateTimeFormat(locale, {
    ...(sameDay && !weekday ? {} : { weekday: 'short' }),
    hour: 'numeric', minute: '2-digit',
  }).format(reset);
}

const WINDOW_LABELS: Readonly<Record<string, StringKey>> = {
  five_hour: 'chat.usage.limit.session',
  seven_day: 'chat.usage.limit.weekly',
  seven_day_opus: 'chat.usage.limit.opus',
  seven_day_sonnet: 'chat.usage.limit.sonnet',
  seven_day_overage_included: 'chat.usage.limit.included',
  overage: 'chat.usage.limit.overage',
};

function windowLabel(window: RateLimitWindow): string {
  const key = WINDOW_LABELS[window.kind];
  if (key) return t(key);
  if (window.windowDurationMins === 300) return t('chat.usage.limit.session');
  if (window.windowDurationMins === 10080) return t('chat.usage.limit.weekly');
  return window.label ?? window.kind;
}

export function planLimits(windows: readonly RateLimitWindow[], now = Date.now(), locale?: string) {
  return windows.flatMap((window) => {
    if (window.resetsAt !== undefined && window.resetsAt * 1000 <= now) return [];
    return [{
    id: window.kind,
    label: windowLabel(window),
    resetLabel: window.resetsAt === undefined ? '' : t('chat.usage.limit.reset', { when: formatReset(window.resetsAt * 1000, now, locale) }),
    percentLabel: window.usedPercent === undefined ? '' : `${Math.round(window.usedPercent)}%`,
    ...(window.usedPercent === undefined ? {} : { percent: window.usedPercent }),
    }];
  });
}

export function nextLimitReset(windows: readonly RateLimitWindow[], now = Date.now()): number | undefined {
  const future = windows.flatMap((window) => window.resetsAt !== undefined && window.resetsAt * 1000 > now ? [window.resetsAt * 1000] : []);
  return future.length === 0 ? undefined : Math.min(...future);
}

export interface LiveErrors {
  sessionId?: string;
  ids: ReadonlySet<string>;
}

export const NO_LIVE_ERRORS: LiveErrors = { ids: new Set() };

/** A resumed session re-emits its stored rows on the live stream with their original `ts`, so arrival alone does not make an error new (ONL-3174). */
export function recordLiveError(live: LiveErrors, event: StudioEvent, openedAt: number): LiveErrors {
  if (event.type !== 'session.error' || event.ts < openedAt) return live;
  const ids = live.sessionId === event.sessionId ? new Set(live.ids) : new Set<string>();
  ids.add(event.eventId);
  return { sessionId: event.sessionId, ids };
}

export function limitCardReports(
  items: readonly TranscriptItem[],
  agent: HarnessId,
  sessionId: string | undefined,
  live: LiveErrors,
  reported: Set<string>,
): RendererTelemetryEventMap['rate_limit_card_shown'][] {
  if (sessionId === undefined || live.sessionId !== sessionId) return [];
  return items.flatMap((item) => {
    const key = `${sessionId}:${item.id}`;
    if (reported.has(key)) return [];
    const report = limitCardReport(item, agent, live.ids);
    if (report === undefined) return [];
    reported.add(key);
    return [report];
  });
}

export function limitCardReport(item: TranscriptItem, agent: HarnessId, liveErrorIds: ReadonlySet<string>): RendererTelemetryEventMap['rate_limit_card_shown'] | undefined {
  if (!liveErrorIds.has(item.id)) return undefined;
  if (item.kind !== 'error' || (!isLimitShaped(item.code, item.apiErrorStatus) && item.code !== 'billing_error')) return undefined;
  return { agent, window_kind: item.limit?.window ?? (item.code === 'billing_error' ? 'credits' : 'unknown') };
}
