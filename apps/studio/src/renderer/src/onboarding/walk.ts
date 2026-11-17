import type { OnboardingScreen, RendererTelemetryEventMap } from '@studio/events';

type ScreenShown = RendererTelemetryEventMap['onboarding_screen_shown'];

/** One pass through onboarding, from the flow's mount: what each change of screen should report. */
export interface OnboardingWalk {
  /** `hidden` is the sign-in gate covering the flow, which stays mounted behind it (ONL-3259). */
  shownEvent(screen: OnboardingScreen, hidden: boolean): ScreenShown | undefined;
}

export function createOnboardingWalk(): OnboardingWalk {
  const visits = new Map<OnboardingScreen, number>();
  let reported: OnboardingScreen | undefined;
  return {
    shownEvent(screen, hidden) {
      if (hidden || screen === reported) return undefined;
      reported = screen;
      const visit = (visits.get(screen) ?? 0) + 1;
      visits.set(screen, visit);
      return { screen, visit };
    },
  };
}
