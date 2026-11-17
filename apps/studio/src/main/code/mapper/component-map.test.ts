import { describe, expect, it } from 'bun:test';
import { EVIDENCE_DOM_PATH_MAX, EVIDENCE_PATH_DEPTH_MAX } from '@studio/events';
import { boundariesOf, componentMapSource, COMPONENT_MAP_MAX } from './component-map.js';

describe('the map reader that is serialized into the page (ONL-2563)', () => {
  it('closes over nothing, so no identifier from this module survives', () => {
    const source = componentMapSource();
    expect(source).not.toContain('boundariesOf');
    expect(source).not.toContain('import');
    expect(source).not.toContain('require');
  });

  it('takes `document` as an argument rather than reaching for a global', () => {
    expect(componentMapSource()).toContain('(document,');
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    expect(() => new Function('document', `return ${componentMapSource()}`)).not.toThrow();
  });

  /* A path spelled to a different length than the guest spells it matches nothing, and the
     outline silently never draws on a deep page. */
  it('carries the evidence path’s own bounds rather than its own numbers', () => {
    expect(componentMapSource()).toContain(`(document, ${String(EVIDENCE_PATH_DEPTH_MAX)}, ${String(EVIDENCE_DOM_PATH_MAX)})`);
  });
});

describe('what main accepts back from the page', () => {
  it('takes a boundary with its path and its component', () => {
    expect(
      boundariesOf({ ok: true, boundaries: [{ domPath: 'html > body > div', component: 'Hero' }] }),
    ).toEqual([{ domPath: 'html > body > div', component: 'Hero' }]);
  });

  it('answers nothing for a page with no React, which is an answer and not a fault', () => {
    expect(boundariesOf({ ok: false, why: 'no-react' })).toEqual([]);
  });

  /* It crosses from an untrusted realm: a row that is not a pair of non-empty
     strings is dropped rather than carried. */
  it('drops a row missing either half, and anything that is not an object', () => {
    expect(
      boundariesOf({
        ok: true,
        boundaries: [
          { domPath: 'div', component: '' },
          { domPath: '', component: 'Hero' },
          { domPath: 7, component: 'Hero' },
          'a string',
          null,
          { domPath: 'div', component: 'Kept' },
        ],
      }),
    ).toEqual([{ domPath: 'div', component: 'Kept' }]);
  });

  it('refuses anything that is not an object at all', () => {
    expect(boundariesOf(null)).toEqual([]);
    expect(boundariesOf('ok')).toEqual([]);
    expect(boundariesOf({ ok: true, boundaries: 'all of them' })).toEqual([]);
  });

  it('bounds how many boundaries one page can claim', () => {
    const many = Array.from({ length: COMPONENT_MAP_MAX + 500 }, (_, index) => ({
      domPath: `div:nth-of-type(${String(index)})`,
      component: 'Row',
    }));
    expect(boundariesOf({ ok: true, boundaries: many })).toHaveLength(COMPONENT_MAP_MAX);
  });

  it('bounds a path and a name the page made enormous', () => {
    const [row] = boundariesOf({
      ok: true,
      boundaries: [{ domPath: 'x'.repeat(5000), component: 'y'.repeat(5000) }],
    });
    expect(row?.domPath.length).toBe(2048);
    expect(row?.component.length).toBe(200);
  });
});

interface FakeNode {
  tagName: string;
  parentElement: FakeNode | null;
  children: FakeNode[];
}

interface Fiber {
  type?: unknown;
  elementType?: unknown;
  return?: Fiber | null;
  _debugOwner?: unknown;
}

/** The reader as the page runs it: `componentMapSource()` is evaluated, never imported. */
function runReader(doc: unknown): { ok: boolean; boundaries?: { domPath: string; component: string }[]; react?: string } {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  const run = new Function('document', `return ${componentMapSource()}`) as (
    doc: unknown,
  ) => { ok: boolean; boundaries?: { domPath: string; component: string }[]; react?: string };
  return run(doc);
}

/** `html > body > main`, where `main` is the first host element of a `Hero` the page renders. */
function page(options: { isDev: boolean; name?: string; hostBetween?: boolean }): unknown {
  const html: FakeNode = { tagName: 'HTML', parentElement: null, children: [] };
  const body: FakeNode = { tagName: 'BODY', parentElement: html, children: [] };
  html.children.push(body);
  const main: FakeNode = { tagName: 'MAIN', parentElement: body, children: [] };
  body.children.push(main);

  const debug = options.isDev ? { _debugOwner: null } : {};
  const hero: Fiber = {
    type: function Hero() {
      return null;
    },
    return: null,
    ...debug,
  };
  const between: Fiber = { type: 'section', return: hero, ...debug };
  const host: Fiber = {
    type: 'main',
    return: options.hostBetween === true ? between : hero,
    ...debug,
  };
  Object.assign(main, { ['__reactFiber$abc']: host });
  return { querySelectorAll: () => [html, body, main] };
}

describe('the gate on which React build a boundary may be read from (ONL-2563)', () => {
  it('reads a boundary from a development build', () => {
    const answer = runReader(page({ isDev: true }));
    expect(answer).toMatchObject({ ok: true, react: 'development' });
    expect(answer.boundaries).toEqual([{ domPath: 'html > body:nth-of-type(1) > main:nth-of-type(1)', component: 'Hero' }]);
  });

  /* Production React strips the debug fields and MINIFIES the component's own name, so a
     boundary read there carries a name no file in the project contains. */
  it('reads nothing from a production build, and says which it was', () => {
    expect(runReader(page({ isDev: false }))).toEqual({ ok: true, boundaries: [], react: 'production' });
  });

  it('reads nothing from a page with no React at all, and says so', () => {
    const bare: FakeNode = { tagName: 'DIV', parentElement: null, children: [] };
    expect(runReader({ querySelectorAll: () => [bare] })).toEqual({ ok: true, boundaries: [], react: 'none' });
  });

  it('leaves out an element that is nested inside the component rather than its own box', () => {
    const answer = runReader(page({ isDev: true, hostBetween: true }));
    expect(answer.boundaries).toEqual([]);
  });
});
