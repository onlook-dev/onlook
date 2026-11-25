import { describe, expect, test } from 'bun:test';
import { zzStrings } from '@studio/chat-ui/testing';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  bodyAction,
  bodyPropsFor,
  currentOptionOf,
  GitStatusPill,
  hoverLinesFor,
  labelFor,
  menuFor,
  type GitPillGlyphs,
} from './GitStatusPill.js';
import { PILL_FIXTURES, STUB_STRINGS } from './fixtures.js';
import { GIT_PILL_STATES, type GitPillState } from './state.js';

const GLYPHS: GitPillGlyphs = { branch: 'B', chevron: 'V', check: 'C' };
const PR = { number: 313, url: 'https://example.test/pr/313' };
const FACTS = ['feat/x', '1 ahead, 0 behind', 'as of now'];
const HINT = 'Wait for the turn';
const noop = (): void => undefined;

describe('Create PR recovery', () => {
  for (const label of ['No Changes to Publish', 'Push Refused', 'GitHub Approval Needed', 'GitHub Sign-In Needed', 'PR Not Created']) {
    test(`shows ${label} in the button`, () => {
      const markup = renderToStaticMarkup(<GitStatusPill state={PILL_FIXTURES['create-pr']} strings={STUB_STRINGS} glyphs={GLYPHS} failure={{ label, nextStep: 'Check access, then try Create PR again.' }} onAction={noop} />);
      expect(markup).toContain(`aria-label="${label}"`);
      expect(markup).toContain('data-failure="true"');
    });
  }
  test('keeps working and queued labels ahead of an earlier failure', () => {
    for (const props of [{ state: { ...PILL_FIXTURES['create-pr'], mode: 'working' } as GitPillState }, { state: PILL_FIXTURES['create-pr'], isQueued: true }]) {
      const markup = renderToStaticMarkup(<GitStatusPill {...props} strings={STUB_STRINGS} glyphs={GLYPHS} failure={{ label: 'Push Refused', nextStep: 'Check access.' }} onAction={noop} />);
      expect(markup).not.toContain('data-failure="true"');
      expect(markup).not.toContain('aria-label="Push Refused"');
    }
  });
});

describe('tab preview pills', () => {
  test.each([...GIT_PILL_STATES])('shows %s without interactive controls', (id) => {
    const html = renderToStaticMarkup(
      <GitStatusPill state={PILL_FIXTURES[id]} strings={STUB_STRINGS} glyphs={GLYPHS} scale="preview"
        onAction={noop} onOpenPr={noop} onPick={noop} onNoActionPress={noop} />,
    );
    expect(html).toContain('data-git-scale="preview"');
    if (id !== 'first-paint') expect(html).toContain(STUB_STRINGS.pillLabel[id]);
    expect(html).not.toContain('<button');
    expect(menuFor(PILL_FIXTURES[id], 'preview')).toBeUndefined();
  });
});

function working(state: GitPillState): GitPillState {
  return { ...state, mode: 'working' } as GitPillState;
}

describe('labelFor', () => {
  test('first paint has no word, so its cell stands a skeleton; every other state has one, working included', () => {
    expect(labelFor(PILL_FIXTURES['first-paint'], STUB_STRINGS, false, false)).toBeUndefined();
    for (const id of GIT_PILL_STATES) {
      if (id === 'first-paint') continue;
      expect(labelFor(PILL_FIXTURES[id], STUB_STRINGS, false, false), id).toBeDefined();
    }
    expect(labelFor(working(PILL_FIXTURES['create-pr']), STUB_STRINGS, false, false)).toBeDefined();
  });

  test('Ready to Merge names its action under the pointer, and only the true one', () => {
    const ready = (dropdownDefault: 'merge' | 'open-in-browser') =>
      ({ ...PILL_FIXTURES['ready-to-merge'], dropdownDefault }) as GitPillState;
    expect(labelFor(ready('merge'), STUB_STRINGS, true, true)).toBe('Start Merge');
    expect(labelFor(ready('open-in-browser'), STUB_STRINGS, true, true)).toBe('Open in Browser');
    expect(labelFor(ready('merge'), STUB_STRINGS, true, false)).toBe('Ready to Merge');
    expect(labelFor(ready('merge'), STUB_STRINGS, false, true)).toBe('Ready to Merge');
  });

  test('the pointer changes no other state\'s word, working included', () => {
    for (const id of GIT_PILL_STATES) {
      if (id === 'ready-to-merge' || id === 'first-paint') continue;
      expect(labelFor(PILL_FIXTURES[id], STUB_STRINGS, true, true), id).toBe(STUB_STRINGS.pillLabel[id]);
    }
    const merging = { ...PILL_FIXTURES['ready-to-merge'], mode: 'working' } as GitPillState;
    expect(labelFor(merging, STUB_STRINGS, true, true)).toBe('Merging');
  });
});

