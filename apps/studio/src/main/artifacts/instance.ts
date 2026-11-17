import type { ArtifactStore } from './adapter.js';
import { createArtifactStore } from './store.js';
import { recordArtifactIntegrity } from './telemetry.js';
import { artifactContentChanged } from './changes.js';

let store: ArtifactStore | undefined;

export function artifactStore(): ArtifactStore {
  store ??= createArtifactStore({ onIntegrity: recordArtifactIntegrity, onChanged: artifactContentChanged });
  return store;
}
