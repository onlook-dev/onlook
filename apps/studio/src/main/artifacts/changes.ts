const listeners = new Set<(artifactId: string) => void>();

export function onArtifactContentChanged(listener: (artifactId: string) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function artifactContentChanged(artifactId: string): void {
  for (const listener of listeners) listener(artifactId);
}
