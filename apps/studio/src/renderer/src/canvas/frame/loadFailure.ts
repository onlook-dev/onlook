import { displayUrl } from '@studio/events';
import { t, type StringKey } from '@studio/i18n';

/** A guest's main-frame load failure, as `did-fail-load` reported it (ONL-2336). */
export interface FrameLoadFailure {
  url: string;
  code: number;
  description: string;
}

export interface LoadFailureCopy {
  key: StringKey;
  params: Record<string, string>;
}

export function loadFailureCopy(failure: FrameLoadFailure, homeUrl: string): LoadFailureCopy {
  const url = displayUrl(failure.url);
  const home = displayUrl(homeUrl);
  if (isHttpsHopOnHttp(failure.url, homeUrl)) {
    return { key: 'frame.health.failed.https', params: { url, home } };
  }
  const reason = failure.description.trim() === '' ? t('frame.health.failed.code', { code: failure.code }) : failure.description;
  return { key: 'frame.health.failed.page', params: { url, home, reason } };
}

function isHttpsHopOnHttp(failedUrl: string, homeUrl: string): boolean {
  try {
    const failed = new URL(failedUrl);
    const home = new URL(homeUrl);
    return failed.protocol === 'https:' && home.protocol === 'http:' && failed.hostname === home.hostname;
  } catch {
    return false;
  }
}
