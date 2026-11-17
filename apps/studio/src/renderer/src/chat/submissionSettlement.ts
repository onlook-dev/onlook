/** A later edit wins, even when it happens to recreate the submitted value. */
export function shouldClearComposerText(
  submittedRevision: number,
  currentRevision: number,
): boolean {
  return submittedRevision === currentRevision;
}

/**
 * A held prompt keeps the elements it was about: a take restores only its images, so the live
 * selection is the only thing that can rebuild its element and frame context (ONL-2294).
 */
export function shouldClearElementPicks(held: boolean): boolean {
  return !held;
}
