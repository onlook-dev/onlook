import { describe, expect, test } from 'bun:test';

import {
  ARTIFACT_NODE_TYPE,
  FRAME_NODE_TYPE,
  SECTION_NODE_TYPE,
  TEXT_NODE_TYPE,
  type CanvasFlowNode,
} from '../canvas/model.js';
import { designTreeRows, isReorderableRow } from './designTree.js';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function section(id: string, box: Box): CanvasFlowNode {
  return {
    id,
    type: SECTION_NODE_TYPE,
    position: { x: box.x, y: box.y },
    width: box.width,
    height: box.height,
    data: { name: id },
  };
}

function frame(id: string, box: Box): CanvasFlowNode {
  return {
    id,
    type: FRAME_NODE_TYPE,
    position: { x: box.x, y: box.y },
    width: box.width,
    height: box.height,
    data: {
      homeUrl: 'http://localhost:3000/',
      name: id,
      currentUrl: 'http://localhost:3000/',
      health: 'live',
      title: '',
      canGoBack: false,
      canGoForward: false,
    },
  };
}

function artifact(id: string, box: Box): CanvasFlowNode {
  return {
    id,
    type: ARTIFACT_NODE_TYPE,
    position: { x: box.x, y: box.y },
    width: box.width,
    height: box.height,
    data: { artifactId: `3f9c1d20-0000-4000-8000-${id.padStart(12, '0')}`, title: id, name: '' },
  };
}

function text(id: string, box: Box): CanvasFlowNode {
  return {
    id,
    type: TEXT_NODE_TYPE,
    position: { x: box.x, y: box.y },
    width: box.width,
    height: box.height,
    data: { text: id, size: 'medium', name: '' },
  };
}

const ids = (nodes: readonly CanvasFlowNode[], closed?: Set<string>): string[] =>
  designTreeRows(nodes, closed).map((row) => row.node.id);

const depths = (nodes: readonly CanvasFlowNode[], closed?: Set<string>): Record<string, number> =>
  Object.fromEntries(designTreeRows(nodes, closed).map((row) => [row.node.id, row.depth]));

/* Front first, the order the list already reads in: a section always sorts last, behind every object. */
const HOLDS_TWO = [
  frame('loose', { x: 2000, y: 0, width: 400, height: 300 }),
  artifact('a', { x: 100, y: 100, width: 200, height: 200 }),
  frame('f', { x: 400, y: 100, width: 200, height: 200 }),
  section('venue', { x: 50, y: 50, width: 700, height: 400 }),
];

describe('what a section holds', () => {
  test('its enclosed frame and artifact become its children', () => {
    expect(ids(HOLDS_TWO)).toEqual(['loose', 'venue', 'a', 'f']);
    expect(depths(HOLDS_TWO)).toEqual({ loose: 0, venue: 0, a: 1, f: 1 });
  });

  test('an object that only overlaps the bounds stays at the top level', () => {
    const over = [...HOLDS_TWO, text('edge', { x: 700, y: 100, width: 200, height: 40 })];
    expect(designTreeRows(over).find((row) => row.node.id === 'edge')?.depth).toBe(0);
  });

  test('a section holding nothing carries no caret', () => {
    const empty = [section('empty', { x: 5000, y: 0, width: 300, height: 200 })];
    expect(designTreeRows(empty)).toEqual([
      { node: empty[0] as CanvasFlowNode, depth: 0, hasChildren: false },
    ]);
  });

  test('a section holding objects carries one', () => {
    expect(designTreeRows(HOLDS_TWO).find((row) => row.node.id === 'venue')?.hasChildren).toBe(true);
  });
});

describe('an object moving across the bounds', () => {
  test('leaves the group when it moves out', () => {
    const moved = HOLDS_TWO.map((node) =>
      node.id === 'f' ? { ...node, position: { x: 900, y: 100 } } : node,
    );
    expect(ids(moved)).toEqual(['loose', 'f', 'venue', 'a']);
    expect(depths(moved).f).toBe(0);
  });

  test('joins it when it moves in', () => {
    const moved = HOLDS_TWO.map((node) =>
      node.id === 'loose' ? { ...node, position: { x: 100, y: 60 } } : node,
    );
    expect(depths(moved).loose).toBe(1);
  });

  test('joins it when the section is widened over it', () => {
    const edge = text('edge', { x: 700, y: 100, width: 200, height: 40 });
    const widened = [...HOLDS_TWO, edge].map((node) =>
      node.id === 'venue' ? { ...node, width: 1000 } : node,
    );
    expect(depths(widened).edge).toBe(1);
  });
});

