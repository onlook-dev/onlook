import { expect, it } from 'bun:test';
import type { ArtifactSummary } from '@studio/events';
import { recentArtifacts } from './catalogDisplay.js';
const row = (id: string, title: string, updatedAt: string): ArtifactSummary => ({id, title, updatedAt, pagePath: 'pages/index.html', pages: [{path: 'pages/cart.html', name: 'Basket'}, {path: 'pages/index.html', name: 'Welcome'}], readOnly: false});
it('sorts newest first with deterministic ties without mutating records or ordered pages', () => {
  const records = [row('b','Old','2026-01-01T00:00:00Z'), row('z','Recent','2026-10-09T00:00:00Z'), row('a','Tie','2026-01-01T00:00:00Z')];
  expect(recentArtifacts(records).map((artifact) => artifact.id)).toEqual(['z','a','b']);
  expect(records.map((artifact) => artifact.id)).toEqual(['b','z','a']);
  expect(recentArtifacts(records)[0]).toBe(records[1]!);
  expect(recentArtifacts(records)[0]!.pages!.map((page) => page.name)).toEqual(['Basket','Welcome']);
});
it('filters locally by artifact title and page names with trim/case folding, and preserves recent ordering', () => {
  const records = [row('old','Commerce','2026-01-01T00:00:00Z'), row('new','Studio','2026-10-09T00:00:00Z')];
  expect(recentArtifacts(records,'  STUDIO ').map((artifact) => artifact.id)).toEqual(['new']);
  expect(recentArtifacts(records,'basket').map((artifact) => artifact.id)).toEqual(['new','old']);
  expect(recentArtifacts(records,'does not match')).toEqual([]);
  expect(recentArtifacts(records,' ')).toEqual(recentArtifacts(records));
});
it('uses name-first main-owned ranks before recent tie-breaking without changing document identity', () => {
  const records = [row('body','Newest','2026-10-09T00:00:00Z'), row('name','Lemon','2026-01-01T00:00:00Z'), row('tie','Other Lemon','2026-10-09T00:00:00Z')];
  expect(recentArtifacts(records,'lemon',new Map([['body',4],['name',0],['tie',2]])).map((artifact) => artifact.id)).toEqual(['name','tie','body']);
});
