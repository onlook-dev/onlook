// Its own module: state.ts cannot import onboarding, whose completeOnboarding writes settings.

import type { HarnessId } from '@studio/events';
import { chosenHarness, pinnedHarness } from '../onboarding/state.js';
import { settingsHarness } from './state.js';

export function resolvedHarness(): HarnessId | undefined {
  return pinnedHarness() ?? settingsHarness() ?? chosenHarness();
}
