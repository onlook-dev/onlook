import { describe, expect, test } from 'bun:test';

import {
  ARTIFACT_NODE_TYPE,
  FRAME_NODE_TYPE,
  IMAGE_NODE_TYPE,
  TEXT_NODE_TYPE,
  type CanvasFlowNode,
} from '../canvas/model.js';
import { ImageGlyph, PlaygroundGlyph, TextGlyph, WindowGlyph } from '../icons/glyphs.js';
import { artifactTag, canvasNodeLabel, canvasNodeLabeller } from '../nodeLabel.js';
import { t } from '@studio/i18n';
import { designRowFacts, designRowGlyph } from './designRow.js';

const BOX = { position: { x: 0, y: 0 }, width: 100, height: 100 };

function frameNode(name: string, currentUrl = 'http://localhost:3000/'): CanvasFlowNode {
  return {
    id: 'f',
    type: FRAME_NODE_TYPE,
    ...BOX,
    data: {
      homeUrl: currentUrl,
      name,
      currentUrl,
      health: 'live',
      title: '',
      canGoBack: false,
      canGoForward: false,
    },
  };
}

function textNode(text: string, name = ''): CanvasFlowNode {
  return { id: 't', type: TEXT_NODE_TYPE, ...BOX, data: { text, size: 'medium', name } };
}

const ONE = '3f9c1d20-1111-4111-8111-aaaaaaaaaaaa';
const TWO = 'b71e4a55-2222-4222-8222-bbbbbbbbbbbb';
/** Two valid uuids whose first four characters are one string (ONL-2568). */
const SHARED_ONE = '3c49a1b2-1111-4111-8111-aaaaaaaaaaaa';
const SHARED_TWO = '3c49f7e8-2222-4222-8222-bbbbbbbbbbbb';

function artifactNode(
  title: string,
  { name = '', id = 'a', artifactId = ONE }: { name?: string; id?: string; artifactId?: string } = {},
): CanvasFlowNode {
  return { id, type: ARTIFACT_NODE_TYPE, ...BOX, data: { artifactId, title, name } };
}

function imageNode(name: string): CanvasFlowNode {
  return {
    id: 'i',
    type: IMAGE_NODE_TYPE,
    ...BOX,
    data: { imageId: 'blob-1', name, originalWidth: 10, originalHeight: 10 },
  };
}

describe('the glyph a row wears', () => {
  test('a served frame draws the window', () => {
    expect(designRowGlyph(designRowFacts(frameNode('Home')))).toBe(WindowGlyph);
  });

  test('an artifact draws the playground', () => {
    expect(designRowGlyph(designRowFacts(artifactNode('Sketch')))).toBe(PlaygroundGlyph);
  });

  test('a frame whose URL ends .html no longer draws the playground (ONL-2568)', () => {
    for (const url of ['http://localhost:3000/a.html', 'http://localhost:3000/proto/b.htm']) {
      expect(designRowGlyph(designRowFacts(frameNode('Sketch', url)))).toBe(WindowGlyph);
    }
  });

  test('a label draws the text glyph', () => {
    expect(designRowGlyph(designRowFacts(textNode('Variants')))).toBe(TextGlyph);
  });

  test('a picture draws the image glyph', () => {
    expect(designRowGlyph(designRowFacts(imageNode('shot.png')))).toBe(ImageGlyph);
  });
});

