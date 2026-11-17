import { describe, expect, it } from 'bun:test';
import { railItems } from './railItems.js';

describe('what the rail offers', () => {
  it('holds the mark, the two panel views and help, in that order', () => {
    expect(railItems(true).map((item) => item.id)).toEqual(['mark', 'designs', 'artifacts', 'code', 'help']);
  });

  it('seats the mark at the head and help at the foot, with the views between them', () => {
    const places = Object.fromEntries(railItems(true).map((item) => [item.id, item.place]));
    expect(places).toEqual({ mark: 'head', designs: 'views', artifacts: 'views', code: 'views', help: 'foot' });
  });

  it('names a panel view for each item that switches one, and nothing for the rest', () => {
    const views = railItems(true).filter((item) => item.view !== undefined);
    expect(views.map((item) => item.view)).toEqual(['designs', 'artifacts', 'code']);
  });

  it('offers no Code entry by default', () => {
    expect(railItems().map((item) => item.id)).toEqual(['mark', 'designs', 'artifacts', 'help']);
    expect(railItems(false)).toEqual(railItems());
  });
});
