import { describe, expect, it } from 'bun:test';
import {
  defaultTextBox,
  type CanvasDoc,
  type CanvasNode,
  type CanvasNodeId,
  type CanvasPage,
} from '@studio/events';
import { en } from '@studio/i18n/strings';
import {
  canvasMenuItems,
  menuSelectionFor,
  type CanvasMenuItem,
  type CanvasMenuSelection,
  type CanvasMenuVerb,
} from './items.js';

function browser(id: string, order = 0): CanvasNode {
  return {
    id,
    pageId: 'pg_main',
    kind: 'browser',
    name: id,
    x: 0,
    y: 0,
    width: 1280,
    height: 800,
    order,
    content: { homeUrl: 'http://localhost:3000/' },
  };
}

function label(id: string, order = 0): CanvasNode {
  return {
    id,
    pageId: 'pg_main',
    kind: 'text',
    name: id,
    x: 0,
    y: 0,
    ...defaultTextBox('medium'),
    order,
    content: { text: 'a note', size: 'medium' },
  };
}

function picture(id: string, order = 0): CanvasNode {
  return {
    id,
    pageId: 'pg_main',
    kind: 'image',
    name: id,
    x: 0,
    y: 0,
    width: 320,
    height: 200,
    order,
    content: { imageId: `img_${id}`, name: `${id}.png`, originalWidth: 640, originalHeight: 400 },
  };
}

