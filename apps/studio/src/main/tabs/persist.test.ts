import { describe, expect, it } from 'bun:test';
import { HOME_ACTIVE } from '@studio/events';
import { windowRecordFor, type PersistFacts, type PersistTab } from './persist.js';

const REPO = 'repo-1';

function facts(overrides: Partial<PersistFacts> = {}): PersistFacts {
  const tabs = new Map<string, PersistTab>([
    ['tab-1', {}],
    ['tab-2', { workspacePath: '/w/one' }],
    ['tab-3', { workspacePath: '/w/two' }],
  ]);
  return {
    isBooting: false,
    isUsable: true,
    order: ['tab-1', 'tab-2', 'tab-3'],
    tabs,
    repoIdentityOf: () => REPO,
    ...overrides,
  };
}

describe('the moments that must not write at all (ONL-2208)', () => {
  it('writes nothing while booting, so the home tab never lands on the saved set', () => {
    expect(windowRecordFor(facts({ isBooting: true, order: ['tab-1'] }))).toBeUndefined();
  });

  it('writes nothing while booting whatever the order holds, so a pruned set cannot reach disk', () => {
    expect(windowRecordFor(facts({ isBooting: true, order: ['tab-1', 'tab-2'] }))).toBeUndefined();
  });

  it('writes nothing for a launch that refused to read (ONL-2123)', () => {
    expect(windowRecordFor(facts({ isUsable: false }))).toBeUndefined();
  });
});

describe('what a live window records', () => {
  it('keeps the order the strip shows, by project', () => {
    expect(windowRecordFor(facts())?.tabs).toEqual([
      { workspacePath: '/w/one', repoIdentity: REPO },
      { workspacePath: '/w/two', repoIdentity: REPO },
    ]);
  });

  it('records home when the active tab holds no project', () => {
    expect(windowRecordFor(facts({ activeId: 'tab-1' }))?.active).toEqual(HOME_ACTIVE);
  });

  it('records the active tab by its project', () => {
    expect(windowRecordFor(facts({ activeId: 'tab-3' }))?.active).toEqual({ kind: 'tab', workspacePath: '/w/two' });
  });

  it('leaves out a project the registry no longer names, rather than recording it unnamed', () => {
    const record = windowRecordFor(facts({ repoIdentityOf: (path) => (path === '/w/one' ? REPO : undefined) }));

    expect(record?.tabs).toEqual([{ workspacePath: '/w/one', repoIdentity: REPO }]);
  });

  it('records an empty set once a live window really has no project tabs', () => {
    expect(windowRecordFor(facts({ order: ['tab-1'] }))).toEqual({ tabs: [], active: HOME_ACTIVE });
  });
});
