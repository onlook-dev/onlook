import { describe, expect, it } from 'bun:test';
import { broadcastAudience } from './broadcast.js';

function view(name: string, isDestroyed = false): { name: string; isDestroyed: () => boolean } {
  return { name, isDestroyed: () => isDestroyed };
}

const names = (views: { name: string }[]): string[] => views.map((each) => each.name);

describe('broadcastAudience', () => {
  it('reaches a held spare as well as the chrome and every warm tab (ONL-2464)', () => {
    const audience = broadcastAudience({
      chrome: view('chrome'),
      tabs: [view('tab-1'), undefined, view('tab-3')],
      spare: view('tab-4'),
    });
    expect(names(audience)).toEqual(['chrome', 'tab-1', 'tab-3', 'tab-4']);
  });

  it('never reaches a destroyed view, spare or tab', () => {
    const audience = broadcastAudience({
      chrome: view('chrome'),
      tabs: [view('tab-1', true), view('tab-2')],
      spare: view('tab-3', true),
    });
    expect(names(audience)).toEqual(['chrome', 'tab-2']);
  });
});
