// Menu labels are Title Case (macOS menus), the pill sentence case: separate keys, not one string (ONL-1844).

import { isDiskFull, type UpdateState, type UpdateStatus } from '@studio/events';
import type { StringKey } from './strings.js';

export interface StatusPresentation {
  menu: { key: StringKey; enabled: boolean };
  pill: StringKey | null;
}

export const UPDATE_PRESENTATION = {
  unsupported: { menu: { key: 'menu.update.unavailable', enabled: false }, pill: null },
  idle: { menu: { key: 'menu.update.check', enabled: true }, pill: null },
  checking: {
    menu: { key: 'menu.update.checking', enabled: false },
    pill: 'topbar.update.checking',
  },
  available: { menu: { key: 'menu.update.found', enabled: false }, pill: 'topbar.update.available' },
  downloading: {
    menu: { key: 'menu.update.downloadingPercent', enabled: false },
    pill: 'topbar.update.downloading',
  },
  downloaded: {
    menu: { key: 'menu.update.downloaded', enabled: false },
    pill: 'topbar.update.ready',
  },
  'up-to-date': {
    menu: { key: 'menu.update.upToDate', enabled: false },
    pill: 'topbar.update.upToDate',
  },
  error: { menu: { key: 'menu.update.check', enabled: true }, pill: 'topbar.update.failed' },
} satisfies Record<UpdateStatus, StatusPresentation>;

export function presentation(status: UpdateStatus, message?: string): StatusPresentation {
  if (status === 'error' && message === 'UPDATE_AUTHORIZATION_DENIED') {
    return { menu: UPDATE_PRESENTATION.error.menu, pill: 'topbar.update.authorizationDenied' };
  }
  if (status === 'error' && isDiskFull(message)) {
    return { menu: UPDATE_PRESENTATION.error.menu, pill: 'topbar.update.diskFull' };
  }
  return UPDATE_PRESENTATION[status];
}

/** A check and its all-clear are the user's answer, not news: unasked they widen the band for nothing (ONL-2620). */
const ONLY_WHEN_ASKED: readonly UpdateStatus[] = ['checking', 'up-to-date'];

/** The one decision on whether the band carries a pill at all; `null` is no pill. */
export function pillKey(state: UpdateState): StringKey | null {
  if (state.requested !== true && ONLY_WHEN_ASKED.includes(state.status)) return null;
  return presentation(state.status, state.message).pill;
}