describe('children read in canvas order', () => {
  const grid = [
    artifact('bottom-left', { x: 100, y: 400, width: 100, height: 100 }),
    artifact('top-right', { x: 400, y: 100, width: 100, height: 100 }),
    artifact('top-left', { x: 100, y: 100, width: 100, height: 100 }),
    section('grid', { x: 50, y: 50, width: 700, height: 600 }),
  ];

  test('top to bottom, then left to right — not the order they were made', () => {
    expect(ids(grid)).toEqual(['grid', 'top-left', 'top-right', 'bottom-left']);
  });

  test('two on one line read left to right whichever way the stack holds them', () => {
    const flipped = [grid[1] as CanvasFlowNode, grid[2] as CanvasFlowNode, grid[0] as CanvasFlowNode, grid[3] as CanvasFlowNode];
    expect(ids(flipped)).toEqual(['grid', 'top-left', 'top-right', 'bottom-left']);
  });
});

describe('sections inside sections', () => {
  const nested = [
    artifact('deep', { x: 150, y: 150, width: 100, height: 100 }),
    section('inner', { x: 100, y: 100, width: 300, height: 300 }),
    section('outer', { x: 50, y: 50, width: 700, height: 600 }),
  ];

  test('the innermost section owns the object', () => {
    expect(ids(nested)).toEqual(['outer', 'inner', 'deep']);
    expect(depths(nested)).toEqual({ outer: 0, inner: 1, deep: 2 });
  });

  test('two overlapping sections give a shared object to exactly one', () => {
    const shared = [
      artifact('both', { x: 300, y: 300, width: 100, height: 100 }),
      section('left', { x: 100, y: 100, width: 500, height: 500 }),
      section('right', { x: 200, y: 200, width: 500, height: 500 }),
    ];
    const rows = designTreeRows(shared);
    expect(rows.map((row) => row.node.id).filter((id) => id === 'both')).toHaveLength(1);
    expect(rows.filter((row) => row.hasChildren)).toHaveLength(1);
  });

  test('two sections of one size neither nest nor lose a row', () => {
    const twins = [
      artifact('held', { x: 150, y: 150, width: 100, height: 100 }),
      section('one', { x: 100, y: 100, width: 400, height: 400 }),
      section('two', { x: 100, y: 100, width: 400, height: 400 }),
    ];
    const rows = designTreeRows(twins);
    expect(rows).toHaveLength(3);
    expect(rows.filter((row) => row.depth === 0).map((row) => row.node.id)).toEqual(['one', 'two']);
  });
});

describe('every object appears exactly once', () => {
  for (const [name, nodes] of [
    ['a section holding two', HOLDS_TWO],
    ['sections inside sections', [
      artifact('deep', { x: 150, y: 150, width: 100, height: 100 }),
      section('inner', { x: 100, y: 100, width: 300, height: 300 }),
      section('outer', { x: 50, y: 50, width: 700, height: 600 }),
    ]],
    ['nothing at all', []],
  ] as const) {
    test(name, () => {
      const rows = designTreeRows(nodes);
      expect(rows).toHaveLength(nodes.length);
      expect(new Set(rows.map((row) => row.node.id)).size).toBe(nodes.length);
    });
  }
});

describe('a closed section', () => {
  test('keeps its own row and hides what it holds', () => {
    expect(ids(HOLDS_TWO, new Set(['venue']))).toEqual(['loose', 'venue']);
  });

  test('hides a nested section and everything under it', () => {
    const nested = [
      artifact('deep', { x: 150, y: 150, width: 100, height: 100 }),
      section('inner', { x: 100, y: 100, width: 300, height: 300 }),
      section('outer', { x: 50, y: 50, width: 700, height: 600 }),
    ];
    expect(ids(nested, new Set(['outer']))).toEqual(['outer']);
    expect(ids(nested, new Set(['inner']))).toEqual(['outer', 'inner']);
  });

  test('closing one a page no longer holds changes nothing', () => {
    expect(ids(HOLDS_TWO, new Set(['gone']))).toEqual(ids(HOLDS_TWO));
  });
});

describe('a list with no section', () => {
  const flat = [
    frame('one', { x: 0, y: 0, width: 100, height: 100 }),
    frame('two', { x: 200, y: 0, width: 100, height: 100 }),
  ];

  test('reads exactly as it did before, every row reorderable', () => {
    expect(designTreeRows(flat)).toEqual([
      { node: flat[0] as CanvasFlowNode, depth: 0, hasChildren: false },
      { node: flat[1] as CanvasFlowNode, depth: 0, hasChildren: false },
    ]);
    expect(designTreeRows(flat).every(isReorderableRow)).toBe(true);
  });

  test('an empty list stays empty', () => {
    expect(designTreeRows([])).toEqual([]);
  });
});

describe('which rows a drag may reorder', () => {
  test('the top-level objects, never a section or a child', () => {
    expect(designTreeRows(HOLDS_TWO).filter(isReorderableRow).map((row) => row.node.id)).toEqual([
      'loose',
    ]);
  });
});
