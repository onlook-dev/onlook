import { describe, expect, it } from 'bun:test';
import { ARTIFACT_MANIFEST_VERSION } from '@studio/events';
import { decodeManifest } from './manifest.js';

const id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

describe('portable manifest schema', () => {
  it('salvages future manifests only in memory and refuses both future schema and reader versions', () => {
    for (const versions of [
      { schemaVersion: ARTIFACT_MANIFEST_VERSION + 1, minReaderVersion: 1 },
      { schemaVersion: ARTIFACT_MANIFEST_VERSION, minReaderVersion: ARTIFACT_MANIFEST_VERSION + 1 },
    ]) {
      const decoded = decodeManifest({ ...versions, id: 'future-id', title: 'Future', extension: true }, id);
      expect(decoded.readOnly).toBe(true);
      expect(decoded.repaired).toBe(true);
      expect(decoded.manifest).toMatchObject({ ...versions, id, title: 'Future', extension: true });
    }
  });
});
