import { describe, expect, it } from 'bun:test';
import { PREWARM_LIMIT, prewarmQueue } from './prewarm.js';

const candidate = (id: string, over: Partial<{ isCold: boolean; isProject: boolean; isSelected: boolean }> = {}) => ({
  id,
  isCold: true,
  isProject: true,
  isSelected: false,
  ...over,
});

describe('which restored tabs a launch warms (ONL-3153)', () => {
  it('takes the selected tab first, then strip order', () => {
    expect(prewarmQueue([candidate('a'), candidate('b', { isSelected: true }), candidate('c')])).toEqual(['b', 'a', 'c']);
  });

  it('leaves the tabs that already hold a renderer', () => {
    expect(prewarmQueue([candidate('warm', { isCold: false }), candidate('cold')])).toEqual(['cold']);
  });

  it('leaves Home, which is not a project', () => {
    expect(prewarmQueue([candidate('home', { isProject: false }), candidate('project')])).toEqual(['project']);
  });

  it('stops at the limit, so a session of nine tabs does not build nine renderers', () => {
    const many = Array.from({ length: 9 }, (_, index) => candidate(`tab-${String(index)}`));
    expect(prewarmQueue(many)).toHaveLength(PREWARM_LIMIT);
  });
});
