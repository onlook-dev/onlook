import { describe, expect, it } from 'bun:test';
import type { ArtifactNode, BrowserNode, TextNode } from '@studio/events';
import { defaultTextBox } from '@studio/events';
import { artifactTag } from '../nodeLabel.js';
import type { StringKey, StringParams } from '@studio/i18n';
import { artifactFrameNames } from './artifactFrames.js';

/** The catalog's own value is not the subject here; a chip's label is, so a key names itself and keeps its params. */
const translate = (key: StringKey, params?: StringParams): string =>
  params === undefined ? `t:${key}` : `t:${key}:${Object.values(params).join(':')}`;

function frame(id: string, pageId: string, homeUrl: string): BrowserNode {
  return {
    id,
    pageId,
    kind: 'browser',
    name: id,
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    order: 0,
    content: { homeUrl },
  };
}

function note(id: string, pageId: string): TextNode {
  return {
    id,
    pageId,
    kind: 'text',
    name: id,
    x: 0,
    y: 0,
    ...defaultTextBox('medium'),
    order: 0,
    content: { text: id, size: 'medium' },
  };
}

/** `name` is blank as `addArtifact` mints it; the title is what a chip shows (ONL-2568). */
function artifact(
  id: string,
  pageId: string,
  title = id,
  name = '',
  artifactId = `art-${id}`,
): ArtifactNode {
  return {
    id,
    pageId,
    kind: 'artifact',
    name,
    x: 0,
    y: 0,
    width: 480,
    height: 640,
    order: 0,
    content: { artifactId, title },
  };
}

describe('which transcript chips wear the artifact treatment', () => {
  it('names an artifact on a page the canvas is not showing', () => {
    const nodes = [frame('here', 'pg_a', 'http://localhost:3000/'), artifact('there', 'pg_b')];

    expect(artifactFrameNames(nodes, translate)).toBe('there');
  });

  it('no longer names a browser frame whose URL ends .html', () => {
    // The treatment follows the artifact's identity now, not a URL (ONL-2568).
    const nodes = [
      frame('served', 'pg_a', 'http://localhost:3000/preview/index.html'),
      frame('alsoServed', 'pg_a', 'http://localhost:3000/proto/a.htm'),
    ];

    expect(artifactFrameNames(nodes, translate)).toBe('');
  });

  it('names no text node and no plain frame', () => {
    const nodes = [note('n', 'pg_a'), frame('plain', 'pg_a', 'http://localhost:3000/app')];

    expect(artifactFrameNames(nodes, translate)).toBe('');
  });

  it('names two artifacts sharing a title differently, so either chip can be matched', () => {
    const nodes = [artifact('one', 'pg_a', 'Pricing'), artifact('two', 'pg_a', 'Pricing')];

    const [first, second] = artifactFrameNames(nodes, translate).split('\n');

    expect(first).not.toBe(second);
    expect(first).toContain('Pricing');
    expect(first).toContain(artifactTag('art-one'));
    expect(second).toContain(artifactTag('art-two'));
  });

  it('names them differently even when their ids share the tag’s leading characters (ONL-2568)', () => {
    const shared = ['3c49a1b2-1111-4111-8111-aaaaaaaaaaaa', '3c49f7e8-2222-4222-8222-bbbbbbbbbbbb'];
    const nodes = [
      artifact('one', 'pg_a', 'Pricing', '', shared[0]),
      artifact('two', 'pg_a', 'Pricing', '', shared[1]),
    ];

    const [first, second] = artifactFrameNames(nodes, translate).split('\n');

    expect(artifactTag(shared[0] as string)).toBe(artifactTag(shared[1] as string));
    expect(first).not.toBe(second);
    expect(first).toContain('3c49a');
    expect(second).toContain('3c49f');
  });

  it('names both rows of one artifact the same, because they are one sketch', () => {
    const nodes = [
      artifact('one', 'pg_a', 'Pricing', '', 'art-same'),
      artifact('two', 'pg_b', 'Pricing', '', 'art-same'),
    ];

    expect(artifactFrameNames(nodes, translate)).toBe('Pricing\nPricing');
  });

  it('names the artifact by the label a chip carries, not by the blank envelope name', () => {
    // A chip matches on `object.label`; an unrenamed artifact's `name` is '' (ONL-2568).
    const nodes = [artifact('one', 'pg_a', 'Pricing')];

    expect(artifactFrameNames(nodes, translate)).toBe('Pricing');
  });

  it('names a chip by the current artifact title alone, without changing saved metadata (ONL-2593)', () => {
    const nodes = [artifact('one', 'pg_a', 'Pricing', 'Checkout')];

    expect(artifactFrameNames(nodes, translate)).toBe('Pricing');
    expect(artifactFrameNames(nodes, translate, new Map([[nodes[0]!.content.artifactId, 'Renamed sketch']]))).toBe('Renamed sketch');
    expect(nodes[0]!.name).toBe('Checkout');
    expect(nodes[0]!.content.title).toBe('Pricing');
  });

  it('names an untitled artifact by its catalog label, never by an empty string', () => {
    // An empty entry would make every unnamed chip an artifact.
    const nodes = [artifact('one', 'pg_a', '')];

    expect(artifactFrameNames(nodes, translate)).toBe('t:canvas.artifact.untitled');
  });

  it('answers empty with no document open', () => {
    expect(artifactFrameNames([], translate)).toBe('');
  });
});
