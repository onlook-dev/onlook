import { describe, expect, it } from 'bun:test';
import { refusalFrom } from './refusal.js';

describe('refusalFrom', () => {
  it("carries main's reason, detail and project name onto the refusal", () => {
    expect(refusalFrom({ reason: 'already-copied', projectName: 'lemonade', detail: 'x' })).toEqual({
      reason: 'already-copied',
      projectName: 'lemonade',
      detail: 'x',
    });
  });

  it('names the picked folder by its last segment, trailing slash or not (ONL-2895)', () => {
    expect(refusalFrom({ reason: 'nothing-to-copy' }, '/Users/a/my-new-site')).toStrictEqual({ reason: 'nothing-to-copy', folderName: 'my-new-site' });
    expect(refusalFrom({ reason: 'nothing-to-copy' }, '/Users/a/my-new-site/').folderName).toBe('my-new-site');
  });
});
