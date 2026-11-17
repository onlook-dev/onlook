import { describe, expect, test } from 'bun:test';
import { prOf } from '@studio/git-ui';
import { PILL_FIXTURES } from '@studio/git-ui/fixtures';
import { GIT_STATUS_STRINGS } from '../git-status/presentation.js';
import { openLabelFor } from './ProjectCard.js';

describe('openLabelFor', () => {
  test('the accessible name carries the status and PR the hidden pill shows; the bare card keeps the name', () => {
    const label = openLabelFor('pricing-v2', 'ready-to-merge', PILL_FIXTURES['ready-to-merge']);
    expect(label).toContain('pricing-v2');
    expect(label).toContain(GIT_STATUS_STRINGS.cardLabel['ready-to-merge']);
    expect(label).toContain(`#${prOf(PILL_FIXTURES['ready-to-merge'])?.number}`);
    expect(openLabelFor('pricing-v2', 'none', undefined)).toBe('pricing-v2');
  });
});
