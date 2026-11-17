import { expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { takeComplaints } from '../../testing/dom.js';
import { ArtifactList } from './ArtifactList.js';

it('reuses unchanged cards while search results change and still updates renamed records', async () => {
  let reads = 0;
  const record = {id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Study', updatedAt: '', pagePath: 'pages/index.html', get readOnly() { reads += 1; return false; }};
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<ArtifactList records={[record]} deferControls />); });
    reads = 0;
    await act(async () => { root.render(<ArtifactList records={[record]} deferControls />); });
    expect(reads).toBe(0);
    await act(async () => { root.render(<ArtifactList records={[{...record, title: 'Renamed study'}]} deferControls />); });
    expect(container.querySelector('[data-testid="artifact-title-button"]')?.textContent).toBe('Renamed study');
    expect(container.querySelector('[data-testid="artifact-export-menu"]')).toBeNull();
    await act(async () => { (container.querySelector('[data-testid="artifact-title-button"]') as HTMLElement).focus(); });
    expect(container.querySelector('[data-testid="artifact-export-menu"]')).not.toBeNull();
  } finally {
    await act(async () => { root.unmount(); });
    container.remove();
    expect(takeComplaints()).toEqual([]);
  }
});

it('opens an eight-artifact library without mounting unopened menus or delete dialogs', () => {
  const records = Array.from({ length: 8 }, (_, index) => ({ id: `aaaaaaaa-1111-4111-8111-${String(index).padStart(12, '0')}`, title: `Study ${index}`, updatedAt: 'one', pagePath: 'pages/index.html', readOnly: false }));
  const markup = renderToStaticMarkup(<ArtifactList records={records} onPlace={() => {}} />);
  expect(markup.match(/data-testid="artifact-page-preview"/g)).toHaveLength(8);
  expect(markup.match(/data-testid="artifact-title-button"/g)).toHaveLength(8);
  expect(markup.match(/canvas-artifact-delete-confirm/g) ?? []).toHaveLength(0);
  expect(markup.match(/role="menuitem"/g) ?? []).toHaveLength(0);
});

it('paints every sidebar preview and title before mounting interactive overlay controls', () => {
  const records = Array.from({ length: 8 }, (_, index) => ({ id: `aaaaaaaa-1111-4111-8111-${String(index).padStart(12, '0')}`, title: `Study ${index}`, updatedAt: 'one', pagePath: 'pages/index.html', readOnly: false }));
  const markup = renderToStaticMarkup(<ArtifactList records={records} onPlace={() => {}} deferControls />);
  expect(markup.match(/data-testid="artifact-page-preview"/g)).toHaveLength(8);
  expect(markup.match(/data-testid="artifact-title-button"/g)).toHaveLength(8);
  expect(markup.match(/class="artifact-page-card"/g)).toHaveLength(8);
  expect(markup.match(/data-testid="artifact-export-menu"/g) ?? []).toHaveLength(0);
});

it('preserves every legacy document in order as explicit readonly cards, never live guests or hidden extra bytes', () => {
  const markup = renderToStaticMarkup(<ArtifactList records={[{ id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Shop', updatedAt: 'one', pagePath: 'pages/index.html', readOnly: true, pages: [{ path: 'pages/cart.html', name: 'Basket' }, { path: 'pages/index.html', name: 'Welcome' }] }]} onPlace={() => {}} isProjectsView />);
  expect(markup.indexOf('Basket')).toBeLessThan(markup.indexOf('Welcome'));
  expect(markup.match(/data-testid="artifact-page-preview"/g)).toHaveLength(2);
  expect(markup).toContain('<figcaption');
  expect(markup).toContain('Rendering page');
  expect(markup).not.toContain('<webview');
  expect(markup).not.toContain('<iframe');
  expect(markup).toContain('disabled');
  expect(markup).toContain('Legacy artifact');
});

it('renders single-document home cards as a responsive grid and project cards as a list without page counts', () => {
  const records = [{id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Shop', updatedAt: 'one', pagePath: 'pages/index.html', readOnly: false, pages: [{path: 'pages/index.html', name: 'Home'}]}];
  const home = renderToStaticMarkup(<ArtifactList records={records} isProjectsView />);
  const sidebar = renderToStaticMarkup(<ArtifactList records={records} onPlace={() => {}} />);
  expect(home).toContain('data-gap="8"');
  // A wide panel tiles columns too, at a narrower minimum than the Projects page (ONL-2593).
  expect(sidebar).toContain('minmax(min(100%, 140px), 1fr)');
  expect(home.match(/data-testid="artifact-page-preview"/g)).toHaveLength(1);
  expect(home).not.toContain('Add to canvas');
  expect(home).not.toContain('1 page');
  expect(home).not.toContain('<figcaption');
  expect(sidebar).toContain('Add to canvas');
  expect(home).toContain('Rename artifact');
  expect(home).not.toContain('Shop ·');
  expect(home).not.toContain('title="aaaaaaaa');
  expect(sidebar).not.toContain('Shop ·');
  expect(home.indexOf('artifact-title-button')).toBeGreaterThan(home.indexOf('artifact-page-preview'));
  expect(sidebar.indexOf('artifact-title-button')).toBeGreaterThan(sidebar.indexOf('artifact-page-preview'));
});

it('tags only distinct artifacts sharing a title and removes tags when titles diverge', () => {
  const records = ['12340000-1111-4111-8111-000000000001', '12340001-1111-4111-8111-000000000002'].map((id) => ({ id, title: 'Pricing', pagePath: 'pages/index.html', updatedAt: 'one', readOnly: false }));
  const duplicate = renderToStaticMarkup(<ArtifactList records={records} />);
  expect(duplicate).toContain('Pricing · 12340000');
  expect(duplicate).toContain('Pricing · 12340001');
  const renamed = renderToStaticMarkup(<ArtifactList records={records.map((record, index) => ({ ...record, title: index === 0 ? 'Pricing' : 'Checkout' }))} />);
  expect(renamed).not.toContain(' · ');
});
