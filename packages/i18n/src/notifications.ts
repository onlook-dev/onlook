import type { BackgroundEventKind, NoticeKind } from '@studio/events';
import { t, type StringKey } from './index.js';

const EVENT_KEYS = {
  finished: 'notifications.event.finished',
  failed: 'notifications.event.failed',
  question: 'notifications.event.question',
  approval: 'notifications.event.approval',
} satisfies Record<BackgroundEventKind, StringKey>;

/** A ready line's slot always holds a repository's full name, so it fills its own (ONL-3182). */
export function notificationLine(kind: NoticeKind, name: string): string {
  return kind === 'ready' ? t('github.ready', { repository: name }) : t(EVENT_KEYS[kind], { name });
}
