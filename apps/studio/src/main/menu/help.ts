import { MENU_ACCELERATORS, type ReportLane } from '@studio/events';

export interface HelpItem {
  readonly labelKey: 'menu.help.reportProblem' | 'menu.help.shareIdea';
  readonly lane: ReportLane;
  readonly accelerator?: string;
}

export const HELP_ITEMS: readonly HelpItem[] = [
  {
    labelKey: 'menu.help.reportProblem',
    lane: 'bug',
    accelerator: MENU_ACCELERATORS.report.key,
  },
  { labelKey: 'menu.help.shareIdea', lane: 'feature' },
];
