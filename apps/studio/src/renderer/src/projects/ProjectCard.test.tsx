import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { PILL_FIXTURES } from '@studio/git-ui/fixtures';
import { PROJECT_CARD_WIDTH, ProjectCard, thumbnailFadeFor, type ProjectCardProps } from './ProjectCard.js';

/* The fade's clock and its reduced-motion escape live in the sheet, so the sheet is read
   here the way `theme/p3.test.ts` reads it. */
const CSS = readFileSync(fileURLToPath(new URL('./projects.css', import.meta.url)), 'utf8');

const THUMB = 'studio-thumb://canvas/red-skylark?v=7';

const GROUND = 'background-color:var(--color-background-muted)';

function card(props: Omit<ProjectCardProps, 'name' | 'meta'> = {}): string {
  return renderToStaticMarkup(<ProjectCard name="red-skylark" meta="2d" {...props} />);
}

/** The ratio box itself, NOT the wrapper the primitive puts inside it — the ground rides the box. */
function ratioBox(markup: string): string {
  const inner = markup.indexOf('data-astryx-aspect-ratio-override');
  expect(inner).toBeGreaterThan(-1);
  const wrapper = markup.lastIndexOf('<div', inner);
  const box = markup.lastIndexOf('<div', wrapper - 1);
  return markup.slice(box, markup.indexOf('>', box) + 1);
}

const VOID_TAGS = new Set(['img', 'br', 'hr', 'input']);

/** Opening tags of the ratio wrapper's DIRECT children: the core reset sizes every one of them
    to the whole box, so a second child stacks over the image instead of under it. */
function ratioChildren(markup: string): string[] {
  const inner = markup.indexOf('data-astryx-aspect-ratio-override');
  expect(inner).toBeGreaterThan(-1);
  const body = markup.slice(markup.indexOf('>', inner) + 1);
  const children: string[] = [];
  let depth = 0;
  for (const tag of body.matchAll(/<(\/?)([a-z]+)[^>]*?(\/?)>/gu)) {
    if (tag[1] === '/') {
      if (depth === 0) break;
      depth -= 1;
      continue;
    }
    if (depth === 0) children.push(tag[0]);
    if (tag[3] !== '/' && !VOID_TAGS.has(tag[2] ?? '')) depth += 1;
  }
  return children;
}

function imgTag(markup: string): string {
  const at = markup.indexOf('<img');
  expect(at).toBeGreaterThan(-1);
  return markup.slice(at, markup.indexOf('>', at) + 1);
}

describe('the card\'s thumbnail slot (ONL-2471)', () => {
  it('paints the composed image as the ratio box\'s only child, over a ground on the box', () => {
    const markup = card({ previewSrc: THUMB });
    const children = ratioChildren(markup);

    expect(children).toHaveLength(1);
    expect(children[0]).toContain('<img');
    expect(children[0]).toContain(`src="${THUMB}"`);
    // The stored image carries the slot's margin as transparent padding, so the ground has to
    // be UNDER it — on the box, never a sibling.
    expect(ratioBox(markup)).toContain(GROUND);
  });

  it('renders a blank muted cover when there is no image (ONL-2615)', () => {
    const markup = card();
    const children = ratioChildren(markup);

    expect(children).toHaveLength(1);
    expect(children[0]).toContain('<div');
    expect(children[0]).toContain(GROUND);
    expect(children[0]).toContain('data-testid="project-card-placeholder"');
    expect(markup).toMatch(/data-testid="project-card-placeholder"[^>]*><\/div>/u);
    expect(markup).not.toContain('<img');
    expect(markup).not.toContain('data-testid="project-card-thumbnail"');
    expect(ratioBox(markup)).toContain(GROUND);
  });

  it('clips the cover on the open target without clipping its keyboard outline', () => {
    const markup = card({ onOpen: () => {} });
    const wrapper = markup.slice(0, markup.indexOf('>'));
    const target = markup.slice(markup.indexOf('<button'), markup.indexOf('>', markup.indexOf('<button')));

    expect(wrapper).not.toContain('overflow:hidden');
    expect(target).toContain('border-radius:inherit;overflow:hidden');
  });

  it('leaves the ground showing when the image never arrives, and says nothing about it', () => {
    const markup = card({ previewSrc: THUMB });

    // Nothing is marked shown until the load fires, so a failed image rests transparent.
    expect(imgTag(markup)).not.toContain('data-loaded');
    expect(markup).not.toContain('role="alert"');
    expect(ratioBox(markup)).toContain(GROUND);
  });

  it('keeps one footprint whatever the canvas holds', () => {
    const withImage = card({ previewSrc: THUMB });
    const other = card({ previewSrc: 'studio-thumb://canvas/one-tall-frame?v=2' });

    expect(ratioBox(withImage)).toBe(ratioBox(other));
    expect(ratioBox(withImage)).toBe(ratioBox(card()));
    expect(ratioBox(withImage)).toContain(`aspect-ratio:${String(PROJECT_CARD_WIDTH / 140)}`);
    for (const markup of [withImage, other]) {
      expect(imgTag(markup)).toContain('object-fit:cover');
    }
  });

  it('hangs the fade on the URL that loaded, so a re-render with the same one does not replay it', () => {
    expect(thumbnailFadeFor(THUMB, undefined)).toBeUndefined();
    expect(thumbnailFadeFor(THUMB, THUMB)).toBe('true');
    expect(thumbnailFadeFor('studio-thumb://canvas/red-skylark?v=8', THUMB)).toBeUndefined();
  });

  it('carries its own clock and the reduced-motion escape', () => {
    expect(CSS).toContain('@keyframes project-card-thumbnail-in');
    expect(CSS).toMatch(
      /\.project-card-thumbnail\[data-loaded='true'\] \{\s*animation: project-card-thumbnail-in var\(--duration-fast-max\)/u,
    );
    // Both selectors, or the attribute rule above outranks the escape and the fade still runs.
    expect(CSS).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.project-card-thumbnail,\s*\.project-card-thumbnail\[data-loaded='true'\] \{\s*animation: none;\s*opacity: 1;/u,
    );
  });

  it('decodes off the first paint: lazy and async', () => {
    const tag = imgTag(card({ previewSrc: THUMB }));

    expect(tag).toContain('loading="lazy"');
    expect(tag).toContain('decoding="async"');
  });

  it('keeps the image out of a session replay', () => {
    // The same literal `replay/derive.test.ts` pins as the recorder's block selector.
    expect(imgTag(card({ previewSrc: THUMB }))).toContain('data-replay-block');
  });

  it('keeps the git pill over the image at its design inset, outside the box', () => {
    const markup = card({ previewSrc: THUMB, gitPill: PILL_FIXTURES['ready-to-merge'] });
    const overlayAt = markup.indexOf('top:12px;left:12px');

    expect(ratioChildren(markup)).toHaveLength(1);
    expect(overlayAt).toBeGreaterThan(markup.indexOf('<img'));
    expect(markup.indexOf('project-card-git-pill')).toBeGreaterThan(overlayAt);
  });
});
