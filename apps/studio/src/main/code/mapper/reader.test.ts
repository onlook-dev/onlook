import { describe, expect, it } from 'bun:test';
import { readerSource, readingOf } from './reader.js';

describe('the reader that is serialized into the page (ONL-2563)', () => {
  /* It is stringified and evaluated in another realm, where this module's scope
     does not exist. A captured binding is `undefined` there with no error. */
  it('closes over nothing, so no identifier from this module survives', () => {
    const source = readerSource('div');
    expect(source).not.toContain('readingOf');
    expect(source).not.toContain('import');
    expect(source).not.toContain('require');
  });

  it('carries the selector as data rather than as spliced source', () => {
    expect(readerSource('div > p:nth-of-type(2)')).toContain('"div > p:nth-of-type(2)"');
  });

  it('escapes a selector that would otherwise end the string, and still parses', () => {
    const source = readerSource('a[title="x"]');
    expect(source).toContain(JSON.stringify('a[title="x"]'));
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    expect(() => new Function('document', `return ${source}`)).not.toThrow();
  });
});

describe('what main accepts back from the page', () => {
  it('takes a reading with its component and frames', () => {
    expect(
      readingOf({
        ok: true,
        component: 'Button',
        frames: ['at Button (a.tsx:3:4)'],
        siblings: 1,
        react: 'development',
      }),
    ).toEqual({
      ok: true,
      component: 'Button',
      frames: ['at Button (a.tsx:3:4)'],
      ownerFrames: [],
      direct: false,
      siblings: 1,
      siblingsComplete: false,
      react: 'development',
    });
  });

  it('takes a host element with no component ancestor as an answer, not a failure', () => {
    expect(readingOf({ ok: true, component: null, frames: [], siblings: 1, react: 'development' })).toEqual({
      ok: true,
      component: null,
      frames: [],
      ownerFrames: [],
      direct: false,
      siblings: 1,
      siblingsComplete: false,
      react: 'development',
    });
  });

  it('reads a missing or impossible sibling count as one', () => {
    for (const siblings of [undefined, 0, -3, 2.5, 'many', null]) {
      const answer = readingOf({ ok: true, component: 'A', frames: [], siblings });
      if (!answer.ok) throw new Error('expected a reading');
      expect(answer.siblings).toBe(1);
    }
  });

  it('requires an explicit boolean before accepting direct element provenance', () => {
    for (const direct of [undefined, false, 'true', 1]) {
      expect(readingOf({ ok: true, direct })).toMatchObject({ direct: false });
    }
    expect(readingOf({ ok: true, direct: true })).toMatchObject({ direct: true });
  });

  it('bounds an enormous sibling count', () => {
    const answer = readingOf({ ok: true, component: 'A', frames: [], siblings: 9e9 });
    if (!answer.ok) throw new Error('expected a reading');
    expect(answer.siblings).toBe(10_000);
  });

  it('keeps the page’s own why when it is one this side knows', () => {
    expect(readingOf({ ok: false, why: 'no-react' })).toEqual({ ok: false, why: 'no-react' });
    expect(readingOf({ ok: false, why: 'no-element' })).toEqual({ ok: false, why: 'no-element' });
  });

  /* It crosses from an untrusted realm: an unknown reason is not passed
     through, and a non-object is not a reading at all. */
  it('refuses a why it does not know, and anything that is not an object', () => {
    expect(readingOf({ ok: false, why: 'something-else' })).toEqual({ ok: false, why: 'unreadable' });
    expect(readingOf('a string')).toEqual({ ok: false, why: 'unreadable' });
    expect(readingOf(null)).toEqual({ ok: false, why: 'unreadable' });
  });

  it('bounds a component name and a frame the page made enormous', () => {
    const huge = readingOf({ ok: true, component: 'x'.repeat(5000), frames: ['y'.repeat(5000)] });
    if (!huge.ok) throw new Error('expected a reading');
    expect(huge.component?.length).toBe(200);
    expect(huge.frames[0]?.length).toBe(500);
  });

  it('bounds how many frames it will take', () => {
    const many = readingOf({ ok: true, component: 'A', frames: Array.from({ length: 500 }, () => 'at x') });
    if (!many.ok) throw new Error('expected a reading');
    expect(many.frames.length).toBe(32);
  });

  /* The stacks of the components ABOVE the element, which is the only answer for an element a
     dependency drew. They are bounded and filtered the same way, and absent is empty. */
  it('takes the owners’ frames beside the element’s own', () => {
    const answer = readingOf({
      ok: true,
      component: 'styled.section',
      frames: ['at styled (deps/styled-components.js:5:11)'],
      ownerFrames: ['at Hero (src/Hero.jsx:5:11)', 7],
      siblings: 1,
      react: 'development',
    });
    if (!answer.ok) throw new Error('expected a reading');
    expect(answer.ownerFrames).toEqual(['at Hero (src/Hero.jsx:5:11)']);
  });

  it('reads absent owner frames as none', () => {
    const answer = readingOf({ ok: true, component: 'A', frames: [], siblings: 1 });
    if (!answer.ok) throw new Error('expected a reading');
    expect(answer.ownerFrames).toEqual([]);
  });

  it('drops a frame that is not a string rather than carrying it', () => {
    const mixed = readingOf({ ok: true, component: 'A', frames: ['at x', 7, null] });
    if (!mixed.ok) throw new Error('expected a reading');
    expect(mixed.frames).toEqual(['at x']);
  });
});

