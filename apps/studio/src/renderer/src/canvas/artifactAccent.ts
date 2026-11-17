/** The blue treatment follows an artifact's identity, never a frame's URL (ONL-2568). */
export const ARTIFACT_ACCENT_ATTRS = { 'data-accent': 'artifact' } as const;

export function artifactAccentAttrs(isArtifact: boolean): { 'data-accent'?: 'artifact' } {
  return isArtifact ? ARTIFACT_ACCENT_ATTRS : {};
}
