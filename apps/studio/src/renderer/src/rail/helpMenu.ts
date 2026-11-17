import type { HelpAction } from '@studio/events';

import { capable } from '../capabilities.js';
import { t, type StringKey } from '@studio/i18n';

export const ONLOOK_DOCS_URL = 'https://docs.onlook.com';

export interface HelpMenuItem {
  action: HelpAction;
  label: StringKey;
}

const ITEMS: readonly HelpMenuItem[] = [
  { action: 'docs', label: 'account.docs' },
  { action: 'reportIssue', label: 'rail.help.reportIssue' },
  { action: 'requestFeature', label: 'rail.help.requestFeature' },
  { action: 'shortcuts', label: 'rail.help.shortcuts' },
  { action: 'tour', label: 'rail.help.tour' },
];

/** One list for both doors: the rail's foot and the canvas's floating control open the same menu. */
export function helpMenuItems(): readonly HelpMenuItem[] {
  // The Help center's label is empty in a build without the cloud, which has no docs to send anyone to.
  const takesReports = capable('report');
  return ITEMS.filter((item) => item.action === 'docs' ? t(item.label) !== ''
    : item.action === 'reportIssue' || item.action === 'requestFeature' ? takesReports : true);
}