/**
 * The body itself, evaluated the way the page evaluates it — a fake document
 * and a fake fiber standing in for React's. This is what proves the walk and
 * the wrapper unwrapping, which no amount of asserting on the source would.
 */
function docWith(node: unknown): { querySelector: () => unknown } {
  return { querySelector: () => node };
}

/** A node carrying React's expando, pointing at a fiber chain. */
function nodeFor(fiber: unknown): Record<string, unknown> {
  return { ['__reactFiber$abc']: fiber };
}

describe('the reader’s walk, run as the page runs it', () => {
  const evaluate = (node: unknown, selector = 'div'): Record<string, unknown> => {
    const source = readerSource(selector);
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const run = new Function('document', `return ${source.slice(0, source.lastIndexOf('(document,'))}(document, ${JSON.stringify(selector)})`) as (
      doc: unknown,
    ) => Record<string, unknown>;
    return run(docWith(node));
  };

  it('answers no-element when the selector matches nothing', () => {
    expect(evaluate(null)).toEqual({ ok: false, why: 'no-element' });
  });

  it('reads bounded DOM evidence without React', () => {
    expect(evaluate({ tagName: 'H1', textContent: '  Welcome   home ', getAttribute: () => 'hero title' })).toMatchObject({
      ok: true, react: 'none', component: null, frames: [], evidence: { tag: 'h1', classes: ['hero', 'title'], text: 'Welcome home' },
    });
  });

  it('names the nearest component, walking past the host fiber', () => {
    const component = { type: function Button() { return null; }, return: null, _debugStack: '' };
    const host = { type: 'div', return: component };
    expect(evaluate(nodeFor(host))).toMatchObject({ ok: true, component: 'Button' });
  });

  it('names a component through a memo wrapper', () => {
    const inner = { displayName: 'Card' };
    const component = { type: { type: inner }, return: null };
    expect(evaluate(nodeFor(component))).toMatchObject({ ok: true, component: 'Card' });
  });

  it('names a component through a forward-ref wrapper', () => {
    const component = { type: { render: function Field() { return null; } }, return: null };
    expect(evaluate(nodeFor(component))).toMatchObject({ ok: true, component: 'Field' });
  });

  it('answers a null component, not a failure, for a host with no component above it', () => {
    expect(evaluate(nodeFor({ type: 'div', return: null }))).toMatchObject({ ok: true, component: null });
  });

  /* The bug this test exists for: splitting on a literal backslash-n returns
     the whole stack as ONE frame, and every mapping downstream reads the wrong
     line. */
  it('splits an owner stack into its real lines', () => {
    const component = {
      type: function Hero() { return null; },
      return: null,
      _debugStack: 'at Hero (src/Hero.tsx:12:3)\nat App (src/App.tsx:4:5)',
    };
    const answer = evaluate(nodeFor(component));
    expect(answer['frames']).toEqual(['at Hero (src/Hero.tsx:12:3)', 'at App (src/App.tsx:4:5)']);
  });

  /* A styled wrapper creates the host element inside its own dist, so the element's stack is the
     dependency's and the line the designer wrote is on the fiber above it. */
  it('takes each fiber’s own stack, the element’s apart from its owners’', () => {
    const owner = {
      type: function Hero() { return null; },
      return: null,
      _debugStack: 'at Hero (src/Hero.jsx:5:11)',
    };
    const styled = {
      type: function StyledComponent() { return null; },
      return: owner,
      _debugStack: 'at styled (deps/styled-components.js:9:2)',
    };
    const host = { type: 'section', return: styled };
    const answer = evaluate(nodeFor(host));
    expect(answer['frames']).toEqual(['at styled (deps/styled-components.js:9:2)']);
    expect(answer['ownerFrames']).toEqual(['at Hero (src/Hero.jsx:5:11)']);
  });

  it('counts one sibling for an element standing alone', () => {
    const only = { type: 'li', return: null };
    expect(evaluate(nodeFor(only))['siblings']).toBe(1);
  });

  /* The count the grade turns on: a list's call site maps every row to one
     line, so a row must never earn the strongest confidence word. */
  it('counts the rows a list produced, from the matched element’s own parent', () => {
    const parent: Record<string, unknown> = { type: 'ul', return: null };
    const rows = [1, 2, 3].map(() => ({ type: 'li', return: parent, sibling: null, _debugStack: 'at List (src/List.jsx:8:3)' }));
    rows[0]!.sibling = rows[1] as never;
    rows[1]!.sibling = rows[2] as never;
    parent['child'] = rows[0];
    expect(evaluate(nodeFor(rows[1]))['siblings']).toBe(3);
  });

  it('does not count a sibling of another type as a row of the same list', () => {
    const parent: Record<string, unknown> = { type: 'div', return: null };
    const heading = { type: 'h1', return: parent, sibling: null as unknown };
    const paragraph = { type: 'p', return: parent, sibling: null };
    heading.sibling = paragraph;
    parent['child'] = heading;
    expect(evaluate(nodeFor(heading))['siblings']).toBe(1);
  });

  it('counts across .map(Row) instances whose only child is one li', () => {
    const Row = function Row() { return null; };
    const parent: Record<string, unknown> = { type: 'ul', return: null };
    const rows = [1, 2, 3, 4].map(() => ({ type: Row, return: parent, sibling: null as unknown, child: null as unknown }));
    const hosts = rows.map((row) => ({ type: 'li', return: row, _debugStack: 'at Row (src/Row.jsx:2:3)' }));
    rows.forEach((row, index) => { row.child = hosts[index]; row.sibling = rows[index + 1] ?? null; });
    parent['child'] = rows[0];
    for (const host of hosts) expect(evaluate(nodeFor(host))['siblings']).toBe(4);
  });

  it('does not attribute distinct same-tag ancestor callsites to one Hero', () => {
    const fragment: Record<string, unknown> = { return: null };
    const first: Record<string, unknown> = { type: 'div', return: fragment, _debugStack: 'at App (src/App.jsx:20:3)' };
    const second: Record<string, unknown> = { type: 'div', return: fragment, _debugStack: 'at App (src/App.jsx:30:3)' };
    const hero: Record<string, unknown> = { type: function Hero() { return null; }, return: first };
    const footer: Record<string, unknown> = { type: function Footer() { return null; }, return: second };
    const heading = { type: 'h1', return: hero, _debugStack: 'at Hero (src/Hero.jsx:5:11)' };
    const foot = { type: 'footer', return: footer, _debugStack: 'at Footer (src/Footer.jsx:5:11)' };
    fragment['child'] = first;
    first['sibling'] = second;
    first['child'] = hero;
    second['child'] = footer;
    hero['child'] = heading;
    footer['child'] = foot;
    expect(evaluate(nodeFor(heading))).toMatchObject({ component: 'Hero', siblings: 1 });
  });

  it('does not combine same-tag siblings from different creation sites', () => {
    const parent: Record<string, unknown> = { type: 'div', return: null };
    const first = { type: 'h1', return: parent, _debugStack: 'at App (src/App.jsx:10:3)', sibling: null as unknown };
    const second = { type: 'h1', return: parent, _debugStack: 'at App (src/App.jsx:20:3)' };
    first.sibling = second;
    parent['child'] = first;
    expect(evaluate(nodeFor(first))['siblings']).toBe(1);
  });

  it('does not infer repeated reach from tags when creation evidence is absent', () => {
    const parent: Record<string, unknown> = { type: 'ul', return: null };
    const first = { type: 'li', return: parent, sibling: null as unknown };
    first.sibling = { type: 'li', return: parent };
    parent['child'] = first;
    expect(evaluate(nodeFor(first))).toMatchObject({ siblings: 1, siblingsComplete: false });
  });

  it('does not claim completion when a same-type fiber lacks creation evidence', () => {
    const parent: Record<string, unknown> = { return: null };
    const first = { type: 'li', return: parent, _debugStack: 'at Row (src/Row.jsx:2:3)', sibling: { type: 'li', return: parent } };
    parent['child'] = first;
    expect(evaluate(nodeFor(first))).toMatchObject({ siblings: 1, siblingsComplete: false });
  });

  it('does not count matches from truncated creation stacks', () => {
    const first = { type: 'li', _debugStack: 'at Row (src/Row.jsx:2:3)' + 'x'.repeat(501), return: null };
    expect(evaluate(nodeFor(first))).toMatchObject({ siblings: 1, siblingsComplete: false });
  });

  it('parses completion conservatively when the page omits or spoofs it', () => {
    for (const siblingsComplete of [undefined, 'true', 1, false]) {
      expect(readingOf({ ok: true, siblings: 1, siblingsComplete })).toMatchObject({ siblingsComplete: false });
    }
    expect(readingOf({ ok: true, siblings: 10_001, siblingsComplete: true })).toMatchObject({ siblingsComplete: false });
    expect(readingOf({ ok: true, siblings: 4, siblingsComplete: true })).toMatchObject({ siblingsComplete: true });
  });

  it('reads React 18’s single source field when there is no stack', () => {
    const component = {
      type: function Old() { return null; },
      return: null,
      _debugSource: { fileName: 'src/Old.jsx', lineNumber: 7, columnNumber: 2 },
    };
    expect(evaluate(nodeFor(component))['frames']).toEqual(['at src/Old.jsx:7:2']);
  });
  it('prefers a concrete JSX source location over a runtime stack', () => {
    const element = { type: 'img', return: null,
      _debugStack: 'at runtime (node_modules/runtime.js:1:2)',
      _debugSource: { fileName: 'src/PlantPhoto.tsx', lineNumber: 46, columnNumber: 11 } };
    expect(evaluate(nodeFor(element))['frames']).toEqual(['at src/PlantPhoto.tsx:46:11']);
  });

});
