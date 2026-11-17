import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Showroom, type Gallery } from './Showroom.js';

describe('targeted Showroom state', () => {
  it('falls back to the gallery for an unknown category anchor', () => {
    const mounted: string[] = [];
    const galleries: Gallery[] = [{ id: 'artifacts', title: 'Artifacts', categories: [{
      id: 'pending', title: 'Reading', stories: [{ id: 'pending-story', title: 'Reading', render: () => { mounted.push('pending'); return <div />; } }],
    }] }];
    renderToStaticMarkup(<Showroom galleries={galleries} initial="artifacts/unknown" />);
    expect(mounted).toEqual(['pending']);
  });

  it('does not mount another category that could overwrite a fixture store', () => {
    const mounted: string[] = [];
    const galleries: Gallery[] = [{
      id: 'artifacts', title: 'Artifacts', categories: ['pending', 'missing'].map((id) => ({
        id, title: id, stories: [{ id: `${id}-story`, title: id, render: () => { mounted.push(id); return <div>{id}</div>; } }],
      })),
    }];
    renderToStaticMarkup(<Showroom galleries={galleries} initial="artifacts/pending" />);
    expect(mounted).toEqual(['pending']);
  });

  it('can target one story without mounting a sibling store writer', () => {
    const mounted: string[] = [];
    const galleries: Gallery[] = [{ id: 'sidebar', title: 'Sidebar', categories: [{
      id: 'designs', title: 'Designs', stories: ['kinds', 'working'].map((id) => ({
        id, title: id, render: () => { mounted.push(id); return <div>{id}</div>; },
      })),
    }] }];
    renderToStaticMarkup(<Showroom galleries={galleries} initial="sidebar/designs/kinds" />);
    expect(mounted).toEqual(['kinds']);
  });

  it('preserves the two-segment story anchor from main while isolating sibling writers', () => {
    const mounted: string[] = [];
    const galleries: Gallery[] = [{ id: 'sidebar', title: 'Sidebar', categories: [{
      id: 'designs', title: 'Designs', stories: ['kinds', 'working'].map((id) => ({
        id, title: id, render: () => { mounted.push(id); return <div>{id}</div>; },
      })),
    }] }];
    renderToStaticMarkup(<Showroom galleries={galleries} initial="sidebar/kinds" />);
    expect(mounted).toEqual(['kinds']);
  });
});
