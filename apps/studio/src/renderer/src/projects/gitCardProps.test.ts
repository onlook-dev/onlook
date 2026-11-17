import { describe, expect, test } from 'bun:test';
import { GIT_PILL_SHIPPED_DEFAULTS } from '@studio/events';
import { MEASUREMENT_FIXTURES, measurement, row } from '@studio/git-ui/measurement-fixtures';
import { gitCardPropsFor } from './gitCardProps.js';

const D = GIT_PILL_SHIPPED_DEFAULTS;

describe('gitCardPropsFor', () => {
  test('an open PR with failing checks derives the state and a PR-bearing pill', () => {
    const props = gitCardPropsFor(row(MEASUREMENT_FIXTURES['fix-checks']), D, false);
    expect(props.gitState).toBe('checks-failed');
    expect(props.gitPill?.id).toBe('fix-checks');
  });

  test('a stale row mounts the pill in its rest look', () => {
    const props = gitCardPropsFor(row(MEASUREMENT_FIXTURES['checks-running'], { stale: true }), D, false);
    expect(props.gitPill?.mode).toBeUndefined();
    expect(props.gitState).toBe('checks-running');
  });

  test('pre-PR dirty work: status without a pill', () => {
    const props = gitCardPropsFor(row(measurement({ dirty: true })), D, false);
    expect(props.gitState).toBe('not-uploaded');
    expect(props.gitPill).toBeUndefined();
  });

  test('a closed PR: pill without a status word', () => {
    const props = gitCardPropsFor(row(MEASUREMENT_FIXTURES['pr-closed']), D, false);
    expect(props.gitState).toBeUndefined();
    expect(props.gitPill?.id).toBe('pr-closed');
  });

  test('a receded card suppresses everything, an open PR with failing checks included', () => {
    expect(gitCardPropsFor(row(MEASUREMENT_FIXTURES['fix-checks']), D, true)).toEqual({});
  });
});
