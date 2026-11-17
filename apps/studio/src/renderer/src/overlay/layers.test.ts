import { readdirSync, readFileSync } from 'node:fs';
import { expect, it } from 'bun:test';
import { LAYER, layerProperty, type LayerName } from './layers.js';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

it('the stylesheet declares every level at the value the scale gives it, and no other', () => {
  const declared = Object.fromEntries([...css.matchAll(/(--studio-layer-[a-z-]+):\s*(-?\d+);/g)].map((match) => [match[1], Number(match[2])]));
  const named = Object.fromEntries((Object.keys(LAYER) as LayerName[]).map((name) => [layerProperty(name), LAYER[name]]));
  expect(declared).toEqual(named);
});

it('the levels rise in the order they are listed', () => {
  const values = Object.values(LAYER);
  expect(values).toEqual([...values].sort((a, b) => a - b));
  expect(new Set(values).size).toBe(values.length);
});

it('no stylesheet beside a component writes a stacking number of its own', () => {
  const sheets = readdirSync(new URL('..', import.meta.url), { recursive: true, encoding: 'utf8' }).filter((path) => path.endsWith('.css') && path !== 'theme/studio.css');
  expect(sheets).toContain('fan/fan.css');
  for (const sheet of sheets) {
    const text = readFileSync(new URL(`../${sheet}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const bare = [...text.matchAll(/z-index:\s*([^;]+);/g)].map((match) => match[1]!.trim()).filter((value) => !/^var\(--studio-layer-[a-z-]+\)( !important)?$/.test(value));
    expect(bare).toEqual([]);
  }
});