describe('the body cell', () => {
  test('working is disabled and busy; a wordless cell is busy; a resting one is neither', () => {
    expect(bodyPropsFor('Uploading', { isWorking: true })).toEqual({ 'aria-disabled': 'true', 'aria-busy': 'true' });
    expect(bodyPropsFor(undefined, { isWorking: false })).toEqual({ 'aria-busy': 'true' });
    expect(bodyPropsFor('Create PR', { isWorking: false })).toEqual({});
  });

  test('a working pill never presses, a readout or a trust state has no body press, and an actionable state presses with its action', () => {
    expect(bodyAction(working(PILL_FIXTURES['upload-changes']), noop, noop)).toBeUndefined();
    for (const id of ['checks-running', 'local-only', 'no-access', 'first-paint'] as const) {
      expect(bodyAction(PILL_FIXTURES[id], noop, noop), id).toBeUndefined();
    }
    expect(bodyAction(PILL_FIXTURES['create-pr'], noop, noop)).toBe(noop);
  });
});

describe('the menu', () => {
  test('rides Create PR, Push and Ready to Merge, and Fix Checks only with local changes to upload (ONL-2388); never a readout or a working pill', () => {
    for (const id of ['create-pr', 'push', 'ready-to-merge'] as const) {
      expect(menuFor(PILL_FIXTURES[id], 'chrome'), id).toBe(id);
    }
    expect(menuFor({ id: 'fix-checks', pr: PR, dirty: true }, 'chrome')).toBe('fix-checks');
    expect(menuFor(PILL_FIXTURES['fix-checks'], 'chrome')).toBeUndefined();
    expect(menuFor(PILL_FIXTURES['checks-running'], 'chrome')).toBeUndefined();
    expect(menuFor(working(PILL_FIXTURES['create-pr']), 'chrome')).toBeUndefined();
  });

  test('checks the default it holds, and Fix Checks holds none: Upload Changes is an action, not a default (ONL-2388)', () => {
    expect(currentOptionOf({ ...PILL_FIXTURES['ready-to-merge'], dropdownDefault: 'merge' } as GitPillState)).toBe('merge');
    expect(currentOptionOf(PILL_FIXTURES['ready-to-merge'])).toBe('open-in-browser');
    expect(currentOptionOf(PILL_FIXTURES.push)).toBe('push');
    expect(currentOptionOf({ id: 'fix-checks', pr: PR, dirty: true })).toBeUndefined();
  });
});

