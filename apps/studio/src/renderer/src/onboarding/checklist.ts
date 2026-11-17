export interface ChecklistVisibility {
  /** The `machine-check` flag: off, onboarding is main's and the screen has no state that could raise it (ONL-3111). */
  enabled: boolean;
  /** The person is at the step a project is created from. */
  atFirstProject: boolean;
  /** A check failed, so creating a project cannot work. */
  blocked: boolean;
  /** A check failed or could not finish. */
  needsAttention: boolean;
  /** The checklist is already on screen. */
  shown: boolean;
  /** The person continued past it. */
  told: boolean;
}

/** A failed check raises the checklist whenever it arrives; anything else holds the screen only until the person continues. */
export function showsChecklist(view: ChecklistVisibility): boolean {
  return view.enabled && view.atFirstProject && (view.blocked || (!view.told && (view.shown || view.needsAttention)));
}
