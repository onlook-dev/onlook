import {
  isCredentialRefusalKind,
  STALL_NOTICE_MS,
  type ProviderNotice,
  type ProviderRetry,
  type SessionState,
} from '@studio/events';
import { t } from '@studio/i18n';

export const RETRY_NOTICE_MS = 10_000;

type NoticeState = Pick<SessionState, 'isStreaming' | 'retrying' | 'retryingSince' | 'silentSince'>;

export function providerNoticeDueAt(state: NoticeState): number | undefined {
  if (!state.isStreaming) return undefined;
  const deadlines: number[] = [];
  if (state.silentSince !== undefined) deadlines.push(state.silentSince + STALL_NOTICE_MS);
  if (state.retrying && state.retryingSince !== undefined && !isCredentialRefusalKind(state.retrying.kind, state.retrying.status)) {
    deadlines.push(state.retryingSince + RETRY_NOTICE_MS);
  }
  return deadlines.length > 0 ? Math.min(...deadlines) : undefined;
}

function retryText(retry: ProviderRetry): string {
  const attempt = retry.attempt;
  if (isCredentialRefusalKind(retry.kind, retry.status)) {
    return attempt === undefined
      ? t('chat.notice.credentialPlain')
      : t('chat.notice.credentialAttempt', { attempt });
  }
  return attempt === undefined ? t('chat.notice.retryPlain') : t('chat.notice.retryAttempt', { attempt });
}

function retryLine(retry: ProviderRetry, agent: string): NonNullable<ProviderNotice['line']> {
  const doing = t('chat.retryLine.doing');
  if (retry.status === 529) {
    const status = retry.status;
    const detail = retry.attempt === undefined
      ? t('chat.retryLine.overloadedPlain', { agent, status })
      : t('chat.retryLine.overloadedAttempt', { agent, status, attempt: retry.attempt });
    return { words: t('chat.retryLine.overloaded', { agent, status }), doing, detail };
  }
  const words = isCredentialRefusalKind(retry.kind, retry.status) ? t('chat.retryLine.credential') : t('chat.retryLine.provider', { agent });
  return { words, doing, detail: retryText(retry) };
}

/** One row for the turn's standing signals (ONL-2491). `isStreaming` is the host's, so a restored session's days-old `silentSince` shows nothing. */
export function providerNotice(
  state: NoticeState,
  now: number,
  agent = t('agent.name.claude'),
): ProviderNotice | undefined {
  if (!state.isStreaming) return undefined;
  if (state.retrying && (
    isCredentialRefusalKind(state.retrying.kind, state.retrying.status)
    || state.retryingSince === undefined
    || now - state.retryingSince >= RETRY_NOTICE_MS
  )) return { state: 'retrying', text: retryText(state.retrying), line: retryLine(state.retrying, agent) };
  if (state.silentSince === undefined || now - state.silentSince < STALL_NOTICE_MS) return undefined;
  const seconds = Math.floor((now - state.silentSince) / 1_000);
  return { state: 'silent', text: t('chat.notice.silent', { agent, seconds }), seconds };
}
