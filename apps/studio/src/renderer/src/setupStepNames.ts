import type { SetupRepairStep } from '@studio/events';
import type { StringKey } from '@studio/i18n';

/** One name per failed step, for the Left Rail's foot and the canvas card alike (ONL-2961). */
export const FAILED_STEP_NAME: Record<SetupRepairStep, StringKey> = {
  install: 'setup.failed.install',
  start: 'setup.failed.start',
};
