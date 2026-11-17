import { devSwitches } from '../env/dev-switches.js';
// Imports nothing: settings/state.ts reads this and onboarding/state.ts writes settings, so a shared module is the only way round the cycle.

// A function, not a module-load constant: main's modules load before
// `app.whenReady()`, so a frozen value ignores what a test sets.
export function forced(): boolean | undefined {
  const override = devSwitches.firstRun;
  if (override === undefined || override === '') return undefined;
  // `1` is a first run, so NOT onboarded.
  return override === '1' ? false : true;
}
