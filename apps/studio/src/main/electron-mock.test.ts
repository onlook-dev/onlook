import { describe, expect, it } from 'bun:test';

describe('electron mock preload guarantee', () => {
  it('resolves electron to the shared mock before any suite runs', async () => {
    const electron = (await import('electron')) as Record<string, unknown>;
    const app = electron.app as Record<string, unknown> | undefined;
    expect(
      typeof app?.getPath,
      "electron did not resolve to a mock — the [test] preload in bunfig.toml (tests/apparatus/src/preload.ts) is not wired",
    ).toBe('function');
    expect(
      electron.__studioSharedElectronMock,
      'electron resolved to a mock, but not the shared one from tests/apparatus/src/electron.ts — something registered ahead of the preload seat',
    ).toBe(true);
  });
});