describe('two artifacts that share a title', () => {
  const one = artifactNode('Pricing', { id: 'a1', artifactId: ONE });
  const two = artifactNode('Pricing', { id: 'a2', artifactId: TWO });
  const labelsFor = (nodes: CanvasFlowNode[]): string[] => {
    const facts = nodes.map(designRowFacts);
    const labelOf = canvasNodeLabeller(facts, t);
    return facts.map(labelOf);
  };

  test('read differently in the list, each by its own artifact', () => {
    const [first, second] = labelsFor([one, two]);

    expect(first).not.toBe(second);
    expect(first).toContain(artifactTag(ONE));
    expect(first).not.toContain(artifactTag(TWO));
    expect(second).toContain(artifactTag(TWO));
  });

  test('keep their true titles, which is what a tag stands beside', () => {
    const [first] = labelsFor([one, two]);

    expect(first?.startsWith('Pricing')).toBe(true);
    expect(one.data.title).toBe('Pricing');
    expect(canvasNodeLabel(designRowFacts(one))).toEqual({
      source: 'artifact-title',
      value: 'Pricing',
    });
  });

  test('read the same way whichever end of the list they are read from', () => {
    const [first] = labelsFor([one, two]);
    const [, alsoFirst] = labelsFor([two, one]);

    expect(alsoFirst).toBe(first);
  });

  test('shows each artifact by its own title, never a local alias (ONL-2593)', () => {
    const [first, second] = labelsFor([
      artifactNode('Checkout', { id: 'a1', artifactId: ONE, name: 'Pricing' }),
      artifactNode('Billing', { id: 'a2', artifactId: TWO, name: 'Pricing' }),
    ]);

    expect(first).not.toBe(second);
    expect(first).toBe('Checkout');
    expect(second).toBe('Billing');
  });

  test('two with no title at all are told apart', () => {
    const [first, second] = labelsFor([
      artifactNode('', { id: 'a1', artifactId: ONE }),
      artifactNode('', { id: 'a2', artifactId: TWO }),
    ]);

    expect(first).not.toBe(second);
    expect(first?.startsWith(t('canvas.artifact.untitled'))).toBe(true);
  });

  test('whose ids also share the tag’s leading characters still read differently (ONL-2568)', () => {
    const [first, second] = labelsFor([
      artifactNode('Pricing', { id: 'a1', artifactId: SHARED_ONE }),
      artifactNode('Pricing', { id: 'a2', artifactId: SHARED_TWO }),
    ]);

    expect(artifactTag(SHARED_ONE)).toBe(artifactTag(SHARED_TWO));
    expect(first).not.toBe(second);
    expect(first).toContain('3c49a');
    expect(second).toContain('3c49f');
  });

  test('two rows of one artifact are one sketch, so neither is tagged', () => {
    const [first, second] = labelsFor([one, { ...one, id: 'a3' }]);

    expect(first).toBe('Pricing');
    expect(second).toBe('Pricing');
  });

  test('a title only one artifact holds never grows a tag', () => {
    const [first] = labelsFor([one, frameNode('Pricing'), artifactNode('Checkout', { id: 'a4', artifactId: TWO })]);

    expect(first).toBe('Pricing');
  });

  test('an artifact with no title falls back to the catalogue', () => {
    expect(canvasNodeLabel(designRowFacts(artifactNode('')))).toEqual({
      source: 'untitled',
      key: 'canvas.artifact.untitled',
    });
  });
});

describe('where a row gets its label', () => {
  test("a frame reads its durable name", () => {
    expect(canvasNodeLabel(designRowFacts(frameNode('Pricing')))).toEqual({
      source: 'given',
      value: 'Pricing',
    });
  });

  test('a frame with no name falls back to the catalogue', () => {
    expect(canvasNodeLabel(designRowFacts(frameNode('   ')))).toEqual({
      source: 'untitled',
      key: 'sidebar.frame.untitled',
    });
  });

  test('a label reads its own string', () => {
    expect(canvasNodeLabel(designRowFacts(textNode('Spring sale')))).toEqual({
      source: 'text',
      value: 'Spring sale',
    });
  });

  test('a label follows the string as it is edited', () => {
    const before = canvasNodeLabel(designRowFacts(textNode('Spring sale')));
    const after = canvasNodeLabel(designRowFacts(textNode('Summer sale')));
    expect(before).not.toEqual(after);
    expect(after).toEqual({ source: 'text', value: 'Summer sale' });
  });

  test('a multi-line label is cut to its first line with content', () => {
    expect(canvasNodeLabel(designRowFacts(textNode('\n  Headline  \nand the rest')))).toEqual({
      source: 'text',
      value: 'Headline',
    });
  });

  test('a label with nothing written yet falls back to the catalogue', () => {
    expect(canvasNodeLabel(designRowFacts(textNode('   \n  ')))).toEqual({
      source: 'untitled',
      key: 'sidebar.text.untitled',
    });
  });

  test('a picture reads its stored display name', () => {
    expect(canvasNodeLabel(designRowFacts(imageNode('hero@2x.png')))).toEqual({
      source: 'given',
      value: 'hero@2x.png',
    });
  });

  test('a picture whose gesture supplied no filename falls back to the pasted-image label', () => {
    expect(canvasNodeLabel(designRowFacts(imageNode('')))).toEqual({
      source: 'pasted-image',
      key: 'canvas.image.pastedName',
    });
  });

  test('a given name beats the string a label holds, and keeps beating it', () => {
    expect(canvasNodeLabel(designRowFacts(textNode('Spring sale', 'Hero copy')))).toEqual({
      source: 'given',
      value: 'Hero copy',
    });
    expect(canvasNodeLabel(designRowFacts(textNode('Summer sale', 'Hero copy')))).toEqual({
      source: 'given',
      value: 'Hero copy',
    });
  });

  test('clearing a given name returns a label to deriving', () => {
    expect(canvasNodeLabel(designRowFacts(textNode('Spring sale', '  ')))).toEqual({
      source: 'text',
      value: 'Spring sale',
    });
  });
});
