import { expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { FannedPreview, type FanCard } from './FannedPreview.js';

function cards(count: number, removable = false): FanCard[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `card-${String(index)}`,
    label: `Shot ${String(index)}`,
    content: <img src={`shot-${String(index)}.png`} alt="" />,
    ...(removable ? { remove: { label: `Remove shot ${String(index)}`, isDisabled: false, onRemove: () => {} } } : {}),
  }));
}

it('names the cards it shows, on a container that can carry a name', () => {
  const markup = renderToStaticMarkup(<FannedPreview cards={cards(2)} />);
  expect(markup).toContain('role="group"');
  expect(markup).toContain('aria-label="Shot 0, Shot 1"');
});

it('holds the fan at five, and takes no name when it holds nothing', () => {
  const markup = renderToStaticMarkup(<FannedPreview cards={cards(7)} />);
  expect(markup).toContain('shot-4.png');
  expect(markup).not.toContain('shot-5.png');
  expect(renderToStaticMarkup(<FannedPreview cards={[]} />)).not.toContain('aria-label');
});

it('offers removal on the card itself, and only where a card can be removed', () => {
  expect(renderToStaticMarkup(<FannedPreview cards={cards(1)} />)).not.toContain('<button');
  const markup = renderToStaticMarkup(<FannedPreview cards={cards(2, true)} />);
  expect(markup.match(/<button/g)).toHaveLength(2);
  expect(markup).toContain('aria-label="Remove shot 0"');
  expect(markup).toContain('aria-label="Remove shot 1"');
});
