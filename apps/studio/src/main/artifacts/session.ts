import { session } from 'electron';
import { ARTIFACT_SCHEME, ARTIFACTS_PARTITION, isArtifactId } from '@studio/events';
import type { ArtifactStore } from './adapter.js';
import { createArtifactRequestHandler } from './protocol.js';

export function artifactRequestAllowed(details: { url: string; resourceType?: string; frame?: { url: string } | null }): boolean {
  try {
    const target = new URL(details.url);
    if (target.protocol !== `${ARTIFACT_SCHEME}:` || !isArtifactId(target.host)) return false;
    if (details.resourceType === 'script' || details.resourceType === 'stylesheet') {
      if (details.frame === undefined || details.frame === null) return false;
      const document = new URL(details.frame.url);
      return document.protocol === target.protocol && document.host === target.host;
    }
    return true;
  } catch {
    return false;
  }
}

/** One instance per partition string, which is what makes an identity comparison the guest's session. */
export function artifactsSession(): Electron.Session {
  return session.fromPartition(ARTIFACTS_PARTITION);
}

/**
 * The one module that registers `webRequest` on this session. Only one listener per event
 * per session survives, so a second registration anywhere would silently delete the deny.
 */
export function installArtifactSessionPolicies(
  target: Electron.Session,
  store: Pick<ArtifactStore, 'readManifest'>,
): void {
  target.protocol.handle(ARTIFACT_SCHEME, createArtifactRequestHandler(store));

  // Decided in JS rather than by pattern: default-deny is every scheme but this one.
  target.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
    callback({ cancel: !artifactRequestAllowed(details) });
  });

  target.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  target.setPermissionCheckHandler(() => false);
}