function sketch(id: string, order = 0): CanvasNode {
  return {
    id,
    pageId: 'pg_main',
    kind: 'artifact',
    name: '',
    x: 0,
    y: 0,
    width: 480,
    height: 640,
    order,
    content: { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Pricing' },
  };
}

function docOf(nodes: CanvasNode[]): CanvasDoc {
  return {
    schemaVersion: 1,
    docId: 'doc-under-test',
    revision: 1,
    pages: { pg_main: { id: 'pg_main', name: 'Canvas', order: 0 } },
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}

function pagedDocOf(pages: CanvasPage[], nodes: CanvasNode[]): CanvasDoc {
  return {
    schemaVersion: 1,
    docId: 'doc-under-test',
    revision: 1,
    pages: Object.fromEntries(pages.map((page) => [page.id, page])),
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}

function verbsFor(
  doc: CanvasDoc,
  selectedNodeIds: string[],
  openedOn: string,
): CanvasMenuItem['verb'][] {
  return canvasMenuItems(menuSelectionFor({ doc, selectedNodeIds }, openedOn)).map(
    (item) => item.verb,
  );
}

function movePagesFor(doc: CanvasDoc, selectedNodeIds: string[], openedOn: string): string[] {
  const item = canvasMenuItems(menuSelectionFor({ doc, selectedNodeIds }, openedOn)).find(
    (candidate) => candidate.verb === 'move-to-page',
  );
  return item === undefined ? [] : item.pages.map((page) => page.name);
}

const ACTING_VERBS: CanvasMenuVerb[] = ['duplicate', 'bring-to-front', 'send-to-back', 'delete'];

describe('the canvas node menu', () => {
  it('offers Export for browser frames and Artifact/browser selections, not text', () => {
    expect(verbsFor(docOf([browser('a')]), ['a'], 'a')).toContain('export-artifact');
    expect(verbsFor(docOf([browser('a'), sketch('b')]), ['a', 'b'], 'a')).toContain('export-artifact');
    expect(verbsFor(docOf([label('a')]), ['a'], 'a')).not.toContain('export-artifact');
  });
  it('offers Section actions without ineffective stacking commands', () => {
    const section: CanvasNode = { id: 'section', pageId: 'pg_main', kind: 'section', name: 'Explorations', x: 0, y: 0, width: 1600, height: 1200, order: 0, content: {} };
    const verbs = verbsFor(docOf([section]), ['section'], 'section');
    expect(verbs).toContain('duplicate');
    expect(verbs).toContain('delete');
    expect(verbs).not.toContain('bring-to-front');
    expect(verbs).not.toContain('send-to-back');
  });

  it('offers every acting verb on a frame, a label and an image alike', () => {
    for (const node of [browser('n'), label('n'), picture('n')]) {
      const verbs = verbsFor(docOf([node, browser('other', 1)]), ['n'], 'n');
      for (const verb of ACTING_VERBS) expect(verbs, node.kind).toContain(verb);
    }
  });

  it('offers restoring the aspect ratio on a picture and on nothing else', () => {
    expect(verbsFor(docOf([picture('n'), browser('other', 1)]), ['n'], 'n')).toContain(
      'restore-aspect-ratio',
    );
    for (const node of [browser('n'), label('n')]) {
      expect(verbsFor(docOf([node, browser('other', 1)]), ['n'], 'n'), node.kind).not.toContain(
        'restore-aspect-ratio',
      );
    }
  });

  it('offers destroying the artifact on an artifact and on nothing else', () => {
    expect(verbsFor(docOf([sketch('n'), browser('other', 1)]), ['n'], 'n')).toContain(
      'delete-artifact',
    );
    for (const node of [browser('n'), label('n'), picture('n')]) {
      expect(verbsFor(docOf([node, browser('other', 1)]), ['n'], 'n'), node.kind).not.toContain(
        'delete-artifact',
      );
    }
  });

  it('offers duplicate (another placement of the same sketch), persistent chat attachment and export on an artifact', () => {
    expect(verbsFor(docOf([sketch('n'), browser('other', 1)]), ['n'], 'n')).toContain(
      'duplicate',
    );
    expect(verbsFor(docOf([sketch('n')]), ['n'], 'n')).toContain('attach-artifact');
    expect(verbsFor(docOf([sketch('n')]), ['n'], 'n')).toContain('export-artifact');
  });

  it('copies a mixed selection as one all-or-nothing batch', () => {
    const doc = docOf([browser('a'), sketch('b', 1)]);
    expect(verbsFor(doc, ['a', 'b'], 'a')).toContain('duplicate');
    // The kinds that can be copied still offer it on their own.
    expect(verbsFor(doc, ['a'], 'a')).toContain('duplicate');
  });

  it('drops restoring the aspect ratio from a selection of several pictures, which has no one answer', () => {
    const doc = docOf([picture('a'), picture('b', 1)]);
    expect(verbsFor(doc, ['a', 'b'], 'a')).not.toContain('restore-aspect-ratio');
  });

  it('drops the stacking verbs from a multi-selection, which they cannot answer for', () => {
    const doc = docOf([browser('a'), label('b', 1), picture('c', 2)]);
    expect(verbsFor(doc, ['a', 'b'], 'a')).toEqual(['duplicate', 'delete']);
  });

  it('builds one item set for a panel row and for the node on the canvas', () => {
    const doc = docOf([browser('a'), picture('b', 1)]);
    const fromRow = canvasMenuItems(menuSelectionFor({ doc, selectedNodeIds: ['a'] }, 'a'));
    const fromNode = canvasMenuItems(menuSelectionFor({ doc, selectedNodeIds: ['a'] }, 'a'));
    expect(fromRow).toEqual(fromNode);
  });

  it('acts on the whole selection when opened on a member, and on the one node otherwise', () => {
    const doc = docOf([browser('a'), label('b', 1), picture('c', 2)]);
    const ids = (selected: string[], openedOn: string): string[] =>
      menuSelectionFor({ doc, selectedNodeIds: selected }, openedOn).targets.map(
        (target) => target.id,
      );
    expect(ids(['a', 'b'], 'b')).toEqual(['a', 'b']);
    expect(ids(['a', 'b'], 'c')).toEqual(['c']);
  });

  it('drops a selected id the document no longer holds', () => {
    const doc = docOf([browser('a'), label('b', 1)]);
    expect(
      menuSelectionFor({ doc, selectedNodeIds: ['a', 'gone'] }, 'a').targets.map((t) => t.id),
    ).toEqual(['a']);
  });

  it('offers nothing for a node the document does not hold', () => {
    expect(verbsFor(docOf([browser('a')]), [], 'ghost')).toEqual([]);
    expect(canvasMenuItems(menuSelectionFor({ doc: null, selectedNodeIds: [] }, 'a'))).toEqual([]);
  });

  it('offers no move when the project holds one page', () => {
    expect(verbsFor(docOf([browser('a')]), ['a'], 'a')).not.toContain('move-to-page');
  });

  it('offers every page but the node’s own, and never a divider', () => {
    const doc = pagedDocOf(
      [
        { id: 'pg_a', name: 'Checkout', order: 0 },
        { id: 'pg_div', name: '---', order: 1 },
        { id: 'pg_b', name: 'Settings', order: 2 },
        { id: 'pg_c', name: 'Marketing', order: 3 },
      ],
      [{ ...browser('n'), pageId: 'pg_a' }],
    );

    expect(movePagesFor(doc, ['n'], 'n')).toEqual(['Settings', 'Marketing']);
  });

  it('offers a destination a multi-selection shares, and never the page it sits on', () => {
    const doc = pagedDocOf(
      [
        { id: 'pg_a', name: 'Checkout', order: 0 },
        { id: 'pg_b', name: 'Settings', order: 1 },
      ],
      [
        { ...browser('a'), pageId: 'pg_a' },
        { ...label('b', 1), pageId: 'pg_a' },
      ],
    );

    expect(movePagesFor(doc, ['a', 'b'], 'a')).toEqual(['Settings']);
    expect(verbsFor(doc, ['a', 'b'], 'a')).toEqual(['duplicate', 'move-to-page', 'delete']);
  });

  it('reads a node whose page the document dropped as sitting on the first page', () => {
    const doc = pagedDocOf(
      [
        { id: 'pg_a', name: 'Checkout', order: 0 },
        { id: 'pg_b', name: 'Settings', order: 1 },
      ],
      [{ ...browser('n'), pageId: 'pg_gone' }],
    );

    expect(movePagesFor(doc, ['n'], 'n')).toEqual(['Settings']);
  });

  it('names every label with a catalog key, and opens no group at the top', () => {
    const items = canvasMenuItems(menuSelectionFor({ doc: docOf([browser('a')]), selectedNodeIds: ['a'] }, 'a'));
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.isGroupStart).toBe(false);
    for (const item of items) expect(en[item.labelKey]).toBeTypeOf('string');
  });
});

describe('the element group above the Frame’s own verbs (ONL-2563)', () => {
  const FRAME: CanvasMenuSelection = {
    targets: [{ id: 'n1' as CanvasNodeId, kind: 'browser' }],
    movePages: [],
  };

  it('offers nothing of its own with no mapped element', () => {
    expect(canvasMenuItems(FRAME, null).map((item) => item.verb)).not.toContain('open-element');
  });

  it('puts the element verbs first, above a rule', () => {
    const items = canvasMenuItems(FRAME, { component: 'Hero', hasDefinition: true });
    expect(items.slice(0, 2).map((item) => item.verb)).toEqual(['open-element', 'open-component']);
    expect(items[0]?.isGroupStart).toBe(false);
    expect(items[2]?.isGroupStart).toBe(true);
  });

  /* A control ships when it acts: on a project where the reader resolved no
     component, the item is absent rather than present and inert. */
  it('omits Open component when the reader resolved none', () => {
    const verbs = canvasMenuItems(FRAME, { component: null, hasDefinition: false }).map((item) => item.verb);
    expect(verbs).toContain('open-element');
    expect(verbs).not.toContain('open-component');
  });

  it('leaves the Frame’s own verbs and their order untouched', () => {
    const without = canvasMenuItems(FRAME, null);
    const withElement = canvasMenuItems(FRAME, { component: 'Hero', hasDefinition: true });
    expect(withElement.slice(2).map((item) => item.verb)).toEqual(without.map((item) => item.verb));
  });

  it('draws no rule above the first Frame verb when there is no element group', () => {
    expect(canvasMenuItems(FRAME, null)[0]?.isGroupStart).toBe(false);
  });
});

describe('what each element verb opens (ONL-2563)', () => {
  const FRAME2: CanvasMenuSelection = {
    targets: [{ id: 'n1' as CanvasNodeId, kind: 'browser' }],
    movePages: [],
  };

  /* A control ships when it acts: with a component named but nowhere declaring it,
     Open component has no file to open. */
  it('omits Open component when the mapper found no declaration', () => {
    const verbs = canvasMenuItems(FRAME2, { component: 'Hero', hasDefinition: false }).map((item) => item.verb);
    expect(verbs).toContain('open-element');
    expect(verbs).not.toContain('open-component');
  });

  it('offers both when the declaration was found', () => {
    const verbs = canvasMenuItems(FRAME2, { component: 'Hero', hasDefinition: true }).map((item) => item.verb);
    expect(verbs).toContain('open-element');
    expect(verbs).toContain('open-component');
  });
});
