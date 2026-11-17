interface ComposerTipsState {
  isDismissed: boolean;
  isHidden: boolean;
  isComposerEmpty: boolean;
  hasStatus: boolean;
  isSkillUnsettled: boolean;
  isComposerHeld: boolean;
  isQuestionOpen: boolean;
}

/** Only in an empty composer with nothing else to say: a notice, a status or a waiting question outranks it (ONL-2744, ONL-2812). */
export function showsComposerTipsPill(state: ComposerTipsState): boolean {
  return !state.isHidden && !state.isDismissed && state.isComposerEmpty && !state.hasStatus && !state.isSkillUnsettled && !state.isComposerHeld && !state.isQuestionOpen;
}