describe('queued (ONL-2379)', () => {
  test('a queued pill names the queue, and takes its word back under the pointer', () => {
    expect(labelFor(PILL_FIXTURES['create-pr'], STUB_STRINGS, false, true, true)).toBe(STUB_STRINGS.queuedLabel);
    expect(labelFor(PILL_FIXTURES['create-pr'], STUB_STRINGS, true, true, true)).toBe(STUB_STRINGS.queuedTakeBack);
    expect(labelFor(PILL_FIXTURES['download-changes'], STUB_STRINGS, false, true, true)).toBe(STUB_STRINGS.queuedLabel);
  });

  test('a working pill ignores the queue: the work it is already doing wins', () => {
    expect(labelFor(working(PILL_FIXTURES['create-pr']), STUB_STRINGS, false, true, true)).toBe(
      STUB_STRINGS.workingLabel['create-pr'],
    );
  });

  test('a queued pill still presses, marks itself queued, and does not read as busy', () => {
    const html = renderToStaticMarkup(
      <GitStatusPill state={PILL_FIXTURES['create-pr']} strings={STUB_STRINGS} glyphs={GLYPHS} isQueued onAction={noop} />,
    );
    expect(html).toContain('data-queued="true"');
    expect(html).toContain('git-status-body-press');
    expect(html).toContain(STUB_STRINGS.queuedLabel);
    expect(html).not.toContain('aria-busy');
  });

  test('a queued cell leads its hover line with the line naming what it waits on', () => {
    expect(hoverLinesFor(PILL_FIXTURES['create-pr'], FACTS, HINT).label).toEqual([HINT, ...FACTS]);
  });

  test('a queued press takes back even on a state whose body would open the PR', () => {
    const openPr = (): void => {
      throw new Error('a queued press must not open the pull request');
    };
    const html = renderToStaticMarkup(
      <GitStatusPill state={PILL_FIXTURES['draft-pr']} strings={STUB_STRINGS} glyphs={GLYPHS} isQueued onAction={noop} onOpenPr={openPr} />,
    );
    expect(html).toContain('data-queued="true"');
    expect(html).toContain(STUB_STRINGS.queuedLabel);
  });

  test('the card scale carries no queue of its own', () => {
    const html = renderToStaticMarkup(
      <GitStatusPill state={PILL_FIXTURES['upload-changes']} strings={STUB_STRINGS} glyphs={GLYPHS} scale="card" isQueued onAction={noop} onOpenPr={noop} />,
    );
    expect(html).not.toContain('data-queued="true"');
  });
});

test('every state surfaces the hover line, those without a PR number included', () => {
  for (const id of GIT_PILL_STATES) {
    const lines = hoverLinesFor(PILL_FIXTURES[id], FACTS, undefined);
    expect([lines.label, lines.pr], id).toContainEqual(FACTS);
  }
});

describe('nesting', () => {
  test('the hover line never wraps the menu', () => {
    const html = renderToStaticMarkup(
      <GitStatusPill state={PILL_FIXTURES['create-pr']} strings={STUB_STRINGS} glyphs={GLYPHS} tooltip={FACTS} isTooltipOpen onAction={noop} onPick={noop} />,
    );
    // Tooltip renders its layer right after what it wraps, so markup after the layer is outside it.
    const layer = html.indexOf('role="tooltip"');
    const chevron = html.indexOf('data-testid="git-status-chevron"');
    const menu = html.indexOf('data-testid="git-status-dropdown"');
    expect(layer).toBeGreaterThan(-1);
    expect(chevron).toBeGreaterThan(layer);
    expect(menu).toBeGreaterThan(layer);
  });

  test('the PR link is never inside the body button', () => {
    for (const id of ['resolve-conflicts', 'ready-to-merge', 'merged'] as const) {
      const html = renderToStaticMarkup(
        <GitStatusPill state={PILL_FIXTURES[id]} strings={STUB_STRINGS} glyphs={GLYPHS} onAction={noop} onOpenPr={noop} />,
      );
      expect(html, id).toContain('git-status-body-press');
      expect(html, id).toContain('git-status-pr-link');
      expect(html, id).not.toMatch(/<button[^>]*>(?:(?!<\/button>).)*<button/);
    }
  });
});

test('every string comes from the bag', () => {
  const sentinel = zzStrings(STUB_STRINGS);
  const html = renderToStaticMarkup(
    <GitStatusPill state={PILL_FIXTURES['upload-changes']} strings={sentinel} glyphs={GLYPHS} onAction={noop} />,
  );
  expect(html).not.toContain('Upload Changes');
});
