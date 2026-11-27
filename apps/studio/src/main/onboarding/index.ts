import { handle } from '../ipc/bridge.js';
import { IPC_INVOKE, type OnboardingCompletion, type OnboardingState } from '@studio/events';
import { completeOnboarding, readOnboardingState, saveOnboardingProgress } from './state.js';
import { flagOn } from '../flags/index.js';
import { registerMachineHandlers } from '../workspace/machine.js';

export function registerOnboardingHandlers(): void {
  // Off, the channels are absent, so the renderer cannot reach a check even through the bridge (ONL-3111).
  if (flagOn('machine-check')) registerMachineHandlers();
  handle(IPC_INVOKE.onboardingState, (): OnboardingState => readOnboardingState());
  handle(IPC_INVOKE.onboardingProgress, (_event, progress) => saveOnboardingProgress(progress));

  handle(
    IPC_INVOKE.onboardingComplete,
    (_event, completion?: OnboardingCompletion): void => {
      completeOnboarding(completion ?? {});
    },
  );
}
