import { describe, expect, it } from 'bun:test';
import { ARTIFACT_SCHEME, ARTIFACTS_PARTITION } from '@studio/events';
import { artifactRequestAllowed, installArtifactSessionPolicies } from './session.js';

type BeforeRequest = (
  details: { url: string; resourceType?: string },
  callback: (response: { cancel?: boolean }) => void,
) => void;

function fakeSession(): {
  target: Electron.Session;
  schemes: string[];
  filters: { urls: string[] }[];
  egress: () => BeforeRequest;
  permissionRequest: () => (c: unknown, p: string, cb: (ok: boolean) => void) => void;
  permissionCheck: () => () => boolean;
} {
  const schemes: string[] = [];
  const filters: { urls: string[] }[] = [];
  let egress: BeforeRequest | undefined;
  let permissionRequest: ((c: unknown, p: string, cb: (ok: boolean) => void) => void) | undefined;
  let permissionCheck: (() => boolean) | undefined;

  const target = {
    protocol: {
      handle: (scheme: string): void => {
        schemes.push(scheme);
      },
    },
    webRequest: {
      onBeforeRequest: (filter: { urls: string[] }, listener: BeforeRequest): void => {
        filters.push(filter);
        egress = listener;
      },
    },
    setPermissionRequestHandler: (handler: (c: unknown, p: string, cb: (ok: boolean) => void) => void): void => {
      permissionRequest = handler;
    },
    setPermissionCheckHandler: (handler: () => boolean): void => {
      permissionCheck = handler;
    },
  } as unknown as Electron.Session;

  return {
    target,
    schemes,
    filters,
    egress: () => {
      if (egress === undefined) throw new Error('no egress listener was installed');
      return egress;
    },
    permissionRequest: () => {
      if (permissionRequest === undefined) throw new Error('no permission request handler');
      return permissionRequest;
    },
    permissionCheck: () => {
      if (permissionCheck === undefined) throw new Error('no permission check handler');
      return permissionCheck;
    },
  };
}

const store = { readManifest: () => Promise.resolve(undefined) };

const decide = (listener: BeforeRequest, url: string): boolean => {
  let cancelled: boolean | undefined;
  listener({ url }, (response) => {
    cancelled = response.cancel;
  });
  return cancelled === true;
};

describe('the artifacts session', () => {
  it('requires a positively recognised owning document for executable and stylesheet dependencies', () => {
    const own = 'studio-artifact://aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
    const sibling = 'studio-artifact://bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
    for (const resourceType of ['script', 'stylesheet']) {
      expect(artifactRequestAllowed({ url: `${own}/pages/shared.js`, resourceType, frame: { url: `${own}/pages/index.html` } })).toBe(true);
      expect(artifactRequestAllowed({ url: `${sibling}/pages/shared.js`, resourceType, frame: { url: `${own}/pages/index.html` } })).toBe(false);
      expect(artifactRequestAllowed({ url: `${own}/pages/shared.js`, resourceType })).toBe(false);
      expect(artifactRequestAllowed({ url: `${own}/pages/shared.js`, resourceType, frame: { url: 'about:blank' } })).toBe(false);
    }
  });
  it('is its own partition, so the frames partition keeps having no artifact handler', () => {
    expect(ARTIFACTS_PARTITION).toBe('persist:studio-artifacts');
    expect(ARTIFACTS_PARTITION).not.toBe('persist:studio-frames');
  });

  it('installs the artifact handler on the session it is given, and only that scheme', () => {
    const session = fakeSession();
    installArtifactSessionPolicies(session.target, store);

    expect(session.schemes).toEqual([ARTIFACT_SCHEME]);
  });

  it('denies every destination but its own scheme', () => {
    const session = fakeSession();
    installArtifactSessionPolicies(session.target, store);
    const egress = session.egress();

    expect(decide(egress, `${ARTIFACT_SCHEME}://aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa/pages/index.html`)).toBe(
      false,
    );

    // The dev server, a private address, the public internet, and the other local schemes.
    expect(decide(egress, 'http://127.0.0.1:5173/')).toBe(true);
    expect(decide(egress, 'http://localhost:3000/api')).toBe(true);
    expect(decide(egress, 'http://192.168.1.10/')).toBe(true);
    expect(decide(egress, 'http://169.254.169.254/latest/meta-data/')).toBe(true);
    expect(decide(egress, 'https://example.com/collect')).toBe(true);
    expect(decide(egress, 'ws://127.0.0.1:5173/')).toBe(true);
    expect(decide(egress, 'file:///etc/passwd')).toBe(true);
    expect(decide(egress, 'studio-thumb://canvas/x')).toBe(true);
  });

  it('filters on every URL rather than a scheme pattern, so one listener decides it all', () => {
    const session = fakeSession();
    installArtifactSessionPolicies(session.target, store);

    // One registration only: a second would silently replace this one and delete the deny.
    expect(session.filters).toEqual([{ urls: ['<all_urls>'] }]);
  });

  it('refuses every permission, asked for and checked', () => {
    const session = fakeSession();
    installArtifactSessionPolicies(session.target, store);

    for (const permission of ['media', 'geolocation', 'notifications', 'clipboard-read', 'midi']) {
      let granted: boolean | undefined;
      session.permissionRequest()({}, permission, (ok) => {
        granted = ok;
      });
      expect(granted).toBe(false);
    }
    expect(session.permissionCheck()()).toBe(false);
  });
});
